# Phase 01: Infrastructure & Auth - Research

**Researched:** 2026-06-11
**Domain:** Node.js/Express + MSAL.js SPA + Prisma/PostgreSQL + IIS/PM2 deployment
**Confidence:** MEDIUM (all packages verified on npm registry; MSAL/Express patterns cited from Microsoft Learn official docs; deployment patterns cited from community + Microsoft Q&A)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Backend — Node.js + Express
- **D-02:** Frontend — React + Vite
- **D-03:** ORM — Prisma (schema-first, code-first migrations, supports PostgreSQL)
- **D-04:** Database — PostgreSQL (free/open-source, runs on Windows Server, no licensing cost)
- **D-05:** Auth pattern — SPA pattern: MSAL.js runs in the React frontend, handles the OAuth 2.0 PKCE flow, and obtains a JWT from Azure AD. The JWT is sent as a Bearer token to the Express API on every request. The Express backend validates the JWT (signature + claims) — no server-side session state.
- **D-06:** Token storage — sessionStorage (MSAL default; token cleared on tab close, lower XSS exposure than localStorage)
- **D-07:** Role source — roles (Admin / Staff) are stored in a local database table, not read from Azure AD groups. Azure AD handles authentication only; the app handles authorization.
- **D-08:** First Admin bootstrap — an environment variable (`BOOTSTRAP_ADMIN_EMAIL`) designates the first Admin. On the first login by a user whose Azure AD email matches that value, the system automatically grants them the Admin role.
- **D-09:** All record create, update, and delete operations must write an audit log entry to the database recording: acting user ID, affected record type and ID, action (CREATE / UPDATE / DELETE), and timestamp (UTC).
- **D-10:** Windows Server + IIS (reverse proxy) + PM2 (Node process manager). A deployment runbook must be produced covering IIS `web.config` setup, PM2 ecosystem config, and environment variable injection.

### Claude's Discretion
None declared — all key decisions were locked during discuss-phase.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Staff can log in using their Microsoft school account (Entra ID / Azure AD SSO) | MSAL.js v5 PKCE flow; `@azure/msal-browser` + `@azure/msal-react`; Entra ID app registration with SPA redirect URI |
| AUTH-02 | System enforces two roles — Admin (manage templates, delete records, manage users) and Staff (create and edit records, generate transcripts) | Express `requireRole` middleware reading `req.user.role` from local DB; BOOTSTRAP_ADMIN_EMAIL bootstrap pattern |
| AUTH-03 | All record create, update, and delete operations are logged with the acting user, the affected record, the action, and a timestamp | Service-layer `logAudit()` helper called from route handlers; `AuditLog` Prisma model |
</phase_requirements>

---

## Summary

This phase establishes the complete technical skeleton for the SPCS Student Transcript System. It is a Walking Skeleton phase — the goal is a thin, end-to-end working slice: user clicks "Sign in with Microsoft" → MSAL PKCE flow → JWT Bearer token → Express validates → role assigned from local DB → protected route returns 200.

The dominant technical challenge is the **MSAL SPA + Express JWT validation handshake**. The React frontend acquires an access token scoped to the Express API (`api://<client-id>/access_as_user`) via `acquireTokenSilent`, sends it as a Bearer token, and Express validates it by fetching the public key from Microsoft's JWKS endpoint. The Express backend never sees raw credentials — it only validates tokens. This is a stateless, sessionless architecture that aligns with the school's security posture.

A secondary challenge is **PM2 on Windows Server**, which has no built-in Windows service support. The deployment runbook must include a WinSW/NSSM wrapper to keep PM2 alive across reboots. IIS handles HTTPS termination and acts as a reverse proxy; no Node process is exposed directly to the network.

Audit logging is implemented as a **service-layer helper** (`logAudit`) called explicitly from route handlers, keeping the pattern explicit and debuggable for a small team. This is established in Phase 1 alongside the `AuditLog` Prisma model so all downstream phases inherit the pattern without additional infrastructure work.

