# Feature Research

**Domain:** Network file-share document linking for school careers transcript system (v2.0 milestone)
**Researched:** 2026-06-16
**Confidence:** HIGH (school DMS patterns, SMB/UNC integration patterns well-documented); MEDIUM (SPCS share folder layout unknown — matching rules TBD after inspection)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features careers staff assume when documents "live on the share and show up in the app." Missing these = product feels broken or no better than opening File Explorer.

#### Share Discovery & Matching

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Share folder reconnaissance and documented layout | Cannot auto-match without knowing how files are organised; PROJECT.md gates discovery on this | Low (one-time) | Walk `\\spcs-fs\Private\Administration\Office\Student`, document hierarchy, naming conventions, file types; output `shareLayout.ts` config — prerequisite for all discovery |
| Background discovery scan (scheduled or admin-triggered) | Staff expect files to appear without manual registration; enterprise DMS products (DocumentLOK IdentiFile, OpenEduCat import) index existing shares rather than re-upload | Medium | Walk share tree via service account; upsert `LinkedDocument` rows by normalized relative path; idempotent rescans; run as PM2 worker, not HTTP thread |
| Automated student matching from path/filename rules | School shares typically use per-student folders or student-ID-in-filename patterns (OpenEduCat: "one folder per student"; rule-based renamers match `{studentId}.jpg`) | Medium | Primary anchor: `Student.schoolStudentId` (unique in schema); secondary: normalized name tokens from folder/filename; rules live in config, not hardcoded |
| Unmatched/orphan file queue | Auto-match will fail for ambiguous names, typos, new students not yet in system; staff need a place to resolve | Medium | Status `ORPHAN` / `DISCOVERED`; admin/staff UI to manually assign to student or dismiss; without this, trust in automation erodes quickly |
| Stale/missing file detection on rescan | Files move, rename, or delete on share; app must not show ghost documents | Low–Medium | Compare scan results to DB; mark `STALE` when path absent; optional: detect mtime/size change for "file updated on share" indicator |
| Manual link and unlink override | Staff know the share better than any rule engine; mis-matches are inevitable at 200–600 students | Low | Override auto-match; audit who linked/unlinked; does not move files on share — metadata only |

#### Student Profile Document List

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-student linked document list on profile | Core v2 deliverable — replaces v1 DOC-02 upload list; staff open student record and see their share files | Low | Columns: file name, inferred type, last modified (share mtime), link status, open action; depends on `Student` entity (Phase 2) |
| Document type classification | v1 DOC-04 tags (Report Card, Certificate, Award Letter, etc.) still expected; staff filter mentally by type | Low–Medium | Infer from folder segment, filename keywords, or extension heuristics before manual override; no upload step — classification is metadata on link row |
| Sort/filter document list (name, date, type) | Table stakes for any document list UI at this scale | Low | Client-side sufficient for ~5–30 docs per student |

#### Authenticated Access

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Open/download through authenticated app (proxy stream) | Browsers cannot open raw UNC from HTTPS app; staff must not copy-paste `\\spcs-fs\...` paths; school DMS products serve files through app layer with permission checks | Medium | `GET /api/documents/:id/content` streams via server-side UNC read; inherits JWT auth (`validateJwt` → `resolveUser`); never expose absolute paths to client |
| Read-only share access from app | Explicit PROJECT.md constraint; authoritative files stay on file server | Low (policy) | Service account granted read-only ACL; no delete/rename/write SMB operations in app code; staff manage files in Explorer |
| Access audit logging | Student records governance; who opened which document when | Low–Medium | Extend existing `AuditLog` pattern — log document views/downloads and evidence link changes with acting user |

#### Dependencies on Existing Platform

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Requires authenticated staff (Entra ID SSO) | All document endpoints must be gated same as student records | — (built) | AUTH-01/02 already planned; document routes mount under `/api` with same middleware stack |
| Requires student profile entity | Nothing to match or list without `Student` rows | — (Phase 2) | Matching key: `schoolStudentId`; FK `LinkedDocument.studentId → Student.id` |
| Requires audit infrastructure | Document access is sensitive; reuse AUTH-03 pattern | — (Phase 1) | New audit models: `LinkedDocument`, `ShareScanRun`, `DocumentEvidence` |

---

