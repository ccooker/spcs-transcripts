---
phase: 01-infrastructure-auth
plan: 03
slug: auth
type: execute
wave: 2
depends_on: [01-server-scaffold]
files_modified:
  - server/src/app.ts
  - server/src/middleware/auth.ts
  - server/src/middleware/requireRole.ts
  - server/src/services/user.ts
  - server/src/services/audit.ts
  - server/src/routes/auth.ts
  - server/index.ts
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03]

must_haves:
  truths:
    - "npx vitest run exits 0 — all tests from Plan 01 turn GREEN (AUTH-01, AUTH-02, AUTH-03 test cases pass)"
    - "GET /api/auth/me without Bearer token returns 401 (per D-05 stateless auth)"
    - "GET /api/auth/me with valid Bearer token returns 200 with { id, email, displayName, role } (per AUTH-01)"
    - "User record is created in PostgreSQL on first login via resolveUser (per D-07 roles in local DB)"
    - "BOOTSTRAP_ADMIN_EMAIL user receives Role.ADMIN on first login (per D-08)"
    - "requireRole(Role.ADMIN) returns 403 for Staff users (per AUTH-02)"
    - "logAudit() writes one AuditLog record with actingUserId, action, model, recordId, timestamp (per D-09, AUTH-03)"
    - "expressjwt() is configured with BOTH issuer formats (v1 and v2) to prevent Pitfall 1"
    - "server is startable: node dist/index.js listens on PORT env var"
  artifacts:
    - path: "server/src/middleware/auth.ts"
      provides: "validateJwt + resolveUser Express middleware"
      exports: ["validateJwt", "resolveUser"]
    - path: "server/src/middleware/requireRole.ts"
      provides: "requireRole factory middleware"
      exports: ["requireRole"]
    - path: "server/src/services/audit.ts"
      provides: "logAudit service function"
      exports: ["logAudit"]
    - path: "server/src/routes/auth.ts"
      provides: "GET /api/auth/me route"
    - path: "server/src/app.ts"
      provides: "Full Express application with all middleware"
      exports: ["app"]
    - path: "server/index.ts"
      provides: "Entry point calling app.listen()"
  key_links:
    - from: "server/src/app.ts"
      to: "server/src/middleware/auth.ts"
      via: "app.use('/api', validateJwt) + app.use('/api', resolveUser)"
      pattern: "app\\.use.*validateJwt"
    - from: "server/src/middleware/auth.ts"
      to: "server/src/lib/prisma.ts"
      via: "prisma.user.upsert() in resolveUser"
      pattern: "prisma\\.user\\.upsert"
    - from: "server/src/routes/auth.ts"
      to: "req.user"
      via: "Express type augmentation from types/express.d.ts"
      pattern: "req\\.user"
---

## Phase Goal

**As a** careers staff member, **I want to** sign in with my school Microsoft account and reach the SPCS Student Transcript System, **so that** I can manage student records with my role-based permissions enforced and every data operation logged.

<objective>
Implement the full Express authentication backend: JWT validation via JWKS, user upsert on first login with BOOTSTRAP_ADMIN_EMAIL role assignment, requireRole middleware, the /api/auth/me route, and the logAudit service. This plan turns the RED tests from Plan 01 GREEN and delivers the first working server-side slice.

Purpose: After this plan, `GET /api/auth/me` with a valid Bearer token returns 200 with user identity — the Walking Skeleton endpoint works end-to-end from token validation through DB lookup to JSON response. All Phase 1 automated tests pass.

Output: Complete Express auth middleware stack; full app.ts replacing Plan 01 stub; index.ts entry point; all 8 test cases passing.
</objective>

