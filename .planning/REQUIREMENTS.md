# Requirements: SPCS Student Transcript System

**Defined:** 2026-06-11
**Core Value:** A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session — no hunting through spreadsheets, emails, or paper.

## v1 Requirements

### Access Control

- [ ] **AUTH-01**: Staff can log in using their Microsoft school account (Entra ID / Azure AD SSO)
- [ ] **AUTH-02**: System enforces two roles — Admin (manage templates, delete records, manage users) and Staff (create and edit records, generate transcripts)
- [ ] **AUTH-03**: All record create, update, and delete operations are logged with the acting user, the affected record, the action, and a timestamp

### Student Records

- [ ] **STU-01**: Staff can create a student profile (name, year level, contact details)
- [ ] **STU-02**: Staff can view, edit, and delete student profiles
- [ ] **STU-03**: Staff can add, edit, and delete academic results per student (subject, grade, year, optional notes)
- [ ] **STU-04**: Staff can add, edit, and delete extracurricular activity entries per student (organisation, role, start and end dates, description)
- [ ] **STU-05**: Staff can add, edit, and delete award and achievement entries per student (title, issuer, date, level — school/regional/state/national, description)
- [ ] **STU-06**: Staff can add, edit, and delete work experience entries per student (employer, role, start and end dates, description)
- [ ] **STU-07**: Staff can add and edit career interests and goals per student (structured interest areas selection + free-text description)
- [ ] **STU-08**: Staff can add timestamped notes to a student's record; notes are attributed to the entering staff member and the full notes history is visible

### Document Management

- [ ] **DOC-01**: Staff can upload one or more PDF files to a student's record
- [ ] **DOC-02**: Staff can view the document list for a student (file name, document type tag, upload date, uploader) and download original files
- [ ] **DOC-03**: Staff can soft-delete an uploaded document (retained with audit trail entry, not permanently destroyed)
- [ ] **DOC-04**: Staff can assign a document type tag to each uploaded file from a predefined list (Report Card, Certificate, Award Letter, Work Experience Letter, Reference Letter, Other)

### Transcript Generation

- [ ] **TRN-01**: Staff can open a transcript template for any student and fill in narrative text sections (one section per record type: academics, activities, awards, work experience, career goals, staff endorsement)
- [ ] **TRN-02**: Staff can set a per-student transcript status to Draft or Finalised
- [ ] **TRN-03**: Staff can export a student's transcript as a formatted PDF with school branding (logo and letterhead configurable by Admin)

### Search & Navigation

- [ ] **NAV-01**: Staff can search the student list by name
- [ ] **NAV-02**: Staff can filter the student list by year level and transcript status (Draft / Finalised / None)
- [ ] **NAV-03**: Staff can view a cohort overview table showing all students with status indicators per student

## v2 Requirements

### PDF Data Extraction

- **EXT-01**: Uploaded PDFs are processed to extract structured data (grades, dates, descriptions) using OCR and layout analysis
- **EXT-02**: Staff can review extracted fields side-by-side with the source PDF before committing to the student record
- **EXT-03**: Original PDF is always retained regardless of extraction outcome

### Evidence & Traceability

- **EV-01**: Staff can link an uploaded PDF document to one or more specific record entries as supporting evidence
- **EV-02**: Linked evidence is visible when viewing each record entry

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
| Student self-service portal | Doubles auth complexity; raises privacy governance requirements; students receive PDF by staff delivery |
| AI-generated narrative text | Creates liability for formal university/employer documents; staff must own tone and content |
| In-system email delivery (SMTP) | 3–8 staff can email exported PDFs themselves; adds SMTP config, bounce handling, security scope |
| Digital signatures / QR verification | Overkill for ~500 documents/year sent directly by known staff; Parchment-scale solution |
| SIS integration (SIMON, Compass, etc.) | Each SIS has different API; fragile mapping; data governance questions; defer to v2+ after manual pain validated |
| Multi-school / multi-campus support | Adds tenant isolation, cross-school admin; single-school deployment only |
| Cloud-hosted database | School data governance / privacy policy; student records cannot leave school network |
| Parent/guardian portal | Not in careers team's remit; adds identity, consent, and privacy layer |
| Attendance and discipline records | SIS domain; careers staff do not use this data |
| Analytics dashboards | 3–8 staff managing 200–600 students; filtered list is sufficient; low ROI |
| Payment processing | No student-facing request flow; no fee model |
| Notification / reminder email system | Small co-located team; in-system messaging not needed |

## Traceability

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| STU-01 | — | Pending |
| STU-02 | — | Pending |
| STU-03 | — | Pending |
| STU-04 | — | Pending |
| STU-05 | — | Pending |
| STU-06 | — | Pending |
| STU-07 | — | Pending |
| STU-08 | — | Pending |
| DOC-01 | — | Pending |
| DOC-02 | — | Pending |
| DOC-03 | — | Pending |
| DOC-04 | — | Pending |
| TRN-01 | — | Pending |
| TRN-02 | — | Pending |
| TRN-03 | — | Pending |
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-11 after initial definition*