**Primary recommendation:** Use `express-jwt` v8 + `jwks-rsa` v4 for token validation; service-layer audit logging over Prisma extensions; `pm2-installer` or WinSW for Windows service registration.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSO login flow (PKCE) | Browser / Client | — | MSAL.js runs entirely in the browser; no server-side session |
| Token storage | Browser / Client | — | sessionStorage via MSAL default cache; never touches backend |
| JWT validation | API / Backend | — | Express middleware fetches JWKS, validates signature + claims |
| User upsert on first login | API / Backend | Database / Storage | Express middleware creates/updates User record in PostgreSQL |
| Role assignment (BOOTSTRAP_ADMIN_EMAIL) | API / Backend | Database / Storage | Startup logic; env var compared to `preferred_username` claim |
| Role enforcement | API / Backend | — | `requireRole` middleware reads `req.user.role` from DB lookup |
| Audit logging | API / Backend | Database / Storage | Service-layer writes to `AuditLog` table in same DB transaction |
| Static frontend serving | CDN / Static | API / Backend | IIS serves Vite build output from `dist/`; Express serves API only |
| HTTPS termination | CDN / Static | — | IIS handles TLS; Express listens on HTTP on localhost only |
| Process management | API / Backend | — | PM2 manages Node process lifecycle; IIS ARR proxies inbound traffic |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@azure/msal-browser` | 5.13.0 | PKCE OAuth2 flow, token acquisition + storage | Official Microsoft MSAL library; only supported PKCE SPA client [CITED: learn.microsoft.com/en-us/entra/msal/javascript] |
| `@azure/msal-react` | 5.4.4 | React context wrapper for msal-browser | Official React integration; `MsalProvider`, `useMsal`, `AuthenticatedTemplate` hooks [CITED: learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started] |
| `express` | 5.2.1 | HTTP server / API framework | Locked decision D-01; 107M/wk downloads [VERIFIED: npm registry] |
| `express-jwt` | 8.5.1 | JWT Bearer token validation middleware | Pairs with jwks-rsa; maintained by auth0; 730k/wk [VERIFIED: npm registry] |
| `jwks-rsa` | 4.0.1 | JWKS endpoint key fetching + caching | Standard for Azure AD token validation in Node.js; 15M/wk [VERIFIED: npm registry] |
| `prisma` | 7.8.0 | CLI + Prisma Migrate tooling | Locked decision D-03; 12.4M/wk [VERIFIED: npm registry] |
| `@prisma/client` | 7.8.0 | Generated type-safe DB client | Locked decision D-03; 11.1M/wk [VERIFIED: npm registry] |
| `vite` | 8.0.16 | React SPA build tool | Locked decision D-02; 129M/wk [VERIFIED: npm registry] |
| `pm2` | 7.0.1 | Node process manager | Locked decision D-10; 3.1M/wk [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cors` | 2.8.6 | CORS headers for SPA → API requests | Required when frontend and API are on different origins during dev |
| `helmet` | 8.2.0 | Security headers (CSP, HSTS, X-Frame-Options) | Always — set it as first middleware in Express |
| `dotenv` | 17.4.2 | Env variable loading from `.env` file | Dev and PM2 ecosystem; production injects env via PM2 or IIS |
| `jsonwebtoken` | 9.0.3 | JWT signing for test helpers | Test environment only — sign test tokens to bypass JWKS |
| `nock` | 14.0.15 | HTTP mock for JWKS endpoint in tests | Test environment — intercept JWKS calls to validate auth middleware |
| `vitest` | Latest stable | Test runner (same config as Vite) | Recommended over Jest for Vite-based projects; native ESM |
| `supertest` | 7.2.2 | HTTP assertion for Express routes | Integration tests of auth middleware + protected routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `express-jwt` + `jwks-rsa` | `passport` + `passport-jwt` + `jwks-rsa` | Passport adds unnecessary abstraction for a simple API; direct express-jwt is cleaner |
| `express-jwt` + `jwks-rsa` | `@azure/msal-node` (confidential client) | msal-node is for confidential clients (with client secret); SPA doesn't use it — frontend acquires token, backend only validates |
| Prisma extensions (`$extends`) for audit | Service-layer `logAudit()` helper | Prisma extensions require `AsyncLocalStorage` for user ID propagation and have transaction boundary issues; explicit service calls are simpler for this team size [ASSUMED] |
| `vitest` | `jest` | Both work; vitest shares Vite config and is faster for ESM; use vitest since frontend already uses Vite |

**Installation:**
```bash
# Server
npm install express express-jwt jwks-rsa prisma @prisma/client cors helmet dotenv
npm install --save-dev vitest supertest @types/supertest jsonwebtoken nock

# Client
npm install @azure/msal-browser @azure/msal-react react react-dom
npm install --save-dev vite @vitejs/plugin-react
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@azure/msal-browser` | npm | ~6 yrs (Jan 2020) | N/A (scoped pkg) | github.com/AzureAD/microsoft-authentication-library-for-js | SUS* | Approved — official Microsoft package; `npm view` confirms AzureAD org homepage |
| `@azure/msal-react` | npm | ~6 yrs (Nov 2020) | N/A (scoped pkg) | github.com/AzureAD/microsoft-authentication-library-for-js | SUS* | Approved — official Microsoft package; `npm view` confirms AzureAD org |
| `jwks-rsa` | npm | ~9 yrs | 14.9M/wk | github.com/auth0/node-jwks-rsa | OK | Approved |
| `express-jwt` | npm | ~12 yrs | 730k/wk | github.com/auth0/express-jwt | OK | Approved |
| `jsonwebtoken` | npm | ~12 yrs | 45M/wk | github.com/auth0/node-jsonwebtoken | OK | Approved |
| `prisma` | npm | ~5 yrs | 12.4M/wk | github.com/prisma/prisma | OK | Approved |
| `@prisma/client` | npm | ~5 yrs | 11.1M/wk | github.com/prisma/prisma | OK | Approved |
| `express` | npm | ~14 yrs | 107M/wk | github.com/expressjs/express | OK | Approved |
| `vite` | npm | ~5 yrs | 129M/wk | github.com/vitejs/vite | SUS† | Approved — false positive; recent minor release triggered "too-new" flag |
| `supertest` | npm | ~11 yrs | 14.4M/wk | github.com/ladjs/supertest | OK | Approved |
| `pm2` | npm | ~11 yrs | 3.1M/wk | github.com/Unitech/pm2 | OK | Approved |
| `vitest` | npm | ~3 yrs | 64.6M/wk | github.com/vitest-dev/vitest | SUS† | Approved — false positive; recent minor release triggered "too-new" flag |
| `cors` | npm | ~11 yrs | 56.9M/wk | github.com/expressjs/cors | OK | Approved |
| `helmet` | npm | ~12 yrs | 11.4M/wk | github.com/helmetjs/helmet | SUS† | Approved — false positive; recent minor release triggered "too-new" flag |
| `dotenv` | npm | ~10 yrs | 137.7M/wk | github.com/motdotla/dotenv | OK | Approved |
| `nock` | npm | ~12 yrs | 6.7M/wk | github.com/nock/nock | OK | Approved |

