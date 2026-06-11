# Walking Skeleton — SPCS Student Transcript System

**Phase:** 1
**Generated:** 2026-06-11

## Capability Proven End-to-End

> A staff member clicks "Sign in with Microsoft" → MSAL PKCE flow completes in the browser → JWT Bearer token sent to Express → token validated against Azure JWKS → user upserted in PostgreSQL with role from local DB → GET /api/auth/me returns 200 with `{ id, email, displayName, role }`.

---

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | Express 5.2.1 | D-01 locked — Express; v5 chosen as latest stable (async error propagation built-in) |
| Frontend framework | React 18 + Vite 8 | D-02 locked — React + Vite |
| ORM | Prisma 7 | D-03 locked — schema-first, code-first migrations, type-safe PostgreSQL client |
| Database | PostgreSQL 16 | D-04 locked — free, on-premise, runs on Windows Server |
| Auth | MSAL.js v5 SPA (PKCE) + express-jwt v8 + jwks-rsa v4 | D-05 locked — no server-side session; frontend acquires JWT, backend validates only |
| Token storage | sessionStorage (MSAL default) | D-06 locked — cleared on tab close; lower XSS exposure than localStorage |
| Role storage | Local PostgreSQL `User` table | D-07 locked — Azure AD handles authentication only; app handles authorisation |
| First Admin | `BOOTSTRAP_ADMIN_EMAIL` environment variable | D-08 locked — first login by matching email is automatically granted Admin role |
| Audit logging | Service-layer `logAudit()` helper in Prisma transactions | D-09 locked — explicit calls from route handlers; append-only `AuditLog` table |
| Deployment target | Windows Server + IIS ARR (reverse proxy) + PM2 (process manager) | D-10 locked — school standard; IIS handles HTTPS, PM2 manages Node lifecycle |
| Directory layout | `server/` + `client/` (separate `package.json`) | No monorepo tooling needed for a 5-phase single-team project |
| Test framework | Vitest + Supertest | Native ESM support; shared Vite config; faster than Jest for this stack |
| Language | TypeScript (strict mode) in both server and client | Type safety for Prisma models, Express middleware, MSAL hooks |

---

## Stack Touched in Phase 1

- [x] **Project scaffold** — `server/` (Express + Prisma + Vitest) and `client/` (Vite + React + shadcn) with separate `package.json` files, `tsconfig.json`, and build scripts
- [x] **Routing** — `GET /api/auth/me` (backend); `/` login page, `/home` dashboard, `/unauthorized` 403 page (frontend React Router)
- [x] **Database** — Prisma `user.upsert` (WRITE on first login) + `user.findUnique` read in auth middleware; `AuditLog.create` (WRITE on every mutation)
- [x] **UI** — "Sign in with Microsoft" button triggers `msalInstance.loginRedirect()`; home page fetches `/api/auth/me` and renders `{ displayName, role }` with role-gated navigation
- [x] **Deployment** — `ecosystem.config.js` (PM2) + `web.config` (IIS ARR) + `DEPLOYMENT-RUNBOOK.md` covering PostgreSQL install, IIS ARR setup, PM2 Windows service registration, and HTTPS certificate binding; local full-stack run: `cd server && npm run dev` + `cd client && npm run dev`

---

## Out of Scope (Deferred to Later Slices)

- Student profile CRUD and directory search (Phase 2)
- Six record types: academics, activities, awards, work experience, career goals, notes (Phase 3)
- PDF document upload, storage, download, soft-delete (Phase 4)
- Narrative transcript template, draft/finalised status, school-branded PDF export (Phase 5)
- Admin branding configuration UI (Phase 5)
- Dark mode (out of v1 scope)
- PDF data extraction / OCR (v2 scope)
- Multi-school / cloud-hosted deployment (out of scope)

---

## Subsequent Slice Plan

- **Phase 2:** Student directory — create, view, edit, delete profiles; name search; year/status filters; cohort overview table (depends on Phase 1 auth middleware + Prisma client)
- **Phase 3:** Six student record types with full CRUD from a single student profile page; notes attributed to entering staff member (depends on Phase 2 Student model)
- **Phase 4:** PDF document upload to secure non-web-root storage, document list/download, soft-delete with audit trail, document type tagging (depends on Phase 2 Student model)
- **Phase 5:** Narrative transcript template auto-populated from stored records; draft/finalised status; school-branded PDF export with configurable logo (depends on Phases 3 + 4)

---

## Key Contract for Downstream Phases

Every downstream phase executor MUST read this file before planning. The following contracts are non-negotiable:

1. **`req.user`** — Express `Request` is augmented (via `server/src/types/express.d.ts`) to carry `req.user: User` (Prisma `User` model). All downstream route handlers access the acting user via `req.user.id` and `req.user.role`.
2. **`requireRole(Role.ADMIN)`** — factory middleware at `server/src/middleware/requireRole.ts`. Wrap admin-only route handlers with this.
3. **`logAudit(prisma, { userId, action, model, recordId, details? })`** — call after every create, update, or delete mutation. Import from `server/src/services/audit.ts`. `action` is `AuditAction.CREATE | UPDATE | DELETE` from `@prisma/client`.
4. **`apiFetch(path, options?)`** — all client API calls MUST go through this wrapper at `client/src/api/apiClient.ts`; it acquires a fresh Bearer token via `acquireTokenSilent` before every request.
5. **Prisma schema** — add new models to `server/prisma/schema.prisma`; run `npx prisma migrate dev --name <name>` in dev, `npx prisma migrate deploy` in production.

---

*Walking Skeleton created: 2026-06-11*
*Author: gsd-planner*
