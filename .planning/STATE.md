---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
status: Ready to execute
last_updated: "2026-06-12T08:47:13.867Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session — no hunting through spreadsheets, emails, or paper.
**Current milestone:** v1.0
**Current phase:** 02

## Current Status

- Roadmap: created
- Active phase: Phase 2 (context gathered 2026-06-12 — ready for `/gsd-plan-phase 2`)
- Last action: Phase 2 discuss-phase completed — student profile, year level, list layout, and archive decisions captured in 02-CONTEXT.md

## Phase History

| Phase | Plan | Summary | Completed |
|-------|------|---------|-----------|
| 01-infrastructure-auth | 01 (server-scaffold) | Express 5 ESM server, Prisma 7 schema+migration, 8 RED tests | 2026-06-11 |
| 01-infrastructure-auth | 02 (client-scaffold) | Vite 8 + React + MSAL PKCE client, shadcn/zinc theme, Login/Home/Unauthorized pages | 2026-06-11 |
| 01-infrastructure-auth | 03 (auth) | Express JWT auth stack (HS256 test/RS256 JWKS), resolveUser upsert, requireRole, logAudit, GET /api/auth/me — all 8 tests GREEN | 2026-06-11 |
| 01-infrastructure-auth | 04 (wire) | MSAL acquireTokenSilent apiFetch client, App.tsx /api/auth/me integration, role-gated HomePage with loading skeleton | 2026-06-11 |
| 01-infrastructure-auth | 05 (deploy) | PM2 ecosystem.config.js + IIS web.config (ARR proxy + SPA fallback) + 389-line DEPLOYMENT-RUNBOOK.md; Tasks 1+2 committed; Task 3 awaiting checkpoint:human-verify | 2026-06-11 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| PDF extraction deferred to v2 | v1 requirements do not include EXT-* items; manual entry + PDF upload/storage is the v1 scope | Roadmap |
| 5-phase structure | Standard granularity; phases derived from requirement categories with natural delivery boundaries | Roadmap |
| Phase 4 independent of Phase 3 | Document management depends on student entity (Phase 2), not on records UI (Phase 3) — can be built in parallel if needed | Roadmap |
| Prisma 7 requires prisma.config.ts for datasource URL | Breaking change from Prisma 6: url removed from schema.prisma datasource block; moved to prisma.config.ts with defineConfig | 01-01 |
| Prisma 7 requires @prisma/adapter-pg for PrismaClient | PrismaClient no longer reads DATABASE_URL env var; requires explicit driver adapter (PrismaPg) | 01-01 |
| Migration SQL generated via prisma migrate diff | No PostgreSQL/Docker available in dev; used --from-empty --to-schema to generate SQL without live DB | 01-01 |
| Plan 03 auth middleware must use HS256 when NODE_ENV=test | TEST_JWT_SECRET env var activates HS256 validation in tests instead of JWKS (Assumption A4 from RESEARCH.md) | 01-01 |
| Both Azure issuer formats required in expressjwt() | Include both sts.windows.net (v1) and login.microsoftonline.com (v2) to prevent 401 for some users (Pitfall 1) | 01-03 |
| AuditLog.actingUserId requires existing User to exist first | FK constraint; test helper must create user before logAudit() call | 01-03 |
| index.ts placed at server/src/index.ts, not server/index.ts | Matches tsconfig rootDir:src and dev script `tsx watch src/index.ts` | 01-03 |
| shadcn v4 CLI requires manual component setup for Vite projects | Interactive prompts in v4 not fully suppressible; components.json, tailwind.config.js, and UI primitives created directly matching v3 format | 01-02 |
| MSAL v5.13.0 removed storeAuthStateInCookie | CacheOptions type in v5 only has cacheLocation; omitted property; sessionStorage cache still enforced | 01-02 |
| API_SCOPE derived from VITE_CLIENT_ID env var | Prevents Pitfall 2 (wrong audience) — Graph tokens rejected by Express aud validation | 01-04 |
| UserInfo type exported from App.tsx | Avoids circular dependency; HomePage imports from @/App without a separate types file | 01-04 |
| Session-expired shows 3 s alert then loginRedirect | Gives user visual feedback before redirect; 401 and network errors both treated as session-expired | 01-04 |
| ecosystem.config.js at workspace root — __dirname resolves correctly for script path ./server/dist/index.js | Placed at workspace root (not server/) so relative script path is valid from PM2 cwd | 01-05 |
| PM2_HOME set to C:/ProgramData/pm2 machine-level — required for Windows service compatibility | User-profile PM2_HOME fails when running as Local Service account; machine-level path required (Pitfall 4) | 01-05 |
| DATABASE_URL uses 127.0.0.1 not localhost in ecosystem.config.js | Prevents IPv6 resolution issues on Windows Server (Pitfall 6) | 01-05 |

### Todos

(none yet)

### Blockers

(none yet)

---
*State initialised: 2026-06-11*
*Last updated: 2026-06-12 after Phase 2 discuss-phase — context captured in 02-CONTEXT.md*
