---
phase: 01
slug: infrastructure-auth
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-12
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser ↔ Entra ID | MSAL PKCE redirect; school Microsoft account | OAuth tokens, user identity claims |
| Browser ↔ Express API | JWT Bearer on `/api/*`; Vite proxy in dev, IIS ARR in prod | Access tokens, user profile JSON |
| Express ↔ PostgreSQL | Prisma 7 with adapter-pg | User records, AuditLog append-only |
| IIS ↔ localhost:3001 | ARR reverse proxy; external HTTPS terminates at IIS | HTTP proxied API requests |
| Dev machine ↔ npm registry | Package installs for server/client tooling | Third-party dependencies |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Tampering | npm install (server) | mitigate | Packages pre-audited in 01-RESEARCH.md Package Legitimacy Audit | closed |
| T-01-02 | Information Disclosure | server/.env | mitigate | `server/.gitignore` excludes `.env`; `.env.example` has placeholders only | closed |
| T-01-03 | Information Disclosure | TEST_JWT_SECRET | mitigate | `.env.example` warns test-only; HS256 branch gated on `NODE_ENV === 'test'` in `auth.ts:18` | closed |
| T-01-SC | Tampering | npm/pip/cargo installs | mitigate | RESEARCH.md slopcheck complete; no SLOP verdicts | closed |
| T-02-01 | Spoofing | Token storage (sessionStorage) | mitigate | `msalConfig.ts:10` — `cacheLocation: 'sessionStorage'` | closed |
| T-02-02 | Spoofing | MSAL redirectUri | mitigate | `msalConfig.ts:7` — `redirectUri: window.location.origin` | closed |
| T-02-03 | Tampering | Token scope (wrong audience) | mitigate | `msalConfig.ts:18` — `access_as_user` API scope | closed |
| T-02-04 | Elevation of Privilege | Client-side role check | accept | UX-only nav gating; server `requireRole` enforces authorization | closed |
| T-02-SC | Tampering | npm install (client) | mitigate | Official @azure/msal-* packages; RESEARCH.md audit | closed |
| T-03-01 | Tampering | JWT algorithm confusion | mitigate | `auth.ts:21,35` — `algorithms: ['HS256']` test / `['RS256']` prod | closed |
| T-03-02 | Spoofing | Token replay (stolen JWT) | accept | sessionStorage tab-scoped; 1h token lifetime; Azure CA out of scope | closed |
| T-03-03 | Elevation of Privilege | Role escalation via DB manipulation | mitigate | `requireRole.ts` reads `req.user.role` from DB via `resolveUser`; bootstrap compare case-insensitive | closed |
| T-03-04 | Spoofing | CORS exploitation | mitigate | `app.ts:15-17` — cors only when `NODE_ENV !== 'production'` | closed |
| T-03-05 | Repudiation | Audit log tampering | mitigate | `logAudit` create-only; no AuditLog API routes; append-only at app layer | closed |
| T-03-06 | Tampering | Mass assignment via req.body | mitigate | `auth.ts:60-71` — upsert lists explicit fields only | closed |
| T-03-07 | Information Disclosure | Token validation error details | mitigate | `app.ts:30-32` — generic `{ error: 'Invalid or missing token' }` | closed |
| T-03-08 | Information Disclosure | JWT Bearer header logged | mitigate | No Authorization logging in server src; `helmet()` in `app.ts:12` | closed |
| T-03-SC | Tampering | npm install | mitigate | express-jwt/jwks-rsa pre-audited in RESEARCH.md | closed |
| T-04-01 | Tampering | Token scope (wrong audience) | mitigate | `apiClient.ts:7` — `API_SCOPE` matches Express `aud` validation | closed |
| T-04-02 | Elevation of Privilege | Client-side role gate bypassed | accept | HomePage/AppShell UX only; `requireRole` server-side | closed |
| T-04-03 | Spoofing | API response data not validated | accept | `/api/auth/me` trusted server output; TypeScript `UserInfo` type | closed |
| T-04-04 | Information Disclosure | Token in Authorization header | accept | HTTPS in production (IIS TLS); localhost HTTP in dev only | closed |
| T-04-SC | Tampering | npm install | mitigate | shadcn Skeleton from official registry only | closed |
| T-05-01 | Information Disclosure | ecosystem.config.js credentials | mitigate | CHANGE_ME on DATABASE_URL password; top comment warns; real secrets not committed | closed |
| T-05-02 | Tampering | IIS path traversal via rewrite | mitigate | `web.config:23` — API rule matches `^(api/?.*)` only; SPA fallback to `/index.html` | closed |
| T-05-03 | Information Disclosure | Express on localhost only | mitigate | ARR proxy; `DEPLOYMENT-RUNBOOK.md` Step 5 firewall rule blocks external :3001 | closed |
| T-05-04 | Denial of Service | PM2 crash without restart | mitigate | `ecosystem.config.js:18` — `exec_mode: 'fork'`; runbook documents pm2-installer | closed |
| T-05-05 | Information Disclosure | PM2 log file location | accept | System-level path `C:/ProgramData/pm2/logs/`; admin-only access | closed |
| T-05-SC | Tampering | npm install (pm2) | mitigate | pm2 + @jessety/pm2-installer audited in RESEARCH.md | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-02-04, T-04-02 | Client-side `role === 'ADMIN'` hides nav links only; all authorization enforced server-side via `requireRole` middleware | security-audit | 2026-06-12 |
| AR-02 | T-03-02 | sessionStorage + 1h Azure token lifetime sufficient for 3–8 staff on school network; token revocation via Azure AD CA out of v1 scope | security-audit | 2026-06-12 |
| AR-03 | T-04-03 | `/api/auth/me` is trusted internal API; compile-time TypeScript typing sufficient at team size | security-audit | 2026-06-12 |
| AR-04 | T-04-04 | Bearer token in Authorization header is standard OAuth 2.0; TLS terminates at IIS in production | security-audit | 2026-06-12 |
| AR-05 | T-05-05 | PM2 logs at machine-level path accessible only to administrators; logs contain user IDs not PII payloads | security-audit | 2026-06-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-12 | 30 | 30 | 0 | gsd-security-auditor (orchestrator) |

### Threat Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-01-02 | `server/.gitignore:3` — `.env` excluded |
| T-01-03 | `server/.env.example:8` — TEST_JWT_SECRET comment; `auth.ts:18` |
| T-02-01 | `client/src/auth/msalConfig.ts:10` |
| T-02-03 | `client/src/auth/msalConfig.ts:18` |
| T-03-01 | `server/src/middleware/auth.ts:21,35` |
| T-03-03 | `server/src/middleware/requireRole.ts:10-11` |
| T-03-04 | `server/src/app.ts:15-17` |
| T-03-05 | `server/src/services/audit.ts:13` — create only; no audit routes |
| T-03-07 | `server/src/app.ts:30-32` |
| T-04-01 | `client/src/api/apiClient.ts:7` |
| T-05-02 | `web.config:23,35` |
| T-05-03 | `DEPLOYMENT-RUNBOOK.md:202-208` — firewall rule |
| T-05-04 | `ecosystem.config.js:18`; runbook PM2 service section |

### Unregistered Flags

None — all SUMMARY.md `## Threat Flags` sections report no new attack surface.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-12
