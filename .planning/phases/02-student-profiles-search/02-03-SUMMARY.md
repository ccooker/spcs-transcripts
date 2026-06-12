---
phase: 02-student-profiles-search
plan: 03
subsystem: api
tags: [express, prisma, vitest, react, tanstack-table, zod, pagination]

requires:
  - phase: 02-student-profiles-search
    provides: Student CRUD, archive/restore API, AppShell, detail page
provides:
  - GET /api/students with search, filter, sort, pagination, admin includeArchived
  - StudentsListPage with explicit search button, filters, cohort headers, pagination
  - StudentsDataTable with TanStack manualPagination/Sorting
  - CohortGroupHeader per-form status counts from current page data
affects: [phase-03-student-records]

tech-stack:
  added: []
  patterns: [Server-side offset pagination pageSize 50, appliedQuery vs searchInput for D-11, cohort headers injected when sort is formLevel]

key-files:
  created:
    - client/src/pages/StudentsListPage.tsx
    - client/src/components/students/StudentsDataTable.tsx
    - client/src/components/students/StudentColumns.tsx
    - client/src/components/students/CohortGroupHeader.tsx
  modified:
    - server/src/__tests__/students.test.ts
    - server/src/schemas/student.ts
    - server/src/services/student.ts
    - server/src/routes/students.ts
    - client/src/App.tsx

key-decisions:
  - "Transcript status badges follow 02-UI-SPEC (DRAFT outline, NONE secondary) — matches StudentDetailPage"
  - "list-sort test uses binary string compare to match PostgreSQL default collation"
  - "Admin archived toggle uses native checkbox — no shadcn checkbox component installed"

patterns-established:
  - "listStudents excludes archivedAt unless includeArchived and ADMIN role (403 for staff)"
  - "Default sort formLevel asc with secondary fullName asc for cohort grouping"
  - "CohortGroupHeader counts computed from current page rows only per RESEARCH A1"

requirements-completed: [NAV-01, NAV-02, NAV-03, STU-02]

duration: 25min
completed: 2026-06-12
---

# Phase 02 Plan 03: Student Directory List Summary

**Server-paginated GET /api/students with search/filter/sort and TanStack data table at /students with cohort group headers and admin archived toggle**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-12T08:57:00Z
- **Completed:** 2026-06-12T09:02:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- RED→GREEN integration tests for nav-01, nav-02, list-default, list-admin-archived, list-pagination, list-sort
- listStudentsQuerySchema + listStudents service with ILIKE search, filters, pagination, admin-gated includeArchived
- StudentsListPage replacing stub with search button (D-11), immediate filter refetch, cohort headers (D-10), row navigation, list restore for admins

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — list, search, and filter integration tests** - `6d29c34` (test)
2. **Task 2: GET /api/students list API with query validation** - `a7f7a0a` (feat)
3. **Task 3: Students list page with data table and cohort headers** - `c45f921` (feat)

## Files Created/Modified

- `server/src/__tests__/students.test.ts` - nav-01, nav-02, list-* integration tests + seedListStudents helper
- `server/src/schemas/student.ts` - listStudentsQuerySchema with sort whitelist and pageSize cap
- `server/src/services/student.ts` - listStudents with pagination and cohort-friendly orderBy
- `server/src/routes/students.ts` - GET / before GET /:id with admin 403 on includeArchived
- `client/src/pages/StudentsListPage.tsx` - Full list page with toolbar, error state, fetch orchestration
- `client/src/components/students/StudentsDataTable.tsx` - TanStack manual table with skeleton and pagination footer
- `client/src/components/students/StudentColumns.tsx` - Sortable columns, status badges, archived restore action
- `client/src/components/students/CohortGroupHeader.tsx` - Per-form Draft/Finalised/None summary row
- `client/src/App.tsx` - /students route wired to StudentsListPage

## Decisions Made

- Badge variants aligned with 02-UI-SPEC and existing StudentDetailPage (not PATTERNS.md secondary/outline swap)
- Sort test expectation uses binary string order to match PostgreSQL default collation
- Native HTML checkbox for admin "Show archived students" toggle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] list-sort test collation mismatch**
- **Found during:** Task 2 (GET /api/students GREEN)
- **Issue:** Test used localeCompare (case-insensitive) but PostgreSQL orders fullName case-sensitively
- **Fix:** Updated test to use binary string comparison for expected order
- **Files modified:** server/src/__tests__/students.test.ts
- **Verification:** All 22 students tests pass
- **Committed in:** `a7f7a0a`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test expectation fix only; API behavior unchanged and correct for PostgreSQL.

## Known Stubs

| File | Reason | Resolved by |
|------|--------|-------------|
| `client/src/pages/StudentsPage.tsx` | Old list stub no longer routed; file retained | Optional cleanup in future chore |

## TDD Gate Compliance

- RED commit `6d29c34` (test) precedes GREEN commit `a7f7a0a` (feat) — compliant

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 student directory complete — search, filter, cohort overview, pagination live at /students
- Phase 3 can build record sections on student detail without list work remaining
- Manual UAT per 02-VALIDATION.md recommended for search button and cohort header behavior

## Self-Check: PASSED

- FOUND: server/src/services/student.ts
- FOUND: client/src/pages/StudentsListPage.tsx
- FOUND: client/src/components/students/StudentsDataTable.tsx
- FOUND: client/src/components/students/CohortGroupHeader.tsx
- FOUND: .planning/phases/02-student-profiles-search/02-03-SUMMARY.md
- FOUND: commit 6d29c34
- FOUND: commit a7f7a0a
- FOUND: commit c45f921

---
*Phase: 02-student-profiles-search*
*Completed: 2026-06-12*
