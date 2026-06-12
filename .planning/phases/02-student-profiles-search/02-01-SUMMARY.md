---
phase: 02-student-profiles-search
plan: 01
subsystem: api
tags: [prisma, zod, express, react-hook-form, sonner, vitest]

requires:
  - phase: 01-infrastructure-auth
    provides: JWT auth middleware, resolveUser upsert, logAudit, MSAL client, App shell patterns
provides:
  - Student Prisma model with FormLevel and TranscriptStatus enums
  - POST /api/students with Zod validation and audit logging
  - AppShell shared layout with active Students nav
  - /students/new create form wired to API with success redirect
  - apiPost/apiPatch/apiDelete client helpers
affects: [02-student-profiles-search plan 02, plan 03]

tech-stack:
  added: [zod@4.4.3, react-hook-form@7.78.0, @hookform/resolvers@5.4.0, sonner@2.0.7, @tanstack/react-table@8.21.3]
  patterns: [Zod strict createStudentSchema on API, RHF+zodResolver mirror on client, AppShell layout extraction, atomic integration tests with clearDb FK order]

key-files:
  created:
    - server/src/__tests__/students.test.ts
    - server/src/schemas/student.ts
    - server/src/services/student.ts
    - server/src/routes/students.ts
    - client/src/components/layout/AppShell.tsx
    - client/src/components/students/StudentForm.tsx
    - client/src/lib/formLevels.ts
    - client/src/pages/StudentNewPage.tsx
    - client/src/pages/StudentsPage.tsx
    - client/src/pages/StudentDetailPage.tsx
  modified:
    - server/prisma/schema.prisma
    - server/src/app.ts
    - server/src/__tests__/helpers/testDb.ts
    - client/src/api/apiClient.ts
    - client/src/App.tsx
    - client/src/main.tsx
    - client/src/pages/HomePage.tsx

key-decisions:
  - "Student Prisma schema included in RED test commit so testDb student.deleteMany compiles and runs"
  - "shadcn form/input/select/table/label created manually after CLI overwrite prompt blocked non-interactive install"
  - "Minimal StudentsPage and StudentDetailPage stubs until Plan 02-03 list and detail slices"

patterns-established:
  - "createStudent service owns prisma.student.create + logAudit(CREATE) — routes stay thin"
  - "Client create form mirrors server Zod fields via shared FORM_LEVELS and formLevelLabel helpers"

requirements-completed: [STU-01, AUTH-03]

duration: 28min
completed: 2026-06-12
---

# Phase 02 Plan 01: Create Student Vertical Slice Summary

**End-to-end create-student flow: Prisma Student model, POST /api/students with audit log, and /students/new form inside AppShell**

## Performance

- **Duration:** 28 min
- **Started:** 2026-06-12T08:44:00Z
- **Completed:** 2026-06-12T08:52:00Z
- **Tasks:** 3
- **Files modified:** 31

## Accomplishments

- Integration tests (stu-01, auth-03-create) RED then GREEN for POST /api/students
- Student entity in PostgreSQL with UUID id, FormLevel enum, transcriptStatus NONE default
- Staff-facing /students/new page with React Hook Form validation and sonner success toast
- AppShell extracted from HomePage; Students nav link active and functional

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — create-student integration tests and test DB scaffold** - `9603b84` (test)
2. **Task 2: Student schema, Zod validation, POST API, and schema push** - `ddc5139` (feat)
3. **Task 3: AppShell, create-student UI, routing, and client packages** - `330f31c` (feat)

## Files Created/Modified

- `server/src/__tests__/students.test.ts` - stu-01 and auth-03-create integration tests
- `server/src/routes/students.ts` - POST handler with 400/409 handling
- `server/src/services/student.ts` - createStudent + logAudit
- `server/src/schemas/student.ts` - FORM_LEVELS and createStudentSchema (strict)
- `client/src/pages/StudentNewPage.tsx` - Full-page create form at /students/new
- `client/src/components/layout/AppShell.tsx` - Shared authenticated layout
- `client/src/components/students/StudentForm.tsx` - RHF + Zod create form
- `client/src/api/apiClient.ts` - apiPost, apiPatch, apiDelete helpers

## Decisions Made

- Included Student model in Prisma schema during RED task so testDb clear order compiles
- Manual shadcn UI primitives instead of CLI due to interactive overwrite prompt on existing button.tsx
- Students list and detail routes are intentional stubs until Plans 02-02/02-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Student model in schema during Task 1 RED**
- **Found during:** Task 1 (testDb scaffold)
- **Issue:** `prisma.student.deleteMany()` required generated client; tests failed before route 404 RED
- **Fix:** Added Student model to schema.prisma and ran prisma generate in Task 1 commit
- **Files modified:** server/prisma/schema.prisma, server/src/generated/prisma/*
- **Verification:** Tests fail with 404 (missing route) instead of undefined model
- **Committed in:** `9603b84`

**2. [Rule 3 - Blocking] Manual shadcn component creation**
- **Found during:** Task 3 (client packages)
- **Issue:** `npx shadcn add` blocked on button.tsx overwrite prompt in non-interactive shell
- **Fix:** Created input, label, select, table, form components matching shadcn default style
- **Files modified:** client/src/components/ui/*
- **Verification:** `npm run build` passes
- **Committed in:** `330f31c`

**3. [Rule 3 - Blocking] Local Postgres for integration tests**
- **Found during:** Task 1 verification
- **Issue:** docker-compose postgres not exposed on host 5432; vitest DATABASE_URL unreachable
- **Fix:** Started `spcs-test-pg` container on 5432 with password matching vitest default
- **Verification:** prisma db push and npm test pass
- **Committed in:** (environment only — not in repo)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All necessary for test execution and client build. No scope creep beyond intentional list/detail stubs.

## Known Stubs

| File | Reason | Resolved by |
|------|--------|-------------|
| `client/src/pages/StudentsPage.tsx` | Minimal list stub with Add student CTA | Plan 02-03 |
| `client/src/pages/StudentDetailPage.tsx` | Placeholder showing record ID after create redirect | Plan 02-02/03 |

## TDD Gate Compliance

- RED commit `9603b84` (test) precedes GREEN commit `ddc5139` (feat) — compliant

## Issues Encountered

- docker-compose postgres has no host port mapping; local test DB container required for vitest

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Student entity and create API ready for list/search (Plan 02-03) and detail/edit (Plan 02-02)
- apiPost helper available for further mutations

## Self-Check: PASSED

- FOUND: server/src/__tests__/students.test.ts
- FOUND: server/src/routes/students.ts
- FOUND: client/src/pages/StudentNewPage.tsx
- FOUND: client/src/components/layout/AppShell.tsx
- FOUND: .planning/phases/02-student-profiles-search/02-01-SUMMARY.md
- FOUND: commit 9603b84
- FOUND: commit ddc5139
- FOUND: commit 330f31c

---
*Phase: 02-student-profiles-search*
*Completed: 2026-06-12*
