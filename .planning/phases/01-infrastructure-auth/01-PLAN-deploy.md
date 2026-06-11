---
phase: 01-infrastructure-auth
plan: 05
slug: deploy
type: execute
wave: 4
depends_on: [01-auth]
files_modified:
  - ecosystem.config.js
  - web.config
  - DEPLOYMENT-RUNBOOK.md
autonomous: false
requirements: [AUTH-01]

user_setup:
  - service: azure-entra-id
    why: "App registration required before MSAL PKCE flow can complete"
    dashboard_config:
      - task: "Create app registration in Entra ID admin center"
        location: "portal.azure.com → Microsoft Entra ID → App registrations → New registration"
      - task: "Register redirect URI as type SPA (not Web)"
        location: "App registration → Authentication → Add a platform → Single-page application → set http://localhost:5173 (dev) and https://<school-domain> (prod)"
      - task: "Expose an API scope named access_as_user"
        location: "App registration → Expose an API → Add a scope → scope name: access_as_user"
      - task: "Grant admin consent for the API scope"
        location: "App registration → API permissions → Grant admin consent for <tenant>"
    env_vars:
      - name: AZURE_TENANT_ID
        source: "Entra ID admin center → Overview → Tenant ID"
      - name: AZURE_CLIENT_ID
        source: "App registration → Overview → Application (client) ID"
      - name: VITE_TENANT_ID
        source: "Same as AZURE_TENANT_ID"
      - name: VITE_CLIENT_ID
        source: "Same as AZURE_CLIENT_ID"

must_haves:
  truths:
    - "ecosystem.config.js defines spcs-api app pointing to server/dist/index.js with PM2_HOME: C:\\ProgramData\\pm2 set as system env var"
    - "web.config proxies /api/* to http://localhost:3001 and has SPA fallback rule for React Router"
    - "DEPLOYMENT-RUNBOOK.md covers all steps from PostgreSQL installation through IIS + ARR + URL Rewrite setup, PM2 Windows service registration, and HTTPS certificate binding"
    - "DEPLOYMENT-RUNBOOK.md contains the full-stack local dev run command (npm run dev in both server/ and client/)"
    - "Runbook explicitly warns against iisnode (deprecated) and documents ARR as the correct approach"
  artifacts:
    - path: "ecosystem.config.js"
      provides: "PM2 app configuration for Windows Server"
      contains: "spcs-api"
    - path: "web.config"
      provides: "IIS URL Rewrite rules for API proxy and SPA fallback"
      contains: "API Proxy"
    - path: "DEPLOYMENT-RUNBOOK.md"
      provides: "End-to-end deployment instructions for Windows Server"
      min_lines: 100
  key_links:
    - from: "web.config"
      to: "http://localhost:3001"
      via: "IIS ARR reverse proxy rewrite rule"
      pattern: "localhost:3001"
    - from: "ecosystem.config.js"
      to: "server/dist/index.js"
      via: "PM2 script path"
      pattern: "dist/index\\.js"
---

## Phase Goal

**As a** careers staff member, **I want to** sign in with my school Microsoft account and reach the SPCS Student Transcript System, **so that** I can manage student records with my role-based permissions enforced and every data operation logged.

<objective>
Produce the deployment artifacts (PM2 ecosystem config, IIS web.config) and a comprehensive DEPLOYMENT-RUNBOOK.md that allows the application to be deployed to and verified on Windows Server with IIS. Includes a human checkpoint for end-to-end deployment verification.

Purpose: Phase 1 success criterion #4 requires the application to be accessible via HTTPS from school-network browsers with the deployment runbook verified end-to-end. This plan delivers those artifacts.

Output: ecosystem.config.js; web.config; DEPLOYMENT-RUNBOOK.md with full Windows Server + IIS + PM2 instructions; human checkpoint to verify HTTPS access and PM2 reboot persistence.
</objective>