<execution_context>
@C:/@code/spcs-transcripts/.cursor/gsd-core/workflows/execute-plan.md
@C:/@code/spcs-transcripts/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
@.planning/phases/01-infrastructure-auth/01-VALIDATION.md
@.planning/phases/01-infrastructure-auth/01-SKELETON.md
@.planning/phases/01-infrastructure-auth/01-server-scaffold-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement JWT middleware (validateJwt + resolveUser), requireRole, and user service</name>
  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 3 (Express JWT Validation Middleware — BOTH issuer formats, algorithms: ['RS256']), Pattern 4 (User Resolution Middleware — preferred_username fallback chain, BOOTSTRAP_ADMIN_EMAIL logic, prisma.user.upsert), Pattern 5 (Role Guard Middleware — requireRole factory), Pitfall 1 (dual issuer formats), Pitfall 5 (preferred_username may be missing — fallback to upn, email), Anti-Patterns (export app without listen())
    - server/src/types/express.d.ts — read the req.user type augmentation (needed to understand what resolveUser must assign)
    - server/prisma/schema.prisma — read Role enum values (ADMIN, STAFF) used in requireRole and resolveUser
    - server/src/__tests__/auth.test.ts — read all 5 test cases to understand exactly what the middleware must do to make them pass
    - server/src/__tests__/helpers/makeTestToken.ts — read the token structure (HS256, preferred_username, aud, iss) to understand what resolveUser will receive in test mode
  </read_first>
  <files>
    server/src/middleware/auth.ts,
    server/src/middleware/requireRole.ts,
    server/src/services/user.ts
  </files>
  <action>
    1. **server/src/middleware/auth.ts** — implement two exports: `validateJwt` and `resolveUser`.

       `validateJwt`: When `NODE_ENV === 'test'`, use `expressjwt({ secret: process.env.TEST_JWT_SECRET || 'test-secret', algorithms: ['HS256'], issuer: [...], audience: [...] })` — this allows test tokens signed with the symmetric secret to pass validation without hitting the JWKS endpoint. When `NODE_ENV !== 'test'`, use `expressjwt({ secret: jwksRsa.expressJwtSecret({ cache: true, rateLimit: true, jwksRequestsPerMinute: 5, jwksUri: \`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys\` }) as jwksRsa.GetVerificationKey, issuer: [\`https://sts.windows.net/${TENANT_ID}/\`, \`https://login.microsoftonline.com/${TENANT_ID}/v2.0\`], audience: [\`api://${CLIENT_ID}\`], algorithms: ['RS256'] })`. CRITICAL: include BOTH issuer strings in the array — missing the v1 issuer format causes Pitfall 1 (401 for some users). Read TENANT_ID and CLIENT_ID from `process.env.AZURE_TENANT_ID` and `process.env.AZURE_CLIENT_ID`.

       `resolveUser`: async `(req, res, next)` middleware. Extract email from `req.auth?.preferred_username || req.auth?.upn || req.auth?.email`. If no email, return 401 `{ error: 'No email claim in token' }` (Pitfall 5 mitigation). Compare email (lowercased) against `process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()`. Call `prisma.user.upsert({ where: { email }, create: { email, displayName: req.auth?.name ?? email, role: isBootstrapAdmin ? Role.ADMIN : Role.STAFF }, update: { displayName: req.auth?.name ?? email, ...(isBootstrapAdmin ? { role: Role.ADMIN } : {}) } })`. Assign result to `req.user`. Call `next()`. Handle errors with `next(err)`. Import `prisma` from `../lib/prisma` and `Role` from `@prisma/client`.

    2. **server/src/middleware/requireRole.ts** — implement `requireRole` factory exactly as Pattern 5 in RESEARCH.md. Import `Role` from `@prisma/client`. Export `requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) => { if (!req.user) return res.status(401).json({ error: 'Unauthenticated' }); if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' }); next(); }`.

    3. **server/src/services/user.ts** — export `upsertUserOnLogin` as a thin wrapper (may be used in future for pre-login hooks). For Phase 1, the logic lives in `resolveUser` directly; create this file as a placeholder with an exported type `LoginClaims = { preferred_username?: string; upn?: string; email?: string; name?: string }` for use in auth.ts typing.
  </action>
  <verify>
    <automated>cd server && npx vitest run --reporter=dot src/__tests__/requireRole.test.ts 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - server/src/middleware/auth.ts exports `validateJwt` and `resolveUser`
    - server/src/middleware/auth.ts contains `NODE_ENV === 'test'` branch switching to HS256 validation
    - server/src/middleware/auth.ts contains both issuer strings in an array: `sts.windows.net` AND `login.microsoftonline.com` — Pitfall 1 prevention
    - server/src/middleware/auth.ts contains `req.auth?.preferred_username || req.auth?.upn || req.auth?.email` fallback chain — Pitfall 5 prevention
    - server/src/middleware/auth.ts contains `prisma.user.upsert` with both `create` and `update` blocks
    - server/src/middleware/auth.ts contains `BOOTSTRAP_ADMIN_EMAIL` comparison (case-insensitive via `.toLowerCase()`)
    - server/src/middleware/requireRole.ts exports `requireRole` and contains `req.user.role !== role` check returning 403
    - `cd server && npx vitest run src/__tests__/requireRole.test.ts` exits 0 (requireRole tests pass)
  </acceptance_criteria>
  <done>JWT validation middleware (both JWKS and test-mode HS256), user upsert with bootstrap admin logic, and requireRole factory implemented. requireRole tests pass GREEN.</done>