### Differentiators (Competitive Advantage)

Features that deliver the Core Value — *open student record, produce transcript in one session without hunting folders* — beyond bare file listing.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Evidence linking (network document → specific record entry) | Staff prove "this certificate supports this award"; recipients trust transcript data; DBOMS-style "link once, reference everywhere" without duplicating files on share | Medium | Many-to-many join: one `LinkedDocument` → multiple awards/activities/work entries; visible badge on record entry and in document list; **v2 core** per PROJECT.md (replaces deferred v1.x evidence feature) |
| Match confidence indicator | Staff quickly spot uncertain auto-links before relying on them for evidence | Low | Store `matchRule` + `matchConfidence` (0–1); surface "Auto-linked (high)" vs "Needs review" in UI |
| Unmatched files dashboard (cohort-wide) | Careers team sees "12 new files couldn't be matched" after scan — proactive cleanup vs per-student archaeology | Medium | Aggregate `ORPHAN`/`DISCOVERED` rows; filter by folder, date, extension; bulk assign to student |
| Scan run history and stats | IT/admin visibility: files seen, linked, orphaned, errors — operational confidence | Low | `ShareScanRun` model: started/completed, counts, error message; admin-only view |
| In-app PDF preview (inline) | Faster verification than download-open cycle when linking evidence | Medium | Proxy stream with `Content-Disposition: inline`; browser PDF viewer; fallback to download for non-PDF |
| "Open containing folder" hint (not raw UNC) | Helps staff who need to fix files on share — show human-readable relative path or last-known folder name without exposing server internals | Low | Display share-relative path sanitized for staff context; optional copy of folder segment only |
| Rescan-on-demand for one student | After staff reorganise a student's share folder, refresh without full-tree scan | Medium | Scope scan to student's known folder prefix once layout documented; nice accelerator, not day-one |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem natural but conflict with v2.0 scope, school constraints, or the read-only share model.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Upload/copy files into app storage (v1 DOC-01 model) | Familiar web-app pattern; staff have a stray PDF in email | Duplicates authoritative share; doubles storage; contradicts v2.0 milestone goal | Link from share only; staff save file to correct share folder, next scan picks it up |
| Delete or replace files on share from app | Mistake correction; "wrong version uploaded" | One mis-click destroys authoritative school records; read-only is explicit safety decision | Staff delete/replace in File Explorer on share; rescan updates app metadata |
| Expose raw UNC paths in browser UI or API responses | Power users want direct path | Security leak (server topology); browsers can't open UNC from web anyway; bypasses auth audit | Proxy download only; show sanitized relative path if needed |
| Real-time filesystem watch (inotify/FSEvents on share) | Instant updates when file lands | SMB watch unreliable at scale; network churn; complex on Windows shares | Scheduled scan (nightly + admin trigger) — sufficient for 3–8 staff, low doc velocity |
| Full share browser (navigate entire tree in app) | "Just let me browse the share" | Scope creep into generic file manager; permission model differs from student-scoped view; Glance/smb-browser is a different product | Student-scoped list + orphan queue only |
| Automatic OCR / data extraction from share files (EXT-01..03) | Eliminate manual record entry | High complexity; varied PDF layouts; explicitly deferred in PROJECT.md | Manual record entry + evidence link to source PDF on share; revisit extraction later if pain validated |
| Automatic evidence linking (AI guesses which award a cert belongs to) | Saves clicks | Wrong links on formal documents worse than no links; staff must own traceability | Staff-initiated link via picker UI; system suggests at most, never auto-commits |
| Two-way sync (app metadata writes back to share) | Sidecar metadata files next to documents | Share becomes dependency of app writes; breaks other departments' folder conventions; backup/ACL complexity | Database is metadata source of truth; share holds bytes only |
| Public or unauthenticated share links | Easy sharing with external recipients | Student data exposure; no audit trail; smb-browser-style anonymous links inappropriate for student records | Staff download via auth proxy, email PDF themselves (existing out-of-scope for SMTP) |
| Student self-service document access | Students want portal | Explicitly out of scope; doubles auth/privacy surface | Staff deliver exported transcript PDF |
| Version history stored in app | Track document revisions | Share may not have versioning; app doesn't own files; versioning belongs on file server or DMS | Show share `fileModifiedAt`; note "file changed on share" after rescan |
| Replacing SIS / becoming full DMS | Centralise all school documents | OpenEduCat/DocumentLOK scope; careers team needs ~6 record types + evidence, not institution-wide ECM | Stay scoped to careers transcript workflow and one share root |

