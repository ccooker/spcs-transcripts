# Project Research Summary

**Project:** SPCS Student Transcript System — v2.0 Network Document Linking
**Domain:** On-premise school careers transcript app with SMB share discovery, path-reference linking, and authenticated document proxy
**Researched:** 2026-06-16
**Confidence:** HIGH

## Executive Summary

SPCS v2.0 is not a document management system — it is a **thin linking layer** that connects an existing Windows SMB share (`\\spcs-fs\Private\Administration\Office\Student`) to the careers transcript workflow. Experts build this pattern by storing normalized relative paths in PostgreSQL, walking the share with a background worker under a dedicated AD service account, and serving file bytes through an authenticated Express proxy. The share remains authoritative; the app holds metadata, match confidence, and evidence join rows only. This replaces the deferred v1 upload model entirely.

The recommended approach extends the existing stack without new infrastructure: native Node.js `fs` against UNC paths (no SMB client libraries), **fast-glob** for discovery walks, **node-cron** in a second PM2 worker process, Prisma schema extensions for `LinkedDocument` / `ShareScanRun` / `DocumentEvidence`, and Express streaming via `createReadStream` behind existing JWT middleware. No Redis, no cloud storage, no client-side npm additions. Deployment hinges on a read-only AD service account running PM2 — not `LocalSystem`, not mapped drive letters, not per-request `NET USE`.

The dominant risks are operational and organizational, not technical. **Discovery before share layout is documented** produces mass wrong-links and staff distrust. **PM2 service identity without share ACL** causes "works on my machine" failures in production. **Fuzzy name matching without disambiguation** can attach evidence to wrong students on formal transcripts. Mitigation is strict phase ordering: human share reconnaissance first, then SMB access verification, then worker-based scan/match, then proxy UI, then evidence linking after record types exist.

## Key Findings

### Recommended Stack

v2.0 adds minimal npm packages to the existing Express 5.2 + Prisma 7.8 + React/Vite + MSAL stack. No new ORM, no job queue infrastructure, no client dependencies.

**Core technologies:**
- **Node.js `fs` / `fs/promises`:** Read-only UNC access and streaming — works on Windows Server when PM2 process identity has share ACL; no SMB wire-protocol library needed
- **fast-glob 3.3.3:** Recursive share tree walk for discovery — UNC support via `cwd` option; replaces hand-rolled `readdir` recursion
- **node-cron 4.2.1:** Schedule nightly discovery scans in PM2 worker — ESM-compatible, `noOverlap: true` for long scans
- **mime-types 3.0.2:** Content-Type for proxied files — explicit control for inline PDF vs attachment download
- **Prisma schema extensions:** `LinkedDocument`, `ShareScanRun`, `DocumentEvidence` — path metadata only, `BigInt` for file size serialized to string in JSON
- **PM2 worker process (`spcs-worker`):** Isolated discovery runner — prevents share walks from blocking HTTP event loop
- **AD service account + `SHARE_ROOT` env:** Read-only ACL on share; full UNC paths only — never mapped drive letters

**Avoid:** smb2 npm, Redis/Bull, multer/upload pipelines, `express.static` on share root, copying files to `/uploads/`, exposing UNC paths in API JSON, `NET USE` in request handlers.

### Expected Features

**Must have (table stakes — v2.0 launch):**
- Share folder reconnaissance and documented layout rules (`shareLayout.ts`) — P0 blocker before any scan code
- Background discovery scan (scheduled + admin trigger) with idempotent rescans
- Rule-based auto-match to student via `schoolStudentId` / folder / filename patterns
- Orphan/unmatched queue with manual link/unlink override
- Stale file detection on rescan (`STALE` status when path absent)
- Per-student linked document list on profile (name, type inference, modified date, status)
- Authenticated open/download via server proxy (`GET /api/documents/:id/content`)
- Read-only share enforcement — no write/delete SMB operations
- Evidence linking: staff attach linked document to award/activity/work record entry
- Audit log for document views, downloads, and evidence link/unlink

**Should have (v2.x soon after launch):**
- Match confidence UI ("Auto-linked" vs "Needs review")
- Cohort-wide unmatched files dashboard with bulk assign
- Scan run history and stats for admins
- Inline PDF preview via `Content-Disposition: inline`
- Manual document type override when inference is wrong

**Defer (v3+ / if validated):**
- OCR / structured extraction from share PDFs (EXT-01..03)
- Real-time filesystem watch on SMB share
- Full share browser / generic file manager
- Automatic AI evidence linking
- Upload/copy files into app storage (v1 DOC-01 model — explicitly superseded)
- Two-way metadata sync back to share

### Architecture Approach

v2.0 extends the decoupled React SPA + Express API architecture with a read-only SMB integration layer and two-phase discovery pipeline (scan filesystem truth → apply business matching rules). Documents shift from upload + local storage to reference + proxy. A separate PM2 worker runs discovery asynchronously; HTTP handlers enqueue scans and return `202` with `scanRunId`.

