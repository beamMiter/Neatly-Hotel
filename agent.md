# Neatly Hotel — Agent Notes

Project structure follows the team fullstack Next.js App Router convention.

## Stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- React Compiler enabled (`next.config.ts`)
- Frontend + backend in the same repo
- **Database:** Prisma + Supabase PostgreSQL (shared)

## Database (Supabase + Prisma)

Everyone uses the same Supabase Postgres. Existing tables (`rooms`, `room_types`, …) stay as-is. This app only **adds** `hotel_information`.

1. Copy `.env.example` → `.env.local` and set `DATABASE_URL`
2. One-time:
   ```bash
   npm install
   npm run db:setup
   ```
   (`db:setup` creates `hotel_information` if missing, then seeds hotel info. It does **not** wipe `rooms`.)

| Script               | Purpose                     |
| -------------------- | --------------------------- |
| `npm run db:deploy`  | Apply migrations on Supabase |
| `npm run db:seed`    | Load sample rooms + hotel   |
| `npm run db:setup`   | deploy + seed               |

Schema: `prisma/schema.prisma`  
Queries: `src/server/queries/` (Prisma client in `src/server/db/`)

## Folder Structure

```text
Neatly-Hotel/
├── public/                      # static assets
├── prisma/                      # Prisma schema, migrations, seed
│   ├── schema.prisma
│   ├── seed.mjs
│   ├── migrations/
│   └── dev.db                   # unused after supabase switch (gitignored)
├── src/
│   ├── app/                     # FRONTEND routes + API routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── api/                 # REST handlers (app/api/**/route.ts)
│   │   └── (admin)/             # admin UI routes
│   │       ├── layout.tsx
│   │       └── room-management/
│   │           └── page.tsx
│   ├── components/              # reusable UI
│   │   ├── ui/                  # buttons, inputs, badges (shared)
│   │   └── layout/              # sidebar, navbar, footer
│   ├── features/                # domain features
│   │   └── room-management/
│   │       └── components/
│   ├── server/                  # backend core
│   │   ├── db/                  # Prisma client export (+ cloud SQL refs)
│   │   ├── queries/             # DB queries
│   │   └── services/            # external services
│   ├── lib/                     # shared helpers
│   ├── hooks/                   # shared React hooks
│   ├── assets/                  # icons / images used in code
│   └── types/                   # shared TypeScript types
├── agent.md                     # this file
├── AGENTS.md                    # Next.js auto agent rules (do not remove)
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Path Alias

- `@/*` → `./src/*`

## Where To Put New Code

| Kind of code                           | Put it in                 |
| -------------------------------------- | ------------------------- |
| Page / route UI                        | `src/app/...`             |
| Shared layout pieces (sidebar, navbar) | `src/components/layout/`  |
| Shared small UI (button, input)        | `src/components/ui/`      |
| Feature-only UI / hooks / actions      | `src/features/<feature>/` |
| DB client / schema                     | `src/server/db/`          |
| Query functions                        | `src/server/queries/`     |
| 3rd-party integrations                 | `src/server/services/`    |
| Shared helpers                         | `src/lib/`                |
| Shared types                           | `src/types/`              |

## Current Feature Scope

Merged on `dev`: room list, edit status, delete room, hotel information.

This branch: switch Prisma from SQLite to Supabase PostgreSQL.

Not done yet: customer search rooms.