**\* SUS note:** The legitimacy tool cannot resolve download counts for `@azure/*` scoped packages. Both are confirmed official Microsoft packages via `npm view` (homepage: `github.com/AzureAD/microsoft-authentication-library-for-js`, created 2020). Proceed as approved.

**† SUS false positive:** `vite`, `vitest`, `helmet` flagged "too-new" because a minor version was published recently. All are long-standing packages with massive download counts.

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious SUS:** `@azure/msal-browser`, `@azure/msal-react` — legitimacy tool limitation, not actual suspicion. Both confirmed official Microsoft MSAL packages. No human checkpoint required.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  School Network                                         │
│                                                         │
│  ┌──────────┐   HTTPS    ┌──────────┐   HTTP(local)    │
│  │ Browser  │──────────► │   IIS    │──────────────────►│
│  │(React SPA│            │(ARR      │         │        │
│  │+ MSAL.js)│◄─────────── │ Reverse  │◄────────┘        │
│  └──────────┘  static+API │ Proxy)   │    ┌────────────┐│
│       │                  └──────────┘    │  Express   ││
│       │ PKCE redirect                    │  (PM2)     ││
│       │                                  │  :3001     ││
│       ▼                                  └────────────┘│
│  ┌────────────────┐                           │        │
│  │ Microsoft      │                           │ Prisma │
│  │ Entra ID       │                           ▼        │
│  │ (external)     │                    ┌────────────┐  │
│  │                │◄── JWKS endpoint   │ PostgreSQL │  │
│  │ Auth Code+PKCE │    (key fetch)     │ (on-prem)  │  │
│  └────────────────┘                    └────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘

Flow:
1. Browser → Entra ID: loginRedirect (PKCE challenge)
2. Entra ID → Browser: authorization code
3. Browser → Entra ID: code exchange (PKCE verifier) → access token (JWT)
4. Browser → IIS → Express: GET /api/auth/me  Authorization: Bearer <JWT>
5. Express → Entra ID JWKS: fetch public key (cached)
6. Express → PostgreSQL: lookup/upsert User, check BOOTSTRAP_ADMIN_EMAIL
7. Express → Browser: { id, email, role }
8. Browser: renders role-appropriate UI
```

### Recommended Project Structure
```
spcs-transcripts/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # data model
│   │   └── migrations/          # generated migration SQL
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts        # PrismaClient singleton (module-level)
│   │   ├── middleware/
│   │   │   ├── auth.ts          # expressjwt() + JWKS config
│   │   │   └── requireRole.ts   # (role: Role) => RequestHandler
│   │   ├── routes/
│   │   │   └── auth.ts          # GET /api/auth/me
│   │   ├── services/
│   │   │   ├── user.ts          # upsertUserOnLogin()
│   │   │   └── audit.ts         # logAudit()
│   │   ├── types/
│   │   │   └── express.d.ts     # augment req.user type
│   │   └── app.ts               # Express app (no listen())
│   ├── index.ts                 # app.listen() entry point
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── auth/
│   │   │   └── msalConfig.ts    # PublicClientApplication config
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── api/
│   │   │   └── apiClient.ts     # fetch wrapper with acquireTokenSilent
│   │   ├── pages/
│   │   │   └── HomePage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx             # MsalProvider wraps App
│   ├── index.html
│   └── vite.config.ts
├── ecosystem.config.js          # PM2 config
└── web.config                   # IIS reverse proxy rules
```

### Pattern 1: MSAL React Initialization

**What:** Initialize `PublicClientApplication` once, outside component tree, pass to `MsalProvider`.
**When to use:** Always — re-instantiation inside components causes redirect loop bugs.

```typescript
// Source: learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started
// client/src/auth/msalConfig.ts
import { PublicClientApplication, Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',  // D-06: sessionStorage
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

```tsx
// client/src/main.tsx
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './auth/msalConfig';

root.render(
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
);
```

### Pattern 2: Token Acquisition and API Call

**What:** `acquireTokenSilent` with API-specific scope; fallback to popup on `InteractionRequiredAuthError`.
**When to use:** Every protected API call.

```typescript
// Source: learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token
// client/src/api/apiClient.ts
import { msalInstance } from '../auth/msalConfig';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

const API_SCOPE = `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`;

export async function apiFetch(path: string, options?: RequestInit) {
  const account = msalInstance.getActiveAccount();
  if (!account) throw new Error('No active account');

  let tokenResponse;
  try {
    tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: [API_SCOPE],
      account,
    });
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      // Trigger interactive login; page will reload after redirect
      await msalInstance.acquireTokenRedirect({ scopes: [API_SCOPE] });
      return;
    }
    throw e;
  }

  return fetch(`/api${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${tokenResponse.accessToken}`,
    },
  });
}
```

### Pattern 3: Express JWT Validation Middleware

**What:** `expressjwt()` validates JWT signature via JWKS; sets `req.auth` with decoded claims.
**When to use:** Applied globally to all `/api/*` routes except public endpoints.

```typescript
// Source: github.com/AzureAD/microsoft-identity-web/discussions/2405
// server/src/middleware/auth.ts
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const TENANT_ID = process.env.AZURE_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_CLIENT_ID!;

export const validateJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  }) as jwksRsa.GetVerificationKey,
  // Accept both v1 and v2 token formats
  issuer: [
    `https://sts.windows.net/${TENANT_ID}/`,
    `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  ],
  audience: [`api://${CLIENT_ID}`],
  algorithms: ['RS256'],
});
```

### Pattern 4: User Resolution Middleware (Local DB Lookup)

**What:** After JWT validation, look up or create User in DB; check BOOTSTRAP_ADMIN_EMAIL.
**When to use:** Applied to all protected routes after `validateJwt`.

```typescript
// server/src/middleware/auth.ts (continued)
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export async function resolveUser(req: Request, res: Response, next: NextFunction) {
  const email: string = req.auth?.preferred_username || req.auth?.upn || req.auth?.email;
  if (!email) return res.status(401).json({ error: 'No email claim in token' });

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const isBootstrapAdmin = bootstrapEmail && email.toLowerCase() === bootstrapEmail;

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName: req.auth?.name ?? email,
      role: isBootstrapAdmin ? Role.ADMIN : Role.STAFF,
    },
    update: {
      displayName: req.auth?.name ?? email,
      // Only upgrade to ADMIN if bootstrap email matches; never downgrade
      ...(isBootstrapAdmin ? { role: Role.ADMIN } : {}),
    },
  });

  req.user = user;
  next();
}
```

### Pattern 5: Role Guard Middleware

**What:** Factory function returning an Express middleware that checks `req.user.role`.
**When to use:** Wrap admin-only routes.

```typescript
// server/src/middleware/requireRole.ts
import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: Role) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return _res.status(401).json({ error: 'Unauthenticated' });
    if (req.user.role !== role) return _res.status(403).json({ error: 'Forbidden' });
    next();
  };

