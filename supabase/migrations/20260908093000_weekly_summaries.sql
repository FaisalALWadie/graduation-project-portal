create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  week_number int not null,
  content text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id) on delete set null
);

create index weekly_summaries_team_id_idx on public.weekly_summaries (team_id);

alter table public.weekly_summaries enable row level security;
grant select, insert on public.weekly_summaries to authenticated;

-- Visible to the whole team (student/advisor), same pattern as
-- everything else.
create policy weekly_summaries_select_team on public.weekly_summaries
  for select using (team_id = public.get_my_team_id());

-- Only advisor or admin can generate one (spec: "Generate Summary"
-- button visible to advisor and admin).
create policy weekly_summaries_insert_advisor on public.weekly_summaries
  for insert with check (
    public.get_my_role() = 'advisor' and team_id = public.get_my_team_id()
  );

create policy weekly_summaries_admin_all on public.weekly_summaries
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
