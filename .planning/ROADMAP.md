# Roadmap: SPCS Student Transcript System

**Milestone:** v1.0
**Goal:** Full end-to-end transcript workflow — staff can log in, manage student records, upload documents, fill a template, and export a PDF transcript.
**Requirements:** 21 v1 requirements

---

## Phases

- [ ] **Phase 1: Infrastructure & Auth** — Microsoft Entra ID SSO, role-based access, audit logging, on-premise deployment
- [x] **Phase 2: Student Profiles & Search** — Student directory CRUD, name search, year/status filtering, cohort overview (completed 2026-06-12)
- [ ] **Phase 3: Student Records UI** — All six record types: academics, activities, awards, work experience, career goals, notes
- [ ] **Phase 4: Document Management** — PDF upload, secure storage, document listing/download/soft-delete, type tagging
- [ ] **Phase 5: Transcript Assembly & Export** — Narrative template, draft/finalised status, school-branded PDF export

---

## Phase Details

### Phase 1: Infrastructure & Auth

**Goal:** Staff can securely access the application using their school Microsoft account, with role-based permissions enforced and every data operation logged.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03
**Success Criteria:**

1. A staff member can click "Sign in with Microsoft" and reach the app home page using their school Entra ID credentials — no separate password required.
2. An Admin-role user sees management options (branding config, user management) that a Staff-role user cannot access or navigate to.
3. Every record create, edit, and delete operation writes an audit log entry recording the acting user, affected record ID, action type, and timestamp.
4. The application is accessible via HTTPS from any school-network browser, with the deployment runbook verified end-to-end on Windows Server + IIS + PM2.

**Plans:** 5 plans

Plans:

- [x] 01-01-PLAN.md — Server npm project, Prisma schema (User + AuditLog), first migration, failing test suite (RED)
- [x] 01-02-PLAN.md — Vite + React + shadcn init, MSAL config (sessionStorage, API scope), Login/Home/Unauthorized pages
- [x] 01-03-PLAN.md — Express auth middleware (validateJwt, resolveUser, requireRole), audit service (logAudit), /api/auth/me route; tests turn GREEN
- [x] 01-04-PLAN.md — apiFetch client (acquireTokenSilent), /api/auth/me call in App.tsx, role-gated HomePage
- [~] 01-05-PLAN.md — PM2 ecosystem.config.js, IIS web.config, DEPLOYMENT-RUNBOOK.md; human checkpoint for HTTPS verification (Tasks 1+2 complete, Task 3 awaiting human verify)

### Phase 2: Student Profiles & Search

**Goal:** Staff can manage a complete student directory and quickly locate any student or survey the cohort.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** STU-01, STU-02, NAV-01, NAV-02, NAV-03
**Success Criteria:**

1. Staff can create a new student profile (name, year level, contact details) and it immediately appears in the student list.
2. Staff can view, edit, and delete any existing student profile.
3. Staff can type a partial name in the search box and see matching students filtered in the list.
4. Staff can filter the student list by year level and by transcript status (Draft / Finalised / None).
5. Staff can view a cohort overview table showing all students with per-student status indicators at a glance.

**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Create student vertical slice: schema, POST API, shadcn prep, /students/new UI

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — View/edit/archive/restore: detail page, PATCH/DELETE/restore API, archive dialog

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Student directory: list API, search/filter, cohort table, pagination

**UI hint**: yes

### Phase 3: Student Records UI

**Goal:** Staff can enter and manage all six types of student record data from within a single student profile page.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** STU-03, STU-04, STU-05, STU-06, STU-07, STU-08
**Success Criteria:**

1. Staff can add, edit, and delete academic results (subject, grade, year, notes) for a student from the student profile page.
2. Staff can add, edit, and delete extracurricular activity entries, award entries, and work experience entries for a student.
3. Staff can add and update career interests and goals (structured interest areas + free-text description) for a student.
4. Staff can add timestamped notes to a student record; each note is attributed to the entering staff member and the full history is visible.
5. All six record types are accessible from a single student profile page without navigating away.

**Plans:** 6 plans

Plans:

**Wave 1**