**Major components:**
1. **shareAccess service** — UNC path join, traversal guard (`resolveSafePath`), `createReadStream`; shared by proxy route and worker
2. **discoveryScan job** — `fast-glob` walk, upsert `LinkedDocument` by `relativePath`, mark `STALE` on rescan
3. **matching engine** — Priority rules from `shareLayout.ts`: `schoolStudentId` in folder/filename → exact name → fuzzy (manual review only)
4. **linkedDocument service** — CRUD metadata; list by student; no binary writes
5. **Document proxy route** — JWT-gated stream; opaque UUID in API; never client-supplied paths
6. **DocumentEvidence join** — Polymorphic many-to-many: one `LinkedDocument` → multiple record entries
7. **React documents components** — `DocumentList`, `DocumentOpenButton`, `EvidenceLinkPicker` on `StudentDetailPage`

### Critical Pitfalls

1. **Discovery before share layout documented** — Walk share with careers staff first; derive matching rules from real samples; get sign-off before first auto-link; output `shareLayout.ts` config
2. **PM2/LocalSystem cannot see network share** — Dedicated AD service account with read-only ACL; PM2 runs as that account; smoke test `readdir(SHARE_ROOT)` at startup under production identity
3. **UNC exposure / path traversal in proxy** — Opaque document ID only; `resolveSafePath` rejects `..`; never return absolute UNC to client; audit every content stream
4. **Aggressive fuzzy name matching** — `schoolStudentId` match auto-links; fuzzy name never auto-links; persist `matchRule` + `matchConfidence`; block auto-link on duplicate-name ambiguity
5. **Synchronous full-share scan in HTTP handler** — Worker process only; `POST /api/admin/scans` returns `202`; UI polls `ShareScanRun` status
6. **Matching before student directory populated** — Gate first auto-match on student data readiness; support re-match-only job without full tree walk
7. **Copying share files to app storage** — Path reference only; deprecate v1 upload path; proxy reads live from share at open time

## Implications for Roadmap

Based on combined research, v2.0 should be structured as six phases (6–11) building bottom-up from share understanding through evidence linking. v1 Phase 4 (upload/storage) is superseded — do not build dual storage paths.

### Phase 6: Share Reconnaissance & Matching Rules
**Rationale:** PROJECT.md gates discovery on documented layout; all matching depends on real folder conventions — cannot be guessed from code
**Delivers:** Written layout spec, `shareLayout.ts` config, matching rule priority, careers staff sign-off, recon statistics script
**Addresses:** Share folder reconnaissance (P0), auto-match rule foundation, document type inference heuristics
**Avoids:** Discovery before layout documented (Pitfall 1), fuzzy match wrong student (Pitfall 4 — rules design)

### Phase 7: LinkedDocument Schema & SMB Access
**Rationale:** Worker and API need Prisma models and verified UNC I/O before any scan; deployment blocker for all filesystem operations
**Delivers:** Prisma migration (`LinkedDocument`, `ShareScanRun`), `shareAccess.ts`, `SHARE_ROOT` env, PM2 service account setup, UNC smoke test in runbook
**Uses:** Native `fs`, Prisma 7.8, optional `@cityssm/windows-unc-path-connect` fallback at startup
**Implements:** shareAccess service, read-only ACL enforcement
**Avoids:** PM2/LocalSystem share failure (Pitfall 2), write access to share (Pitfall 10)

### Phase 8: Discovery Engine & Link Persistence
**Rationale:** Populates `LinkedDocument` rows from share truth; must run in worker, not HTTP thread
**Delivers:** `discoveryScan.ts`, PM2 `spcs-worker` entry, `node-cron` schedule, admin scan trigger (`202` + poll), `ShareScanRun` history, stale detection, re-match-only job
**Addresses:** Background discovery scan, stale/missing file detection, scan run stats
**Avoids:** Synchronous scan in HTTP (Pitfall 5), copying files to `/uploads/` (Pitfall 6), no stale handling (Pitfall 8), matching before students exist (Pitfall 7)

### Phase 9: Matching Engine & Orphan Queue
**Rationale:** Separates business rules from filesystem enumeration; requires scan output and populated `Student` rows with `schoolStudentId`
**Delivers:** `matching.ts` rule engine, auto-link by ID/folder/filename, `ORPHAN` status queue, manual link/unlink API, admin orphan routes with role gate
**Addresses:** Automated student matching, manual link/unlink override, orphan/unmatched queue
**Avoids:** Fuzzy match wrong student (Pitfall 4), matching before students exist (Pitfall 7)

### Phase 10: Document List & Auth Proxy
**Rationale:** Staff-facing value — open student profile and see/share-open documents; requires linked rows from Phase 9
**Delivers:** `GET /api/documents/:id/content` streaming proxy, student profile document list UI, `apiGetBlob` client helper, document view audit logging, read-only enforcement, v1 upload deprecation/migration messaging
**Uses:** `mime-types`, Express `createReadStream` pipe, MSAL Bearer via `apiFetch`
**Implements:** Document proxy route, `DocumentList` / `DocumentOpenButton` components
**Avoids:** UNC exposure / path traversal (Pitfall 3), document IDOR (Pitfall 9), client-side open without auth header, memory exhaustion on large PDFs