// Usage: router.delete('/user/:id', requireRole(Role.ADMIN), deleteUserHandler)
```

### Pattern 6: Service-Layer Audit Logging

**What:** Explicit `logAudit()` call in route handlers after any mutation.
**When to use:** After every create, update, or delete DB operation throughout all phases.

```typescript
// server/src/services/audit.ts
import { PrismaClient, AuditAction } from '@prisma/client';

export async function logAudit(
  prisma: PrismaClient,
  opts: {
    userId: string;
    action: AuditAction;    // CREATE | UPDATE | DELETE
    model: string;          // e.g. 'Student', 'AcademicResult'
    recordId: string;
    details?: Record<string, unknown>;  // optional before/after snapshot
  }
) {
  await prisma.auditLog.create({
    data: {
      actingUserId: opts.userId,
      action: opts.action,
      model: opts.model,
      recordId: opts.recordId,
      details: opts.details ? JSON.stringify(opts.details) : null,
      timestamp: new Date(),
    },
  });
}

// Usage in a route handler:
// const student = await prisma.student.create({ data });
// await logAudit(prisma, { userId: req.user.id, action: 'CREATE', model: 'Student', recordId: student.id });
```

### Pattern 7: Prisma Schema (Phase 1 Models)

```prisma
// server/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  STAFF
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  displayName String
  role        Role       @default(STAFF)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  auditLogs   AuditLog[] @relation("ActingUser")
}

