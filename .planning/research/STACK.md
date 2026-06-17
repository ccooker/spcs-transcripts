# Stack Research

**Domain:** v2.0 Network Document Linking — SMB share discovery, path references, authenticated proxy (extends existing SPCS Transcript System)
**Researched:** 2026-06-16
**Confidence:** HIGH

> **Scope:** This document covers **stack additions and changes only** for v2.0. The existing baseline is fixed and not re-researched: Express 5.2.1 ESM, Prisma 7.8 + `@prisma/adapter-pg`, PostgreSQL, React + Vite 8, MSAL v5 PKCE, `express-jwt`, Windows Server + IIS + PM2, on-premise only.

---

## Recommended Stack

### Core Technologies (New for v2.0)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **Node.js `fs` / `fs/promises`** | 22 LTS (built-in) | Read-only UNC/SMB access, streaming | On Windows Server, Node's native filesystem APIs work against UNC paths (`\\spcs-fs\...`) when the **PM2 process identity** has share ACL — no SMB client library required. Same APIs used for `stat`, `readdir`, and `createReadStream`. |
| **Prisma schema extensions** | 7.8.0 (existing) | Store path references, scan runs, evidence joins | No new ORM — add `LinkedDocument`, `ShareScanRun`, and evidence join models. Paths stored as normalized relative strings under share root; never store full UNC in DB rows exposed to client. |
| **Express `res.download` / `res.sendFile`** | 5.2.1 (existing) | Authenticated file proxy to browser | Built on the `send` module (already bundled with Express 5): streaming, Range requests, ETag, MIME detection. JWT middleware runs before any byte is read — raw UNC never reaches the browser. |
| **PM2 worker process** | (existing PM2 install) | Isolated discovery scan runner | Separate `ecosystem.config.js` app entry (`spcs-worker`) prevents long share walks from blocking HTTP. Same service account as API — share ACL applies once at OS level. |

### Supporting Libraries (New npm packages)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **fast-glob** | 3.3.3 | Recursive share tree walk for discovery | Discovery job: `fg.glob('**/*', { cwd: shareRoot, onlyFiles: true, absolute: true })`. Official UNC support via `cwd` option or `fg.convertPathToPattern()`. Replaces hand-rolled recursive `readdir`. |
| **node-cron** | 4.2.1 | Schedule discovery scans | Worker process: `cron.schedule('0 2 * * *', runDiscoveryScan, { timezone: 'Asia/Hong_Kong', noOverlap: true })`. v4 is TypeScript-native, ESM-compatible (`import cron from 'node-cron'`), matches server's `"type": "module"`. |
| **mime-types** | 3.0.2 | Content-Type for proxied files | Document proxy route: `mime.lookup(filename) ?? 'application/octet-stream'`. Lightweight; Express `send` also detects MIME but explicit lookup gives control for `Content-Disposition: inline` vs `attachment`. |
| **@cityssm/windows-unc-path-connect** | 1.1.0 | Fallback UNC credential connect at startup | **Only if** domain service account alone cannot reach the share (legacy ACL, cross-domain). Call once at process boot — not per HTTP request. Avoid if PM2 runs as a dedicated AD account with read-only share permissions (preferred). |

### Infrastructure / Deployment (Not npm — required configuration)

| Component | Purpose | Why Required |
|-----------|---------|--------------|
| **AD service account** | SMB authentication identity | PM2 API + worker must run as a domain user with **read-only** NTFS + share permissions on `\\spcs-fs\Private\Administration\Office\Student`. `LocalSystem` and `Network Service` fail or map to guest for remote UNC (ServerFault, Microsoft docs). |
| **`SHARE_ROOT` env var** | Configurable share root path | `\\spcs-fs\Private\Administration\Office\Student` in production; overridable for dev/test. Validated once at startup. |
| **IIS ARR proxy (existing)** | HTTPS termination, `/api/*` → Express | No change to IIS stack. File bytes stream through Express on loopback — no IIS static mapping to UNC. |
| **Windows Firewall (existing)** | Block direct Express access | Port 3001 loopback-only; staff never hit UNC directly. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest + mocks** | Test shareAccess without live UNC | Mock `fs/promises` and `fast-glob` in unit tests; integration test against a local test folder on dev machines. Already in `server/package.json`. |
| **tsx** | Run worker entry locally | `tsx watch src/worker.ts` alongside API during dev. Existing dev dependency. |

---

## Integration with Existing Express + Prisma

### Express request pipeline (unchanged auth, new routes)

```
GET /api/documents/:id/content
  → validateJwt (express-jwt 8.5.1)
  → resolveUser (Prisma upsert)
  → linkedDocumentService.getById(id)     // Prisma — returns relativePath only
  → shareAccess.resolveSafePath(relative)  // path traversal guard
  → shareAccess.createReadStream(absolute) // fs.createReadStream
  → res.set('Content-Type', mime.lookup(...))
  → stream.pipe(res)
```

