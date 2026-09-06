-- Amendment 4: storage.objects has its own RLS, separate from the
-- database tables above. Files are stored at `<team_id>/<filename>` so
-- policies can scope access by team using the same get_my_team_id()
-- helper. Without this, uploads would either be silently denied (no
-- policy = default deny) or, if a lazy blanket policy were used, open
-- to every authenticated user regardless of team.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_bucket_select on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = public.get_my_team_id()::text
      or public.get_my_role() = 'admin'
    )
  );

create policy documents_bucket_insert on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (
      (
        public.get_my_role() = 'student'
        and (storage.foldername(name))[1] = public.get_my_team_id()::text
      )
      or public.get_my_role() = 'admin'
    )
  );

create policy documents_bucket_admin_all on storage.objects
  for all using (
    bucket_id = 'documents' and public.get_my_role() = 'admin'
  )
  with check (
    bucket_id = 'documents' and public.get_my_role() = 'admin'
  );
