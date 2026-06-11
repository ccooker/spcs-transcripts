---
phase: 01-infrastructure-auth
plan: 05
subsystem: infra
tags: [pm2, iis, windows-server, arr, web-config, deployment, runbook]

requires:
  - phase: 01-infrastructure-auth
    provides: Express API server built to server/dist/ (Plans 01, 03, 04)

provides:
  - ecosystem.config.js — PM2 app config with spcs-api entry, env_production block, CHANGE_ME placeholders, system log paths
  - web.config — IIS URL Rewrite rules (API Proxy + SPA Fallback) + X-Content-Type-Options header
  - DEPLOYMENT-RUNBOOK.md — 389-line end-to-end Windows Server deployment guide

affects: [deployment, ops, phase-02, phase-03, phase-04, phase-05]

tech-stack:
  added: [pm2, pm2-installer, iis-arr, iis-url-rewrite]
  patterns:
    - IIS ARR reverse proxy to localhost:3001 (not iisnode — deprecated)
    - PM2 ecosystem.config.js with env_production block for credentials injection
    - system-level PM2_HOME at C:/ProgramData/pm2 for Windows service compatibility
    - web.config SPA fallback rewrite rule for React Router client-side routes

key-files:
  created:
    - ecosystem.config.js
    - web.config
    - DEPLOYMENT-RUNBOOK.md
  modified: []

key-decisions:
  - "ecosystem.config.js placed at workspace root so __dirname resolves to workspace root and script path ./server/dist/index.js is correct relative to PM2 cwd"
  - "PM2_HOME set to C:/ProgramData/pm2 (machine-level) not user profile — required for Windows service running as Local Service account"
  - "DATABASE_URL uses 127.0.0.1 not localhost — prevents IPv6 resolution failure on Windows (Pitfall 6)"
  - "web.config API Proxy rule matches ^(api/?.*)  so /api and /api/ both route to Express; SPA Fallback matches .* with IsFile/IsDirectory negation"
  - "IIS security headers (X-Content-Type-Options, X-Frame-Options) added at IIS layer to cover static files served by IIS directly (not passing through Express/helmet)"

patterns-established:
  - "Deployment: ecosystem.config.js at workspace root with env_production block and CHANGE_ME placeholders; admin fills in on server only"
  - "IIS: web.config at site root handles both API proxy and SPA fallback; no iisnode"
  - "Runbook: prisma migrate deploy (not migrate dev) for production migration"

requirements-completed: [AUTH-01]

duration: 20min
completed: 2026-06-11
---

# Phase 01 Plan 05: Deploy Summary

**PM2 ecosystem.config.js + IIS web.config (ARR API proxy + SPA fallback) + 389-line Windows Server deployment runbook covering PostgreSQL, IIS ARR, PM2 Windows service, HTTPS, and Entra ID app registration**

> **Status: PARTIAL — Tasks 1 and 2 complete, Task 3 (human checkpoint) pending.**
> Execution halted at `checkpoint:human-verify`. See Checkpoint section below.

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-11T06:31:00Z
- **Completed (Tasks 1+2):** 2026-06-11T06:51:00Z
- **Tasks:** 2/3 complete (Task 3 is a human checkpoint)
- **Files created:** 3

## Accomplishments