Mount new routers in `server/src/app.ts` under existing `/api` prefix — same `validateJwt` + `resolveUser` chain as `studentsRouter`.

### Prisma — no new packages, schema-only change

```prisma
// New models — migration via existing `prisma migrate`
model LinkedDocument {
  id              String   @id @default(uuid())
  studentId       String?
  student         Student? @relation(fields: [studentId], references: [id])
  relativePath    String   @unique   // normalized path under SHARE_ROOT
  fileName        String
  fileSizeBytes   BigInt?
  fileModifiedAt  DateTime?
  status          LinkedDocumentStatus
  matchConfidence Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Use existing `@prisma/client` 7.8.0 generated client — no adapter change.

### PM2 ecosystem (second app entry)

```javascript
// ecosystem.config.js — add alongside spcs-api
{
  name: 'spcs-worker',
  script: './server/dist/worker.js',
  instances: 1,
  exec_mode: 'fork',
  env_production: {
    NODE_ENV: 'production',
    DATABASE_URL: '...',           // same as API
    SHARE_ROOT: '\\\\spcs-fs\\Private\\Administration\\Office\\Student',
    DISCOVERY_CRON: '0 2 * * *',   // 02:00 daily
  },
}
```

Worker imports `discoveryScan.ts` which calls `fast-glob` + Prisma upsert — no HTTP server.

### Client (React + Vite — no new npm packages)

Use existing `apiFetch` pattern with `response.blob()` for download/open:

```typescript
const res = await apiFetch(`/documents/${id}/content?disposition=inline`)
const blob = await res.blob()
window.open(URL.createObjectURL(blob))
```

MSAL Bearer token already attached by `apiClient.ts` — no CORS or cookie changes needed.

---

## Installation

```bash
cd server

# v2.0 supporting libraries
npm install fast-glob@3.3.3 node-cron@4.2.1 mime-types@3.0.2

# Fallback UNC connect — install only if service-account-only access fails smoke test
npm install @cityssm/windows-unc-path-connect@1.1.0

# Dev types (node-cron ships its own; mime-types has @types via package)
npm install -D @types/mime-types@3.0.1
```

**No client-side npm additions required** for document open/download.

**Environment variables to add** (API + worker):

| Variable | Example | Purpose |
|----------|---------|---------|
| `SHARE_ROOT` | `\\spcs-fs\Private\Administration\Office\Student` | UNC root for discovery and proxy |
| `DISCOVERY_CRON` | `0 2 * * *` | Cron expression for worker (optional override) |
| `SHARE_CONNECT_USER` | (fallback only) | Username for `@cityssm/windows-unc-path-connect` |
| `SHARE_CONNECT_PASSWORD` | (fallback only) | Password — use Windows Credential Manager or machine env, never commit |

**Prisma migration** (existing toolchain):

```bash
npx prisma migrate dev --name add-linked-documents
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Native `fs` + service account | **smb2** npm (0.2.11) | Never for this deployment — unmaintained, last publish years ago, adds credential-in-code temptation. Only consider if app must run on Linux accessing SMB (not this project). |
| Native `fs` + service account | **`NET USE` / mapped drive letter** | Avoid — drive mappings are session-scoped, invisible to Windows services/PM2, break on reboot. Map via service account ACL instead. |
| **fast-glob** 3.3.3 | Hand-rolled `fs.readdir` recursion | Valid for flat folders; fast-glob handles `**`, ignore patterns, UNC `cwd`, and is battle-tested at 3.3.x with `convertPathToPattern`. |
| **node-cron** 4.2.1 | **node-schedule** 2.x | node-cron is simpler for fixed cron strings; node-schedule better for one-off Date triggers — discovery needs recurring cron. |
| **node-cron** 4.2.1 | **pg-boss** / **Bull + Redis** | Job queues add Redis infrastructure the school doesn't have. Overkill for one nightly scan on a single server. Revisit only if scan frequency or retry complexity grows. |
| Express stream proxy | **IIS virtual directory → UNC** | Exposes share without app-level JWT audit; browsers can't authenticate to UNC from HTTPS pages anyway. |
| Path references in PostgreSQL | **Copy files to local `/uploads`** | Contradicts v2.0 goal — duplicates authoritative data, creates sync drift. |
| **mime-types** 3.0.2 | Manual extension map | mime-types covers edge cases (`.docx`, `.pdf`, `.jpg`) without maintenance burden. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **smb2**, **@awslabs/smithy** SMB clients | Unmaintained or wrong protocol layer; Node on Windows with service account doesn't need SMB wire protocol in userspace | Native `fs` against UNC |
| **multer**, **busboy**, **formidable** | v2.0 is read-only linking — no upload pipeline | Remove/defer v1 upload code paths |
| **express.static** pointed at share root | Bypasses JWT; directory traversal risk if misconfigured | Authenticated `/api/documents/:id/content` route |
| **AWS S3 SDK**, **Azure Blob**, **@azure/storage-file-share** | Cloud storage APIs — on-premise constraint; share already exists on `spcs-fs` | UNC via native fs |
| **Redis + Bull** | New infrastructure for a single-server nightly job | node-cron in PM2 worker |
| **NET USE in request handlers** | Session-scoped, race-prone, credential exposure | AD service account on PM2 |
| **Exposing UNC paths in API JSON** | Security leak; browsers can't open them from HTTPS | Opaque document UUID + proxy |
| **iisnode** | Deprecated pattern; project already uses IIS ARR → Express | Keep existing ARR proxy |
| **pdf-parse / unpdf** (for v2.0) | Discovery/linking doesn't require text extraction — deferred enhancement | Add only if OCR phase is scoped later |

