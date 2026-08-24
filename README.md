# Neatly Hotel

Hotel booking and hotel-operations application built with Next.js App Router,
TypeScript, Tailwind CSS, Prisma, and Supabase.

## Product areas

- Guest: landing page, room search, room detail, registration/login, and the booking flow.
- Admin: room/property management, customer bookings, hotel information, and chatbot setup.
- Support: chatbot with Gemini-assisted intent detection; Live Support is currently being developed.

## Local setup

Requirements: Node.js 20+ and access to the team's Supabase project.

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Install dependencies with `npm install`.
3. Generate Prisma Client with `npm run db:generate`.
4. Start the app with `npm run dev`.

For a fresh hotel database that has been approved by the team, use `npm run db:setup`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser/server Supabase clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable Supabase key. |
| `SUPABASE_SECRET_KEY` | Server-only key for trusted admin operations. Never expose it to the browser. |
| `RATE_LIMIT_SALT` | Optional secret used to hash rate-limit identities; falls back to `SUPABASE_SECRET_KEY`. |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. |
| `GEMINI_API_KEY` | Enables Gemini chatbot intent analysis. |
| `GEMINI_MODEL` | Gemini model name; defaults to `gemini-3.6-flash`. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical site URL for password-reset links. |

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local development server. |
| `npm run typecheck` | Type-check without emitting files. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. |
| `npm run format:check` | Check repository formatting. |
| `npm run db:generate` | Regenerate Prisma Client. |
| `npm run db:deploy` | Apply existing Prisma migrations. |
| `npm run db:seed` | Seed the approved sample data. |
| `npm run security:check-rate-limit` | Probe the atomic rate-limit RPC and clean up its counter. |
| `npm run security:check-live-support` | Verify read access is denied; add `-- --write-probe --ephemeral-auth` for full RLS checks. |
| `npm run security:check-support-cap` | Probe the atomic Live Support message cap and clean up its conversation. |

## Architecture

`src/app` contains only routing wrappers, layouts, pages, and route handlers.
Feature UI belongs in `src/features/<feature>/components`; shared UI is in
`src/components`. Database clients live in `src/server/db`, while server-side
data access belongs in `src/server/queries`. Query input/output types shared
between layers live in `src/types`.

Supabase tables that rely on Row Level Security (`profiles`, `staff_members`,
and chatbot admin data) must use the RLS-bound Supabase client. Prisma bypasses
RLS and is reserved for trusted server-side operations.

## Database safety

The Prisma schema is being consolidated and does not yet describe every
Supabase table. In local development, `DATABASE_URL` and the local Supabase
client may point to different databases. Do **not** run `npm run db:migrate` or
`npm run db:push` without team approval: the current schema drift can cause
Prisma to propose a destructive reset.

Use `npm run db:generate` normally. Use `npm run db:deploy` only for reviewed,
existing Prisma migrations. Supabase SQL migrations under `supabase/migrations`
are managed separately.

## Delivery checks

GitHub Actions runs type-checking, ESLint, and a production build for pull
requests and pushes to `main`. Automated tests have not been added yet; new
business logic should include tests as the test baseline is introduced.
