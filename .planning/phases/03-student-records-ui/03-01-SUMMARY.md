---
phase: 03-student-records-ui
plan: "01"
subsystem: server
tags: [tdd, academics, activities, prisma, zod, express, idor]
dependency_graph:
  requires: []
  provides:
    - AcademicResult Prisma model (schema only — DB push deferred to 03-03)
    - Activity Prisma model (schema only)
    - AwardLevel + CareerInterest enums (used by 03-02, 03-03)
    - /api/students/:id/academics CRUD routes
    - /api/students/:id/activities CRUD routes
    - RED integration tests for STU-03 + STU-04
  affects:
    - server/prisma/schema.prisma
    - server/src/routes/students.ts
    - server/src/__tests__/helpers/testDb.ts
tech_stack:
  added: []
  patterns:
    - IDOR guard (findUnique → check studentId → 404 on mismatch)
    - logAudit on every service write
    - Router({ mergeParams: true }) for nested record routes
    - Zod .strict() + cross-field .refine() (subject/subjectOther)
    - nulls-first orderBy for ongoing activities (D-11)
key_files:
  created:
    - server/src/__tests__/records.test.ts
    - server/src/schemas/academicResult.ts
    - server/src/schemas/activity.ts
    - server/src/services/academicResult.ts
    - server/src/services/activity.ts
    - server/src/routes/academicResults.ts
    - server/src/routes/activities.ts
  modified:
    - server/prisma/schema.prisma
    - server/src/__tests__/helpers/testDb.ts
    - server/src/routes/students.ts
decisions:
  - "mergeParams params typed as Record<string,string> — Express 5 strict param inference doesn't propagate parent :studentId into child router; bracket access with cast resolves TS7053 without runtime impact"
  - "updateAcademicResultSchema built manually (not createAcademicResultSchema.partial()) to allow the subject/subjectOther refine to handle undefined subject gracefully in partial updates"
metrics:
  duration: "~18 min"
  completed: "2026-06-13"
  tasks_completed: 2
  files_changed: 10
---

# Phase 03 Plan 01: Academics & Activities Server Slice Summary

**One-liner:** AcademicResult + Activity Prisma models (schema only), full CRUD backend (Zod, services with IDOR guard + audit, nested Express routes), and RED integration tests for STU-03/STU-04.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RED integration tests for stu-03 + stu-04 | `04d8058` | `records.test.ts` |
| 2 | Schema models, Prisma generate, Zod schemas, services, routes, students.ts mounts | `0e9691d` | 9 files |

---

## What Was Built

### Task 1: RED Tests (`04d8058`)

Created `server/src/__tests__/records.test.ts` with 10 integration tests across two describe blocks:

**stu-03 (6 tests):** list, create (201 + field assertions), update, delete (204), IDOR guard (PATCH wrong student → 404), audit log (AuditLog row with model='AcademicResult' action='CREATE')

**stu-04 (4 tests):** list, create (201 + field assertions), ongoing-sort (null endYear first), IDOR guard

All 10 tests fail as expected (RED) — routes not yet mounted when tests were written.

### Task 2: Full Implementation (`0e9691d`)

**Schema (`schema.prisma`):**
- Added `AwardLevel` enum (SCHOOL/REGIONAL/STATE/NATIONAL/INTERNATIONAL)
- Added `CareerInterest` enum (12 values — used by CareerGoal in 03-02/03-03)
- Added `AcademicResult` model: UUID pk, studentId FK (onDelete: Cascade), subject/subjectOther/grade/calendarYear/formLevel/notes, two indexes (studentId, studentId+calendarYear(Desc))
- Added `Activity` model: UUID pk, studentId FK (onDelete: Cascade), organisation/role/description/startMonth/startYear/endMonth/endYear, one index (studentId)
- Added back-relations to `Student`: `academicResults AcademicResult[]` + `activities Activity[]`
- Ran `npx prisma generate` → Prisma Client 7.8.0 regenerated

**testDb.ts:** Cleared academicResult + activity BEFORE student (FK-safe delete order)

**Zod Schemas:**
- `schemas/academicResult.ts`: `PRESET_SUBJECTS` const (26 DSE subjects), `createAcademicResultSchema` with `.strict()` + cross-field `.refine()` for subject/subjectOther, `updateAcademicResultSchema` (manually partial with same conditional refine)
- `schemas/activity.ts`: `monthSchema` (1–12), `yearSchema` (2000–2040), `createActivitySchema` with `.strict()`, `updateActivitySchema`