---

## Stack Patterns by Variant

### Standard (recommended): Domain service account + native fs

```
PM2 (spcs-api + spcs-worker) → runs as DOMAIN\svc-spcs-transcripts
  → fs.readdir / fs.createReadStream on \\spcs-fs\...\Student
  → Prisma 7.8 → PostgreSQL (relativePath metadata)
  → Express JWT proxy → IIS → Browser
```

**Because:** Simplest, most reliable on Windows Server; credentials managed by AD/IT, not application code.

### Fallback: Explicit UNC connect at startup

```
Process boot → @cityssm/windows-unc-path-connect(SHARE_ROOT, user, pass)
  → then native fs for all I/O
```

**Because:** Some legacy shares require explicit session credentials even when service account is configured. Call once at startup in both API and worker — never per request.

### Discovery scan flow

```
node-cron (worker) → discoveryScan.ts
  → fast-glob('**/*', { cwd: SHARE_ROOT, onlyFiles: true })
  → matching.ts (schoolStudentId rules from shareLayout.ts)
  → Prisma upsert LinkedDocument
  → logAudit(SCAN_COMPLETE)
```

### Document open flow

```
Browser → apiFetch(/documents/:id/content) + Bearer JWT
  → Express validateJwt → shareAccess.createReadStream
  → Content-Type via mime-types
  → pipe to response (inline PDF preview or attachment download)
```

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| fast-glob | 3.3.3 | Node 18+ | UNC via `cwd`; use forward slashes in glob patterns |
| node-cron | 4.2.1 | Node 18+, ESM | v4 breaking: `scheduled`/`runOnInit` removed; tasks auto-start; use `noOverlap: true` for long scans |
| mime-types | 3.0.2 | Node 18+ | ESM/CJS dual package |
| @cityssm/windows-unc-path-connect | 1.1.0 | Windows only | No-op on non-Windows; optional dependency |
| Express | 5.2.1 (existing) | send 1.2.x (transitive) | `res.download` / `res.sendFile` handle Range + streaming |
| Prisma | 7.8.0 (existing) | `@prisma/adapter-pg` 7.8 | `BigInt` for `fileSizeBytes` — serialize to string in JSON responses |
| Node.js | 22 LTS (existing) | Windows Server 2019+ | UNC long-path support: prefer `\\?\UNC\server\share\...` if paths exceed 260 chars |

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| npm registry (direct `npm view` queries, 2026-06-16) | HIGH | fast-glob 3.3.3, node-cron 4.2.1, mime-types 3.0.2, send 1.2.1, @cityssm/windows-unc-path-connect 1.1.0 |
| fast-glob README — UNC path section | HIGH | `cwd` option and `convertPathToPattern` for Windows UNC |
| node-cron v4 migration guide (nodecron.com) | HIGH | ESM import, v4 API changes, `noOverlap` |
| Express 5 API / DeepWiki file operations | HIGH | `res.download`, `send` module streaming |
| ServerFault / Stack Overflow — Windows service UNC access | MEDIUM | Service account vs Network Service vs NET USE |
| nodejs/help #4390 — UNC limitations without credentials | MEDIUM | Confirms fs works when OS identity has ACL; no programmatic credential pass-through |
| Existing repo: `DEPLOYMENT-RUNBOOK.md`, `ecosystem.config.js`, `server/package.json` | HIGH | Confirms Express 5 + Prisma 7 + PM2 + IIS deployment pattern |
| `.planning/research/ARCHITECTURE.md` (v2.0) | HIGH | Component boundaries and integration points |

---
*Stack research for: v2.0 Network Document Linking milestone*
*Researched: 2026-06-16*