</task>

<task type="auto">
  <name>Task 2: Implement audit service, auth route, full app.ts, and index.ts entry point — make all tests GREEN</name>
  <read_first>
    - server/src/middleware/auth.ts — read validateJwt and resolveUser exports (needed for app.ts import)
    - server/src/middleware/requireRole.ts — read requireRole export (needed for app.ts admin test route and auth route protection)
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 6 (Service-Layer Audit Logging — logAudit signature, prisma.$transaction guidance), Express App Entry Point code example (app.ts structure with helmet, cors, validateJwt, resolveUser, global UnauthorizedError handler), Auth Route code example (GET /api/auth/me handler), Anti-Patterns (no nested transactions for audit), Pitfall 7 (CORS only in dev), Anti-Patterns (iisnode forbidden)
    - server/src/__tests__/audit.test.ts — read the exact field names asserted (actingUserId, action, model, recordId) to match logAudit signature
    - server/src/__tests__/auth.test.ts — read all 5 test cases including the admin-only route test to ensure app.ts adds the required test route
  </read_first>
  <files>
    server/src/services/audit.ts,
    server/src/routes/auth.ts,
    server/src/app.ts,
    server/index.ts
  </files>
  <action>
    1. **server/src/services/audit.ts** — implement `logAudit` exactly as Pattern 6 in RESEARCH.md. Export: `async function logAudit(prisma: PrismaClient, opts: { userId: string; action: AuditAction; model: string; recordId: string; details?: Record<string, unknown> }): Promise<void>`. Inside: `await prisma.auditLog.create({ data: { actingUserId: opts.userId, action: opts.action, model: opts.model, recordId: opts.recordId, details: opts.details ? JSON.stringify(opts.details) : null, timestamp: new Date() } })`. Import `PrismaClient` and `AuditAction` from `@prisma/client`. The `prisma` parameter is passed in (not imported from lib/prisma.ts) so the caller can pass a transaction client `tx` from `prisma.$transaction()` — per RESEARCH.md anti-pattern (nesting transactions is forbidden; pass `tx` explicitly).

    2. **server/src/routes/auth.ts** — create an Express Router. Add `router.get('/me', (req, res) => { res.json({ id: req.user!.id, email: req.user!.email, displayName: req.user!.displayName, role: req.user!.role }) })`. Export as default. Import `{ Router }` from `express`.

    3. **server/src/app.ts** — replace the Plan 01 stub with the full Express app per the Express App Entry Point code example in RESEARCH.md. Import and apply in order: `helmet()` (first — security headers), `express.json()`, `cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' })` (dev only — in production IIS proxies from same origin, add a `NODE_ENV !== 'production'` check). Apply `validateJwt` and `resolveUser` to all `/api` routes. Mount `authRouter` at `/api/auth`. Add global error handler for `err.name === 'UnauthorizedError'` → 401 `{ error: 'Invalid or missing token' }`. For test compatibility, also add `app.get('/api/admin/test', requireRole(Role.ADMIN), (_req, res) => res.json({ ok: true }))` — this satisfies the admin-only route test case from auth.test.ts. Export `app` without calling `app.listen()`. Load `dotenv/config` at top of file when `NODE_ENV !== 'test'`.

    4. **server/index.ts** — the only file that calls `app.listen()`. Import `app` from `./src/app`. Import `dotenv/config` at the very top. Read `const port = parseInt(process.env.PORT || '3001', 10)`. Call `app.listen(port, () => console.log(\`SPCS API listening on port ${port}\`))`.

    After writing all files, run the full test suite to confirm GREEN.
  </action>
  <verify>
    <automated>cd server && npx vitest run --reporter=verbose 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - server/src/services/audit.ts exports `logAudit` and contains `prisma.auditLog.create`
    - server/src/services/audit.ts function signature accepts `prisma: PrismaClient` as first argument (NOT imports global prisma — enables transaction client passing)
    - server/src/routes/auth.ts contains `router.get('/me'` and `req.user!.id` and `req.user!.role`
    - server/src/app.ts contains `helmet()` as the first middleware (`app.use(helmet())`)
    - server/src/app.ts contains `app.use('/api', validateJwt)` followed by `app.use('/api', resolveUser)`
    - server/src/app.ts contains `UnauthorizedError` handler returning 401
    - server/src/app.ts does NOT contain `app.listen(` — listen() is only in index.ts
    - server/index.ts contains `app.listen(port` and dotenv import
    - `cd server && npx vitest run` exits 0 — ALL tests GREEN (auth, requireRole, audit)
    - `cd server && npx vitest run --reporter=verbose 2>&1 | grep -c "✓"` returns ≥ 8 (all 8 test cases passing)
  </acceptance_criteria>
  <done>Audit service, auth route, full Express app, and entry point implemented. All RED tests from Plan 01 are now GREEN. GET /api/auth/me returns 200 with user identity. Walking Skeleton server-side slice is working.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Express → Entra ID JWKS endpoint | Public key fetch over HTTPS to validate JWT signatures |