<execution_context>
@C:/@code/spcs-transcripts/.cursor/gsd-core/workflows/execute-plan.md
@C:/@code/spcs-transcripts/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
@.planning/phases/01-infrastructure-auth/01-SKELETON.md
@.planning/phases/01-infrastructure-auth/01-auth-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write PM2 ecosystem.config.js and IIS web.config</name>
  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 8 (IIS web.config — exact XML structure for API proxy rule, SPA fallback rule, X-Content-Type-Options header), Pattern 9 (PM2 ecosystem.config.js — apps array, env_production block, PM2_HOME system env var, pm2-installer usage), Pitfall 4 (PM2 not surviving reboot — PM2_HOME must be system-level not user-level), Anti-Patterns (iisnode is forbidden — use IIS ARR reverse proxy instead)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md — read: D-10 (Windows Server + IIS + PM2 locked decision), Specifics section (school already on Windows Server; IIS is standard)
    - server/src/app.ts — read the PORT env var usage (default 3001) to confirm web.config proxy target
  </read_first>
  <files>
    ecosystem.config.js,
    web.config
  </files>
  <action>
    1. **ecosystem.config.js** — place in the workspace root (parent of server/ and client/). Implement exactly as Pattern 9 in RESEARCH.md. The `apps` array has one entry: `name: 'spcs-api'`, `script: './server/dist/index.js'` (path relative to workspace root), `cwd: __dirname`, `instances: 1`, `exec_mode: 'fork'`. The `env_production` block must include all env vars: `NODE_ENV: 'production'`, `PORT: 3001`, `DATABASE_URL: 'postgresql://spcs:CHANGE_ME@127.0.0.1:5432/spcs_transcripts'` (127.0.0.1 per Pitfall 6), `AZURE_TENANT_ID: 'CHANGE_ME'`, `AZURE_CLIENT_ID: 'CHANGE_ME'`, `BOOTSTRAP_ADMIN_EMAIL: 'CHANGE_ME'`. Log paths: `error_file: 'C:/ProgramData/pm2/logs/spcs-api-error.log'`, `out_file: 'C:/ProgramData/pm2/logs/spcs-api-out.log'`, `log_date_format: 'YYYY-MM-DD HH:mm:ss Z'`. Add a comment block at the top explaining that all `CHANGE_ME` values must be replaced before running in production. Do NOT commit real credentials — replace before deploy.

    2. **web.config** — place in the workspace root (same folder that IIS site root points to, where the client `dist/` output will be copied). Implement exactly as Pattern 8 in RESEARCH.md. Two rewrite rules: (a) `API Proxy` — matches `^(api/?.*)`, rewrites to `http://localhost:3001/{R:1}`, stopProcessing true; (b) `SPA Fallback` — matches `.*`, conditions: REQUEST_FILENAME is not a file AND not a directory, rewrites to `/index.html`, stopProcessing true. Add `<httpProtocol><customHeaders>` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. Include XML comment: `<!-- ARR module required: IIS URL Rewrite 2.0 + Application Request Routing 3.0 must be installed -->`. Include XML comment: `<!-- Do NOT use iisnode — it is unmaintained. Use ARR reverse proxy to localhost. -->`.
  </action>
  <verify>
    <automated>node -e "require('./ecosystem.config.js'); console.log('PM2 config valid')"</automated>
  </verify>
  <acceptance_criteria>
    - ecosystem.config.js contains `name: 'spcs-api'` and `script: './server/dist/index.js'`
    - ecosystem.config.js contains `DATABASE_URL:` in env_production with `127.0.0.1` (not localhost)
    - ecosystem.config.js contains `error_file: 'C:/ProgramData/pm2/logs/` (system-wide log path, not user profile)
    - ecosystem.config.js does NOT contain real credentials (all sensitive values are `'CHANGE_ME'`)
    - web.config contains `<rule name="API Proxy"` targeting `http://localhost:3001`
    - web.config contains `<rule name="SPA Fallback"` with `/index.html` rewrite
    - web.config contains `X-Content-Type-Options` header
    - web.config contains comment warning against iisnode
    - `node -e "require('./ecosystem.config.js')"` exits 0 (valid JS)
  </acceptance_criteria>
  <done>PM2 ecosystem config and IIS web.config written with all required rules and security headers. No real credentials committed.</done>
</task>

