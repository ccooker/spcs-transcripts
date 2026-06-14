---
phase: 02-student-profiles-search
verified: 2026-06-12T09:06:00Z
status: passed
score: 15/15
overrides_applied: 0
human_verification:
  - test: "Sign in as staff, navigate to /students/new, fill required fields (name, form level, graduation year, school ID), click Create student"
    expected: "Success toast 'Student created', redirect to /students/:uuid detail page; student appears in /students list when navigating back"
    why_human: "End-to-end form UX, MSAL auth, and visual feedback cannot be verified without a running app and real sign-in"
  - test: "On a student detail page, click Archive, type the student's full name in the confirmation dialog, confirm"
    expected: "Confirm button disabled until name matches (case-insensitive); toast 'Student archived'; redirect to /students; student absent from default list"
    why_human: "Dialog interaction timing and typed-name UX require browser verification"
  - test: "Open /students with multiple students across form levels; verify default sort shows cohort group headers"
    expected: "Header rows show 'Form N' with 'Draft: n · Finalised: n · None: n'; each row has transcript status badge; row click opens detail"
    why_human: "Visual layout of cohort headers and badge rendering cannot be confirmed programmatically"
  - test: "Type a partial name in search box without clicking Search; then click Search students"
    expected: "No list refetch while typing only; after Search click, list filters to matching names"
    why_human: "Network timing during live interaction needs browser DevTools or manual observation (code separation verified, runtime behavior needs confirmation)"
  - test: "Sign in as admin, enable 'Show archived students', restore an archived row from the list"
    expected: "Archived rows visible with muted styling and (Archived) label; Restore succeeds with toast and row returns to active state"
    why_human: "Admin-only toggle visibility and restore-from-list flow require authenticated admin session"
---

# Phase 2: Student Profiles & Search Verification Report

**Phase Goal:** Staff can manage a complete student directory and quickly locate any student or survey the cohort.
**Verified:** 2026-06-12T09:06:00Z
**Status:** passed
**Re-verification:** No — initial verification

> **MVP mode note:** ROADMAP marks this phase `mode: mvp`, but the phase-level goal is not in user-story format (`As a …, I want …, so that …`). Individual plan goals use user-story format. Verification below uses ROADMAP success criteria as the user-flow contract.

## User Flow Coverage

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Create student | Staff submits profile at `/students/new` | `StudentNewPage.tsx` + `StudentForm.tsx` + `POST /api/students` | ✓ |
| Appears in list | New student queryable from directory | `listStudents()` excludes only `archivedAt`; create persists via `prisma.student.create` | ✓ |
| View profile | `/students/:id` shows read-only fields | `StudentDetailPage.tsx` `apiGet` + profile grid | ✓ |
| Edit profile | Edit → Save persists changes | `handleSave` → `apiPatch` + `updateStudent()` | ✓ |
| Archive (delete) | Soft-delete hides from active list | `archiveStudent()` sets `archivedAt`; list defaults `archivedAt: null` | ✓ |
| Search by name | Partial name filter on button click | `searchInput` vs `appliedQuery`; `listStudents` ILIKE on `fullName` | ✓ |
| Filter cohort | Form level + transcript status filters | `StudentsListPage` Selects → query params; `nav-02-*` tests pass | ✓ |
| Cohort overview | Table with per-student status + form groups | `StudentsDataTable` + `CohortGroupHeader` + status badges in `StudentColumns` | ✓ |
| Outcome | Complete directory CRUD + search/filter/sort | All routes wired in `App.tsx`; 22/22 integration tests green | ✓ |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff can create a student profile (name, form level, graduation year, school ID, optional contacts) | ✓ VERIFIED | `createStudentSchema`, `StudentForm`, `StudentNewPage`, `stu-01-create` tests |
| 2 | Created student persisted with UUID id and `transcriptStatus` NONE | ✓ VERIFIED | `schema.prisma` `@default(uuid())`, `@default(NONE)`; test asserts fields |
| 3 | Create writes AuditLog with action CREATE, model Student | ✓ VERIFIED | `createStudent()` calls `logAudit`; `auth-03-create` test |
| 4 | After create, staff redirected to detail route with success toast | ✓ VERIFIED | `StudentNewPage` `navigate(\`/students/${student.id}\`)` + `toast.success('Student created')` |
| 5 | Staff can view student profile at `/students/:id` in read-only mode | ✓ VERIFIED | `StudentDetailPage` profile grid; `stu-02-get` tests |
| 6 | Staff can edit profile fields and save via PATCH | ✓ VERIFIED | Edit mode + `apiPatch`; `stu-02-patch` + `auth-03-update` tests |
| 7 | Staff can archive after typing full name in confirmation dialog | ✓ VERIFIED | `ArchiveStudentDialog` name match gate + `apiDelete`; `stu-02-archive` tests |
| 8 | Archived students hidden from default list API responses | ✓ VERIFIED | `listStudents` `archivedAt: null` when `!includeArchived`; `list-default` test |
| 9 | Admin can restore archived student; Staff receives 403 on restore | ✓ VERIFIED | `requireRole(Role.ADMIN)` on restore route; `auth-02-restore` + `stu-02-restore` tests |
| 10 | Detail page shows Phase 3 placeholder card for student records | ✓ VERIFIED | `StudentDetailPage` "Student records" card with future-update copy |
| 11 | Paginated sortable student list at `/students` (server-side sort) | ✓ VERIFIED | `listStudents` pagination/sort; `StudentsDataTable` `manualSorting`; `list-pagination`, `list-sort` tests |
| 12 | Search applies `q` param on button click, not every keystroke | ✓ VERIFIED | `searchInput` local state; `appliedQuery` set only in `handleSearch()`; fetch depends on `appliedQuery` |
| 13 | Form level and transcript status filters refetch immediately | ✓ VERIFIED | `onValueChange` updates filter state → `buildQueryString` → `useEffect` refetch |
| 14 | Cohort group headers with per-form Draft/Finalised/None counts when sorted by form | ✓ VERIFIED | `CohortGroupHeader` injected when `sortByFormLevel`; `countCohortStatus()` |
| 15 | Row shows status badge; admin can show archived + restore from list; row click navigates to detail | ✓ VERIFIED | `StudentColumns` badges + restore button; `StudentsDataTable` `onClick` navigate |

