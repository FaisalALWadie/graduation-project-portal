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

## Phase 7 — Meeting Logs ✅
- `components/team/meeting-logs.tsx` — one shared component, used on `/student/meetings`, `/advisor/meetings`, and composed into `/admin/teams/[teamId]`
- Either a student or the advisor can log a meeting (matches RLS: `meetings_insert_team` has no role restriction, just team scoping) — `canPost` is `true` on both those pages, `false` for admin's read-only composed view
- `lib/actions/meetings.ts`: `addMeetingLog` derives `team_id` from the caller's own profile, same pattern as `addAdvisorNote`

Verified end-to-end: student posted a meeting log, immediately visible on the advisor's Meetings tab, and correctly read-only (no post form) on admin's composed team view. Zero console errors.

## Phase 8 — Presentation Mode ✅
- `/presentation-mode` (open to admin/advisor/student) — full-screen distraction-free jury view: project title + advisor name, 3 big stat cards (completion %, total tasks, milestones approved), the Recharts distribution chart, a milestone chip strip, and a real `frappe-gantt` timeline
- Real browser Fullscreen API toggle (not just CSS) via a "Full screen" button
- Admin resolves "which team to present" via `?team=<id>` (defaults to the first team) since admin has no `team_id` of their own

Two real bugs found and fixed while polishing this (this phase got extra scrutiny per your request for visual care):
1. `frappe-gantt`'s own CSS isn't exposed as an importable subpath by its package `exports` map — vendored the file into `styles/frappe-gantt.css` instead of importing from `node_modules`.
2. The Gantt bars were anchored on `tasks.created_at`, which clusters at seed-insert-time for all 15 rows — every bar collapsed near one point far outside the visible `due_date` range, so the chart looked empty. Re-anchored bars on `due_date` with a per-status duration heuristic instead, and switched view mode from Week to Month so the whole ~8-month project span (including the Nov milestone) fits on screen without scrolling.

Verified end-to-end in a real browser: all 15 task bars + 3 milestone flags render at their correct positions and colors, zero console errors, fullscreen toggle doesn't throw.

## Phase 9 — Polish & QA ✅
- Removed 3 dead empty route folders left over from Phase 1 scaffolding (`student/kanban`, `advisor/overview`, `advisor/export` — the real pages ended up living one level up)
- Added `loading.tsx` (dashboard skeleton), `error.tsx` (dashboard + root, both with a "Try again" reset button), `global-error.tsx` (root-layout-level failures), and a custom `not-found.tsx`
- **Two real responsive bugs found and fixed** via an actual mobile-viewport (375px) Playwright audit, not just a code read-through:
  1. `NavTabs` (5 items on the advisor) had no overflow handling and forced ~19px of horizontal page overflow on mobile — added `overflow-x-auto` + `shrink-0 whitespace-nowrap` per tab.
  2. `DashboardHeader` was cramped on mobile (full title + full name + badge + button all fighting for space) — title collapses to "GPP" and the user's name hides below the `sm:` breakpoint.
  - Re-ran the audit after fixing: all of student/advisor/admin/presentation-mode now render at exactly 375px with zero overflow.
- Accessibility: audited for `<img>` without alt (none exist), icon-only buttons (all are shadcn library internals, already labeled), and clickable non-button elements — found `TaskCard`'s draggable card div had `onClick` but no keyboard handler; dnd-kit already makes it focusable (`role="button" tabIndex=0`) but a `div` doesn't fire click on Enter/Space the way a real `<button>` does, so added that explicitly.
- Full regression pass across all three roles at desktop width after all the above changes — zero console errors, verified (via actual DOM class inspection, not just a screenshot glance) that active-tab highlighting is correct.

Note: form inputs already have proper `<Label htmlFor>`/`id` pairing and inline zod error messages throughout (login, register, tasks, documents, notes, meetings, team creation) — that was true going into this phase, not new here.

