# Neatly Hotel — Agent Notes

Project structure follows the team fullstack Next.js App Router convention.

## Stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- React Compiler enabled (`next.config.ts`)
- Frontend + backend in the same repo
- **Local dev:** Prisma + SQLite (`prisma/dev.db`)
- **Cloud later:** Supabase PostgreSQL (switch when features are ready)

## Database (local — Prisma)

Each teammate runs locally; no shared remote DB yet.

1. Copy `.env.example` → `.env.local`
2. One-time setup:
   ```bash
   npm install
   npm run db:setup
   ```
3. Dev server: `npm run dev`
4. Verify: `/api/rooms` → `"source": "database"`

| Script               | Purpose                     |
| -------------------- | --------------------------- |
| `npm run db:migrate` | Apply schema migrations     |
| `npm run db:seed`    | Load sample rooms (45 rows) |
| `npm run db:setup`   | migrate + seed              |

Schema: `prisma/schema.prisma`  
Queries: `src/server/queries/` (uses Prisma client from `src/server/db/`)

### Cloud phase (later)

When ready for Supabase: change `provider` in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL` to Supabase URI, run `npm run db:migrate`. Reference SQL: `src/server/db/schema.sql`.

## Folder Structure

```text
Neatly-Hotel/
├── public/                      # static assets
├── prisma/                      # Prisma schema, migrations, seed
│   ├── schema.prisma
│   ├── seed.mjs
│   ├── migrations/
│   └── dev.db                   # local SQLite (gitignored)
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

`feat/room-management-list`

- Admin sidebar layout
- Room management list page (search, table, status badges, pagination)
- Local Prisma + SQLite (`npm run db:setup`) — list loads from DB with mock fallback

Not in this branch yet: edit status, delete room, hotel information, customer search.
