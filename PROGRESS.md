# Progress

Graduation Project Management Portal — status against the master spec.

## Phase 1 — Foundation ✅
- Next.js 16 (App Router, TS strict), Tailwind v4, shadcn/ui installed
- Supabase clients: `lib/supabase/client.ts` (browser), `server.ts` (SSR), `middleware.ts` (session refresh)
- `lib/env.ts` fails loudly with a specific message if a required env var is missing
- Route groups scaffolded: `(auth)`, `(dashboard)/{student,advisor,admin,presentation-mode}`

## Phase 2 — Database ✅
- 8 tables, 5 enums, indexes (`supabase/migrations/`)
- `get_my_role()` / `get_my_team_id()` SECURITY DEFINER helpers (avoid RLS recursion on `profiles`)
- `approve_milestone(milestone_id, new_status)` RPC — the only way to change milestone status; no direct UPDATE grant on `milestones`/`advisor_notes` for advisors
- Storage RLS on the `documents` bucket, scoped by team via `get_my_team_id()`
- Seed script (`scripts/seed.mjs`) — 1 team, 1 advisor, 3 students, 15 tasks, 3 milestones, sample documents/meeting logs/advisor notes, 3 task comments
- `scripts/verify-rls.mjs` — signs in as each role and confirms RLS actually enforces the intended boundaries

**Demo credentials** (shared password): `GradPortal2026!`
| Role | Email |
|---|---|
| Admin | 444812573@kku.edu.sa |
| Advisor (seeded) | advisor.alqahtani@kku.edu.sa |
| Student | student.alharbi@kku.edu.sa / student.alotaibi@kku.edu.sa / student.alghamdi@kku.edu.sa |

## Phase 3 — Auth & Middleware ✅
- Real login/register forms (react-hook-form + zod), no placeholders
- Register lets someone self-declare `student` or `advisor` (never `admin` — self-signup can't escalate); admin approves by assigning a team from `/admin`
- `requireRole()`/`requireProfile()` (`lib/auth/require-role.ts`) — hard per-page authorization check in every Server Component, not just middleware
- `lib/supabase/middleware.ts` — soft UX-layer redirect (wrong-role area, or auth pages while logged in)

## Phase 4 — Student Experience ✅
- Kanban board: drag-and-drop (`@dnd-kit/core`), create/edit/delete tasks, priority + due date + assignee, comments thread, optimistic UI with rollback on failure
- Task server actions hardened: explicit team scoping + affected-row checks (defense-in-depth on top of RLS), assignee-must-be-on-team validation
- Documentation Vault: upload to Storage (`lib/actions/documents.ts`), auto-incrementing version per title, signed-URL download, `/student` now has a tab nav (Task Board / Documents / Meetings)
- Fixed a real pre-existing gap: the Phase 2 seed script inserted `documents` rows pointing at storage paths that were never actually uploaded, so Download always 404'd on seed data. `scripts/seed.mjs` now uploads real placeholder files at those exact paths.

## Phase 5 — Advisor Experience ✅
- `/advisor` overview: completion %, Recharts pie chart of task status distribution, full read-only task list (`components/team/team-progress.tsx` — built reusable so Phase 6 admin composes it, doesn't duplicate it)
- `/advisor/documents`: same vault UI as students, `canUpload={false}` — reused, not rebuilt
- `/advisor/notes`: post + view weekly notes (`components/team/advisor-notes.tsx`)
- `/advisor/sign-off`: Approve/Reject buttons call the `approve_milestone` RPC, never a raw table UPDATE (`components/team/milestone-sign-off.tsx`, reusable with `canApprove` prop for Phase 6)
- PDF export: real one-page PDF via `@react-pdf/renderer`, generated and downloaded client-side
- Along the way: migrated `TaskStatusChart` off Recharts' deprecated `Cell` API (per-datum `fill` instead), and fixed a `z.coerce.number()` + react-hook-form generic mismatch (plain `z.number()` + `valueAsNumber` instead)

## Phase 6 — Admin Experience ✅
- `/admin` is now a teams list (supports multiple teams, per spec, even though the demo only uses one) + "Create team" dialog + the existing pending-accounts approval list (assign form now lets you pick which team when more than one exists)
- `/admin/teams/[teamId]` composes the **exact same** `TeamProgress`, `MilestoneSignOff` (with `canApprove`), `AdvisorNotes` (with `canPost={false}`), and `DocumentsClient` (with `canUpload={false}`) components built in Phase 5 — nothing was rebuilt, only recomposed with different prop flags
- Roster has a "Remove" button per member (`removeFromTeam` — clears `team_id`, and clears `teams.advisor_id` too if that member was the team's advisor)
- Fixed two more Base UI API differences while wiring this up: `Select`'s `onValueChange` passes `string | null` (not bare `string`), and `Button` has no `asChild`/`render` prop at all — use the exported `buttonVariants()` directly on a `<Link>` instead

Verified end-to-end: created a second team (then deleted it), approved a milestone from the admin's composed sign-off view (confirmed via DB), and ran a full register → assign → remove cycle on a throwaway account (confirmed `team_id` correctly nulled after removal). Zero console errors throughout.

## Phase 7 — Meeting Logs ⬜
CRUD, correct per-role visibility.

## Phase 8 — Presentation Mode ⬜
Full-screen jury view: completion %, status distribution chart (Recharts), Gantt timeline (`frappe-gantt` — see deviation note below).

## Phase 9 — Polish & QA ⬜
Responsive pass, loading/empty/error states everywhere, accessibility basics, full manual test pass across all three roles.

## Phase 10 — Deployment prep ⬜
Vercel checklist, env var checklist, final clean `next build`.

## Known deviations from the original spec
- **Gantt library:** using `frappe-gantt` instead of `gantt-task-react` — the latter only declares a React 18 peer dependency and conflicts with this project's React 19.
- **RPC hardening:** `approve_milestone` returns the updated row (not `void`) and sets `search_path = public` explicitly on all `SECURITY DEFINER` functions — a Postgres best practice against search_path hijacking that the spec's snippet omitted.
- **Task action hardening:** server actions add explicit `.eq("team_id", ...)` filters and affected-row checks on top of RLS (defense-in-depth + fail loudly instead of silently no-op-ing), found by an automated security review.
