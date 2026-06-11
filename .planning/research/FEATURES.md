# Feature Research

**Domain:** School careers student transcript management
**Researched:** 2026-06-11
**Confidence:** HIGH — domain is well-understood; small-team school software patterns are stable; research corroborated by analysis of Parchment, Transcend, SchoolPoint, Rediker AdminPlus, Symplicity CSM, and comparable careers advisor tooling

---

## Feature Landscape

### Table Stakes (Users Expect These)

#### Student Records

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Student profile CRUD (name, year, contact) | Any record system needs a subject entity | Low | Year level drives filtering and grouping |
| Academic results entry (subject, grade, year) | Core output of a school record; transcript always has grades | Low | Need to handle pass/fail, letter grades, and percentage formats |
| Extracurricular activities logging (role, org, dates, description) | University applications expect activity history; careers advisors compile this manually today | Low | Common App fields provide good data model: position, org, hours/week, weeks/year, description |
| Awards and achievements logging (title, issuer, date, level) | Every professional transcript includes honours; staff currently hunt through emails to find these | Low | Level matters: school, regional, state, national |
| Work experience entries (employer, role, dates, description) | Expected for employer-facing and university transcripts; distinguishes serious applicants | Low | Part-time jobs, internships, and formal placements all belong |
| Career interests and goals capture | Careers team's core purpose; needed to personalise transcript narrative | Low | Free-text goals + structured interest areas (e.g., STEM, Law, Commerce) |
| Staff notes / observations per student | Advisors need a running log; paper notes are lost | Low | Timestamped, attributed to the entering staff member |
| Student list search and filter (name, year, status) | Users need to reach a specific student quickly out of 200–600 | Low | Year level and "transcript status" filters have immediate utility |
| Bulk student view / cohort overview | Staff manage full year groups, not individuals in isolation | Low | Table view with inline status indicators |

#### Document Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PDF upload per student (report cards, certificates, award letters) | Evidence documents exist as PDFs today; staff need them centralised with the record | Low–Med | Multi-file upload per student; need storage quota awareness |
| Uploaded document listing and download | Staff need to retrieve originals for verification | Low | File name, upload date, uploader, file size |
| Document deletion / replacement | Mistakes happen; wrong version gets uploaded | Low | Soft-delete preferred; keep audit trail |
| Document labelling / type tagging | "Report card", "Certificate", "Reference letter" — without tagging, documents become an unorganised pile | Low | Predefined types + custom label |

#### Transcript Generation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured template with fillable narrative sections | Staff need to author the written commentary; template ensures consistency and completeness | Med | Sections mirror the data types: academics, activities, awards, work, goals, staff endorsement |
| Template auto-population from stored records | Pulling grades and activity entries into the template removes copy-paste errors | Med | Must render cleanly even when sections have no entries |
| PDF export of completed transcript | Universities, employers, and students receive a PDF; no other format is acceptable to recipients | Med | Must be print-ready: correct margins, fonts, school branding |
| Transcript status tracking (draft / finalised) | Staff need to know which transcripts are approved for sending vs in progress | Low | Simple two-state flag per transcript instance |

#### Access Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Microsoft Entra ID (Azure AD) SSO login | School is on M365; staff expect to use their school account; no password management overhead | Med | MSAL / OAuth 2.0 PKCE; no custom username/password |
| Role-based access (admin vs standard staff) | Not all staff should be able to delete records or manage templates | Low | Two roles are enough: Admin and Staff |
| Audit trail of record changes | School data governance requires knowing who changed what and when | Low–Med | Who, what, when on all create/update/delete operations |

#### PDF Handling

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured data extraction from uploaded PDFs | Report cards and certificates arrive as PDFs; re-keying data is error-prone and time-consuming | High | Must handle varied layouts without a fixed source template; OCR + layout analysis required |
| Extraction result review and editing by staff | Extracted data will have errors; staff must confirm before it enters the record | Med | Side-by-side: extracted data on left, source PDF on right |
| Store original PDF alongside extracted data | Extracted data is a derivative; the original is the authoritative evidence | Low | Original is never discarded |

