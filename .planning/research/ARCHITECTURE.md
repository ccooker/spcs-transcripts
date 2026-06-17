# Architecture Research

**Domain:** School transcript web app — network file-share document linking (v2.0 milestone)
**Researched:** 2026-06-16
**Confidence:** HIGH (integration with existing stack); MEDIUM (share folder layout TBD, matching rules TBD)

---

## Standard Architecture

### System Overview (v2.0 — extends v1.0)

The v1.0 system is a **decoupled React SPA + Express API** deployed on a single Windows Server behind IIS. v2.0 adds a **read-only SMB integration layer** and a **background discovery pipeline** that populates `LinkedDocument` rows in PostgreSQL — path references only, no file copies.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         School Network (on-premise)                       │
│                                                                           │
│  ┌─────────────┐         ┌─────────────────────────────────────────┐    │
│  │   Browser   │─HTTPS──▶│  IIS (reverse proxy + static SPA)       │    │
│  │  (Staff PC) │         │  /api/* → localhost:3000 (Express)      │    │
│  └─────────────┘         └──────────────────┬──────────────────────┘    │
│                                               │                           │
│                           ┌───────────────────▼──────────────────────┐  │
│                           │  Express API (PM2, JWT middleware)       │  │
│                           │  ┌────────────┐  ┌──────────────────┐   │  │
│                           │  │ Existing   │  │ NEW: Document    │   │  │
│                           │  │ routes     │  │ Module           │   │  │
│                           │  │ auth,      │  │ • list/proxy     │   │  │
│                           │  │ students   │  │ • evidence links │   │  │
│                           │  └─────┬──────┘  └────────┬─────────┘   │  │
│                           │        │                   │              │  │
│                           │  ┌─────▼───────────────────▼─────────┐   │  │
│                           │  │  Services Layer                    │   │  │
│                           │  │  student • audit • linkedDocument  │   │  │
│                           │  │  • shareAccess • matching • scan   │   │  │
│                           │  └─────┬───────────────────┬─────────┘   │  │
│                           └────────┼───────────────────┼─────────────┘  │
│                                    │                   │                 │
│         ┌──────────────────────────┼───────────────────┼─────────────┐  │
│         │                          │                   │             │  │
│  ┌──────▼──────┐    ┌──────────────▼──────┐   ┌───────▼──────────┐  │  │
│  │ PostgreSQL  │    │  PM2 Worker Process │   │  SMB File Share  │  │  │
│  │ (Prisma)    │    │  (discovery scan)   │   │  \\spcs-fs\...   │  │  │
│  │             │    │  cron / pg-boss     │   │  Student\        │  │  │
│  │ Student     │    └──────────┬──────────┘   └────────▲─────────┘  │  │
│  │ LinkedDoc   │               │ read-only UNC            │             │  │
│  │ Evidence*   │               └──────────────────────────┘             │  │
│  │ ScanRun     │                                                        │  │
│  └─────────────┘                                                        │  │
└──────────────────────────────────────────────────────────────────────────┘
          │ OAuth 2.0 (auth only)
          ▼
┌─────────────────────┐
│  Microsoft Entra ID │
└─────────────────────┘
```

**v2.0 architectural shift:** Documents move from *upload + local filesystem storage* (v1 Phase 4) to *reference + proxy* — the authoritative binary stays on `\\spcs-fs\Private\Administration\Office\Student`. The app stores UNC-relative paths, metadata, match confidence, and evidence join rows.

---

### Component Responsibilities

| Component | Responsibility | v1 / v2 | Typical Implementation |
|-----------|---------------|---------|------------------------|
| React SPA (Vite) | Staff UI; MSAL token acquisition; API calls | **Modified** | Existing `client/` — add Documents tab, evidence picker |
| `apiFetch` / MSAL | Bearer JWT on every `/api/*` request | Existing | `client/src/api/apiClient.ts` |
| Express API | REST endpoints, JWT validation, business logic | **Modified** | `server/src/app.ts` + new routers |
| Auth middleware | `validateJwt` + `resolveUser` on all `/api` routes | Existing | `server/src/middleware/auth.ts` |
| Student module | Student CRUD; **matching anchor** via `schoolStudentId` | Existing | `server/src/routes/students.ts`, `services/student.ts` |
| Audit service | Log create/update/delete on all writes | **Modified** | Extend `AuditAction` / model names for scan + link ops |
| **Share access service** | Read-only UNC I/O; path validation; stream files | **New** | `server/src/services/shareAccess.ts` — `fs.createReadStream` on UNC |
| **Discovery scan job** | Walk share tree; emit discovered file records | **New** | `server/src/jobs/discoveryScan.ts` — scheduled worker |
| **Matching engine** | Map discovered paths → `Student.id` | **New** | `server/src/services/matching.ts` — rules from Phase 6 config |
| **LinkedDocument service** | CRUD metadata; no binary writes | **New** | `server/src/services/linkedDocument.ts` |
| **Document proxy route** | Auth-gated stream; never expose raw UNC to browser | **New** | `GET /api/documents/:id/content` |
| **Evidence link service** | Join `LinkedDocument` ↔ record entries | **New** | Polymorphic or per-entity join tables |
| PostgreSQL | Structured data + path references | **Modified schema** | Prisma migrations |
| PM2 worker | Runs discovery on schedule; separate from HTTP | **New process** | `ecosystem.config.js` second app entry |
| SMB share | Authoritative document store | External | Read-only ACL for app service account |

---

## Integration with Existing Express + Prisma Architecture

### What stays unchanged

| Layer | Pattern | Notes |
|-------|---------|-------|
| Request pipeline | `app.use('/api', validateJwt)` → `resolveUser` → route handler | Document routes inherit same auth; no separate auth model |
| Service layer | Route → service function → Prisma → `logAudit()` | New services follow `student.ts` conventions |
| ID strategy | UUID primary keys (`Student.id`) | `LinkedDocument.id` UUID; match on `schoolStudentId` string |
| Client API | `apiGet` / `apiPost` with Bearer token | Add `apiGetBlob` for PDF download streams |
| Deployment | IIS → Express :3000; PM2 lifecycle | Worker runs under same service account with share ACL |

### What is new vs modified

| Artifact | Status | Purpose |
|----------|--------|---------|
| `prisma/schema.prisma` | **Modified** | Add `LinkedDocument`, `ShareScanRun`, `DiscoveredFile`, evidence join models |
| `server/src/app.ts` | **Modified** | Mount `/api/documents`, `/api/admin/scans` routers |
| `server/src/routes/documents.ts` | **New** | List, proxy download, manual link/unlink |
| `server/src/routes/scans.ts` | **New** | Admin: trigger scan, view run history |
| `server/src/services/shareAccess.ts` | **New** | UNC path join, existence check, read stream |
| `server/src/services/matching.ts` | **New** | Rule engine: folder name, filename, ID patterns |
| `server/src/services/linkedDocument.ts` | **New** | Upsert from scan; query by student |
| `server/src/jobs/discoveryScan.ts` | **New** | Background walker |
| `server/src/config/shareLayout.ts` | **New** | Documented folder rules (from Phase 6 recon) |
| `client/src/pages/StudentDetailPage.tsx` | **Modified** | Documents section |
| `client/src/components/documents/*` | **New** | Document list, open/download, evidence picker |
| `ecosystem.config.js` | **Modified** | Add `transcripts-worker` PM2 entry |
| `DEPLOYMENT-RUNBOOK.md` | **Modified** | Service account, share ACL, UNC smoke test |

### Prisma data model (recommended)

```prisma
enum LinkedDocumentStatus {
  DISCOVERED    // seen on share, not yet matched
  LINKED        // matched to a student
  ORPHAN        // no student match after rules
  STALE         // file removed from share (path missing on rescan)
}

enum ScanRunStatus {
  RUNNING
  COMPLETED
  FAILED
}

model ShareScanRun {
  id           String        @id @default(uuid())
  startedAt    DateTime      @default(now())
  completedAt  DateTime?
  status       ScanRunStatus @default(RUNNING)
  filesSeen    Int           @default(0)
  filesLinked  Int           @default(0)
  errorMessage String?
}

model LinkedDocument {
  id              String               @id @default(uuid())
  studentId       String?              // null until matched
  student         Student?             @relation(fields: [studentId], references: [id])
  relativePath    String               // path under share root, normalized
  fileName        String
  fileExtension   String?
  fileSizeBytes   BigInt?
  fileModifiedAt  DateTime?            // mtime from share
  contentHash     String?              // optional SHA-256 for change detection
  status          LinkedDocumentStatus @default(DISCOVERED)
  matchRule       String?              // which rule linked it (audit/debug)
  matchConfidence Float?               // 0–1 if fuzzy name match
  lastSeenScanId  String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  evidenceLinks   DocumentEvidence[]

  @@unique([relativePath])             // one row per share path
  @@index([studentId])
  @@index([status])
}

// Polymorphic evidence join — one document, many record types
model DocumentEvidence {
  id               String         @id @default(uuid())
  linkedDocumentId String
  linkedDocument   LinkedDocument @relation(fields: [linkedDocumentId], references: [id])
  recordType       String         // e.g. "Award", "Activity", "WorkExperience"
  recordId         String         // UUID of the target record row
  linkedByUserId   String
  linkedAt         DateTime       @default(now())

  @@unique([linkedDocumentId, recordType, recordId])
  @@index([recordType, recordId])
}
```

**Dependency:** `LinkedDocument.studentId` FK requires `Student` rows to exist before matching can succeed. Discovery can run first (status=`DISCOVERED`); matching runs after students exist.

---

## Recommended Project Structure (v2 additions)

```
spcs-transcripts/
├── client/src/
│   ├── api/
│   │   └── apiClient.ts          # add apiGetBlob() for PDF streams
│   ├── components/
│   │   └── documents/            # NEW
│   │       ├── DocumentList.tsx
│   │       ├── DocumentOpenButton.tsx
│   │       └── EvidenceLinkPicker.tsx
│   └── pages/
│       └── StudentDetailPage.tsx # MODIFIED — Documents tab
│
├── server/src/
│   ├── config/
│   │   └── shareLayout.ts        # NEW — folder rules from recon
│   ├── routes/
│   │   ├── documents.ts          # NEW
│   │   └── scans.ts              # NEW (admin)
│   ├── services/
│   │   ├── shareAccess.ts        # NEW — read-only UNC
│   │   ├── linkedDocument.ts     # NEW
│   │   └── matching.ts           # NEW
│   ├── jobs/
│   │   └── discoveryScan.ts      # NEW — worker entry
│   └── app.ts                    # MODIFIED — mount routers
│
├── server/prisma/
│   └── schema.prisma             # MODIFIED
│
└── ecosystem.config.js           # MODIFIED — api + worker processes
```

### Structure rationale

- **`services/shareAccess.ts` isolated from HTTP:** Discovery job and proxy route both call the same read-only I/O layer — single place for path sanitisation and ACL errors.
- **`jobs/` separate from `routes/`:** Scan is long-running; must not block Express event loop. Worker imports services, not routes.
- **`config/shareLayout.ts`:** Matching rules are data, not hardcoded in the matcher — updated after Phase 6 share inspection without refactoring engine logic.
- **Client `documents/` components:** Keeps student profile page thin; evidence picker reused across record-type sub-panels (Phase 11).

---

## Architectural Patterns

### Pattern 1: Reference-on-Share, Proxy-on-Request

**What:** Store only normalized relative paths in PostgreSQL. Serve file bytes through an authenticated Express route that reads from UNC server-side.

**When:** Any sensitive document on an internal share that browsers cannot access directly.

**Why not expose UNC in the UI:** Browsers cannot open `\\spcs-fs\...` from HTTPS pages; raw paths leak infrastructure details; bypasses JWT authorization.

**Example:**

```typescript
// server/src/routes/documents.ts
router.get('/:id/content', async (req, res, next) => {
  const doc = await getLinkedDocumentById(req.params.id)
  if (!doc?.studentId) return res.status(404).json({ error: 'Not found' })

  const absolutePath = shareAccess.resolveSafePath(doc.relativePath)
  res.setHeader('Content-Type', mimeFromExtension(doc.fileExtension))
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`)
  shareAccess.createReadStream(absolutePath).pipe(res)
})
```

**Client open flow:** `window.open` or `<a href>` to `/api/documents/:id/content` with Bearer token is awkward — use `apiFetch` → `blob()` → `URL.createObjectURL` for in-tab PDF viewing, or Content-Disposition attachment for download.

---

### Pattern 2: Two-Phase Discovery Pipeline (Scan → Match)

**What:** Separate filesystem enumeration from student matching. Scan is idempotent and path-keyed; matching is re-runnable when rules or student data change.

**When:** Share layout is initially unknown; matching rules will iterate; student records may be imported after first scan.

**Pipeline:**

```
Phase A — DISCOVER (filesystem truth)
  Walk \\spcs-fs\...\Student
  For each file: upsert LinkedDocument by relativePath
    - update mtime, size, lastSeenScanId
    - mark STALE if path absent on rescan

Phase B — MATCH (business rules)
  For each LinkedDocument where status IN (DISCOVERED, ORPHAN):
    Apply rules in priority order:
      1. Folder name == Student.schoolStudentId
      2. Filename contains schoolStudentId
      3. Folder name fuzzy-match Student.fullName (low confidence)
    On match: set studentId, status=LINKED, matchRule, matchConfidence
    On no match: status=ORPHAN
```

**Trade-offs:** Two phases add complexity but allow re-matching without re-walking the entire tree; critical when `schoolStudentId` is the primary key for folder-per-student layouts common on school shares.

---

### Pattern 3: Service Account for SMB (not per-request `net use`)

**What:** PM2 runs Express and the worker under a dedicated AD service account that has **read-only** ACL on the share. Node uses `fs` APIs against UNC paths directly.

**When:** Windows Server deployment accessing CIFS/SMB shares from a background service.

**Why not `NET USE` in application code:** Unreliable in Windows services; session-specific drive mappings invisible to PM2; credentials in code are a security anti-pattern (ServerFault, IBM UNC docs — MEDIUM confidence).

**Deployment checklist:**
1. Create AD service account (e.g. `svc-spcs-transcripts`)
2. Grant read-only NTFS + share permissions on `\\spcs-fs\Private\Administration\Office\Student`
3. Configure PM2 / Windows Service to run as that account (not `LocalSystem`)
4. Smoke test: `fs.readdir('\\spcs-fs\...\Student')` from worker process

**Fallback if share requires explicit credentials:** `@cityssm/windows-unc-path-connect` at process startup — not per HTTP request.

---

### Pattern 4: Evidence Join Table (not embedded paths on records)

**What:** Record entries (Award, Activity, etc.) link to `LinkedDocument` via `DocumentEvidence` join rows — many-to-many.

**When:** One certificate supports multiple awards; one award has multiple supporting documents.

**Why not duplicate path strings on each record:** Path changes on rescan would orphan evidence; join table keeps a single source of truth for the share path.

---

## Data Flow

### Request flow (existing — unchanged)

```
Browser → apiFetch('/students/:id') → IIS → Express
  → validateJwt → resolveUser → studentsRouter
  → studentService.getStudentById → Prisma → JSON response
```

### Flow 1: Discovery scan (background)

```
PM2 worker (cron / node-cron / pg-boss schedule)
    ↓
discoveryScan.run()
    ↓
INSERT ShareScanRun (status=RUNNING)
    ↓
shareAccess.walk(shareRoot) — async generator, batched
    ↓
For each file:
  upsert LinkedDocument (relativePath unique)
  update fileModifiedAt, fileSizeBytes, lastSeenScanId
    ↓
matching.applyRules() — all DISCOVERED/ORPHAN rows
    ↓
UPDATE ShareScanRun (filesSeen, filesLinked, status=COMPLETED)
    ↓
logAudit (model=ShareScanRun, action=CREATE)
```

### Flow 2: Staff views documents on student profile

```
Browser → GET /api/students/:id/documents
    ↓
validateJwt → linkedDocument.listByStudent(studentId)
    ↓
Prisma: LinkedDocument WHERE studentId AND status=LINKED
    ↓
JSON [{ id, fileName, fileModifiedAt, evidenceCount, ... }]
    ↓
React DocumentList renders rows with Open / Download actions
```

### Flow 3: Authenticated document open (proxy)

```
Browser → apiFetch('/documents/:id/content')  [Accept: application/pdf]
    ↓
validateJwt → getLinkedDocument → verify studentId present
    ↓
shareAccess.resolveSafePath(relativePath)
  — reject '..' path traversal
  — verify path still under SHARE_ROOT
    ↓
fs.createReadStream(absolutePath) → pipe → res
    ↓
Browser: blob → object URL → PDF viewer or download
```

### Flow 4: Evidence linking

```
Browser → POST /api/documents/:id/evidence
  { recordType: 'Award', recordId: '<uuid>' }
    ↓
validateJwt → verify record belongs to same student as document
    ↓
INSERT DocumentEvidence
logAudit (model=DocumentEvidence, action=CREATE)
    ↓
Record detail UI shows linked document badge with open action
```

### State management (client)

No global document store required at this scale. React Query or page-level `useEffect` fetch on student profile mount is sufficient. Invalidate document list after manual admin re-scan trigger.

---

## Scaling Considerations

| Concern | 200–600 students, ~3–8 staff | If share grows significantly |
|---------|------------------------------|------------------------------|
| Full tree scan | Acceptable nightly or hourly; ~minutes for thousands of files | Incremental scan by mtime watermark; skip unchanged paths via contentHash |
| Matching re-run | In-memory batch over PostgreSQL rows — trivial | Index on `status`; run matching only for changed paths |
| Proxy streaming | Sequential reads; school staff concurrency low | Optional short TTL cache of small files — usually unnecessary |
| Worker vs API | Separate PM2 process prevents scan blocking HTTP | Same machine; no horizontal scale needed |
| Database growth | One row per unique share path | `STALE` rows retained for audit; optional purge policy after N scans |

**Realistic volume:** 600 students × ~10 files × ~2 MB ≈ 12 GB on share — app DB holds metadata only (~1 KB/row).

---

## Anti-Patterns

### Anti-Pattern 1: Copying Share Files into App Storage

**What people do:** Download from share during discovery, store copies in `/uploads/`.

**Why wrong:** Duplicates authoritative data; doubles storage; sync drift when staff update files on share; contradicts v2.0 goal.

**Instead:** Path reference only; proxy reads live from share at open time.

---

### Anti-Pattern 2: Exposing UNC Paths to the Browser

**What people do:** Return `\\spcs-fs\...` in API JSON; staff click to open in Explorer.

**Why wrong:** HTTPS pages cannot open UNC links reliably; leaks infrastructure; no audit trail of who opened what; bypasses app authorization.

**Instead:** Return opaque `LinkedDocument.id`; stream via authenticated proxy.

---

### Anti-Pattern 3: Synchronous Full-Share Scan in HTTP Handler

**What people do:** `POST /api/admin/scans` walks entire tree before returning 200.

**Why wrong:** Large shares timeout IIS/Express; blocks other staff requests.

**Instead:** HTTP handler enqueues job and returns `202 { scanRunId }`; worker processes asynchronously; UI polls scan status.

---

### Anti-Pattern 4: Matching Before Students Exist

**What people do:** Run discovery + matching in production before Phase 2 student data is populated.

**Why wrong:** Everything becomes `ORPHAN`; staff lose trust; re-match required anyway.

**Instead:** Document matching rules in Phase 6; ensure student `schoolStudentId` values align with share folder naming; run first full match after student directory is seeded.

---

### Anti-Pattern 5: Write Access to the Share

**What people do:** Allow app to rename, move, or delete share files.

**Why wrong:** Explicit v2.0 out-of-scope; one bug could destroy authoritative school documents.

**Instead:** Read-only ACL on service account; no write APIs; staff manage files on share directly.

---

## Integration Points

### External Services

| Service | Integration pattern | v2 role | Notes |
|---------|---------------------|---------|-------|
| Microsoft Entra ID | MSAL browser + JWT validation (existing) | Unchanged | Document proxy uses same Bearer token |
| SMB file share `\\spcs-fs\...` | UNC read via Node `fs` under service account | **New read-only** | Layout TBD — Phase 6 recon required |
| PostgreSQL | Prisma 7 + `@prisma/adapter-pg` (existing) | **Extended schema** | Scan state + linked docs |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Express API ↔ Share access service | Direct function call | Shared by routes and worker |
| Express API ↔ Discovery worker | PostgreSQL (`ShareScanRun`, job queue) | No HTTP between processes |
| Discovery scan ↔ Matching engine | Sequential in worker; matching reads/writes Prisma | Re-run matching independently via admin action |
| LinkedDocument ↔ Student records | FK `studentId`; evidence joins to Phase 3 record tables | Record tables must exist before evidence UI (Phase 11) |
| React SPA ↔ Document proxy | `apiFetch` with Bearer; blob response | Do not use plain `<a href="/api/...">` without auth header |

---

## Suggested Build Order (v2.0 — Phase 6 onward)

Build bottom-up: share understanding → data model → I/O → scan → match → UI → evidence.

| Phase | Name | New / Modified | Depends on | Delivers |
|-------|------|----------------|------------|----------|
| **6** | Share layout & matching rules | **New** config/docs | v1 Phase 2 (`Student.schoolStudentId`) | Documented folder tree; rule priority; admin sign-off before any scan |
| **7** | LinkedDocument schema & SMB access | **New** models, services, deployment | Phase 6 rules; PM2 service account | Prisma migration; `shareAccess.ts`; UNC smoke test in runbook |
| **8** | Discovery scan job | **New** worker, `ShareScanRun` | Phase 7 | Scheduled walk; upsert by path; `DISCOVERED`/`STALE` status; admin trigger + history |
| **9** | Matching engine | **New** `matching.ts` | Phase 8 scan output; **students must exist** | Auto-link files to students; `ORPHAN` queue for manual review |
| **10** | Document list & auth proxy | **New** routes + UI | Phase 9 linked docs | Student profile document list; open/download via proxy; read-only enforced |
| **11** | Evidence linking | **New** join tables + UI | Phase 10; Phase 3 record types | Attach linked doc to award/activity/etc.; visible on record cards |

### Phase ordering rationale

```
Phase 6 (rules) ──▶ Phase 7 (schema + SMB)
                         │
                         ▼
                   Phase 8 (scan)
                         │
                         ▼
              Phase 9 (match) ◀── requires Student rows
                         │
                         ▼
                   Phase 10 (proxy + UI)
                         │
                         ▼
              Phase 11 (evidence) ◀── requires record entry tables
```

- **Phase 6 before code:** PROJECT.md requires folder structure documented before discovery runs — prevents garbage-in matching.
- **Phase 7 before 8:** Worker needs schema and working UNC access before first scan.
- **Phase 9 after students:** Matching keys off `schoolStudentId` and `fullName`; empty student table yields 100% orphans.
- **Phase 10 before 11:** Evidence links point at `LinkedDocument` rows staff can already view/open.
- **v1 Phase 4 (upload) superseded:** If v1 upload code exists, deprecate in favour of link model; do not run dual storage paths.

### Research flags per phase

| Phase | Research needed? | Topic |
|-------|------------------|-------|
| 6 | **Yes — human** | On-site share inspection; interview careers staff on naming conventions |
| 7 | Low | PM2 service account + IIS coexistence on Windows Server |
| 8 | Low | `node-cron` vs `pg-boss` — pg-boss preferred if already in stack; else `node-cron` in worker |
| 9 | Medium | Fuzzy name matching edge cases (preferred name vs legal name) |
| 10 | Low | PDF blob viewing in React; Content-Disposition patterns |
| 11 | Low | Polymorphic join vs per-table FK — polymorphic sufficient at this scale |

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| Existing codebase (`server/src/app.ts`, `schema.prisma`, `apiClient.ts`) | HIGH | Actual v1 architecture — React SPA + Express JWT + Prisma |
| PROJECT.md v2.0 milestone | HIGH | Share path, read-only constraint, feature list |
| Microsoft Learn — Azure Files SMB mount with service account | HIGH | Service account must mount/access share, not admin interactive session |
| ServerFault — network share access in Windows services | MEDIUM | Run as dedicated account; avoid `NET USE` in service |
| IBM docs — UNC path restrictions (`LocalSystem` → guest) | MEDIUM | PM2 must not run as LocalSystem for authenticated shares |
| `@cityssm/windows-unc-path-connect` (npm) | MEDIUM | Fallback for credential-based UNC connect at startup |
| Incremental sync / watermark pattern (ETL job builder, prisma-queue) | MEDIUM | Applicable to rescan optimization in later iterations |

---
*Architecture research for: SPCS Student Transcript System — v2.0 Network Document Linking*
*Researched: 2026-06-16*
