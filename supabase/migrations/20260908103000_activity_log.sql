create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index activity_log_team_id_idx on public.activity_log (team_id, created_at desc);

alter table public.activity_log enable row level security;
grant select, insert on public.activity_log to authenticated;

-- Same pattern as meeting_logs: any team member (student or advisor)
-- can write an entry for their own team, no role restriction beyond
-- team scoping - these are written from within the same server action
-- that performs the real change, not user-facing forms.
create policy activity_log_select_team on public.activity_log
  for select using (team_id = public.get_my_team_id());

create policy activity_log_insert_team on public.activity_log
  for insert with check (team_id = public.get_my_team_id());

create policy activity_log_admin_all on public.activity_log
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Realtime subscriptions need the table added to the publication -
-- without this, .on('postgres_changes', ...) silently never fires.
alter publication supabase_realtime add table public.activity_log;