---

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Evidence linking (attach a specific uploaded PDF to a specific award or activity record) | Lets staff say "this certificate proves this award"; gives recipients confidence in the data | Low–Med | Many-to-many: one PDF can support multiple record entries |
| Multi-recipient transcript variants (university, employer, student) | A university transcript emphasises academic results and leadership; an employer transcript emphasises work experience; a student copy is the full record. Different audiences need different emphasis | Med | Could be template variants rather than dynamic filtering |
| Record completeness indicators per student | Signals which students have sparse records needing attention before transcript season | Low | "Missing: work experience, career goals" callout on profile |
| Transcript version history (multiple generated transcripts per student) | Transcripts are produced at different points in the school year; staff need to recall what was sent last time | Low | Immutable archived renders with date, generator, recipient type |
| School branding in transcript output (logo, colours, letterhead) | Recipients expect official school letterhead; unbranded output looks unofficial | Low–Med | Logo upload + header/footer configuration |
| Bulk / cohort transcript generation | At ATAR/university application season, staff generate 50+ transcripts; one-by-one is impractical | Med | Queue-based generation; zip download |
| Draft sharing / internal review before finalisation | Two-staff review before sending prevents errors on formal documents | Low | "Send for review" flag + reviewer can add comments |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Student self-service portal (students log in, view/request their own records) | Doubles auth complexity, raises privacy governance requirements, creates parent-notification workflows; scope explicitly ruled out | Staff download PDF and deliver it; student receives a file, not system access |
| AI-generated narrative text | LLM output for formal university/employer documents creates liability; staff must own tone and content; explicitly out of scope | Template sections with staff-authored prose |
| Email delivery from within the system (send transcript directly to university) | Adds SMTP/API configuration, delivery tracking, bounce handling, security review; 3–8 staff can simply email the exported PDF themselves | Export PDF → staff email it |
| Digital signature / QR verification codes on transcripts | Valuable for high-volume credential exchange (Parchment, Transcend); overkill for a school sending ~500 documents/year directly from known staff | School letterhead + staff name is sufficient for this scale and recipient type |
| Payment processing for transcript requests | Not applicable — staff-initiated, no student-facing request flow, no fee model | Not needed |
| SIS integration (SIMON, Compass, etc.) | Each SIS has a different API; mapping is fragile; data governance questions; explicitly out of scope for v1 | Manual entry or PDF upload extraction; revisit in v2 if demand validated |
| Notification / reminder email system | 3–8 staff in the same office; internal coordination does not require in-system messaging; adds complexity and M365 mail integration | Staff communicate out-of-band |
| Parent/guardian portal | Adds identity, consent, and privacy layer; not in the careers team's remit | Transcripts go to student, not parent, unless staff decide otherwise |
| Attendance and discipline records | SIS domain, not careers team domain; inclusion bloats the record with data careers staff do not use | Keep focus on post-school destination data |
| Analytics dashboards / cohort reporting | For 3–8 staff managing 200–600 students, a filtered list view is enough; dashboards add build time with low payoff | Sortable list with filters; defer reporting to v2+ if requested |
| Multi-school / multi-campus support | Adds tenant isolation, billing, cross-school admin; explicitly out of scope | Single-school deployment only |
| Bulk student import via CSV or SIS export | Creates data quality problems (mismatched fields, duplicates, missing year levels); manual entry is low-burden at this scale | Manual entry at enrolment; revisit if school size grows |

---

## Feature Dependencies

```
Azure AD SSO
  └─ All other features (nothing works without authentication)

Student Profile (create)
  ├─ Academic Results (requires a student to attach to)
  ├─ Extracurricular Activities
  ├─ Awards / Achievements
  ├─ Work Experience
  ├─ Career Goals
  ├─ Staff Notes
  └─ PDF Document Uploads
        └─ PDF Data Extraction
              └─ Extraction Review + Edit by Staff

Transcript Template Definition
  └─ Template Assembly (auto-populate from records)
        └─ Transcript Status (draft / finalised)
              └─ PDF Export
                    └─ Transcript Version Archive

Evidence Linking (PDF → Record)
  └─ requires: PDF Document Uploads + at least one Record Type

Multi-recipient Transcript Variants
  └─ requires: Transcript Template Definition (variant templates)

School Branding Configuration
  └─ requires: PDF Export (branding only surfaces in output)

Record Completeness Indicators
  └─ requires: Student Profile + at least two Record Types to be meaningful

Role-Based Access (Admin / Staff)
  └─ requires: Azure AD SSO (roles assigned to Entra ID accounts)

Audit Trail
  └─ requires: Azure AD SSO (audit entries are attributed to authenticated users)
```

---

## MVP Definition

### Launch With (v1)

Deliver the core value proposition: *a staff member opens a student record and produces a completed professional transcript PDF in a single session.*

**Access Control**
- Azure AD SSO (MSAL / OAuth 2.0 PKCE)
- Admin and Staff roles
- Audit trail for all record changes

