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

## Phase 4 — Student Experience 🟡 in progress
- ✅ Kanban board: drag-and-drop (`@dnd-kit/core`), create/edit/delete tasks, priority + due date + assignee, comments thread, optimistic UI with rollback on failure
- ✅ Task server actions hardened: explicit team scoping + affected-row checks (defense-in-depth on top of RLS), assignee-must-be-on-team validation
- ⬜ Documentation Vault (upload to Storage, version list)
- ⬜ Meeting Logs UI (schema + RLS already support it)

## Phase 5 — Advisor Experience ⬜
Read-only dashboard, Advisor Notes, milestone sign-off via RPC, PDF export.

## Phase 6 — Admin Experience ⬜
Team/user management CRUD (create team, assign advisor, add/remove students), composed read-only views reused from advisor (not duplicated).

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