**Score:** 15/15 truths verified (automated evidence)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `server/prisma/schema.prisma` | Student model + enums | ✓ VERIFIED | `model Student`, `FormLevel`, `TranscriptStatus` with indexes |
| `server/src/routes/students.ts` | Full CRUD + list + restore | ✓ VERIFIED | GET `/`, GET/PATCH/DELETE `/:id`, POST `/` and `/:id/restore`; 116 lines |
| `server/src/services/student.ts` | Business logic + list query | ✓ VERIFIED | create/get/update/archive/restore/listStudents; real Prisma queries |
| `client/src/pages/StudentNewPage.tsx` | Create form page | ✓ VERIFIED | 82 lines; wired to AppShell + apiPost |
| `client/src/pages/StudentDetailPage.tsx` | View/edit/archive | ✓ VERIFIED | 289 lines; fetch, edit, archive dialog, admin restore |
| `client/src/pages/StudentsListPage.tsx` | Search/filter/table UI | ✓ VERIFIED | 298 lines; toolbar, filters, pagination state |
| `client/src/components/students/StudentsDataTable.tsx` | TanStack table | ✓ VERIFIED | 192 lines; manualPagination/Sorting/Filtering |
| `client/src/components/students/CohortGroupHeader.tsx` | Form cohort summary | ✓ VERIFIED | 41 lines; counts from page data |
| `client/src/components/students/ArchiveStudentDialog.tsx` | Type-name confirm | ✓ VERIFIED | 95 lines; case-insensitive match gate |
| `client/src/components/layout/AppShell.tsx` | Shared nav shell | ✓ VERIFIED | 107 lines; active Students nav, no longer disabled |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `StudentNewPage.tsx` | `POST /api/students` | `apiPost('/students', values)` | ✓ WIRED | Line 37 |
| `students.ts` route | `audit.ts` | `logAudit` on CREATE/UPDATE/DELETE | ✓ WIRED | `createStudent`, `updateStudent`, `archiveStudent`, `restoreStudent` |
| `students.ts` route | Prisma | `prisma.student.create` | ✓ WIRED | `createStudent` service |
| `ArchiveStudentDialog.tsx` | `DELETE /api/students/:id` | `apiDelete` | ✓ WIRED | Line 50 |
| `students.ts` restore | `requireRole(ADMIN)` | middleware on `POST /:id/restore` | ✓ WIRED | Line 88 |
| `StudentDetailPage.tsx` | `PATCH /api/students/:id` | `apiPatch` on save | ✓ WIRED | Line 126 |
| `StudentsListPage.tsx` | `GET /api/students` | `apiGet(\`/students?${params}\`)` | ✓ WIRED | Line 88 |
| `students.ts` GET `/` | `listStudentsQuerySchema` | `safeParse(req.query)` | ✓ WIRED | Lines 37–48 |
| `StudentsDataTable.tsx` | `CohortGroupHeader` | inject on formLevel change | ✓ WIRED | Lines 136–141 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `StudentsListPage` | `students` | `apiGet('/students?…')` → `listStudents()` | Prisma `findMany` + `count` | ✓ FLOWING |
| `StudentDetailPage` | `student` | `apiGet('/students/:id')` → `getStudentById()` | Prisma `findUnique` | ✓ FLOWING |
| `StudentNewPage` | redirect id | `apiPost` response body | `prisma.student.create` return | ✓ FLOWING |
| `StudentsDataTable` | cohort counts | `students` page array | Derived from filtered page data | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| All student integration tests pass | `cd server; npm test -- src/__tests__/students.test.ts -x` | 22/22 passed (3.9s) | ✓ PASS |
| Client compiles | `cd client; npm run build` | tsc + vite build succeeded | ✓ PASS |
| Create test exists | `students.test.ts` grep `stu-01-create` | 4 test cases | ✓ PASS |
| List/search tests exist | `students.test.ts` grep `nav-01\|nav-02\|list-` | 7 test cases | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared or conventional `scripts/*/tests/probe-*.sh` for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| STU-01 | 02-01 | Staff can create student profile | ✓ SATISFIED | POST API, form, tests `stu-01-create` |
| STU-02 | 02-02, 02-03 | Staff can view, edit, delete profiles | ✓ SATISFIED | Detail page, PATCH, soft-archive DELETE, list exclusion |
| NAV-01 | 02-03 | Search student list by name | ✓ SATISFIED | `q` param + Search button UI; `nav-01` test |
| NAV-02 | 02-03 | Filter by year level and transcript status | ✓ SATISFIED | `formLevel`/`transcriptStatus` query params; `nav-02-*` tests |
| NAV-03 | 02-03 | Cohort overview with status indicators | ✓ SATISFIED | Data table + badges + `CohortGroupHeader` rows |