**Student Records**
- Student profile CRUD (name, year level, contact)
- Academic results (subject, grade, year, notes)
- Extracurricular activities (org, role, dates, hours, description)
- Awards and achievements (title, issuer, date, level, description)
- Work experience (employer, role, start/end dates, description)
- Career interests and goals (structured interest areas + free-text)
- Staff notes (timestamped, attributed)

**PDF Handling**
- PDF upload per student (multiple files)
- Document listing, download, deletion
- Document type tagging
- PDF data extraction (OCR + layout analysis; handles varied formats)
- Side-by-side extraction review and edit before committing to record

**Transcript Generation**
- Template with fillable narrative sections (per data type)
- Auto-population of structured data from stored records
- Draft / finalised status flag
- PDF export with school branding (logo, header)

**Search and Navigation**
- Student list with search (name) and filter (year level, transcript status)
- Cohort overview table

### Add After Validation (v1.x)

Features with clear value but requiring validated usage patterns before building:

- **Evidence linking** — attach uploaded PDFs as evidence for specific record entries; validate that staff actually want this traceability before adding the UI cost
- **Transcript version archive** — store prior generated PDFs per student; validate whether staff need to recall old versions or simply regenerate
- **Record completeness indicators** — flag students with sparse records; validate whether careers staff want system-driven reminders or self-manage
- **Bulk / cohort transcript generation** — queue-based generation for ATAR season; validate after first transcript season to confirm the one-by-one flow is the actual bottleneck
- **Internal draft review** — "send for review" flag for two-staff sign-off on sensitive transcripts; validate whether team of 3–8 needs in-system workflow or handles this out-of-band

### Future Consideration (v2+)

- **Multi-recipient transcript variants** — separate university, employer, and student templates; only worth building once the single-template version has been used enough to surface what each recipient actually needs differently
- **SIS integration** — data import from SIMON / Compass; defer until manual entry pain is confirmed and school IT is ready to negotiate API access
- **Reporting and analytics** — cohort-level views, completion statistics; low priority for a team this size
- **Custom template editor (staff-configurable)** — currently IT/admin configures the template; a visual editor for non-technical staff is high complexity for modest gain at this scale
- **Bulk student import (CSV)** — only if school size grows or annual re-enrolment becomes a burden

---

## Feature Prioritization Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Azure AD SSO | Critical — gate | Med | Must-have | v1 |
| Student profile CRUD | Critical — foundation | Low | Must-have | v1 |
| Academic results entry | High | Low | Must-have | v1 |
| Extracurriculars, awards, work exp, goals | High | Low (per type) | Must-have | v1 |
| Staff notes | High | Low | Must-have | v1 |
| PDF upload + storage | High | Low–Med | Must-have | v1 |
| PDF data extraction (OCR) | High — key differentiator for data entry pain | High | Must-have | v1 |
| Extraction review UI | High — extraction without review is dangerous | Med | Must-have | v1 |
| Template assembly + PDF export | Critical — core output | Med–High | Must-have | v1 |
| School branding in PDF | Med | Low–Med | Must-have | v1 |
| Search and filter | High — 200–600 students | Low | Must-have | v1 |
| Audit trail | Med (governance) | Low | Must-have | v1 |
| Role-based access | Med | Low | Must-have | v1 |
| Draft / finalised status | Med | Low | Must-have | v1 |
| Document type tagging | Med | Low | Must-have | v1 |
| Evidence linking | Med | Low–Med | v1.x | After validation |
| Transcript version archive | Med | Low | v1.x | After validation |
| Record completeness indicators | Med | Low | v1.x | After validation |
| Bulk transcript generation | Med | Med | v1.x | After ATAR season |
| Internal draft review workflow | Low–Med | Low | v1.x | After validation |
| Multi-recipient template variants | Med | Med | v2 | After usage data |
| SIS integration | Med | High | v2 | After manual entry pain validated |
| Reporting / analytics | Low | Med | v2 | Small team; low ROI |
| Custom template editor | Low | High | v2 | Complexity vs benefit |
| Bulk student CSV import | Low | Med | v2 | Only if enrolment burden confirmed |

---

## Sources

- Research synthesis from: Parchment credential management platform, Transcend records management, SchoolPoint (Ontario private schools), Rediker AdminPlus e-portfolios, Symplicity CSM career services, OpenEduCat transcript system, ampEducator SIS, CoreCampus advising software, Prentus advisor suite, Evocos evidence portfolio tool
- Common App Activities section data model (field structure for extracurriculars) — collegetransitions.com, orieladmissions.com
- University application activities résumé expectations — collegesofdistinction.com, ucps.k12.nc.us
- Anti-feature rationale derived from project constraints (PROJECT.md) and domain scale analysis (200–600 students, 3–8 staff, on-premise, single school)
