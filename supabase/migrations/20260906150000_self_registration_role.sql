-- Allow a signup to declare "student" or "advisor" as their intended
-- role (never "admin" — that would be a privilege escalation via the
-- public registration form, so anything else falls back to student).
-- The role takes effect immediately, but it's inert until an admin
-- assigns a team_id: every RLS policy that matters for advisors/students
-- also scopes by get_my_team_id(), which is null until approved.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer
  set search_path = public
  as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'requested_role';
  resolved_role public.user_role;
begin
  if requested_role = 'advisor' then
    resolved_role := 'advisor';
  else
    resolved_role := 'student';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    resolved_role
  );
  return new;
end;
$$;