**Orphaned requirements:** None — all five phase requirement IDs appear in plan frontmatter and are implemented.

**Additional plan requirements (not in phase contract):** AUTH-02 (staff 403 on restore) and AUTH-03 (audit on mutations) verified via `auth-02-restore` and `auth-03-*` tests.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in phase artifacts | — | None |
| `StudentDetailPage.tsx` | 272–275 | "future update" placeholder copy | ℹ️ Info | Intentional D-04 Phase 3 deferral, not a stub |

### Human Verification Required

### 1. Create Student End-to-End

**Test:** Sign in as staff, navigate to `/students/new`, fill required fields, click Create student.
**Expected:** Toast "Student created", redirect to detail page; student visible in `/students` list afterward.
**Why human:** Requires MSAL auth and live browser interaction.

### 2. Archive With Typed Confirmation

**Test:** On detail page, open Archive dialog, attempt confirm without matching name, then type exact name and confirm.
**Expected:** Confirm disabled until match; toast "Student archived"; student gone from default list.
**Why human:** Dialog UX and timing require browser.

### 3. Cohort Overview Visual Layout

**Test:** Open `/students` with students in multiple form levels.
**Expected:** Form group header rows with Draft/Finalised/None counts; status badges on each row; row click opens detail.
**Why human:** Visual grouping and badge appearance.

### 4. Search Button Behavior (Runtime)

**Test:** Type in search box without clicking Search; observe network; then click Search students.
**Expected:** No API refetch on keystroke alone; filtered results after Search click.
**Why human:** Runtime network confirmation (code structure verified separately).

### 5. Admin Archived Toggle and List Restore

**Test:** As admin, enable "Show archived students", click Restore on an archived row.
**Expected:** Archived rows visible with muted styling; restore succeeds with toast.
**Why human:** Requires admin-role authenticated session.

### Gaps Summary

No automated gaps found. All 15 observable truths verified against codebase evidence; 22/22 integration tests pass; client builds. Human verification completed via `02-UAT.md` (5/5 pass, 2026-06-12).

---

_Verified: 2026-06-12T09:06:00Z_
_Verifier: Claude (gsd-verifier)_
