-- Generic rate-limit counter, used to cap Gemini AI summary generation
-- and outbound notification emails per team. A single atomic UPSERT
-- (not a SELECT-then-UPDATE) so concurrent calls from the same key
-- can't race past the limit.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- Accessed only through check_rate_limit() (security definer) below -
-- no direct table grants to anon/authenticated.
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_max_count integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;
