-- Enums
create type public.user_role as enum ('admin', 'advisor', 'student');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.milestone_status as enum ('pending', 'submitted', 'approved', 'rejected');
create type public.document_type as enum ('report', 'presentation', 'code', 'other');

-- profiles and teams reference each other, so profiles.team_id's FK
-- is added after both tables exist.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role public.user_role not null default 'student',
  team_id uuid,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  project_title text not null,
  advisor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams (id) on delete set null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  due_date date,
  status public.milestone_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  type public.document_type not null default 'other',
  file_url text not null,
  version int not null default 1,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.meeting_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  meeting_date date not null,
  summary text not null,
  decisions text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.advisor_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  week_number int not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index tasks_team_id_idx on public.tasks (team_id);
create index task_comments_task_id_idx on public.task_comments (task_id);
create index milestones_team_id_idx on public.milestones (team_id);
create index documents_team_id_idx on public.documents (team_id);
create index meeting_logs_team_id_idx on public.meeting_logs (team_id);
create index advisor_notes_team_id_idx on public.advisor_notes (team_id);
create index profiles_team_id_idx on public.profiles (team_id);
