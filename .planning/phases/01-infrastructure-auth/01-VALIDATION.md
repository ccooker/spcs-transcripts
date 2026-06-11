---
phase: 1
slug: infrastructure-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest stable) |
| **Config file** | `server/vitest.config.ts` (Wave 0 — not yet created) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| auth-01-401 | auth | 0 | AUTH-01 | Token replay | Returns 401 without Bearer token | integration | `npx vitest run auth.test` | ❌ W0 | ⬜ pending |
| auth-01-200 | auth | 0 | AUTH-01 | Token spoofing | Returns user identity with valid JWT | integration | `npx vitest run auth.test` | ❌ W0 | ⬜ pending |
| auth-01-upsert | auth | 0 | AUTH-01 | — | `resolveUser` creates User record on first login | integration | `npx vitest run auth.test` | ❌ W0 | ⬜ pending |
| auth-02-bootstrap | auth | 0 | AUTH-02 | Elevation of Privilege | BOOTSTRAP_ADMIN_EMAIL user gets Admin role on first login | integration | `npx vitest run auth.test` | ❌ W0 | ⬜ pending |
| auth-02-403 | auth | 0 | AUTH-02 | Elevation of Privilege | `requireRole(ADMIN)` returns 403 for Staff-role user | unit | `npx vitest run requireRole.test` | ❌ W0 | ⬜ pending |
| auth-02-admin-route | auth | 0 | AUTH-02 | Elevation of Privilege | Admin-only route inaccessible to Staff user | integration | `npx vitest run auth.test` | ❌ W0 | ⬜ pending |
| auth-03-audit | audit | 0 | AUTH-03 | Repudiation | `logAudit()` writes record to AuditLog table | unit | `npx vitest run audit.test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/__tests__/auth.test.ts` — covers AUTH-01, AUTH-02
- [ ] `server/src/__tests__/requireRole.test.ts` — covers AUTH-02
- [ ] `server/src/__tests__/audit.test.ts` — covers AUTH-03
- [ ] `server/vitest.config.ts` — framework config
- [ ] `server/src/__tests__/helpers/makeTestToken.ts` — JWT test helper
- [ ] `server/src/__tests__/helpers/testDb.ts` — Prisma test DB setup/teardown
- [ ] Framework install: `npm install --save-dev vitest supertest @types/supertest jsonwebtoken nock`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staff member can click "Sign in with Microsoft" and reach app home page using school Entra ID credentials | AUTH-01 | Requires real Entra ID tenant + app registration; cannot mock in unit tests | 1. Configure app registration in school Entra ID. 2. Set AZURE_TENANT_ID + AZURE_CLIENT_ID + BOOTSTRAP_ADMIN_EMAIL env vars. 3. Run `npm run dev` (both server + client). 4. Navigate to http://localhost:5173. 5. Click "Sign in with Microsoft". 6. Complete MSAL PKCE flow with school account. 7. Verify home page loads with user's name and role displayed. |
| Admin-role user sees management options that Staff-role user cannot access | AUTH-02 | Requires end-to-end test with two real Entra ID accounts | 1. Log in with BOOTSTRAP_ADMIN_EMAIL account — verify Admin menu options visible. 2. Log out and log in with a non-bootstrap account — verify Admin options absent. |
| Application accessible via HTTPS from school-network browser | AUTH-01 | Requires production Windows Server + IIS deployment | Follow deployment runbook end-to-end: install PostgreSQL, configure IIS + ARR, configure PM2 as Windows service, verify HTTPS endpoint accessible. |
| PM2 process survives Windows Server reboot | AUTH-01 (deployment) | Requires actual server reboot | After `pm2-installer` setup: reboot the Windows Server, verify PM2 auto-starts and API is available within 60 seconds of boot. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