| Client Bearer token → Express | Untrusted JWT in Authorization header crosses here |
| Express → PostgreSQL | User upsert and AuditLog write |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Tampering | JWT algorithm confusion (alg:none or HS256 swap) | mitigate | `algorithms: ['RS256']` hardcoded in expressjwt() production config — never accepts `none`; test mode HS256 branch activated only when `NODE_ENV === 'test'` |
| T-03-02 | Spoofing | Token replay (stolen JWT) | accept | sessionStorage tab-scoped (D-06); token lifetime 1 hour (Azure default); MSAL handles refresh; revocation requires Azure AD conditional access (out of scope for 3–8 staff) |
| T-03-03 | Elevation of Privilege | Role escalation via DB manipulation | mitigate | `requireRole` reads `req.user.role` populated from DB on every request via `resolveUser`; no role data trusted from client; BOOTSTRAP_ADMIN_EMAIL compare is case-insensitive |
| T-03-04 | Spoofing | CORS exploitation from non-school origin | mitigate | `cors({ origin: process.env.CORS_ORIGIN })` restricts to configured origin; disabled in production (IIS same-origin proxy) |
| T-03-05 | Repudiation | Audit log tampering or deletion | mitigate | `AuditLog` model has no UPDATE or DELETE route in Phase 1; append-only pattern enforced at application layer; DB user should not have DELETE on AuditLog in production |
| T-03-06 | Tampering | Mass assignment via req.body into Prisma | mitigate | `prisma.user.upsert` explicitly lists only `email`, `displayName`, `role` fields; never spreads `req.body` |
| T-03-07 | Information Disclosure | Token validation error details leaked to client | mitigate | Global UnauthorizedError handler returns generic `{ error: 'Invalid or missing token' }` — no internal error details exposed |
| T-03-08 | Information Disclosure | JWT Bearer header logged | mitigate | Logging uses `req.auth.sub` (opaque user ID) not the raw Authorization header; `helmet` removes X-Powered-By |
| T-03-SC | Tampering | npm/pip/cargo installs | mitigate | All packages pre-audited in RESEARCH.md; express-jwt and jwks-rsa confirmed as auth0-maintained packages with high download counts; no new package installs in this plan |
</threat_model>