### Phase 11: Evidence Linking
**Rationale:** Core v2 differentiator; requires both `LinkedDocument` rows staff can view AND Phase 3 record entry tables (awards, activities, work experience)
**Delivers:** `DocumentEvidence` join table, evidence attach/detach API, `EvidenceLinkPicker` UI on record entries, evidence badge on record cards and document list
**Addresses:** Evidence linking (network document → specific record entry), audit for link/unlink
**Avoids:** Auto-commit AI evidence links (anti-feature), duplicate path strings on records

### Phase Ordering Rationale

```
Phase 6 (rules) ──▶ Phase 7 (schema + SMB)
                         │
                         ▼
                   Phase 8 (scan)
                         │
                         ▼
              Phase 9 (match) ◀── requires Student rows (Phase 2)
                         │
                         ▼
                   Phase 10 (proxy + UI)
                         │
                         ▼
              Phase 11 (evidence) ◀── requires record entry tables (Phase 3)
```

- **Phase 6 is human-first, not code-first** — prevents garbage-in matching that destroys staff trust
- **Phase 7 unblocks all I/O** — no scan or proxy work until service account ACL verified on production server
- **Phases 8–9 split scan from match** — allows re-matching when students are bulk-imported without re-walking entire share tree
- **Phase 10 delivers standalone value** — document list + open/download works before evidence linking
- **Phase 11 is the transcript workflow payoff** — but correctly deferred until record types exist
- **v1 upload path must be deprecated** — dual storage creates sync drift and contradicts v2 goal

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6:** Human — on-site share inspection with careers staff; naming conventions unknown until walked
- **Phase 9:** Medium — fuzzy name matching edge cases (twins, preferred vs legal name, duplicate surnames)

Phases with standard patterns (skip research-phase):
- **Phase 7:** Low — PM2 service account + native `fs` on UNC well-documented for Windows Server
- **Phase 8:** Low — `node-cron` + `fast-glob` patterns established; no Redis needed for single-server nightly scan
- **Phase 10:** Low — Express stream proxy + React blob URL pattern standard
- **Phase 11:** Low — Polymorphic join table sufficient at this scale

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm versions verified 2026-06-16; extends proven v1 stack; native fs on Windows UNC confirmed by Microsoft/community sources |
| Features | HIGH | School DMS patterns well-documented (OpenEduCat, DocumentLOK); project-specific requirements in PROJECT.md; share layout is the one unknown |
| Architecture | HIGH | Integrates cleanly with existing Express + Prisma + PM2 + IIS deployment; component boundaries clear |
| Pitfalls | HIGH | Windows SMB service identity, browser UNC restrictions, path traversal well-documented; matching pitfalls validated against school DMS patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **SPCS share folder layout unknown:** Must be resolved in Phase 6 via on-site reconnaissance with careers staff — matching rules cannot be finalized until real folder tree is walked
- **`schoolStudentId` alignment with share naming:** Validate that share folders/files use the same ID format as `Student.schoolStudentId` in the database — if not, primary match rule must be adjusted
- **v1 upload migration path:** If any v1 uploaded documents exist in production, need explicit migration/deprecation plan in Phase 10 — not researched in detail
- **Service account provisioning timeline:** School IT must create read-only AD account before Phase 7 go-live — deployment dependency, not a code feature but a launch blocker
- **Antivirus interaction on proxy reads:** Large PDF streaming may hit double AV scan latency — coordinate with IT during Phase 10 performance validation

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view` queries, 2026-06-16) — fast-glob 3.3.3, node-cron 4.2.1, mime-types 3.0.2
- [Microsoft Learn — SMB file sharing overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview) — SMB access patterns
- [Microsoft Q&A — SMB share service account access](https://learn.microsoft.com/en-us/answers/questions/5830388/how-to-get-a-task-scheduler-task-to-access-an-smb) — service account requirements
- Existing codebase — `server/src/app.ts`, `schema.prisma`, `apiClient.ts`, `DEPLOYMENT-RUNBOOK.md`, `ecosystem.config.js`
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` — v2.0 milestone scope and constraints

### Secondary (MEDIUM confidence)
- [OpenEduCat DMS docs](https://newdocs.openeducat.org/features/advanced/documents/) — student file organization, share migration patterns
- [DocumentLOK](https://www.documentlok.com/) — SIS-embedded document access, auto-indexing patterns
- [DBOMS evidence linking](https://dboms.com/solutions/evidence-linking) — link-once-reference-everywhere pattern
- ServerFault / Stack Overflow — Windows service UNC access, `LocalSystem` limitations, secure file proxy patterns
- [node-cron v4 migration guide](https://nodecron.com) — ESM import, `noOverlap` for long scans
- fast-glob README — UNC path via `cwd` and `convertPathToPattern`

### Tertiary (LOW confidence)
- School-specific share naming conventions — requires Phase 6 validation on-site
- Antivirus exclusion feasibility for service account read pattern — IT policy dependent

---
*Research completed: 2026-06-16*
*Ready for roadmap: yes*