## Phase 10 — Deployment prep ✅
- `README.md` rewritten from the generic create-next-app boilerplate into real project docs: setup steps, env var table (with exactly where to find each value in Supabase), the deployment checklist below, and demo credentials
- Verified clean from a cold cache: deleted `.next` entirely and reran `next build` — zero TypeScript/ESLint errors
- Verified the **production** build actually boots and serves correctly (`next start`, not just `next build`) and ran the full 3-role regression pass against it — zero console errors
- Security sweep of every tracked file for leaked secrets (API keys, access tokens, DB password) — none found; the only match was the intentionally-public demo password, which is also in the README
- Confirmed `.env.local` was never committed (only `.env.local.example`)
- Checked Supabase Auth's Site URL — still `http://localhost:3000` (expected, since nothing is deployed yet). **Action item for after your first deploy:** update Site URL + add the Vercel domain to the redirect allow list in Supabase Dashboard → Authentication → URL Configuration, and consider turning off `mailer_autoconfirm` once real email delivery is configured for use beyond the jury demo.
- No hardcoded `localhost` references anywhere in application code (only in local dev scripts, which don't ship)

**Live at:** https://graduation-project-portal.vercel.app — deployed via the Vercel CLI, all 3 env vars set on Production/Preview/Development, Supabase Auth's Site URL and redirect allow list updated to point at this domain. Verified with a real login against the live URL (not just a health check) — zero console errors.

## Phase 11 — Dark Mode, Email, AI Summary, Mind Map, Activity Feed ✅

Added as an addendum after Phase 10, slotted in as its own phase per your instruction (not inserted earlier — Phases 1–10 above are unchanged).

### Dark mode ✅
- `next-themes` (already present from shadcn init) wired up: `ThemeProvider` in the root layout with `attribute={["class", "data-theme"]}`, `defaultTheme="system"`, `enableSystem`
- Toggle button (`components/theme-toggle.tsx`, sun/moon) added to `DashboardHeader` (every dashboard route) and Presentation Mode's own header bar
- This app's Tailwind v4 setup already had a full `.dark { ... }` CSS variable palette and `@custom-variant dark (&:is(.dark *))` from shadcn's init — no theme system had to be built, just connected
- `frappe-gantt`'s vendored CSS turned out to already ship `html[data-theme=dark]` variables — setting `data-theme` alongside `class` made the Gantt chart themed correctly for free, no custom override CSS needed (the spec assumed this would be required; it wasn't, for this library version)
- Verified visually (Playwright, `colorScheme: "dark"`) across Student Kanban + Documents, Advisor Overview (chart + tasks), Admin's composed team view (roster/progress/milestones/notes/meetings/documents all in one), Presentation Mode (stat cards/chart/Gantt), and the login page — all readable, zero console errors, zero real contrast issues
- One real ESLint fixed: the newer `react-hooks/set-state-in-effect` rule flags next-themes' own documented mount-guard pattern; suppressed with a one-line justified comment rather than contorting the code

### Email notifications ⬜
Resend, triggered from server-side action code paths (not client fetch) for: task assigned, task → Review/Completed, document uploaded, milestone approved/rejected, advisor note posted.

### AI Weekly Progress Summary ✅
Per your change: **Google Gemini** instead of Anthropic. `gemini-2.0-flash` (and even `gemini-2.5-flash`) turned out to be unavailable on this API key/account - confirmed by direct testing - so used `gemini-3.6-flash`, the model Google's own 404 error explicitly pointed to and confirmed working. Also note: the key you gave, despite not matching the usual `AIza...` format, authenticated fine on the first try - that specific concern was a false alarm.

New `weekly_summaries` table (RLS: team can read, only advisor/admin can insert). `lib/actions/summary.ts` gathers real data (task status counts, overdue tasks, tasks due within 7 days, milestones, most recently updated tasks), builds a prompt, and calls Gemini server-side only (`lib/gemini.ts`). Failures (bad key, rate limit, network) are caught and surfaced as a clear error toast - never a crashed page. "Generate Summary" button on Advisor Overview and admin's composed team view; Presentation Mode shows the latest one read-only.

Verified with a real generation (not a stub): the model produced a summary correctly citing real task names, real due dates, correctly identified two genuinely-overdue tasks and seven due-this-week, and gave a specific recommendation naming actual task titles.

### Mind Map ✅
Used `@xyflow/react` (v12) rather than the `reactflow` package name specifically — React Flow's own team moved development there; `reactflow` v11 is frozen/legacy under the same authors. One per team (`teams.mindmap_data jsonb`). Same RLS problem as milestone approval: row-level RLS can't restrict edits to one column, so a `update_mindmap(team_id, data)` RPC is the only write path, checking `role = 'student'` server-side — and per your spec, this one deliberately has **no admin bypass** (admin is read-only here, unlike everywhere else in the app).

"Mind Map" tab added to both the student and advisor nav bars (not nested under an existing tab, confirming the earlier placement decision), plus composed into admin's team view — same `MindMapCanvas` component reused with `canEdit` true/false, matching every other reuse pattern in this app. Custom editable node type with an inline input + delete button; changes autosave 1s after the last edit. Demo team seeded with a real starter architecture sketch (7 modules connected to a core node, plus a few cross-dependencies) via `scripts/seed.mjs` — not a blank canvas.