<verification>
After completing both tasks:
1. `cd server && npx vitest run` → exits 0 (all tests GREEN)
2. `cd server && npx vitest run --reporter=verbose 2>&1 | grep -c "✓"` → ≥ 8
3. `cat server/src/middleware/auth.ts | grep -c "sts.windows.net"` → returns 1 (Pitfall 1 mitigated)
4. `cat server/src/middleware/auth.ts | grep "preferred_username"` → contains `|| req.auth?.upn || req.auth?.email` fallback
5. `cat server/src/app.ts | grep "app.listen"` → returns empty (listen() NOT in app.ts)
6. `cat server/src/services/audit.ts | grep "prisma.auditLog.create"` → returns the create call
7. `cd server && node -e "import('./dist/index.js')" 2>&1 | grep "listening"` → after build, server starts
</verification>

<success_criteria>
- All 8 test cases in auth.test.ts, requireRole.test.ts, and audit.test.ts pass (GREEN)
- GET /api/auth/me returns 200 with { id, email, displayName, role } for valid token
- GET /api/auth/me returns 401 without token
- BOOTSTRAP_ADMIN_EMAIL user gets Role.ADMIN on first login
- requireRole(Role.ADMIN) returns 403 for Staff users
- logAudit() writes one AuditLog record with correct fields
- Both issuer formats configured in expressjwt() (Pitfall 1 prevented)
</success_criteria>

## Artifacts This Plan Produces

| Artifact | Type | Path | Description |
|----------|------|------|-------------|
| `validateJwt` | Express middleware | `server/src/middleware/auth.ts` | JWKS-based JWT validation (RS256 prod, HS256 test); validates issuer + audience |
| `resolveUser` | Express middleware | `server/src/middleware/auth.ts` | Upserts User in DB from JWT claims; sets `req.user`; applies BOOTSTRAP_ADMIN_EMAIL → ADMIN |
| `requireRole(role)` | Middleware factory | `server/src/middleware/requireRole.ts` | Returns middleware that checks `req.user.role`; 401 if no user, 403 if role mismatch |
| `logAudit(prisma, opts)` | async service function | `server/src/services/audit.ts` | Writes one AuditLog row; accepts transaction `tx` client; called from route handlers after every mutation |
| `LoginClaims` | TypeScript type | `server/src/services/user.ts` | `{ preferred_username?, upn?, email?, name? }` — JWT claim shape for user resolution |
| `app` | Express Application | `server/src/app.ts` | Full Express app with helmet, cors, validateJwt, resolveUser, auth router, error handler; no listen() |
| `GET /api/auth/me` | HTTP endpoint | `server/src/routes/auth.ts` | Returns `{ id, email, displayName, role }` for authenticated user |
| Express server entry | Node.js entry | `server/index.ts` | Calls `app.listen(PORT)` — the only file that binds a port |

<output>
Create `.planning/phases/01-infrastructure-auth/01-auth-SUMMARY.md` when done
</output>