model AuditLog {
  id            String      @id @default(uuid())
  actingUserId  String
  actingUser    User        @relation("ActingUser", fields: [actingUserId], references: [id])
  action        AuditAction
  model         String      // Prisma model name as string
  recordId      String      // UUID of affected record
  details       String?     // JSON snapshot (optional)
  timestamp     DateTime    @default(now())

  @@index([actingUserId])
  @@index([model, recordId])
  @@index([timestamp])
}
```

### Pattern 8: IIS web.config for Reverse Proxy

**What:** Rewrite all requests to localhost where Express listens. Serve Vite `dist/` directly from IIS for the React SPA; proxy only `/api/*` to Express.
**When to use:** Production IIS deployment (D-10).

```xml
<!-- web.config — place in the IIS site root (same folder as Vite dist/) -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Proxy API requests to Express -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^(api/?.*)" />
          <action type="Rewrite" url="http://localhost:3001/{R:1}" />
        </rule>
        <!-- SPA fallback: let React Router handle client-side routes -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <!-- Security headers (supplement helmet on Express side) -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### Pattern 9: PM2 Ecosystem Config + Windows Service

**What:** `ecosystem.config.js` with environment variable injection; WinSW for Windows service.

```javascript
// ecosystem.config.js — place in server/
module.exports = {
  apps: [{
    name: 'spcs-api',
    script: './dist/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: 'postgresql://spcs:PASSWORD@localhost:5432/spcs_transcripts',
      AZURE_TENANT_ID: 'YOUR_TENANT_ID',
      AZURE_CLIENT_ID: 'YOUR_CLIENT_ID',
      BOOTSTRAP_ADMIN_EMAIL: 'admin@school.edu',
    },
    error_file: 'C:/ProgramData/pm2/logs/spcs-api-error.log',
    out_file: 'C:/ProgramData/pm2/logs/spcs-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
```

**Windows service registration (PM2_HOME must be set system-wide):**
```powershell
# Run as Administrator — set PM2_HOME to a non-user path
[System.Environment]::SetEnvironmentVariable('PM2_HOME', 'C:\ProgramData\pm2', 'Machine')

# Install pm2-installer (wraps WinSW / node-windows)
npm install -g pm2
npm install -g @jessety/pm2-installer   # or use WinSW manually
pm2 start ecosystem.config.js --env production
pm2 save
# pm2-installer creates a Windows Service that runs `pm2 resurrect` at boot
```

> **Critical:** `PM2_HOME` must be set as a **system** environment variable (not user-level) pointing to a non-user-profile path (`C:\ProgramData\pm2`). Running PM2 service as Local Service user will fail to read `%APPDATA%\pm2` which is user-scoped. [CITED: github.com/jessety/pm2-installer]

### Anti-Patterns to Avoid

- **Mixing Graph scopes and API scopes in one `acquireTokenSilent` call:** `acquireTokenSilent` issues a token for one audience only. Requesting `["User.Read", "api://clientId/access_as_user"]` returns a Graph token — your Express API will reject it with 401. Always use separate token requests per resource. [CITED: learn.microsoft.com/en-us/answers/questions/5828554]
- **Running `prisma migrate dev` in production:** It requires a shadow database and auto-generates migrations. Always use `prisma migrate deploy` in production. [CITED: prisma.io/docs/orm/prisma-migrate/workflows/development-and-production]
- **Calling `app.listen()` in test files:** Supertest binds to an ephemeral port automatically when `request(app)` is used. Export `app` without calling `listen()` in `app.ts`; call `listen()` only in `index.ts`.
- **Using `iisnode` for Node.js hosting:** iisnode is unmaintained. Use IIS + ARR reverse proxy to localhost instead. [CITED: learn.microsoft.com/en-us/answers/questions/2145586]
- **Reading role from Azure AD group claims:** D-07 locks role storage in the local DB. Never add `groupMembershipClaims` to the Entra ID app manifest — this creates coupling to AD group management and is explicitly out of scope.
- **Nesting Prisma transactions for audit logging:** Prisma does not support nested interactive transactions. Keep audit `logAudit()` in the same transaction by passing the `tx` client from `prisma.$transaction(async (tx) => {...})` to `logAudit`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signature validation | Custom RSA key fetch + verify | `express-jwt` + `jwks-rsa` | JWKS key rotation, RS256 vs ES256, kid matching, token clock skew — all handled; hand-rolling misses key rotation edge cases |
| PKCE code verifier generation | Custom crypto.subtle SHA-256 | `@azure/msal-browser` | PKCE state management, token cache, silent renewal, session expiry handling — dozens of edge cases |
| Token caching + silent renewal | localStorage read/write | MSAL built-in cache | Token expiry detection, refresh token lifecycle, conditional access handling |
| Password hashing / auth | Any custom auth | Not needed — Azure handles all auth | School requirement (D-05); no passwords in scope |
| Database connection pooling | pg Pool config | Prisma connection URL params | Prisma manages pool; just set `connection_limit` in DATABASE_URL query string |
| HTTP security headers | Manually set res.setHeader | `helmet` | HSTS, CSP, X-Frame-Options — 15+ headers; helmet keeps them current |

**Key insight:** The MSAL + express-jwt + jwks-rsa stack exists precisely because the OAuth 2.0/OIDC token lifecycle is deceptively complex. Key rotation, refresh token expiry, cross-tab synchronization, and conditional access challenges are all handled transparently. Building any part of this manually is a multi-week security project.

---

## Common Pitfalls

### Pitfall 1: Wrong Issuer Format
**What goes wrong:** Express returns 401 "Invalid token" even though the frontend receives a valid token.
**Why it happens:** Azure issues tokens with two issuer formats: `https://sts.windows.net/<tenantId>/` (v1) and `https://login.microsoftonline.com/<tenantId>/v2.0` (v2). Configuring only one fails for the other.
**How to avoid:** Pass an array to `issuer` in `expressjwt()`: `issuer: ['https://sts.windows.net/${TENANT_ID}/', 'https://login.microsoftonline.com/${TENANT_ID}/v2.0']`
**Warning signs:** Works for some users/apps, fails for others; token decoded at jwt.io shows a different `iss` format.

### Pitfall 2: Token Acquired for Wrong Audience
**What goes wrong:** Express rejects token with "jwt audience invalid" even though the user is logged in.
**Why it happens:** The frontend called `acquireTokenSilent` with `scopes: ['User.Read']` (Graph scope) instead of `scopes: ['api://<clientId>/access_as_user']` (API scope). The token's `aud` is `https://graph.microsoft.com`, not `api://<clientId>`.
**How to avoid:** Always use a dedicated API scope in token requests for backend calls. Register "Expose an API" scope in Entra ID app registration. Validate `aud` matches `api://<clientId>` in Express.
**Warning signs:** Token at jwt.io shows `"aud": "https://graph.microsoft.com"` or `"00000003-0000-0000-c000-000000000000"`.

### Pitfall 3: SPA vs Web App Redirect URI Type
**What goes wrong:** PKCE flow fails with "AADSTS9002325: Proof Key for Code Exchanges is required" or similar.
**Why it happens:** The redirect URI in Entra ID app registration is registered as type "Web" instead of "SPA". Web redirect URIs do not support PKCE.
**How to avoid:** In Entra ID admin center → App Registration → Authentication → Add a platform → **Single-page application** (not Web). Set redirect URI to `http://localhost:5173` for dev and the production URL.
**Warning signs:** MSAL error in browser console during login redirect.

### Pitfall 4: PM2 Process Not Surviving Reboot
**What goes wrong:** Server reboots, PM2 is not running, the Node app is unavailable.
**Why it happens:** PM2 has no built-in Windows service support. `pm2 startup` works on Linux only.
**How to avoid:** Use `pm2-installer` (WinSW-based) or configure NSSM to run `pm2 resurrect` as a Windows service. Set `PM2_HOME=C:\ProgramData\pm2` as a **system** (machine-level) env var before installing the service.
**Warning signs:** App works after manual `pm2 start` but is unavailable after reboot.

### Pitfall 5: `preferred_username` Claim Missing from Access Token
**What goes wrong:** `req.auth.preferred_username` is `undefined`; user upsert fails or creates duplicate records.
**Why it happens:** Access tokens for custom APIs do not always include `preferred_username`. The claim depends on token version (v1 vs v2) and app manifest settings.
**How to avoid:** Add `"optionalClaims"` to the Entra ID app manifest to request `preferred_username`. Also fall back to `upn` and `email` claims. If none present, the `sub` claim (opaque user ID) is always present — store it as the Azure user ID and cross-reference on first login.
**Warning signs:** `req.auth.preferred_username` is `undefined`; check decoded token at jwt.io.

### Pitfall 6: PostgreSQL Connection String on Windows
**What goes wrong:** Prisma connects fine on dev but fails with connection refused on Windows Server.
**Why it happens:** PostgreSQL on Windows defaults to listening on `localhost` (127.0.0.1) but may need `pg_hba.conf` updated to allow password auth, and firewall rules may block the port.
**How to avoid:** Use `postgresql://username:password@127.0.0.1:5432/dbname` (explicit IP, not hostname). Ensure PostgreSQL's `pg_hba.conf` has `host all all 127.0.0.1/32 md5`. Verify port 5432 is not blocked by Windows Firewall for localhost traffic.
**Warning signs:** `P1001: Can't reach database server at localhost:5432`

### Pitfall 7: CORS Blocking API Calls During Development
**What goes wrong:** Browser blocks API calls with CORS error during local dev (Vite on :5173, Express on :3001).
**Why it happens:** Same-origin policy blocks cross-origin requests without CORS headers.
**How to avoid:** In dev, configure `cors({ origin: 'http://localhost:5173' })` in Express. In production, IIS proxies both static and API from the same origin, so CORS is not needed — add `NODE_ENV` check to disable CORS middleware in production.

---

## Code Examples

### Express App Entry Point
```typescript
// Source: [ASSUMED] standard Express setup
// server/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateJwt, resolveUser } from './middleware/auth';
import authRouter from './routes/auth';

export const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

// All /api routes require JWT validation + user resolution
app.use('/api', validateJwt);
app.use('/api', resolveUser);

app.use('/api/auth', authRouter);

// Global error handler for JWT errors
app.use((err: any, _req: any, res: any, next: any) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  next(err);
});
```

### Auth Route (Walking Skeleton Endpoint)
```typescript
// server/src/routes/auth.ts
import { Router } from 'express';

const router = Router();

// GET /api/auth/me — returns current user identity and role
router.get('/me', (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    displayName: req.user!.displayName,
    role: req.user!.role,
  });
});

export default router;
```

### Vitest + Supertest Auth Test
```typescript
// Source: pristren.com/blog/http-client-testing-guide/
// server/src/__tests__/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { app } from '../app';

const TEST_TENANT_ID = 'test-tenant-id';
const TEST_CLIENT_ID = 'test-client-id';

// Mock JWKS endpoint so expressjwt can validate our test token
// Use HS256 in test; or set up nock to serve a test RSA key
function makeTestToken(payload: object = {}) {
  // In tests: override expressjwt to accept HS256 symmetric tokens
  // by injecting TEST_JWT_SECRET env var and switching to symmetric validation
  return jwt.sign(
    { preferred_username: 'staff@school.edu', name: 'Test Staff', ...payload },
    process.env.TEST_JWT_SECRET || 'test-secret',
    { expiresIn: '1h', audience: `api://${TEST_CLIENT_ID}`, issuer: `https://login.microsoftonline.com/${TEST_TENANT_ID}/v2.0` }
  );
}

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user identity with valid token', async () => {
    const token = makeTestToken({ preferred_username: 'admin@school.edu' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'admin@school.edu');
    expect(res.body).toHaveProperty('role');
  });
});
```

> **Testing note:** The recommended approach for testing `jwks-rsa`-validated routes in isolation is to use `nock` to intercept the JWKS HTTP call and return a test RSA key pair. Alternatively, introduce a `TEST_JWT_SECRET` env var that switches `expressjwt` to HS256 validation when `NODE_ENV === 'test'`. The planner should create a Wave 0 task to establish the test auth strategy before writing business logic tests. [ASSUMED]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MSAL v1 / msal.js (Implicit flow) | `@azure/msal-browser` v2+ (Auth Code + PKCE) | 2020 | Implicit flow deprecated by IETF; PKCE is now required for SPAs |
| `iisnode` for Node.js on IIS | IIS ARR reverse proxy to localhost | ~2022 | iisnode unmaintained; ARR is the current Microsoft recommendation |
| Prisma `$use` middleware | Prisma `$extends` query extensions | Prisma 4.7 | `$use` deprecated but not yet removed; `$extends` is type-safe but complex for audit use cases |
| `passport` + `passport-azure-ad` | `express-jwt` + `jwks-rsa` | `passport-azure-ad` deprecated ~2023 | `passport-azure-ad` is deprecated with no replacement in the Passport ecosystem |

**Deprecated/outdated:**
- `passport-azure-ad`: Explicitly deprecated by Microsoft. Do not use. Replace with `express-jwt` + `jwks-rsa`.
- `msal` v1 (NPM package named `msal`): Deprecated since 2020. Use `@azure/msal-browser`.
- `iisnode`: Last maintained ~2019. Do not use for new deployments.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Service-layer explicit `logAudit()` is simpler than Prisma `$extends` for this team size and app scope | Don't Hand-Roll / Patterns | If Prisma extensions are preferred, the planner would need to design AsyncLocalStorage propagation — adds complexity to Phase 1 |
| A2 | Single Entra ID app registration (both SPA frontend and API) is sufficient | Architecture Patterns | If school IT requires separate app registrations, the `acquireTokenSilent` scope and Express audience validation need updating |
| A3 | `preferred_username` claim will be present in access tokens from this school's Entra ID tenant | Pitfalls | If absent, user upsert requires fallback to `sub` or `oid` claim; needs Entra ID optional claims configuration |
| A4 | Test JWT validation strategy (symmetric HS256 in test env) is acceptable | Code Examples / Testing | If school requires end-to-end JWKS validation in tests, nock-based RSA key mocking adds 1-2 extra tasks to Wave 0 |
| A5 | Express 5.x is appropriate (locked as latest stable) | Standard Stack | Express 5 has some breaking changes from v4 (error handling signature, async errors). Planner should confirm no v4 dependencies |

---

## Open Questions (RESOLVED)

1. **Does the school IT team have the Entra ID tenant already configured to allow a new app registration?**
   - What we know: School is on M365 (from CONTEXT.md specifics)
   - What's unclear: Whether Global Admin access is available, and whether conditional access policies apply
   - Recommendation: Create a "Pre-Flight Checklist" task in the plan — list what IT needs to configure before the app can be tested (app registration, SPA redirect URI, "Expose an API" scope, admin consent grant)
   - RESOLVED: Plan 05 (`01-PLAN-deploy.md`) includes a `user_setup` pre-flight checklist block and DEPLOYMENT-RUNBOOK.md Pre-Flight section covering all IT prerequisites.

2. **Should the Node.js API and the React SPA be separate npm projects or a monorepo?**
   - What we know: Vite builds the client; Express is the API
   - What's unclear: Whether the planner should create `server/` and `client/` sub-packages (recommended for Phase 1 simplicity) or a workspace monorepo
   - Recommendation: Separate `server/` and `client/` directories with their own `package.json` files; no monorepo tooling needed for a 5-phase project
   - RESOLVED: Plans 01 and 02 use separate `server/` and `client/` directories with independent `package.json` files. No monorepo tooling.

3. **What PostgreSQL version and Windows service configuration does the school have?**
   - What we know: PostgreSQL is not installed on the dev machine (not found in environment check); it will be on the production Windows Server
   - What's unclear: Whether PostgreSQL is already installed on the target server
   - Recommendation: Plan includes a "verify PostgreSQL installation and create database/user" step in the deployment runbook
   - RESOLVED: Plan 05 DEPLOYMENT-RUNBOOK.md includes PostgreSQL installation/verification step with instructions for Windows Server setup and `pg_hba.conf` configuration.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Express API, Prisma CLI, Vite build | ✓ | v22.16.0 | — |
| npm | Package management | ✓ | 10.9.2 | — |
| PostgreSQL (dev) | Prisma migrations during dev | ✗ | — | Use Docker Desktop with `postgres:16` image for local dev |
| PostgreSQL (production) | Data persistence on Windows Server | Unknown | — | Must be installed on Windows Server before deployment |
| IIS + ARR + URL Rewrite | HTTPS termination + proxy | Unknown | — | Dev uses Vite proxy (`server.proxy`) to Express; production only |
| PM2 | Node process management | Unknown | — | For dev, run `node index.js` directly |
| Windows Server (target) | Production deployment | Unknown | — | Dev uses localhost; deployment runbook covers server setup |

**Missing dependencies with no fallback:**
- PostgreSQL on production Windows Server — plan must include installation step

**Missing dependencies with fallback:**
- PostgreSQL on dev machine — use Docker `postgres:16` container for local development

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest stable) |
| Config file | `server/vitest.config.ts` (Wave 0) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `GET /api/auth/me` returns 401 without token | integration | `npx vitest run auth.test` | ❌ Wave 0 |
| AUTH-01 | `GET /api/auth/me` returns user identity with valid JWT | integration | `npx vitest run auth.test` | ❌ Wave 0 |
| AUTH-01 | `resolveUser` creates User record on first login | integration | `npx vitest run auth.test` | ❌ Wave 0 |
| AUTH-02 | BOOTSTRAP_ADMIN_EMAIL user gets Admin role on first login | integration | `npx vitest run auth.test` | ❌ Wave 0 |
| AUTH-02 | `requireRole(ADMIN)` returns 403 for Staff-role user | unit | `npx vitest run requireRole.test` | ❌ Wave 0 |
| AUTH-02 | Admin-only route inaccessible to Staff user | integration | `npx vitest run auth.test` | ❌ Wave 0 |
| AUTH-03 | `logAudit()` writes record to AuditLog table | unit | `npx vitest run audit.test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/src/__tests__/auth.test.ts` — covers AUTH-01, AUTH-02
- [ ] `server/src/__tests__/requireRole.test.ts` — covers AUTH-02
- [ ] `server/src/__tests__/audit.test.ts` — covers AUTH-03
- [ ] `server/vitest.config.ts` — framework config
- [ ] `server/src/__tests__/helpers/makeTestToken.ts` — JWT test helper
- [ ] `server/src/__tests__/helpers/testDb.ts` — Prisma test DB setup/teardown
- [ ] Framework install: `npm install --save-dev vitest supertest @types/supertest jsonwebtoken nock`

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Delegated to Entra ID via MSAL; no password handling |
| V3 Session Management | yes | sessionStorage (MSAL default, D-06); no server-side session |
| V4 Access Control | yes | `requireRole` middleware; Admin/Staff enforcement |
| V5 Input Validation | yes | Validate JWT claims; validate email format from token |
| V6 Cryptography | yes | RS256 JWT validation via jwks-rsa; no custom crypto |
| V7 Error Handling | yes | Never expose token validation error details to client |
| V9 Communications | yes | HTTPS via IIS; Express only on localhost — never exposed directly |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token replay (stolen JWT) | Spoofing | sessionStorage (tab-scoped, cleared on close); short token lifetime (1h); MSAL handles refresh |
| JWT algorithm confusion (alg:none) | Tampering | `algorithms: ['RS256']` hardcoded in `expressjwt()` — never accept `none` |
| Role escalation via local DB manipulation | Elevation of Privilege | `requireRole` reads role from DB on every request via `resolveUser`; DB is not user-accessible |
| CORS exploitation | Spoofing | `cors({ origin: allowedOrigins })` restricts cross-origin access |
| Path traversal via IIS | Tampering | URL Rewrite rules only forward `/api/*`; static files served by IIS directly |
| Audit log tampering | Repudiation | AuditLog model has no `update` endpoint; append-only pattern |
| Mass assignment via req.body | Tampering | Only create specific Prisma fields; never spread `req.body` directly into Prisma operations |
| Token leakage in logs | Information Disclosure | `helmet` removes X-Powered-By; never log JWT Bearer header values; use `req.auth.sub` not full token in logs |

---

## Sources

### Primary (MEDIUM confidence — Microsoft Learn official docs)
- `learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started` — MSAL React initialization, MsalProvider, useMsal
- `learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token` — acquireTokenSilent pattern, scope requirements
- `learn.microsoft.com/en-us/entra/identity-platform/access-tokens` — JWT claim structure, JWKS endpoint, issuer formats
- `prisma.io/docs/orm/prisma-migrate/workflows/development-and-production` — migrate dev vs deploy

### Secondary (LOW confidence — community docs and GitHub discussions)
- `github.com/AzureAD/microsoft-identity-web/discussions/2405` — express-jwt + jwks-rsa for Azure AD validation, dual-issuer pattern
- `github.com/jessety/pm2-installer` — PM2 Windows service via WinSW
- `eysermans.com/post/hosting-a-node-js-application-on-windows-with-iis-as-reverse-proxy/` — IIS ARR + web.config pattern
- `pristren.com/blog/http-client-testing-guide/` — Supertest + Vitest JWT test pattern
- `medium.com/@gayanper/implementing-entity-audit-log-with-prisma` — Prisma audit log patterns

### Package Registry (verified)
- npm registry: all packages verified via `npm view <pkg> version` and `gsd-tools query package-legitimacy`

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — packages verified on npm registry; MSAL version from npm view; express-jwt + jwks-rsa pattern cited from GitHub discussion with Microsoft identity team
- Architecture: MEDIUM — MSAL + Express pattern is well-documented officially; IIS reverse proxy and PM2 Windows service patterns are community-documented with no official Microsoft equivalent
- Pitfalls: MEDIUM — dual-issuer and wrong-audience pitfalls cited from official docs and Microsoft Q&A; PM2 Windows service pitfall cited from official pm2-installer README

**Research date:** 2026-06-11
**Valid until:** 2026-12-11 (stable stack — MSAL, Prisma, Express versions change slowly; check MSAL versions before execution)