<task type="auto">
  <name>Task 2: Write comprehensive DEPLOYMENT-RUNBOOK.md</name>
  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 9 (Windows service registration commands for pm2-installer — the `PM2_HOME` system env var PowerShell command), Pitfall 4 (PM2 reboot survival — pm2-installer or WinSW; PM2_HOME machine-level required), Pitfall 6 (pg_hba.conf for PostgreSQL on Windows), Environment Availability table (PostgreSQL not yet confirmed on production server — runbook must include install step), Open Questions section (Entra ID app registration, separate npm projects recommendation)
    - ecosystem.config.js — read the CHANGE_ME values to know what the admin must fill in
    - web.config — read the ARR comment to include in prerequisites
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md — read: D-10 (IIS + PM2 requirement), Specifics (3–8 staff, school Windows Server standard)
  </read_first>
  <files>
    DEPLOYMENT-RUNBOOK.md
  </files>
  <action>
    Create `DEPLOYMENT-RUNBOOK.md` in the workspace root. The runbook must cover every manual step required to go from a bare Windows Server to a running HTTPS application. Structure:

    ## Prerequisites Checklist
    - Windows Server 2019+ with IIS installed
    - IIS URL Rewrite Module 2.0 (download from Microsoft)
    - IIS Application Request Routing (ARR) 3.0 (download from Microsoft)
    - Node.js LTS (v22+) installed on server
    - PostgreSQL 16 installed and service running
    - SSL certificate bound to site in IIS (school-issued or Let's Encrypt)
    - Azure AD app registration completed (see user_setup in plan frontmatter)

    ## IIS Configuration
    - Step 1: Create IIS site pointing to workspace root (where web.config and client dist/ are)
    - Step 2: Enable proxy in ARR: IIS Manager → Application Request Routing Cache → Server Proxy Settings → Enable Proxy
    - Step 3: Bind HTTPS certificate to the site
    - Step 4: Verify URL Rewrite module installed (IIS Manager → Modules → UrlRewrite)

    ## PostgreSQL Setup
    - Create database user: `CREATE USER spcs WITH PASSWORD 'strong-password-here';`
    - Create database: `CREATE DATABASE spcs_transcripts OWNER spcs;`
    - Edit `pg_hba.conf` to add: `host all spcs 127.0.0.1/32 md5` (use 127.0.0.1 not hostname)
    - Restart PostgreSQL service

    ## Application Build
    - Clone/copy repository to deployment path (e.g., `C:\inetpub\spcs-transcripts\`)
    - `cd server && npm ci && npm run build` (TypeScript compile to dist/)
    - Run Prisma migrations: `cd server && npx prisma migrate deploy` (NOT `migrate dev` in production)
    - `cd client && npm ci && npm run build` (Vite build to client/dist/)
    - Copy `client/dist/` contents to IIS site root

    ## PM2 Setup
    - Set PM2_HOME as system (machine-level) environment variable — run as Administrator:
      `[System.Environment]::SetEnvironmentVariable('PM2_HOME', 'C:\ProgramData\pm2', 'Machine')`
    - Install PM2 globally: `npm install -g pm2`
    - Install pm2-installer for Windows service: `npm install -g @jessety/pm2-installer`
    - Edit `ecosystem.config.js` — replace all `CHANGE_ME` values with real credentials
    - Start app: `pm2 start ecosystem.config.js --env production`
    - Save PM2 state: `pm2 save`
    - Register as Windows service: follow pm2-installer instructions (pm2-installer creates service that runs `pm2 resurrect` at boot)
    - Verify: `pm2 list` → spcs-api shows status 'online'

    ## Environment Variables
    List all required env vars with their source (matching ecosystem.config.js CHANGE_ME values):
    - `DATABASE_URL` — PostgreSQL connection string with 127.0.0.1 and real credentials
    - `AZURE_TENANT_ID` — from Entra ID admin center → Tenant ID
    - `AZURE_CLIENT_ID` — from App registration → Application (client) ID
    - `BOOTSTRAP_ADMIN_EMAIL` — first Admin's school email address
    - `PORT` — 3001 (must match web.config proxy target)

    ## Verification Steps
    - `pm2 list` → spcs-api online
    - `curl http://localhost:3001/api/auth/me` → 401 (server responding, JWT required)
    - Open https://<school-domain> in browser → login page renders
    - Sign in with BOOTSTRAP_ADMIN_EMAIL account → home page shows Admin role

    ## Local Development (Full Stack Run Command)
    - Terminal 1: `cd server && npm run dev` (tsx watch — hot reload)
    - Terminal 2: `cd client && npm run dev` (Vite dev server at localhost:5173 — proxies /api to :3001)
    - Visit: http://localhost:5173

    ## Troubleshooting
    - `P1001: Can't reach database` → check 127.0.0.1 in DATABASE_URL; check pg_hba.conf; check PostgreSQL service running
    - `401 Invalid token` → check AZURE_TENANT_ID and AZURE_CLIENT_ID match app registration; check both issuer formats in auth middleware
    - `AADSTS9002325` → redirect URI type is "Web" not "SPA" in Entra ID app registration (Pitfall 3)
    - PM2 not starting after reboot → PM2_HOME must be machine-level env var, not user-level (Pitfall 4)
    - IIS 502 Bad Gateway → PM2 process not running; check `pm2 list`; check PORT matches 3001 in web.config proxy
  </action>
  <verify>
    <automated>test -f DEPLOYMENT-RUNBOOK.md && wc -l DEPLOYMENT-RUNBOOK.md | awk '{print ($1 >= 100) ? "OK" : "TOO_SHORT"}'</automated>
  </verify>
  <acceptance_criteria>
    - DEPLOYMENT-RUNBOOK.md exists at workspace root
    - DEPLOYMENT-RUNBOOK.md contains `## IIS Configuration` section
    - DEPLOYMENT-RUNBOOK.md contains `PM2_HOME` with the machine-level PowerShell command
    - DEPLOYMENT-RUNBOOK.md contains `prisma migrate deploy` (NOT `migrate dev`) for production
    - DEPLOYMENT-RUNBOOK.md contains `pg_hba.conf` configuration instruction
    - DEPLOYMENT-RUNBOOK.md contains `127.0.0.1` in DATABASE_URL example (not localhost — Pitfall 6)
    - DEPLOYMENT-RUNBOOK.md contains local dev run command (`npm run dev` in both server/ and client/)
    - DEPLOYMENT-RUNBOOK.md contains Troubleshooting section covering P1001, 401, and PM2 reboot issues
    - DEPLOYMENT-RUNBOOK.md does NOT mention iisnode
    - `wc -l DEPLOYMENT-RUNBOOK.md` → ≥ 100 lines
  </acceptance_criteria>
  <done>Comprehensive deployment runbook written covering all Windows Server + IIS + PM2 + PostgreSQL steps. Local dev run command documented. Troubleshooting section covers known pitfalls.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    PM2 ecosystem.config.js, IIS web.config, and DEPLOYMENT-RUNBOOK.md have been created. The server and client are built and the deployment runbook is complete. This checkpoint verifies that the application is accessible via HTTPS on Windows Server with PM2 surviving a reboot — Phase 1 success criterion #4.
  </what-built>
  <how-to-verify>
    Follow DEPLOYMENT-RUNBOOK.md end-to-end on the target Windows Server:

    1. Complete all Prerequisites (IIS URL Rewrite + ARR installed, PostgreSQL running, Node.js installed, Entra ID app registration complete with SPA redirect URI and access_as_user scope).
    2. Run the Application Build steps (npm ci, npm run build for server and client, prisma migrate deploy, copy client/dist/ to IIS site root).
    3. Set PM2_HOME system env var and run PM2 setup steps.
    4. Verify: `pm2 list` shows spcs-api as 'online'.
    5. Open `https://<school-domain>` in a school-network browser → login page renders.
    6. Sign in with BOOTSTRAP_ADMIN_EMAIL school account → home page loads with display name and "Admin" badge.
    7. Sign out and sign in with a non-bootstrap account → home page loads with "Staff" badge.
    8. Reboot the Windows Server. After reboot, verify PM2 auto-started: `pm2 list` shows spcs-api online without manual intervention.
    9. Verify: `https://<school-domain>` is accessible within 60 seconds of server boot.
  </how-to-verify>
  <resume-signal>Type "approved" if all 9 steps verified successfully, or describe any issues encountered (include the step number and error output).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Windows Server → ecosystem.config.js | PM2 reads env vars for DATABASE_URL and Azure credentials from this file |
| IIS → localhost:3001 | ARR proxy forwards external HTTPS requests to local Express HTTP — only localhost, never external |
| school network → IIS | HTTPS terminates at IIS; Express never exposed directly to network |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Information Disclosure | ecosystem.config.js credentials | mitigate | ecosystem.config.js ships with `CHANGE_ME` placeholders; admin replaces on server only; file should NOT be committed with real credentials; add `ecosystem.config.js` to .gitignore after customization if team practices warrant |
| T-05-02 | Tampering | IIS path traversal via rewrite rules | mitigate | API Proxy rule matches only `^(api/?.*)` — only /api/* forwarded to Express; all other paths served as static files from IIS directly; SPA fallback rewrites to /index.html only (not to arbitrary paths) |
| T-05-03 | Information Disclosure | Express on localhost only | mitigate | Express binds to `0.0.0.0:3001` by default but web.config and Windows Firewall should restrict :3001 to localhost only; runbook includes note to add Windows Firewall inbound rule blocking external :3001 |
| T-05-04 | Denial of Service | PM2 process crash without auto-restart | mitigate | PM2 `exec_mode: 'fork'` with default restart policy; pm2-installer ensures process restarts after server reboot |
| T-05-05 | Information Disclosure | PM2 log file location | accept | Logs at `C:/ProgramData/pm2/logs/` — system-level path accessible only to admins; application logs should not contain PII beyond user IDs |
| T-05-SC | Tampering | npm install (global pm2, pm2-installer) | mitigate | pm2@7.0.1 and @jessety/pm2-installer confirmed in RESEARCH.md Package Legitimacy Audit; PM2_HOME must be set before install per Pitfall 4 |
</threat_model>

<verification>
After Tasks 1 and 2 complete:
1. `node -e "require('./ecosystem.config.js')"` → exits 0
2. `cat ecosystem.config.js | grep CHANGE_ME` → returns ≥ 5 matches (no real credentials committed)
3. `cat web.config | grep "localhost:3001"` → returns API Proxy rule
4. `cat web.config | grep "iisnode"` → returns empty (iisnode not mentioned)
5. `wc -l DEPLOYMENT-RUNBOOK.md` → ≥ 100 lines
6. `cat DEPLOYMENT-RUNBOOK.md | grep "migrate deploy"` → returns prisma migrate deploy instruction
7. Human checkpoint: HTTPS deployment verified per how-to-verify steps
</verification>

<success_criteria>
- ecosystem.config.js has correct PM2 app config with production env vars (all CHANGE_ME placeholders)
- web.config has API proxy + SPA fallback rules + X-Content-Type-Options header
- DEPLOYMENT-RUNBOOK.md covers all steps from PostgreSQL through IIS + PM2 + HTTPS
- Human checkpoint: app accessible via HTTPS from school-network browser
- Human checkpoint: PM2 process auto-starts after Windows Server reboot
- Phase 1 success criterion #4 verified
</success_criteria>

## Artifacts This Plan Produces

| Artifact | Type | Path | Description |
|----------|------|------|-------------|
| PM2 app config | `ecosystem.config.js` | workspace root | PM2 app definition with production env vars; `CHANGE_ME` placeholders for secrets |
| IIS Rewrite rules | `web.config` | workspace root | `/api/*` → Express proxy + React SPA fallback; security response headers |
| `DEPLOYMENT-RUNBOOK.md` | Markdown doc | workspace root | End-to-end deployment guide: PostgreSQL setup, IIS ARR config, PM2 Windows service, HTTPS binding, environment variables, troubleshooting |

<output>
Create `.planning/phases/01-infrastructure-auth/01-deploy-SUMMARY.md` when done
</output>