- [x] 03-01-PLAN.md — Academics & Activities server slice: AcademicResult + Activity schema models, Zod schemas, services (IDOR guard + audit), routes, RED tests (stu-03, stu-04)
- [x] 03-01b-PLAN.md — Client infrastructure: @tanstack/react-query + QueryClientProvider, RecordSectionCard + MonthYearPicker + RecordDeleteDialog + periodFormat, AcademicResultsSection + ActivitiesSection, StudentDetailPage placeholder replaced

**Wave 2** *(blocked on Wave 1 completion — runs in parallel: 03-02 server and 03-02b client)*

- [x] 03-02-PLAN.md — Awards & Work Experience server slice: Award + WorkExperience schema models, Zod schemas, services (IDOR guard + audit), routes, RED tests (stu-05, stu-06)
- [x] 03-02b-PLAN.md — Awards & Work Experience client slice: AwardsSection (award level Badge) + WorkExperienceSection, StudentDetailPage updated *(parallel to 03-02, depends on 03-01b)*

**Wave 3** *(blocked on 03-02 completion)*

- [ ] 03-03a-PLAN.md — Career Goals & Staff Notes server slice: CareerGoal + StaffNote schema models (POST-only / append-only per D-16/D-17), Zod schemas, services (list+create only), routes (GET+POST only), RED tests (stu-07, stu-08 including enforcement tests)

**Wave 4** *(blocked on 03-03a + 03-02b completion)*

- [ ] 03-03b-PLAN.md — DB push + client completion: [BLOCKING] npx prisma db push (all 6 models deployed), shadcn checkbox/textarea/tooltip/scroll-area, CareerGoalsSection (versioned) + NotesSection (append-only) + CareerInterestsChecklist, all 6 sections on StudentDetailPage in D-02 order, textarea upgrades in ActivitiesSection/AwardsSection/WorkExperienceSection, all stu-03 through stu-08 GREEN

**UI hint**: yes

### Phase 4: Document Management

**Goal:** Staff can upload, organise, and retrieve supporting PDF documents attached to a student's record.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria:**

1. Staff can upload one or more PDF files to a student's record; each file is stored securely outside the web root and served only via an authenticated endpoint.
2. Staff can view the document list for a student (file name, document type tag, upload date, uploader) and download any file.
3. Staff can soft-delete a document; the file disappears from the active list but is retained on disk with an audit trail entry.
4. Staff can assign a document type tag (Report Card, Certificate, Award Letter, Work Experience Letter, Reference Letter, Other) to each uploaded file.

**Plans:** TBD
**UI hint**: yes

### Phase 5: Transcript Assembly & Export

**Goal:** Staff can compose a narrative transcript from stored student data and export a professional, school-branded PDF.
**Mode:** mvp
**Depends on:** Phase 3, Phase 4
**Requirements:** TRN-01, TRN-02, TRN-03
**Success Criteria:**

1. Staff can open a transcript template for a student and see sections auto-populated from stored records (academics, activities, awards, work experience, career goals, staff endorsement).
2. Staff can write or edit the narrative text for each section directly in the template.
3. Staff can set the student's transcript status to Draft or Finalised.
4. Staff can export a completed transcript as a formatted PDF containing the school logo and letterhead, suitable for sending to universities or employers.
5. Admin can configure the school logo and letterhead used across all exported transcripts.

**Plans:** TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Auth | 5/5 (checkpoint pending) | In Progress | — |
| 2. Student Profiles & Search | 3/3 | Complete   | 2026-06-12 |
| 3. Student Records UI | 0/? | Not started | — |
| 4. Document Management | 0/? | Not started | — |
| 5. Transcript Assembly & Export | 0/? | Not started | — |

---

## Coverage

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
| DOC-01 | Phase 4 |
| DOC-02 | Phase 4 |
| DOC-03 | Phase 4 |
| DOC-04 | Phase 4 |
| TRN-01 | Phase 5 |
| TRN-02 | Phase 5 |
| TRN-03 | Phase 5 |

**21/21 requirements mapped. No orphans.**

---
*Roadmap created: 2026-06-11*
*Last updated: 2026-06-11 after Plan 01-05 Tasks 1+2 complete; checkpoint:human-verify pending*
