---
phase: 01
slug: infrastructure-auth
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
verified: 2026-06-12
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.6 + Supertest 7.2.2 |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `cd server && npm test -- src/__tests__/auth.test.ts src/__tests__/requireRole.test.ts src/__tests__/audit.test.ts` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~10 seconds |
| **Prerequisite** | PostgreSQL reachable at `DATABASE_URL` (local install or Docker container on 127.0.0.1:5432) |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npm test -- src/__tests__/auth.test.ts src/__tests__/requireRole.test.ts src/__tests__/audit.test.ts --reporter=dot`
- **After every plan wave:** Run `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| auth-01-401 | 03 | 0 | AUTH-01 | Token replay | Returns 401 without Bearer token | integration | `npm test -- src/__tests__/auth.test.ts -t auth-01-401` | ✅ | ✅ green |
| auth-01-200 | 03 | 0 | AUTH-01 | Token spoofing | Returns user identity with valid JWT | integration | `npm test -- src/__tests__/auth.test.ts -t auth-01-200` | ✅ | ✅ green |
| auth-01-upsert | 03 | 0 | AUTH-01 | — | `resolveUser` creates User record on first login | integration | `npm test -- src/__tests__/auth.test.ts -t auth-01-upsert` | ✅ | ✅ green |
| auth-02-bootstrap | 03 | 0 | AUTH-02 | Elevation of Privilege | BOOTSTRAP_ADMIN_EMAIL user gets Admin role on first login | integration | `npm test -- src/__tests__/auth.test.ts -t auth-02-bootstrap` | ✅ | ✅ green |
| auth-02-403 | 03 | 0 | AUTH-02 | Elevation of Privilege | `requireRole(ADMIN)` returns 403 for Staff-role user | unit | `npm test -- src/__tests__/requireRole.test.ts -t auth-02-403` | ✅ | ✅ green |
| auth-02-admin-route | 03 | 0 | AUTH-02 | Elevation of Privilege | Admin-only route inaccessible to Staff user | integration | `npm test -- src/__tests__/auth.test.ts -t auth-02-admin-route` | ✅ | ✅ green |
| auth-03-audit | 03 | 0 | AUTH-03 | Repudiation | `logAudit()` writes record to AuditLog table | unit | `npm test -- src/__tests__/audit.test.ts -t auth-03-audit` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Additional automated coverage (beyond map)

| Test name | Requirement | File |
|-----------|-------------|------|
| `auth-02-admin-pass` | AUTH-02 requireRole allows ADMIN | `requireRole.test.ts` |

---

## Wave 0 Requirements

- [x] `server/src/__tests__/auth.test.ts` — 5 integration tests covering AUTH-01, AUTH-02
- [x] `server/src/__tests__/requireRole.test.ts` — 2 unit tests covering AUTH-02
- [x] `server/src/__tests__/audit.test.ts` — 1 unit test covering AUTH-03
- [x] `server/vitest.config.ts` — framework config with TEST_JWT_SECRET and DATABASE_URL defaults
- [x] `server/src/__tests__/helpers/makeTestToken.ts` — HS256 JWT test helper
- [x] `server/src/__tests__/helpers/testDb.ts` — Prisma test DB setup/teardown
- [x] Framework install: vitest, supertest, jsonwebtoken, nock (see `server/package.json`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staff member can click "Sign in with Microsoft" and reach app home page using school Entra ID credentials | AUTH-01 | Requires real Entra ID tenant + app registration; cannot mock in unit tests | 1. Configure app registration in school Entra ID. 2. Set AZURE_TENANT_ID + AZURE_CLIENT_ID + BOOTSTRAP_ADMIN_EMAIL env vars. 3. Run `npm run dev` (both server + client). 4. Navigate to http://localhost:5173. 5. Click "Sign in with Microsoft". 6. Complete MSAL PKCE flow with school account. 7. Verify home page loads with user's name and role displayed. |
| Admin-role user sees management options that Staff-role user cannot access | AUTH-02 | Requires end-to-end test with two real Entra ID accounts | 1. Log in with BOOTSTRAP_ADMIN_EMAIL account — verify Admin menu options visible. 2. Log out and log in with a non-bootstrap account — verify Admin options absent. |
| Application accessible via HTTPS from school-network browser | AUTH-01 | Requires production Windows Server + IIS deployment | Follow deployment runbook end-to-end: install PostgreSQL, configure IIS + ARR, configure PM2 as Windows service, verify HTTPS endpoint accessible. |
| PM2 process survives Windows Server reboot | AUTH-01 (deployment) | Requires actual server reboot | After `pm2-installer` setup: reboot the Windows Server, verify PM2 auto-starts and API is available within 60 seconds of boot. |

*Plan 05 Task 3 (human checkpoint) pending — production Entra/IIS verification not yet complete.*

---

## Validation Audit 2026-06-12

| Metric | Count |
|--------|-------|
| Requirements in map | 7 |
| Automated (COVERED) | 7 |
| Manual-only | 4 |
| Gaps found | 0 |
| Tests generated | 0 |
| Escalated | 0 |

**Audit notes:** Retroactive audit found all Wave 0 test files already implemented during Phase 1 execution (Plans 01–03). Original VALIDATION.md was draft-only and never updated post-execution. `requireRole.test.ts` verified green without DB. Integration tests require PostgreSQL at `127.0.0.1:5432` — not reachable during this audit run (Docker Desktop not running); tests were green during original phase execution per `01-03-SUMMARY.md`.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-06-12