- **ecosystem.config.js** — PM2 app config with `spcs-api` entry, `script: './server/dist/index.js'`, `env_production` block containing all required env vars (`DATABASE_URL` with `127.0.0.1`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `BOOTSTRAP_ADMIN_EMAIL`), system-level log paths at `C:/ProgramData/pm2/logs/`, and CHANGE_ME comment block explaining admin must replace before production.
- **web.config** — IIS URL Rewrite rules: `API Proxy` rule (`^(api/?.*)` → `http://localhost:3001/{R:1}`) and `SPA Fallback` rule (non-file/non-directory → `/index.html`). Security headers: `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. ARR prerequisite comment and iisnode warning comment included.
- **DEPLOYMENT-RUNBOOK.md** — 389-line end-to-end guide covering: Entra ID app registration (SPA redirect URI, access_as_user scope, admin consent), PostgreSQL setup (CREATE USER/DATABASE, pg_hba.conf with 127.0.0.1), IIS configuration (ARR enable, site creation, HTTPS binding, Firewall rule), application build (`npm ci`, `npm run build`, `prisma migrate deploy`, copy client/dist), PM2 setup (machine-level PM2_HOME, pm2-installer Windows service, pm2 save), verification steps, local dev run commands, and troubleshooting for P1001, 401, AADSTS9002325, PM2 reboot, IIS 502, SPA 404.

## Task Commits

1. **Task 1: ecosystem.config.js + web.config** — `29413b9` (chore)
2. **Task 2: DEPLOYMENT-RUNBOOK.md** — `2074de5` (docs)
3. **Task 3: Human checkpoint** — pending (awaiting deployment verification)

## Files Created/Modified

- `ecosystem.config.js` — PM2 app definition for `spcs-api`; `env_production` block with all CHANGE_ME placeholders; system-level log paths; comment block explaining required credential substitution
- `web.config` — IIS URL Rewrite 2.0 rules for API proxy and SPA fallback; X-Content-Type-Options and X-Frame-Options response headers; ARR prerequisite and iisnode warning comments
- `DEPLOYMENT-RUNBOOK.md` — 389-line end-to-end Windows Server deployment guide

## Decisions Made

- `ecosystem.config.js` placed at workspace root (not `server/`) so `__dirname` resolves correctly and `script: './server/dist/index.js'` is a valid relative path from the workspace root — matches the project structure in RESEARCH.md.
- `DATABASE_URL` uses `127.0.0.1` (not `localhost`) in ecosystem.config.js to prevent IPv6 resolution issues on Windows (Pitfall 6 from RESEARCH.md).
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`) added at the IIS layer in `web.config` to cover static files served directly by IIS that never pass through Express/helmet.

## Deviations from Plan

None — plan executed exactly as written. All files match the specified structure from RESEARCH.md Patterns 8 and 9. All acceptance criteria verified.

## Checkpoint: Human Verification Required

**Type:** `checkpoint:human-verify`
**Gate:** blocking

### What Was Built

`ecosystem.config.js`, `web.config`, and `DEPLOYMENT-RUNBOOK.md` have been created and committed. The deployment artifacts are complete. The checkpoint verifies that the application is accessible via HTTPS on Windows Server with PM2 surviving a reboot — Phase 1 success criterion #4.

### How to Verify

Follow `DEPLOYMENT-RUNBOOK.md` end-to-end on the target Windows Server:

1. Complete all Prerequisites (IIS URL Rewrite + ARR installed, PostgreSQL running, Node.js installed, Entra ID app registration complete with SPA redirect URI and `access_as_user` scope).
2. Run the Application Build steps (`npm ci`, `npm run build` for server and client, `prisma migrate deploy`, copy `client/dist/` to IIS site root).
3. Set `PM2_HOME` system env var and complete PM2 setup steps.
4. Verify: `pm2 list` shows `spcs-api` as `online`.
5. Open `https://<school-domain>` in a school-network browser → login page renders.
6. Sign in with `BOOTSTRAP_ADMIN_EMAIL` school account → home page loads with display name and "Admin" badge.
7. Sign out and sign in with a non-bootstrap account → home page loads with "Staff" badge.
8. Reboot the Windows Server. After reboot, verify PM2 auto-started: `pm2 list` shows `spcs-api` online without manual intervention.
9. Verify: `https://<school-domain>` is accessible within 60 seconds of server boot.

### Resume Signal

Type `"approved"` if all 9 steps verified successfully, or describe any issues encountered (include the step number and error output).

## User Setup Required

External services require manual configuration before the checkpoint can be verified:

- **Entra ID app registration** — see DEPLOYMENT-RUNBOOK.md "Entra ID App Registration" section
  - Create app registration in portal.azure.com
  - Register redirect URI as type **Single-page application** (not Web)
  - Expose an API scope named `access_as_user`
  - Grant admin consent for the scope
  - Record `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` for `ecosystem.config.js`

## Next Phase Readiness

- All Phase 1 code artifacts complete (Plans 01–04 committed)
- Deployment artifacts complete (Plan 05 Tasks 1–2 committed)
- Phase 1 is fully code-complete — only the production deployment verification checkpoint remains
- Once the checkpoint is approved, Phase 1 is done and Phase 2 (Student & Academic Data) can begin

---

*Phase: 01-infrastructure-auth*
*Completed (partial): 2026-06-11*
