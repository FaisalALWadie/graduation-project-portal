# Graduation Project Management Portal — Design

Status: Approved (2026-09-06)

## Purpose

A capstone-project management portal to be demoed live to a university jury. Three roles — admin, advisor, student — collaborate on tasks, documents, meeting logs, and milestone sign-off, culminating in a polished "Presentation Mode" screen for the live demo.

## Tech Stack

- Next.js 14+ App Router, TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js` + `@supabase/ssr`
- Recharts for analytics charts
- `gantt-task-react` for the timeline/Gantt view
- `@dnd-kit/core` for Kanban drag-and-drop
- `react-hook-form` + `zod` for forms/validation
- `@react-pdf/renderer` for PDF export
- Deploy target: Vercel (app) + Supabase Cloud (backend)

## Roles & Scope

- **Admin**: full access. Gets a dedicated `/admin` dashboard: manage teams, create a team, assign an advisor to a team, assign/remove students from a team. Reuses the advisor's read-only task/progress/document components for visibility rather than duplicating them — admin adds team/user management CRUD on top, it doesn't get separate Kanban/document UIs.
- **Advisor**: read-only across their team's tasks/files/progress. Can leave weekly Advisor Notes, approve/reject milestones (via RPC, see RLS section), and export a PDF team summary.
- **Student**: full CRUD on tasks within their team, comments, file uploads to the Documentation Vault, deadlines.

**Single-team assumption**: the schema keeps `team_id` foreign keys everywhere so nothing blocks multiple teams existing, but no UI team-switcher is built. Advisor/student dashboards resolve "my team" from the logged-in profile's `team_id` with no picker. Admin's team list naturally shows one team after seeding, but the management screen isn't hardcoded to one.

## Route Structure

```
/app
  /(auth)/login, /(auth)/register
  /(dashboard)/student/... (kanban, documents, meetings)
  /(dashboard)/advisor/... (overview, notes, sign-off, export)
  /(dashboard)/admin/... (teams, team detail, user assignment)
  /(dashboard)/presentation-mode/...
/components
  /kanban, /charts, /gantt, /forms, /ui (shadcn)
/lib
  /supabase (client.ts, server.ts, middleware.ts)
  /validations (zod schemas)
  /utils
/types
/supabase/migrations
```

Next.js middleware protects routes by role using the Supabase SSR session; unauthenticated users redirect to `/login`; authenticated users hitting a route that doesn't match their `profiles.role` are redirected to their own dashboard.

## Database Schema

Tables (as originally specified): `profiles`, `teams`, `tasks`, `task_comments`, `milestones`, `documents`, `meeting_logs`, `advisor_notes`. All as SQL migrations under `supabase/migrations/`.

## RLS Design (amended)

Four amendments adopted after design review, all required for Phase 2:

1. **No recursive profiles lookups.** Policies on `tasks`, `milestones`, `documents`, etc. must never query `profiles` directly inside their own RLS check (querying a table with RLS enabled, from within its own or another table's policy, causes infinite recursion once `profiles` also has RLS on). Instead, two `SECURITY DEFINER` helper functions are created once and reused everywhere:

   ```sql
   create function get_my_role() returns text
   language sql security definer stable
   as $$ select role from profiles where id = auth.uid() $$;

   create function get_my_team_id() returns uuid
   language sql security definer stable
   as $$ select team_id from profiles where id = auth.uid() $$;
   ```

   Every policy on every table calls these functions instead of subquerying `profiles`.

2. **Column-level restriction for advisor writes via RPC, not blanket UPDATE.** RLS is row-level only, so a blanket `UPDATE` grant on `milestones` for advisors would let them edit `title`/`due_date` too. Instead:
   - Advisors get **no direct UPDATE grant** on `milestones` or `advisor_notes` at the table level (except `advisor_notes` inserts, which are fine since advisors own the whole row there).
   - An RPC function `approve_milestone(milestone_id uuid, new_status text)` is the only way to change milestone status; it updates only `status`, `approved_by`, `approved_at`, and internally checks the caller is the assigned advisor (or admin) for that milestone's team.

3. **Milestones are seeded, not user-created.** The three milestones (Proposal, Mid-progress Review, Final Defense) are fixed, known upfront, and inserted directly by the seed script. No "create milestone" UI ships in this MVP — the only mutation path through the UI is a status change via `approve_milestone`.

4. **Explicit Storage RLS.** `storage.objects` has its own RLS, separate from the database tables. Explicit policies scope uploads/reads on the documents bucket to the uploader's `team_id`, using `get_my_team_id()` — without this, uploads could silently fail (no policy = default deny) or be open to all authenticated users (an overly permissive policy).

## Seed Data

One team with a realistic, specific project title (not "Test Project"), one advisor, three students, ~15 realistic tasks spread across all four Kanban statuses, the three fixed milestones, sample documents (report/presentation/code entries with version numbers), sample meeting logs, and sample advisor notes tied to week numbers. All content must read as believable, not placeholder ("Lorem ipsum" / "Task 1" are explicitly disallowed).

## Implementation Roadmap

Followed exactly as specified, pausing after each phase for review:

1. Foundation — project init, Tailwind + shadcn, Supabase client scaffolding, env var handling (fails with a helpful error if required env vars are missing, no invented placeholder values), folder structure.
2. Database — migrations, RLS (per amendments above), seed data. Verify by querying each table.
3. Auth & Roles — login/register, role-based middleware/redirects, session handling.
4. Student Experience — Kanban (drag-and-drop, CRUD), task comments, file upload to Documentation Vault, deadlines.
5. Advisor Experience — dashboard, Advisor Notes, Milestone Sign-off (via RPC), PDF export.
6. Meeting Logs — CRUD, visible to both roles appropriately.
7. Presentation Mode — full-screen jury view: completion %, task distribution chart, Gantt/timeline.
8. Polish & QA — responsive pass, loading/empty states, error boundaries, validation messages, accessibility basics, full manual test pass per role.
9. Deployment prep — env var checklist, `next build` clean.

## Quality Bar

`next build` must produce zero TypeScript/ESLint errors. Every Supabase query handles loading and error states in the UI. Forms validate with clear error messages. Kanban uses optimistic updates that revert on failure. After each phase, the app is run and the relevant flow is manually exercised before reporting the phase done.

## Open Item

Supabase project URL, anon key, and service role key are required before Phase 2 can run migrations against a real backend. Phase 1 proceeds without them (env var wiring will fail loudly and clearly if they're absent when actually needed).
