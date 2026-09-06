-- Helper functions used inside RLS policies. SECURITY DEFINER means they
-- run with the privileges of their owner (bypassing RLS on `profiles`
-- internally), which is what prevents infinite recursion: a policy on
-- e.g. `tasks` calling get_my_team_id() does NOT re-trigger `profiles`
-- RLS the way a plain subquery on profiles would.
create function public.get_my_role() returns text
  language sql security definer stable
  set search_path = public
  as $$ select role::text from public.profiles where id = auth.uid() $$;

create function public.get_my_team_id() returns uuid
  language sql security definer stable
  set search_path = public
  as $$ select team_id from public.profiles where id = auth.uid() $$;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_team_id() to authenticated;

-- Auto-create a profile row (default role: student) whenever a new
-- auth.users row is created. Admin/advisor promotion and team
-- assignment happen afterwards (via seed script or the admin dashboard).
create function public.handle_new_user() returns trigger
  language plpgsql security definer
  set search_path = public
  as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep tasks.updated_at current on every update.
create function public.set_updated_at() returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Amendment 2: milestones are never updated directly by advisors (RLS
-- grants no UPDATE policy for them at all — see the RLS migration).
-- This RPC is the only path to a status change, and it only ever
-- touches status/approved_by/approved_at, never title/due_date.
create function public.approve_milestone(milestone_id uuid, new_status text)
  returns public.milestones
  language plpgsql security definer
  set search_path = public
  as $$
declare
  m public.milestones;
  caller_role text := public.get_my_role();
  caller_team uuid := public.get_my_team_id();
begin
  if new_status not in ('pending', 'submitted', 'approved', 'rejected') then
    raise exception 'invalid milestone status: %', new_status;
  end if;

  select * into m from public.milestones where id = milestone_id;
  if not found then
    raise exception 'milestone % not found', milestone_id;
  end if;

  if caller_role = 'admin' then
    -- allowed
  elsif caller_role = 'advisor' and caller_team = m.team_id then
    -- allowed: the advisor assigned to this milestone's team
  else
    raise exception 'not authorized to approve this milestone';
  end if;

  update public.milestones
    set status = new_status::public.milestone_status,
        approved_by = auth.uid(),
        approved_at = now()
    where id = milestone_id
    returning * into m;

  return m;
end;
$$;

grant execute on function public.approve_milestone(uuid, text) to authenticated;
