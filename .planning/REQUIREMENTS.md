# Requirements: SPCS Student Transcript System

**Defined:** 2026-06-11
**Core Value:** A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session ΓÇö no hunting through spreadsheets, emails, or paper.

## v1.0 Requirements (Prior Milestone ΓÇö In Progress)

These remain from the v1.0 roadmap. Phase 1 largely complete; Phases 2ΓÇô5 not yet shipped.

### Access Control

- [ ] **AUTH-01**: Staff can log in using their Microsoft school account (Entra ID / Azure AD SSO)
- [ ] **AUTH-02**: System enforces two roles ΓÇö Admin (manage templates, delete records, manage users) and Staff (create and edit records, generate transcripts)
- [ ] **AUTH-03**: All record create, update, and delete operations are logged with the acting user, the affected record, the action, and a timestamp

### Student Records

- [ ] **STU-01**: Staff can create a student profile (name, year level, contact details)
- [ ] **STU-02**: Staff can view, edit, and delete student profiles
- [ ] **STU-03**: Staff can add, edit, and delete academic results per student (subject, grade, year, optional notes)
- [ ] **STU-04**: Staff can add, edit, and delete extracurricular activity entries per student (organisation, role, start and end dates, description)
- [ ] **STU-05**: Staff can add, edit, and delete award and achievement entries per student (title, issuer, date, level ΓÇö school/regional/state/national, description)
- [ ] **STU-06**: Staff can add, edit, and delete work experience entries per student (employer, role, start and end dates, description)
- [ ] **STU-07**: Staff can add and edit career interests and goals per student (structured interest areas selection + free-text description)
- [ ] **STU-08**: Staff can add timestamped notes to a student's record; notes are attributed to the entering staff member and the full notes history is visible

### Document Management (Superseded by v2.0)

- [ ] ~~**DOC-01**: Staff can upload one or more PDF files to a student's record~~ ΓÇö Superseded by v2.0 network linking
- [ ] ~~**DOC-02**: Staff can view the document list for a student and download original files~~ ΓÇö Superseded by v2.0 LNK-* / ACC-*
- [ ] ~~**DOC-03**: Staff can soft-delete an uploaded document~~ ΓÇö Superseded; v2.0 is read-only share access
- [ ] ~~**DOC-04**: Staff can assign a document type tag to each uploaded file~~ ΓÇö Superseded by v2.0 LNK-02

### Transcript Generation

- [ ] **TRN-01**: Staff can open a transcript template for any student and fill in narrative text sections (one section per record type: academics, activities, awards, work experience, career goals, staff endorsement)
- [ ] **TRN-02**: Staff can set a per-student transcript status to Draft or Finalised
- [ ] **TRN-03**: Staff can export a student's transcript as a formatted PDF with school branding (logo and letterhead configurable by Admin)

### Search & Navigation

- [ ] **NAV-01**: Staff can search the student list by name
- [ ] **NAV-02**: Staff can filter the student list by year level and transcript status (Draft / Finalised / None)
- [ ] **NAV-03**: Staff can view a cohort overview table showing all students with status indicators per student

## v2.0 Requirements (Current Milestone: Network Document Linking)

### Share Layout & Configuration

- [ ] **SHR-01**: IT and careers staff document the folder layout and naming conventions under the configured share root
- [ ] **SHR-02**: System loads student-matching rules from a documented share layout configuration
- [ ] **SHR-03**: Careers staff sign off on matching rules before production auto-discovery runs
- [ ] **SHR-04**: Admin can configure the network share root path for student documents (e.g. `\\spcs-fs\Private\Administration\Office\Student`)
- [ ] **SHR-05**: Admin can test the configured path and see whether the app service account can read it before discovery runs

### Discovery & Matching

