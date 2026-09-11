-- Generated tsvector columns (auto-maintained by Postgres on every
-- insert/update, not app code) + GIN indexes for the global search
-- feature - proper full-text search (websearch_to_tsquery) rather
-- than ILIKE, which can't use an index for substring matches at this
-- scale and has no relevance ranking.
alter table public.tasks
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

alter table public.documents
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, ''))
  ) stored;

alter table public.meeting_logs
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(decisions, '')), 'B')
  ) stored;

create index if not exists tasks_search_vector_idx on public.tasks using gin (search_vector);
create index if not exists documents_search_vector_idx on public.documents using gin (search_vector);
create index if not exists meeting_logs_search_vector_idx on public.meeting_logs using gin (search_vector);