Verified end-to-end: seeded content loads with the correct node count, edited a label and added a node, reloaded the page and confirmed both changes persisted in the database, and confirmed the advisor's view has no "Add node" button and its inputs are actually `readonly` in the DOM. Zero console errors.

### Live Activity Feed ✅
New `activity_log` table (RLS: team-readable/writable like `meeting_logs`, admin bypass), realtime enabled via `alter publication supabase_realtime add table activity_log`. Logged from the same server action that performs each real change (`lib/activity.ts`, best-effort — never breaks the action it's attached to) for all 6 spec'd event types: task created, task status changed, comment added, document uploaded, milestone approved/rejected, advisor note posted. Shown on Student's page (below the Kanban board), Advisor Overview, and prominently in Presentation Mode.

**Found and fixed a real bug while verifying the "two tabs" requirement**, not just assumed it worked: a plain Node script with `@supabase/supabase-js` received cross-user realtime events perfectly, but the same subscription from the browser component never fired — the channel reported `SUBSCRIBED` but silently received nothing. Root cause: `@supabase/ssr`'s browser client resolves the session from cookies asynchronously, so the component was subscribing before the realtime websocket had a JWT attached, and RLS-filtered `postgres_changes` events were being dropped with no error. Fixed by explicitly awaiting `supabase.auth.getSession()` and calling `supabase.realtime.setAuth(token)` before subscribing.

Verified with two separate real logged-in browser sessions: session A sat on Presentation Mode's Live Activity feed, session B (a different student) created a task, and the entry appeared on session A within seconds with **no page reload** — the actual "someone changes a task on one screen, it appears instantly on the presentation screen" moment the spec asked for. Zero console errors.

## Phase 11b — Performance & Notification Fixes ✅

- **Navigation speed**: `loading.tsx` only existed at the `(dashboard)` route-group level, one segment above `student/layout.tsx` and `advisor/layout.tsx`. Since those layouts stay mounted across sibling-tab navigation (Task Board → Documents, etc.), that Suspense boundary never re-triggered — clicking a tab froze the page with zero feedback for 2+ seconds, confirmed via CDP-throttled Playwright tests. Added `loading.tsx` scoped to `student/`, `advisor/`, and `admin/` so each segment transition actually shows a skeleton (confirmed: skeleton visible at 50ms post-click, vs. previously frozen).
- Cut a redundant profile/role DB round-trip that middleware ran on every single navigation (moved the "already logged in → redirect from /login" check into `redirectIfAuthenticated()`, used only by `/login` and `/register`); merged one sequential query into an existing `Promise.all` in `admin/teams/[teamId]/page.tsx`.
- **Advisor Notes "Send & Notify Team"**: explicit checkbox + button (checked by default), `addAdvisorNote` returns a real delivery outcome instead of silently swallowing errors. This surfaced the actual reason team emails weren't landing: the Resend account is in sandbox mode and can only deliver to the account owner's own address until a custom domain is verified - confirmed via a real API call, not assumed.
- **Task creation now broadcasts to the whole team** (not just the assignee): every other team member gets a "new task added" email, excluding the creator, the assignee (who gets the more specific "assigned to you" email), and the advisor (already notified on Review/Completed).

## Phase 11c — Security Audit ✅

**Server-side validation** (every mutation is a public Server Action endpoint regardless of client-side zod - a direct call bypasses the browser form entirely): audited all mutation functions. Found and fixed three real gaps - `updateMindmap` accepted `data: Json` with zero runtime shape/size check (added `mindmapDataSchema`, capped node/edge arrays), `updateTaskStatus` took a raw string with no validation (added `taskStatusSchema`), `assignToTeam`/`removeFromTeam` had no UUID format or team-exists check. Everything else already validated independently of the client.

**Rate limiting**, backed by a new `check_rate_limit()` Postgres function (one atomic UPSERT, chosen over in-memory counters since Vercel's serverless functions don't share memory across instances - an in-process counter would silently reset every cold start):
- Gemini summary generation: 1/team/5min + 20/day, checked before the API call.
- All notification emails: 30/hour/team, wired into every `sendNotificationEmail` call site so one team can't be used to spam Resend regardless of which action triggers it.
- Login/register bypass the Next.js server entirely (client talks to Supabase Auth directly) - confirmed Supabase's own platform rate limit is active (hit a 429 after ~44 rapid attempts against a live test).

## Phase 12 — Visual Polish, Assignment Notifications, My Tasks, Reminders, Search, Workload, Preview ✅

### Visual design pass ✅
Deep-blue brand palette (light + dark) replacing the default shadcn grayscale. Fixed a latent bug: `--font-sans` referenced itself (`var(--font-sans)`), so Geist Sans was imported but never actually applied - body text was silently falling back to the browser default the whole time. Added a distinct heading font (Plus Jakarta Sans) that every `CardTitle` picks up for free. Card depth (`shadow-sm`, was a flat ring with none). Brand-colored icon mark in the navbar and Presentation Mode's header. New `EmptyState` component replacing 8 bare "No X yet." lines app-wide.

### "Send & Assign" on task assignment ✅
Same explicit-notify pattern as Advisor Notes, extended to task creation and reassignment: a checkbox + "Send & Assign" button, `createTask`/`updateTask` return a real delivery outcome (`sent`/`failed`/`skipped`/`not_applicable`) surfaced via toast. `updateTask` now fetches the task's previous `assigned_to` before writing so the email only fires on an actual reassignment. Found and fixed a real bug while testing: the toast initially named the *previous* assignee instead of the new one - a client-side value derived from react-hook-form's `watch()` raced against the reassignment (exactly what React Compiler's own lint warning on `watch()` flags as unsafe). Fixed by having the server return the notified assignee's name, so the toast reflects who was actually emailed rather than a stale client snapshot.

### My Tasks filter + due-date urgency ✅
Kanban board gets a "My Tasks" / "All Team Tasks" toggle (defaults to My Tasks). New `lib/due-date.ts` classifies every non-completed task as overdue/due-soon(≤2 days)/neutral, applied consistently on Kanban cards and the advisor/admin task list (left-border accent + colored due-date text).

### Deadline reminder cron ✅
New `/api/cron/deadline-reminders`, daily via `vercel.json` crons, emails the assignee of any non-completed task due in 1-2 days. Protected by `CRON_SECRET` checked against the `Authorization` header. New `last_reminded_at` column prevents re-emailing the same task - verified live: a controlled test task got its one reminder sent and the column set, then a second run correctly excluded it. Found and fixed a real bug: `proxy.ts`'s matcher covered every route except static assets, so it was 307-redirecting the cron's unauthenticated request to `/login` before the route handler ever ran (Vercel's cron caller has no browser session) - excluded `/api/` from the matcher; confirmed page-level auth redirects are unaffected.

### Global search ✅
Postgres full-text search (generated `tsvector` columns + GIN indexes on tasks/documents/meeting_logs, not `ILIKE`) via `lib/actions/search.ts`. Debounced search bar in the navbar wherever a team context exists. Results grouped by type, each deep-linking to the actual item (tasks open their edit dialog on the Kanban board; documents/meetings scroll-to-and-highlight). Found and fixed two real bugs while wiring the deep-link: a same-route client-side navigation doesn't remount the page component, so a mount-only effect never re-fired for a second search - replaced with a value derived directly from `searchParams` on every render; and the first attempt at that fix synced the derived value into state via `setState` inside an effect body, which `react-hooks/set-state-in-effect` correctly flags - removed the state/effect entirely.

### Workload Balance ✅
Simple per-member segmented bar (To Do/In Progress/Review/Completed + open/total) on advisor's Overview and admin's composed team view.

### Inline document preview ✅
"Preview" action for PDFs/images in the Documentation Vault, opening a modal with the file embedded via a signed URL (5-minute expiry vs. download's 60s) - same team-scoped access control as downloads, just a longer-lived link. Other file types stay download-only. Verified image preview end-to-end with a real uploaded PNG (network response 200, `naturalWidth` confirms real pixel data rendered). PDF preview's access control, signed-URL generation, and DOM wiring are verified identically correct, but the actual visual PDF rendering inside the iframe couldn't be screenshotted in this headless testing environment - a real browser's built-in PDF viewer (which headless Chromium's automation build appears to lack for iframe embeds) is expected to render it normally.

## Known deviations from the original spec
- **Gantt library:** using `frappe-gantt` instead of `gantt-task-react` — the latter only declares a React 18 peer dependency and conflicts with this project's React 19.
- **RPC hardening:** `approve_milestone` returns the updated row (not `void`) and sets `search_path = public` explicitly on all `SECURITY DEFINER` functions — a Postgres best practice against search_path hijacking that the spec's snippet omitted.
- **Task action hardening:** server actions add explicit `.eq("team_id", ...)` filters and affected-row checks on top of RLS (defense-in-depth + fail loudly instead of silently no-op-ing), found by an automated security review.