- [ ] **DSC-01**: System runs scheduled and admin-triggered discovery scans of the configured network share
- [ ] **DSC-02**: Discovery scan upserts linked document metadata by normalized relative path (idempotent rescans)
- [ ] **DSC-03**: System auto-matches discovered files to students using `schoolStudentId` and configured path/filename rules
- [ ] **DSC-04**: Unmatched files appear in an orphan queue for staff to assign or dismiss
- [ ] **DSC-05**: System marks linked documents stale when files are removed or moved on the share
- [ ] **DSC-06**: Staff can manually link, unlink, or reassign documents with an audit trail

### Document List & Metadata

- [ ] **LNK-01**: Staff see a per-student linked document list on the student profile (name, type, modified date, link status)
- [ ] **LNK-02**: System infers document type from folder/filename heuristics; staff can override type metadata
- [ ] **LNK-03**: Staff can sort and filter the document list by name, date, and type
- [ ] **LNK-04**: Auto-linked documents show match rule and confidence (e.g. high vs needs review)

### Authenticated Access

- [ ] **ACC-01**: Staff open or download linked documents through an authenticated app proxy (no raw UNC paths in the browser)
- [ ] **ACC-02**: App enforces read-only access to the network share (no delete, rename, or write from the app)
- [ ] **ACC-03**: Document views, downloads, and link/unlink actions are audit-logged

### Evidence Linking

- [ ] **EV-01**: Staff attach a linked network document to one or more record entries as supporting evidence
- [ ] **EV-02**: Linked evidence is visible when viewing each record entry
- [ ] **EV-03**: Evidence linking is staff-initiated only (system may suggest matches but never auto-commits)

### Admin Operations

- [ ] **ADM-01**: Admin can view scan run history with file counts, orphans, and errors
- [ ] **ADM-02**: Staff can view a cohort-wide unmatched-files dashboard with bulk assign

## Future Requirements (Deferred)

### PDF Data Extraction

- **EXT-01**: PDFs are processed to extract structured data (grades, dates, descriptions) using OCR and layout analysis
- **EXT-02**: Staff can review extracted fields side-by-side with the source PDF before committing to the student record
- **EXT-03**: Original file is always retained regardless of extraction outcome

### Transcript Enhancements

- **TRN-04**: System archives each generated PDF transcript per student with date, generator, and recipient type
- **TRN-05**: Staff can generate transcripts for an entire year-level cohort in a single batch operation (queue-based, zip download)
- **TRN-06**: Staff can flag a transcript for internal peer review before finalisation; reviewer can add comments

### Student Record Enhancements

- **STU-09**: Student profile displays a completeness indicator highlighting which record types have no entries
- **STU-10**: Admin can bulk-import student profiles from a CSV file

### Reporting

- **RPT-01**: Admin can view a summary report of transcript completion status across all year levels

## Out of Scope

