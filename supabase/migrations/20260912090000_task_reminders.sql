-- Tracks the last time a deadline-reminder email was sent for a task,
-- so the daily cron job (app/api/cron/deadline-reminders) doesn't
-- re-email the same assignee every day a task sits in the 1-2-day
-- window - only once per task per due-date window.
alter table public.tasks
  add column if not exists last_reminded_at timestamptz;
