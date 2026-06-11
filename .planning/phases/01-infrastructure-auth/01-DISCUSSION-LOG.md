# Phase 1: Infrastructure & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 1-Infrastructure & Auth
**Areas discussed:** Tech Stack, MSAL Integration Pattern, Role Assignment, Database Engine

---

## Tech Stack

### Backend

| Option | Description | Selected |
|--------|-------------|----------|
| Node.js + Express | Lightweight, PM2-friendly, large ecosystem, easy IIS reverse-proxy via web.config | ✓ |
| Node.js + Fastify | Faster than Express, schema-first, same deployment story | |
| .NET / ASP.NET Core | Native IIS hosting, no PM2 needed, all C# | |

**User's choice:** Node.js + Express
**Notes:** User initially selected .NET then reconsidered. Confirmed Node.js after clarifying that IIS hosting and Windows PC development both work with Node.js. User also asked about Vercel — noted that Vercel is a cloud platform, out of scope due to on-premise data residency requirement.

---

### Frontend

| Option | Description | Selected |
|--------|-------------|----------|
| React + Vite | Most common pairing with Node.js APIs, large ecosystem, MSAL React SDK available | ✓ |
| Blazor WebAssembly | All C#, no JS build tooling, MSAL via Microsoft.Authentication.WebAssembly.Msal | |
| Razor Pages / MVC | Server-rendered, simpler deployment, auth handled server-side | |

**User's choice:** React + Vite
**Notes:** Selected during initial pass before backend was revisited.

---

### ORM / Database Client

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma | Free/open-source ORM, type-safe, schema-first migrations, supports PostgreSQL and SQL Server | ✓ |
| Knex.js | Free query builder, raw SQL-like control, migrations built in | |
| TypeORM | Free ORM with decorators, supports both DB engines, heavier setup | |

**User's choice:** Prisma
**Notes:** User asked whether Prisma is a paid product — confirmed it is free/open-source. The paid Prisma Accelerate cloud product is irrelevant for an on-premise deployment.

---

## MSAL Integration Pattern

### Auth Flow

| Option | Description | Selected |
|--------|-------------|----------|
| SPA pattern | MSAL.js in React handles login, gets JWT from Azure AD, sends as Bearer token to Express; backend validates JWT | ✓ |
| Backend-for-frontend (BFF) | Express handles OAuth server-side with msal-node, stores server session; no tokens in browser | |

**User's choice:** SPA pattern
**Notes:** Standard Microsoft recommendation for SPAs calling their own backend APIs. Stateless Express API.

---

### Token Storage

| Option | Description | Selected |
|--------|-------------|----------|
| sessionStorage | Token cleared on tab close, lower XSS risk, MSAL default | ✓ |
| localStorage | Token persists across tabs and restarts, more convenient but higher XSS exposure | |

**User's choice:** sessionStorage

---

## Role Assignment

### Role Source

| Option | Description | Selected |
|--------|-------------|----------|
| App DB table | Roles stored in local DB; Admin assigns/changes roles from within the app; first Admin seeded on install | ✓ |
| Azure AD groups | IT creates AD groups (Transcript-Admins, Transcript-Staff); app reads group claims from JWT | |

**User's choice:** App DB table
**Notes:** Gives careers team autonomy over role management without IT involvement for day-to-day changes.

---

### First Admin Bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Config file seed | `BOOTSTRAP_ADMIN_EMAIL` env variable; app auto-promotes that user on first login | ✓ |
| First-login promotion | First Microsoft account to log in becomes Admin automatically | |

**User's choice:** Config file seed (`BOOTSTRAP_ADMIN_EMAIL` env variable)

---

## Database Engine

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL | Free/open-source, runs on Windows Server, excellent Prisma support, no licensing cost | ✓ |
| SQL Server | School may already have licensed instance; native Windows integration | |
| SQL Server Express | Free tier of SQL Server, 10GB limit, no licensing cost | |

**User's choice:** PostgreSQL

---

## Claude's Discretion

None — all areas resolved by user selection.

## Deferred Ideas

None — discussion stayed within phase scope. (Vercel hosting mentioned by user; noted as out of scope due to on-premise data residency constraint.)