| Feature | Reason |
|---------|--------|
| PDF upload and in-app file storage (v1 DOC-01..04) | Superseded by v2.0 network share linking ΓÇö documents stay authoritative on file server |
| Delete or replace files on network share from app | Read-only access prevents accidental destruction of school records; staff manage files in Explorer |
| Raw UNC paths in browser UI or API | Security leak; browsers cannot open UNC from HTTPS; bypasses auth audit |
| Real-time filesystem watch on SMB share | Unreliable at scale on Windows shares; scheduled scan sufficient for 3ΓÇô8 staff |
| Full share browser (navigate entire tree) | Scope creep into generic file manager; student-scoped list + orphan queue only |
| Automatic OCR / data extraction (EXT-01..03) | High complexity; deferred until manual entry pain validated |
| Automatic AI evidence linking | Wrong links on formal documents worse than no links; staff must own traceability |
| Student self-service portal | Doubles auth complexity; raises privacy governance requirements; students receive PDF by staff delivery |
| AI-generated narrative text | Creates liability for formal university/employer documents; staff must own tone and content |
| In-system email delivery (SMTP) | 3ΓÇô8 staff can email exported PDFs themselves; adds SMTP config, bounce handling, security scope |
| Digital signatures / QR verification | Overkill for ~500 documents/year sent directly by known staff |
| SIS integration (SIMON, Compass, etc.) | Each SIS has different API; fragile mapping; defer until manual pain validated |
| Multi-school / multi-campus support | Single-school deployment only |
| Cloud-hosted database | School data governance / privacy policy; student records cannot leave school network |
| Parent/guardian portal | Not in careers team's remit; adds identity, consent, and privacy layer |
| Attendance and discipline records | SIS domain; careers staff do not use this data |
| Analytics dashboards | 3ΓÇô8 staff managing 200ΓÇô600 students; filtered list is sufficient; low ROI |
| Payment processing | No student-facing request flow; no fee model |
| Notification / reminder email system | Small co-located team; in-system messaging not needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Infrastructure & Auth | Pending |
| AUTH-02 | Phase 1: Infrastructure & Auth | Pending |
| AUTH-03 | Phase 1: Infrastructure & Auth | Pending |
| STU-01 | Phase 2: Student Profiles & Search | Pending |
| STU-02 | Phase 2: Student Profiles & Search | Pending |
| STU-03 | Phase 3: Student Records UI | Pending |
| STU-04 | Phase 3: Student Records UI | Pending |
| STU-05 | Phase 3: Student Records UI | Pending |
| STU-06 | Phase 3: Student Records UI | Pending |
| STU-07 | Phase 3: Student Records UI | Pending |
| STU-08 | Phase 3: Student Records UI | Pending |
| TRN-01 | Phase 5: Transcript Assembly & Export | Pending |
| TRN-02 | Phase 5: Transcript Assembly & Export | Pending |
| TRN-03 | Phase 5: Transcript Assembly & Export | Pending |
| NAV-01 | Phase 2: Student Profiles & Search | Pending |
| NAV-02 | Phase 2: Student Profiles & Search | Pending |
| NAV-03 | Phase 2: Student Profiles & Search | Pending |
| SHR-01 | Phase 6: Share Reconnaissance & Path Configuration | Pending |
| SHR-02 | Phase 6: Share Reconnaissance & Path Configuration | Pending |
| SHR-03 | Phase 6: Share Reconnaissance & Path Configuration | Pending |
| SHR-04 | Phase 6: Share Reconnaissance & Path Configuration | Pending |
| SHR-05 | Phase 6: Share Reconnaissance & Path Configuration | Pending |
| ACC-02 | Phase 7: LinkedDocument Schema & SMB Access | Pending |
| DSC-01 | Phase 8: Discovery Engine & Scan History | Pending |
| DSC-02 | Phase 8: Discovery Engine & Scan History | Pending |
| DSC-05 | Phase 8: Discovery Engine & Scan History | Pending |
| ADM-01 | Phase 8: Discovery Engine & Scan History | Pending |
| DSC-03 | Phase 9: Matching Engine & Orphan Queue | Pending |
| DSC-04 | Phase 9: Matching Engine & Orphan Queue | Pending |
| DSC-06 | Phase 9: Matching Engine & Orphan Queue | Pending |
| ADM-02 | Phase 9: Matching Engine & Orphan Queue | Pending |
| LNK-01 | Phase 10: Document List & Authenticated Proxy | Pending |
| LNK-02 | Phase 10: Document List & Authenticated Proxy | Pending |
| LNK-03 | Phase 10: Document List & Authenticated Proxy | Pending |
| LNK-04 | Phase 10: Document List & Authenticated Proxy | Pending |
| ACC-01 | Phase 10: Document List & Authenticated Proxy | Pending |
| ACC-03 | Phase 10: Document List & Authenticated Proxy | Pending |
| EV-01 | Phase 11: Evidence Linking | Pending |
| EV-02 | Phase 11: Evidence Linking | Pending |
| EV-03 | Phase 11: Evidence Linking | Pending |

**Coverage:**
- v2.0 requirements: 23 total
- Mapped to phases: 23/23 Γ£ô
- Unmapped: 0

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-16 after v2.0 roadmap creation*
