# Legacy / Dead Code — Do Not Edit

This project was originally a Next.js monolith and was later split into a **Next.js frontend** (this
repo root) + a standalone **Express backend** (`backend/`). The split left behind a full copy of the
old server-side layer that is **no longer on any runtime path**.

## Runtime path (authoritative)

```
Next.js UI (src/app, src/components)
  → src/lib/api/hooks.ts (TanStack Query)
  → src/lib/api/client.ts  (apiClient → http://localhost:5000)
  → backend/  (Express /api/v1/*)
  → backend/prisma/  (Prisma → backend/prisma/dev.db)
```

The frontend has **no** `middleware.ts`, **no** `src/app/api/**` route handlers — only `page.tsx` +
`layout.tsx`. Everything server-side runs in `backend/`.

## Dead legacy (kept only for reference — never edit, never sync)

| Path | Why it's dead |
|------|---------------|
| `prisma/` (root schema, `prisma/seed.ts`, `prisma/db/`) | Superseded by `backend/prisma/`. Not imported by any runtime code. |
| `src/lib/services/*` | Old monolith services on the **root** Prisma client. Only imported by `src/lib/middleware/auth.ts`, which is itself unused. |
| `src/lib/middleware/*` | Old Next middleware. No `middleware.ts` wires it in. |

These files still compile (they target the **root** Prisma schema, which the Warehouse→Store rename does
**not** touch), so they are left in place rather than excluded from the build. They will be deleted in the
final cleanup step (Phase 3) once the migration is complete.

**Single source of truth for all new work: `backend/`.**
Remember there are **three** live permission lists that must stay in sync:
`backend/src/config/permissions.ts`, `src/lib/constants/permissions.ts`, and the
`ALL_PERMISSIONS_BY_MODULE` map in `src/components/app/sections/roles-section.tsx`.
