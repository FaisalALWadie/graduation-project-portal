-- Email notifications need each recipient's email address, but only
-- auth.users has it (profiles doesn't, and looking it up via the admin
-- API from inside a user-session server action would require the
-- service role key in the wrong place). Denormalize it onto profiles
-- instead, kept in sync by handle_new_user at signup time.

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

alter table public.profiles alter column email set not null;

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

  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    resolved_role,
    new.email
  );
  return new;
end;
$$;
