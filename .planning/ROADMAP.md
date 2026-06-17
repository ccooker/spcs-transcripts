# Roadmap: SPCS Student Transcript System

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-06-14) — [full archive](milestones/v1.0-ROADMAP.md)
- 📋 **v2.0 Network Document Linking** — Phases 6–11 (planned)

**Note:** v1 Phase 4 (Document Management / DOC-01..04 upload model) is superseded by v2.0 network share linking. Do not build dual storage paths.

---

## v1.0 MVP (Phases 1–5) — SHIPPED

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-06-14</summary>

- [x] Phase 1: Infrastructure & Auth (5/5 plans) — completed 2026-06-11
- [x] Phase 2: Student Profiles & Search (3/3 plans) — completed 2026-06-12
- [x] Phase 3: Student Records UI (6/6 plans) — completed 2026-06-13
- [x] Phase 4: Document Management (3/3 plans) — completed 2026-06-13 *(superseded by v2.0 linking)*
- [x] Phase 5: Transcript Assembly & Export (5/5 plans) — completed 2026-06-14

Production HTTPS checkpoint (Plan 01-05 Task 3) deferred — see `.planning/STATE.md` Deferred Items.

</details>

---

## v2.0 Network Document Linking (Phases 6–11)

**Milestone Goal:** Staff see student documents that already live on the school file server — discovered automatically, linked in the app, openable with auth — without uploading copies into the transcript system.

**Supersedes:** v1 Phase 4 upload model. Documents stay authoritative on `\\spcs-fs\...`; the app stores path references only.

### Phases

- [ ] **Phase 6: Share Reconnaissance & Path Configuration** — Document share layout, matching rules sign-off, admin path config and connectivity test
- [ ] **Phase 7: LinkedDocument Schema & SMB Access** — Prisma models, read-only UNC access layer, service account verification
- [ ] **Phase 8: Discovery Engine & Scan History** — Scheduled and manual scans, idempotent link persistence, stale detection, admin scan history
- [ ] **Phase 9: Matching Engine & Orphan Queue** — Auto-match by schoolStudentId, orphan queue, manual link/unlink, cohort unmatched dashboard
- [ ] **Phase 10: Document List & Authenticated Proxy** — Per-student document list UI, type inference, open/download via auth proxy, audit logging
- [ ] **Phase 11: Evidence Linking** — Attach linked documents to record entries as supporting evidence (requires v1 Phase 3 record types)

### Phase Details (v2.0)

### Phase 6: Share Reconnaissance & Path Configuration
**Goal:** Careers staff and IT document the share folder layout and matching rules, and Admin can configure and verify share connectivity before any discovery runs.
**Depends on:** Phase 1 (auth/roles for Admin)
**Requirements:** SHR-01, SHR-02, SHR-03, SHR-04, SHR-05
**Success Criteria:**
1. IT and careers staff produce a written layout spec documenting folder structure and naming conventions under the share root.
2. Admin can set the network share root path (e.g. `\\spcs-fs\Private\Administration\Office\Student`) in the application.
3. Admin can run a connectivity test and see whether the app service account can read the configured path before discovery is enabled.
4. The system loads student-matching rules from the documented share layout configuration (not hard-coded guesses).
5. Careers staff sign off on matching rules before production auto-discovery is allowed to run.
**Plans:** TBD
**UI hint**: yes

### Phase 7: LinkedDocument Schema & SMB Access
**Goal:** The application can safely read files from the network share under a verified service account, with path metadata persisted in the database and write operations blocked.
**Depends on:** Phase 6
**Requirements:** ACC-02
**Success Criteria:**
1. Linked document and scan-run database models exist and migrations apply cleanly on the on-premise PostgreSQL instance.
2. The app service account can read the configured share root via UNC paths in the production PM2 process identity (not LocalSystem).
3. All share access goes through a single read-only access layer that rejects delete, rename, and write operations.
4. Relative paths are normalized and stored; absolute UNC paths never appear in API responses or browser UI.
**Plans:** TBD

### Phase 8: Discovery Engine & Scan History
**Goal:** The system discovers files on the network share on a schedule or admin trigger, persists link metadata idempotently, detects removed files, and records scan run history.
**Depends on:** Phase 7
**Requirements:** DSC-01, DSC-02, DSC-05, ADM-01
**Success Criteria:**
1. Admin can trigger a discovery scan manually; the scan runs in a background worker and does not block the web UI.
2. A scheduled discovery scan runs automatically (e.g. nightly) without staff intervention.
3. Re-running a scan upserts linked document metadata by normalized relative path without creating duplicates.
4. Files removed or moved on the share are marked stale on the next rescan.
5. Admin can view scan run history showing file counts, orphan counts, and errors per run.
**Plans:** TBD

### Phase 9: Matching Engine & Orphan Queue
**Goal:** Discovered files are auto-matched to students where rules allow, unmatched files land in a review queue, and staff can manually link, unlink, or reassign with full audit trail.
**Depends on:** Phase 8, Phase 2 (Student rows with `schoolStudentId`)
**Requirements:** DSC-03, DSC-04, DSC-06, ADM-02
**Success Criteria:**
1. Discovery auto-matches files to students using `schoolStudentId` and configured path/filename rules.
2. Unmatched files appear in an orphan queue where staff can assign them to a student or dismiss them.
3. Staff can manually link, unlink, or reassign a document to a different student; each action is recorded in the audit log.
4. Admin and staff can view a cohort-wide unmatched-files dashboard and bulk-assign orphans to students.
**Plans:** TBD
**UI hint**: yes