**Services:**
- `services/academicResult.ts`: `AcademicResultNotFoundError`, `listAcademicResults` (ordered calendarYear/formLevel desc), `createAcademicResult`, `updateAcademicResult` (IDOR: `!existing || existing.studentId !== studentId → 404`), `deleteAcademicResult` (same IDOR) — all writes call `logAudit()`
- `services/activity.ts`: `ActivityNotFoundError`, `listActivities` (orderBy endYear nulls-first → endMonth nulls-first → startYear desc → startMonth desc, satisfying D-11), `createActivity`, `updateActivity` (IDOR guard), `deleteActivity` (IDOR guard) — all writes call `logAudit()`

**Routes:**
- `routes/academicResults.ts`: `Router({ mergeParams: true })`, `parseStudentId` helper, GET `/`, POST `/` (201), PATCH `/:resultId` (200), DELETE `/:resultId` (204) — `AcademicResultNotFoundError` → 404
- `routes/activities.ts`: identical structure; `ActivityNotFoundError` → 404
- Both use `(req.params as Record<string, string>)['studentId']` to access the parent-inherited param (deviation: see Deviations below)

**students.ts:** Added `router.use('/:studentId/academics', academicResultsRouter)` and `router.use('/:studentId/activities', activitiesRouter)` mounts before `export default`

---

## Verification

```
cd server && npx tsc --noEmit   # exits 0
```

```
# records.test.ts: 10/10 tests FAIL (RED — correct for this stage)
# server/src/routes/students.ts contains /:studentId/academics and /:studentId/activities mounts
# services contain: existing.studentId !== studentId IDOR guard
# activity service contains nulls: 'first' in orderBy
```

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Express 5 strict param type inference blocks mergeParams studentId access**
- **Found during:** Task 2 TypeScript check
- **Issue:** Express 5's TypeScript types infer `req.params` strictly from the route string. Child routers with `mergeParams: true` inherit `:studentId` at runtime but the type system doesn't reflect this — accessing `req.params.studentId` (or `req.params['studentId']`) raised TS7053 errors in all 8 route handlers.
- **Fix:** Cast `req.params` to `Record<string, string>` at each access point: `(req.params as Record<string, string>)['studentId']`. Runtime behavior is unchanged; the parent router always populates this param via Express mergeParams.
- **Files modified:** `routes/academicResults.ts`, `routes/activities.ts`
- **Commit:** `0e9691d`

**2. [Rule 2 - Missing] updateAcademicResultSchema needs partial-aware refine**
- **Found during:** Task 2 schema design
- **Issue:** Using `createAcademicResultSchema.partial()` directly would chain the original refine which expects `data.subject !== undefined` — but in a partial update where `subject` is not sent, the refine would incorrectly require `subjectOther`. 
- **Fix:** Built `updateAcademicResultSchema` manually as a `.strict()` object with all fields optional, and added a guarded refine: `data.subject === undefined || data.subject !== 'OTHER' || (subjectOther defined and non-empty)`.
- **Files modified:** `schemas/academicResult.ts`
- **Commit:** `0e9691d`

---

## Threat Model Verification

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-03-01: IDOR on update/delete | `if (!existing || existing.studentId !== studentId) throw NotFoundError` (always 404) | ✅ Implemented in both services |
| T-03-02: Mass assignment via unknown fields | `.strict()` on all create/update schemas | ✅ Implemented |
| T-03-03: Repudiation | `logAudit()` called in service after every create/update/delete | ✅ Implemented |
| T-03-04: Auth spoofing | Global `validateJwt` + `resolveUser` middleware inherited | ✅ No per-router setup needed |

---

## Known Stubs

None — this plan delivers server-side only. No UI components with placeholder data.

---

## Self-Check: PASSED

- [x] `server/src/__tests__/records.test.ts` exists
- [x] `server/src/schemas/academicResult.ts` exists
- [x] `server/src/schemas/activity.ts` exists
- [x] `server/src/services/academicResult.ts` exists
- [x] `server/src/services/activity.ts` exists
- [x] `server/src/routes/academicResults.ts` exists
- [x] `server/src/routes/activities.ts` exists
- [x] Commits `04d8058` and `0e9691d` exist in git log
- [x] TypeScript: `npx tsc --noEmit` exits 0
