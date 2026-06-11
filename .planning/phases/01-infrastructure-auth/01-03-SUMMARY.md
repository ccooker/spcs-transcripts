---
phase: 01-infrastructure-auth
plan: "03"
slug: auth
subsystem: server
tags: [auth, jwt, express, prisma, middleware, audit]
dependency_graph:
  requires: [01-01-server-scaffold]
  provides: [validateJwt, resolveUser, requireRole, logAudit, GET /api/auth/me]
  affects: [all API routes in downstream phases]
tech_stack:
  added: [express-jwt, jwks-rsa, helmet, cors]
  patterns: [JWT JWKS validation, user upsert on login, role-guard middleware, service-layer audit logging]
key_files:
  created:
    - server/src/middleware/auth.ts
    - server/src/middleware/requireRole.ts
    - server/src/services/user.ts
    - server/src/services/audit.ts
    - server/src/routes/auth.ts
    - server/src/index.ts
  modified:
    - server/src/app.ts
    - server/src/__tests__/auth.test.ts
    - server/src/__tests__/requireRole.test.ts
    - server/src/__tests__/audit.test.ts
decisions:
  - JWT test mode uses HS256 + TEST_JWT_SECRET to avoid JWKS dependency in vitest
  - Both Azure issuer formats included (sts.windows.net v1 + login.microsoftonline.com v2)
  - resolveUser reads preferred_username || upn || email (Pitfall 5 mitigation)
  - app.ts has no listen() call; listen() only in src/index.ts
  - cors middleware disabled in production (IIS same-origin proxy)
  - index.ts at server/src/index.ts (not server/index.ts) to match tsconfig rootDir:src
metrics:
  duration_minutes: 22
  completed: "2026-06-11"
  tasks_completed: 2
  files_created: 6
  files_modified: 4
requirements: [AUTH-01, AUTH-02, AUTH-03]
---

# Phase 01 Plan 03: Auth Implementation Summary

**One-liner:** Express JWT auth stack with HS256 test / RS256 JWKS prod modes, user upsert via `resolveUser`, `requireRole` factory, and `logAudit` service — all 8 RED tests turned GREEN.

## What Was Built

The complete Express authentication backend for SPCS Student Transcript System:

- **`validateJwt`** — `expressjwt()` middleware that uses HS256 + TEST_JWT_SECRET in `NODE_ENV=test` and RS256 + JWKS in production. Both Azure issuer formats included to prevent Pitfall 1.
- **`resolveUser`** — Async middleware that extracts email via `preferred_username || upn || email` fallback, upserts User in PostgreSQL, assigns `Role.ADMIN` to `BOOTSTRAP_ADMIN_EMAIL`, sets `req.user`.
- **`requireRole(role)`** — Factory returning middleware that returns 401 if no user, 403 if role mismatch.
- **`logAudit(prisma, opts)`** — Service function writing one `AuditLog` row; accepts transaction client to avoid nested transactions.
- **`GET /api/auth/me`** — Returns `{ id, email, displayName, role }` for authenticated user.
- **Full `app.ts`** — helmet → json → cors (dev only) → validateJwt → resolveUser → auth router → admin test route → UnauthorizedError handler. No `listen()`.
- **`src/index.ts`** — Entry point calling `app.listen(PORT)`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | JWT middleware, requireRole, user service | cde078c | auth.ts, requireRole.ts, services/user.ts |
| 2 | Audit service, auth route, app.ts, index.ts | 9ebe92c | audit.ts, routes/auth.ts, app.ts, index.ts |

## Test Results

```
✓ requireRole: auth-02-403 (STAFF denied ADMIN route) 
✓ requireRole: auth-02-admin-pass (ADMIN passes)
✓ audit: auth-03-audit (logAudit writes AuditLog record)
✓ auth: auth-01-401 (no token → 401)
✓ auth: auth-01-200 (valid token → 200 with identity)
✓ auth: auth-01-upsert (new user created in DB)
✓ auth: auth-02-bootstrap (admin email gets ADMIN role)
✓ auth: auth-02-admin-route (Staff gets 403 on admin route)
```
**All 8 tests GREEN. `npx vitest run` exits 0.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test import paths used wrong relative depth (`../../` → `../`)**
- **Found during:** Task 1 — first test run showed "Cannot find module" errors
- **Issue:** Tests at `server/src/__tests__/*.test.ts` used `../../middleware/...` which resolves to `server/middleware/` (two levels up from `__tests__`), but source files are at `server/src/middleware/` (one level up)
- **Fix:** Changed all test imports from `../../` to `../` for src-level modules
- **Files modified:** `auth.test.ts`, `requireRole.test.ts`, `audit.test.ts`
- **Commit:** cde078c

**2. [Rule 1 - Bug] audit.test.ts missing user creation before logAudit**
- **Found during:** Task 2 — FK constraint violation `AuditLog_actingUserId_fkey`
- **Issue:** `AuditLog.actingUserId` is a FK to `User.id`. Test passed `userId: 'test-user-id'` without creating that user first. `clearDb()` in `beforeEach` deletes all users.
- **Fix:** Added `prisma.user.create({ data: { id: 'test-user-id', ... } })` before `logAudit()` call in the test
- **Files modified:** `audit.test.ts`
- **Commit:** 9ebe92c

**3. [Rule 3 - Blocking] PostgreSQL not running on dev machine**
- **Found during:** Task 2 — first full test run: "Can't reach database server at 127.0.0.1:5432"
- **Issue:** PostgreSQL not installed or running; Docker not available
- **Fix:** Installed PostgreSQL 18.1 via `scoop install postgresql`, initialized data directory, created `spcs` user and `spcs_transcripts` database, ran `npx prisma migrate dev`
- **Files modified:** None (infrastructure fix)
- **Commit:** N/A (infrastructure)

**4. [Deviation] `server/src/index.ts` instead of `server/index.ts`**
- **Reason:** Plan specified `server/index.ts` but `tsconfig.json` has `"rootDir": "src"` and package.json dev script is `tsx watch src/index.ts`. Placing entry point in `server/src/index.ts` compiles to `dist/index.js` (matching `"main": "dist/index.js"`).

## Known Stubs

None — all plan artifacts are fully wired.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond the threat model. The admin test route (`GET /api/admin/test`) was added by Plan 01 stub and is retained in the full app.ts — it exercises `requireRole(ADMIN)` for test coverage only.

## Self-Check: PASSED

- [x] `server/src/middleware/auth.ts` — FOUND
- [x] `server/src/services/audit.ts` — FOUND  
- [x] `server/src/routes/auth.ts` — FOUND
- [x] `server/src/app.ts` — FOUND
- [x] `server/src/index.ts` — FOUND
- [x] `cde078c` — FOUND in git log
- [x] `9ebe92c` — FOUND in git log
- [x] `npx vitest run` — exits 0 (8/8 tests pass)
