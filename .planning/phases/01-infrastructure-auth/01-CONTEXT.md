# Phase 1: Infrastructure & Auth - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the complete technical foundation: Node.js + Express API, React + Vite frontend, PostgreSQL database via Prisma ORM, Microsoft Entra ID SSO (MSAL.js SPA pattern), role-based access control (Admin / Staff) stored in the app database, config-file-seeded first Admin, and audit logging on all record mutations. The application must be deployable on Windows Server with IIS as a reverse proxy and PM2 managing the Node process.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- **D-01:** Backend — Node.js + Express
- **D-02:** Frontend — React + Vite
- **D-03:** ORM — Prisma (schema-first, code-first migrations, supports PostgreSQL)
- **D-04:** Database — PostgreSQL (free/open-source, runs on Windows Server, no licensing cost)

### MSAL Integration
- **D-05:** Auth pattern — SPA pattern: MSAL.js runs in the React frontend, handles the OAuth 2.0 PKCE flow, and obtains a JWT from Azure AD. The JWT is sent as a Bearer token to the Express API on every request. The Express backend validates the JWT (signature + claims) — no server-side session state.
- **D-06:** Token storage — sessionStorage (MSAL default; token cleared on tab close, lower XSS exposure than localStorage)

### Role Assignment
- **D-07:** Role source — roles (Admin / Staff) are stored in a local database table, not read from Azure AD groups. Azure AD handles authentication only; the app handles authorization.
- **D-08:** First Admin bootstrap — an environment variable (`BOOTSTRAP_ADMIN_EMAIL`) designates the first Admin. On the first login by a user whose Azure AD email matches that value, the system automatically grants them the Admin role.

### Audit Logging
- **D-09:** All record create, update, and delete operations must write an audit log entry to the database recording: acting user ID, affected record type and ID, action (CREATE / UPDATE / DELETE), and timestamp (UTC). This covers AUTH-03 in full.

### Deployment Target
- **D-10:** Windows Server + IIS (reverse proxy) + PM2 (Node process manager). A deployment runbook must be produced covering IIS `web.config` setup, PM2 ecosystem config, and environment variable injection.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-03 are the three requirements in scope for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria (4 criteria) define the acceptance bar

### Project Constraints
- `.planning/PROJECT.md` — Key constraints: on-premise database only, Microsoft Entra ID SSO only, web app accessible from any school browser, data residency rules

No external specs, ADRs, or design documents referenced during discussion — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns all downstream phases will follow

### Integration Points
- All downstream phases (2–5) depend on the auth middleware and Prisma client established in this phase
- Phase 2 onwards assumes the JWT validation middleware is in place as an Express middleware that populates `req.user` with the authenticated user's ID and role

</code_context>

<specifics>
## Specific Ideas

- School is already on M365 licensing — Azure AD tenant exists and will be configured by IT; the app just needs the Tenant ID and Client ID as environment variables
- 3–8 careers staff users total; no performance or scale concerns for auth
- IIS deployment on Windows Server is the school's standard; runbook verification is a Phase 1 success criterion

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Infrastructure & Auth*
*Context gathered: 2026-06-11*
