alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.milestones enable row level security;
alter table public.documents enable row level security;
alter table public.meeting_logs enable row level security;
alter table public.advisor_notes enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_comments to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.meeting_logs to authenticated;
grant select, insert, update, delete on public.advisor_notes to authenticated;

-- profiles: no client-side self-edit in this MVP. Anyone can read their
-- own row, their teammates' rows, or (if admin) everyone's. Only admin
-- writes profiles directly (role/team assignment); self-signup goes
-- through the handle_new_user trigger instead.
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or team_id = public.get_my_team_id()
    or public.get_my_role() = 'admin'
  );

create policy profiles_admin_all on public.profiles
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- teams: visible to your own team; only admin creates/edits/deletes teams.
create policy teams_select on public.teams
  for select using (id = public.get_my_team_id());

create policy teams_admin_all on public.teams
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- tasks: full student CRUD within their own team; advisor/admin read via
-- teams_select-equivalent scoping (advisor is read-only by simply having
-- no insert/update/delete policy of their own).
create policy tasks_select_team on public.tasks
  for select using (team_id = public.get_my_team_id());

create policy tasks_insert_student on public.tasks
  for insert with check (
    public.get_my_role() = 'student'
    and team_id = public.get_my_team_id()
    and created_by = auth.uid()
  );

create policy tasks_update_student on public.tasks
  for update using (
    public.get_my_role() = 'student' and team_id = public.get_my_team_id()
  )
  with check (team_id = public.get_my_team_id());

create policy tasks_delete_student on public.tasks
  for delete using (
    public.get_my_role() = 'student' and team_id = public.get_my_team_id()
  );

create policy tasks_admin_all on public.tasks
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- task_comments: readable by the task's team; only students post comments
-- (advisors give feedback via Advisor Notes instead, per the read-only
-- advisor design).
create policy comments_select_team on public.task_comments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and t.team_id = public.get_my_team_id()
    )
  );

create policy comments_insert_student on public.task_comments
  for insert with check (
    public.get_my_role() = 'student'
    and author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and t.team_id = public.get_my_team_id()
    )
  );

create policy comments_admin_all on public.task_comments
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- milestones: Amendment 3 (seeded, fixed set) + Amendment 2 (no direct
-- UPDATE for advisors — status changes only via approve_milestone()).
-- Deliberately: no insert/update policy for student or advisor at all.
create policy milestones_select_team on public.milestones
  for select using (team_id = public.get_my_team_id());

create policy milestones_admin_all on public.milestones
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- documents: students upload into their own team's vault; everyone on
-- the team can see it.
create policy documents_select_team on public.documents
  for select using (team_id = public.get_my_team_id());

create policy documents_insert_student on public.documents
  for insert with check (
    public.get_my_role() = 'student'
    and team_id = public.get_my_team_id()
    and uploaded_by = auth.uid()
  );

create policy documents_admin_all on public.documents
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- meeting_logs: either role on the team can log a meeting; visible to
-- the whole team.
create policy meetings_select_team on public.meeting_logs
  for select using (team_id = public.get_my_team_id());

create policy meetings_insert_team on public.meeting_logs
  for insert with check (
    team_id = public.get_my_team_id() and created_by = auth.uid()
  );

create policy meetings_admin_all on public.meeting_logs
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- advisor_notes: Amendment 2 again — advisors can post new weekly notes
-- but never edit/delete an existing one (no update/delete policy).
-- Visible to the whole team.
create policy advisor_notes_select_team on public.advisor_notes
  for select using (team_id = public.get_my_team_id());

create policy advisor_notes_insert_advisor on public.advisor_notes
  for insert with check (
    public.get_my_role() = 'advisor'
    and team_id = public.get_my_team_id()
    and advisor_id = auth.uid()
  );

create policy advisor_notes_admin_all on public.advisor_notes
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
