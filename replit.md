# Optimax HR & Internship Management Platform

A premium, enterprise-grade HR and Internship Operations Platform for Optimax Productions. Manages interns from onboarding through certification with separate HR and Admin portals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hr-platform run dev` — run the frontend (port 19028)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- API: Express 5
- Auth: Supabase Auth (role-based: admin / hr)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/` — Drizzle table definitions (students, payments, offer_letters, certificates, hr_users)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/hr-platform/src/` — React frontend (both HR and Admin portals)

## Architecture decisions

- Two separate portal layouts under `/hr/*` and `/admin/*` routes, sharing one React app.
- Auth via Supabase — role stored in `user.user_metadata.role` (admin | hr).
- Replit PostgreSQL for structured data; Supabase used only for auth.
- PDF generation via browser `window.print()` with styled HTML templates (no external service).
- HR portal enforces a strict policy: no revenue numbers, no financial analytics — only payment status badges.

## Product

- **Login** → role-based redirect to HR portal or Admin portal
- **HR Portal**: Dashboard, Student management, Offer Letter generation, Certificate issuance, Payment tracking
- **Admin Portal**: Full analytics with revenue charts, student growth, all HR data, user management

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before using updated types.
- After lib changes: run `pnpm run typecheck:libs` so leaf packages see fresh declarations.
- Supabase credentials are stored as env vars (VITE_ prefix makes them available on the frontend).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