### Phase 10: Document List & Authenticated Proxy
**Goal:** Staff can view, sort, filter, and open linked documents on a student profile through the authenticated app — replacing the v1 upload/download model entirely.
**Depends on:** Phase 9
**Requirements:** LNK-01, LNK-02, LNK-03, LNK-04, ACC-01, ACC-03
**Success Criteria:**
1. Staff see a per-student linked document list on the student profile showing name, inferred type, modified date, and link status.
2. Staff can sort and filter the document list by name, date, and type.
3. Auto-linked documents display the match rule and confidence (e.g. high vs needs review).
4. Staff can override inferred document type when heuristics are wrong.
5. Staff can open or download any linked document through the authenticated app proxy — no raw UNC paths appear in the browser.
6. Document views, downloads, and link/unlink actions are recorded in the audit log.
**Plans:** TBD
**UI hint**: yes

### Phase 11: Evidence Linking
**Goal:** Staff can attach linked network documents as supporting evidence on specific record entries, with full visibility when reviewing records.
**Depends on:** Phase 10, Phase 3 (v1 record entry types: awards, activities, work experience, etc.)
**Requirements:** EV-01, EV-02, EV-03
**Success Criteria:**
1. Staff can attach a linked network document to one or more record entries (award, activity, work experience, etc.) as supporting evidence.
2. Linked evidence is visible when viewing each record entry on the student profile.
3. Evidence linking is always staff-initiated — the system may suggest matches but never auto-commits evidence links.
4. Attaching or removing evidence is recorded in the audit log.
**Plans:** TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure & Auth | v1.0 | 5/5 | Complete | 2026-06-11 |
| 2. Student Profiles & Search | v1.0 | 3/3 | Complete | 2026-06-12 |
| 3. Student Records UI | v1.0 | 6/6 | Complete | 2026-06-13 |
| 4. Document Management | v1.0 | 3/3 | Complete (superseded) | 2026-06-13 |
| 5. Transcript Assembly & Export | v1.0 | 5/5 | Complete | 2026-06-14 |
| 6. Share Reconnaissance & Path Configuration | v2.0 | 0/? | Not started | — |
| 7. LinkedDocument Schema & SMB Access | v2.0 | 0/? | Not started | — |
| 8. Discovery Engine & Scan History | v2.0 | 0/? | Not started | — |
| 9. Matching Engine & Orphan Queue | v2.0 | 0/? | Not started | — |
| 10. Document List & Authenticated Proxy | v2.0 | 0/? | Not started | — |
| 11. Evidence Linking | v2.0 | 0/? | Not started | — |

---

## Coverage

### v1.0

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| STU-01 | Phase 2 |
| STU-02 | Phase 2 |
| NAV-01 | Phase 2 |
| NAV-02 | Phase 2 |
| NAV-03 | Phase 2 |
| STU-03 | Phase 3 |
| STU-04 | Phase 3 |
| STU-05 | Phase 3 |
| STU-06 | Phase 3 |
| STU-07 | Phase 3 |
| STU-08 | Phase 3 |
| DOC-01 | ~~Phase 4~~ Superseded by v2.0 |
| DOC-02 | ~~Phase 4~~ Superseded by v2.0 |
| DOC-03 | ~~Phase 4~~ Superseded by v2.0 |
| DOC-04 | ~~Phase 4~~ Superseded by v2.0 |
| TRN-01 | Phase 5 |
| TRN-02 | Phase 5 |
| TRN-03 | Phase 5 |

**17/17 active v1 requirements mapped. DOC-01..04 superseded.**

### v2.0

| Requirement | Phase |
|-------------|-------|
| SHR-01 | Phase 6 |
| SHR-02 | Phase 6 |
| SHR-03 | Phase 6 |
| SHR-04 | Phase 6 |
| SHR-05 | Phase 6 |
| ACC-02 | Phase 7 |
| DSC-01 | Phase 8 |
| DSC-02 | Phase 8 |
| DSC-05 | Phase 8 |
| ADM-01 | Phase 8 |
| DSC-03 | Phase 9 |
| DSC-04 | Phase 9 |
| DSC-06 | Phase 9 |
| ADM-02 | Phase 9 |
| LNK-01 | Phase 10 |
| LNK-02 | Phase 10 |
| LNK-03 | Phase 10 |
| LNK-04 | Phase 10 |
| ACC-01 | Phase 10 |
| ACC-03 | Phase 10 |
| EV-01 | Phase 11 |
| EV-02 | Phase 11 |
| EV-03 | Phase 11 |

**23/23 v2.0 requirements mapped. No orphans.**

---
*Roadmap created: 2026-06-11 (v1.0)*
*Last updated: 2026-06-16 — v2.0 Network Document Linking phases 6–11 added; Phase 4 superseded*