---

## Feature Dependencies

```
Microsoft Entra ID SSO (AUTH-01)
  └─ All document API routes (JWT validation)

Student Profile (STU-01, schoolStudentId)
  ├─ Automated matching (anchor on schoolStudentId)
  ├─ Per-student document list
  └─ Evidence linking (record entries require student context)

Audit Logging (AUTH-03)
  └─ Document view/download + link/unlink + scan trigger events

Share Folder Reconnaissance (Phase 0 / pre-discovery)
  └─ shareLayout config (folder depth, naming patterns)
        └─ Discovery Scan Job
              ├─ LinkedDocument rows (DISCOVERED → LINKED | ORPHAN)
              ├─ Stale detection (rescan)
              └─ Unmatched files dashboard

LinkedDocument (matched to student)
  ├─ Student profile document list
  ├─ Authenticated proxy open/download
  └─ Evidence Linking (DocumentEvidence join)
        └─ requires: Record entries (STU-03..06 awards, activities, work exp)

Record Type Entries (Phase 3)
  └─ Evidence picker target entities (Award, Activity, WorkExperience, etc.)

Evidence Linking
  └─ enhances: Transcript assembly (staff verify claims against linked PDFs)

Discovery Scan Job
  └─ conflicts-with: v1 Upload Model (DOC-01..04) — v2 replaces upload path
```

### Dependency Notes

- **Matching requires Student.schoolStudentId:** The schema already defines `schoolStudentId String @unique` — matching rules should prefer this over fuzzy name match. Name-based fallback needs confidence scoring and staff review queue.
- **Document list requires linked row, not live share read:** UI reads from PostgreSQL; share is consulted only on scan and on download stream — keeps profile page fast and works when share is briefly offline (show stale badge).
- **Evidence linking requires both LinkedDocument and record entries:** Cannot attach evidence until Phase 3 record types exist; document discovery can ship earlier and stand alone.
- **Proxy download requires service account ACL:** Deployment dependency — Windows service account with read access to share root; documented in runbook, not a code feature but a launch blocker.
- **v2 document features supersede v1 DOC-* upload features:** Roadmap should swap Phase 4 from upload/storage to share linking; do not build both paths.

---

## MVP Definition

### Launch With (v2.0)

Minimum to validate: *staff open a student profile and see/share-linked documents from the file server, open them with auth, and attach one as evidence for a record entry.*

**Pre-requisite (not optional)**
- [ ] Share folder inspection and documented layout rules — gate before first scan

**Discovery & Matching**
- [ ] Background discovery scan (scheduled + admin manual trigger)
- [ ] Rule-based auto-match to student via `schoolStudentId` / folder / filename patterns
- [ ] Orphan/unmatched queue with manual link to student
- [ ] Stale file marking on rescan

**Student Profile Documents**
- [ ] Document list on student profile (name, type inference, modified date, status)
- [ ] Authenticated open/download via server proxy (read-only)

**Evidence & Governance**
- [ ] Staff attach linked document as evidence on a record entry (award, activity, work experience)
- [ ] Evidence visible on record entry view
- [ ] Audit log for document access and evidence link/unlink
- [ ] Read-only enforcement — no write/delete to share from app

### Add After Validation (v2.x)

- [ ] Match confidence UI and bulk review workflow for low-confidence links
- [ ] Cohort-wide unmatched files dashboard with filters
- [ ] Inline PDF preview in browser
- [ ] Scoped rescan for single student folder
- [ ] Manual document type override when inference wrong
- [ ] Scan run history dashboard for admins

### Future Consideration (v3+ / if validated)

