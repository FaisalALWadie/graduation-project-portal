# Graduation Project Management Portal

A capstone project management portal for a student team, advisor, and admin — Kanban task board, documentation vault, meeting logs, advisor sign-off, and a full-screen Presentation Mode for the jury.

Built with Next.js (App Router, TypeScript strict), Tailwind + shadcn/ui, and Supabase (Postgres, Auth, Storage). See [PROGRESS.md](./PROGRESS.md) for what's implemented.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file and fill in your Supabase project's values (Supabase Dashboard → Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role/secret key (server-only — never expose this to the browser, never commit it) |

   The app fails fast with a clear error naming the missing variable if any of these aren't set — it never falls back to a silent placeholder.

3. Apply the database schema (requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and a personal access token from https://supabase.com/dashboard/account/tokens):

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   This runs everything in `supabase/migrations/` — tables, RLS policies, the `approve_milestone` RPC, and storage policies.

4. Seed realistic demo data (creates real Supabase Auth accounts for 1 admin, 1 advisor, 3 students):

   ```bash
   node scripts/seed.mjs
   ```

   Prints the demo login credentials when done. Safe to re-run — it skips anything already seeded.

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Verifying RLS

`node scripts/verify-rls.mjs` signs in as each seeded role and confirms the database actually enforces the intended boundaries (student can CRUD their team's tasks but not approve milestones directly, advisor is blocked from direct writes but can approve via the RPC, admin sees everything). Useful after touching any migration.

## Deploying to Vercel

1. **Push this repo to a Git provider** (GitHub, GitLab, or Bitbucket) — Vercel deploys from a Git repository.
2. **Import the project** at https://vercel.com/new and select the repo. Vercel auto-detects Next.js; no build command changes needed.
3. **Set the same three environment variables** from the table above in the Vercel project's Settings → Environment Variables (Production, and Preview if you want preview deployments to work too).
4. **Deploy.** `next build` must succeed with zero TypeScript/ESLint errors — verify locally first with `npm run build`.
5. **After the first deploy**, update Supabase so redirects and email links point at your real domain instead of `localhost:3000`:
   - Supabase Dashboard → Authentication → URL Configuration → set **Site URL** to your Vercel domain (e.g. `https://your-app.vercel.app`)
   - Add that same URL to the **Redirect URLs** allow list
6. **Auto-confirm on signup** is currently enabled on the Supabase project (Authentication → Providers → Email) so demo accounts can sign in without an email server configured. Turn this off once real email delivery (SMTP) is set up for a production audience beyond the jury demo.

## Demo credentials

Shared password for every seeded account: `GradPortal2026!`

| Role | Email |
|---|---|
| Admin | `444812573@kku.edu.sa` |
| Advisor | `advisor.alqahtani@kku.edu.sa` |
| Student | `student.alharbi@kku.edu.sa`, `student.alotaibi@kku.edu.sa`, `student.alghamdi@kku.edu.sa` |

Anyone can also self-register at `/register` (choosing Student or Advisor); new accounts land unassigned until an admin assigns them to a team from `/admin`.