- [ ] OCR / structured extraction from share-linked PDFs (EXT-01..03) — high cost; only if manual entry pain persists
- [ ] Content-hash deduplication across paths (same file copied to two folders)
- [ ] Email notification when scan finds new unmatched files — small team may not need
- [ ] SharePoint/OneDrive connector — school uses on-prem SMB; defer unless IT migrates share

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Share folder reconnaissance + layout doc | Critical — blocker | Low | P0 |
| Discovery scan job | Critical | Medium | P1 |
| Auto-match to student (schoolStudentId rules) | Critical | Medium | P1 |
| Student profile document list | Critical | Low | P1 |
| Auth proxy open/download | Critical | Medium | P1 |
| Read-only share enforcement | Critical (safety) | Low | P1 |
| Manual link/unlink override | High | Low | P1 |
| Orphan queue (basic) | High | Medium | P1 |
| Stale detection on rescan | High | Low–Medium | P1 |
| Evidence linking to record entries | High — core value | Medium | P1 |
| Document type inference | Medium | Low–Medium | P2 |
| Audit log for doc access | Medium (governance) | Low | P2 |
| Match confidence display | Medium | Low | P2 |
| Unmatched files dashboard (cohort) | Medium | Medium | P2 |
| Scan run history (admin) | Medium | Low | P2 |
| Inline PDF preview | Medium | Medium | P3 |
| Per-student scoped rescan | Low–Medium | Medium | P3 |
| OCR/extraction from share files | High (long-term) | High | Deferred |

**Priority key:**
- P0: Prerequisite before any code
- P1: Must have for v2.0 launch
- P2: Should have soon after launch
- P3: Nice to have

---

## Competitor Feature Analysis

How enterprise/school document systems handle the same problem — and how SPCS v2.0 differs.

| Feature | DocumentLOK (SIS plugin) | OpenEduCat DMS | Generic ECM (SharePoint/Dokmee) | SPCS v2.0 Approach |
|---------|--------------------------|----------------|-----------------------------------|---------------------|
| Document source | Central DMS repository; import from shares | Central store; migration from file servers | Central store; automated indexing (OCR/AI) | **Share remains authoritative**; app holds references only |
| Student association | Index/burst by student ID; embedded in SIS | Attach docs to student profile | Metadata tags + folder hierarchy | Auto-discovery + rule match on `schoolStudentId`; manual override |
| Auto-filing | IdentiFile: burst mass PDFs into student folders | Bulk import preserving folder structure | AI indexing from content | Folder/filename rules from documented share layout — no content OCR at launch |
| Evidence linking | Query completeness ("which docs missing") | Attach to student profile | Link to requirements/assets (DBOMS pattern) | Link share doc → specific award/activity/work record entry |
| Access model | Role-based inside SIS | Role-based DMS permissions | ECM governance + audit | Entra SSO + app proxy stream; read-only SMB service account |
| Write-back to files | DMS owns writes | DMS owns writes | ECM owns versioning | **Read-only** — staff edit share directly |
| Completeness reporting | Built-in missing-doc queries | Category/folder views | Compliance dashboards | Defer — STU-09 completeness is record entries, not share docs |

**Positioning:** SPCS v2.0 is not a DMS replacement. It is a **thin linking layer** that connects an existing SMB share to the transcript workflow — closer to DocumentLOK's "access from within the system" embed pattern than to OpenEduCat's full central repository, but without copying files.

---

## Sources

- [OpenEduCat DMS — student file organization, share migration](https://newdocs.openeducat.org/features/advanced/documents/) — HIGH confidence (official product docs)
- [DocumentLOK — IdentiFile auto-indexing, SIS-embedded access, completeness queries](https://www.documentlok.com/) — MEDIUM confidence (vendor marketing; patterns confirmed across school DMS category)
- [DBOMS evidence linking — master file linked to multiple records](https://dboms.com/solutions/evidence-linking) — MEDIUM confidence (compliance DMS; linking pattern transferable)
- [Dokmee — automated document indexing via folder + metadata](https://www.dokmee.com/blog/document-indexing) — MEDIUM confidence
- [Microsoft Learn — SMB file sharing overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview) — HIGH confidence (official)
- [DEV — database as source of truth, files as assets pattern](https://dev.to/mehartung/keep-your-source-of-truth-in-the-database-not-in-files-a-pattern-for-document-heavy-apps-546g) — MEDIUM confidence (architecture pattern)
- Project context: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/research/ARCHITECTURE.md` — HIGH confidence (project-specific)
- Prisma schema: `Student.schoolStudentId`, auth/audit models — HIGH confidence (codebase)

---
*Feature research for: SPCS v2.0 Network Document Linking*
*Researched: 2026-06-16*
