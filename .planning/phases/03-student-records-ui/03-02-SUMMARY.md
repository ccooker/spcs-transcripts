---
phase: 03-student-records-ui
plan: "02"
subsystem: server
tags: [tdd, awards, work-experience, prisma, zod, express, idor]
dependency_graph:
  requires:
    - 03-01 (AwardLevel + CareerInterest enums, AcademicResult + Activity models, route mount pattern)
  provides:
    - Award Prisma model (schema only — DB push deferred to 03-03b)
    - WorkExperience Prisma model (schema only)
    - /api/students/:id/awards CRUD routes
    - /api/students/:id/work-experience CRUD routes
    - RED integration tests for STU-05 + STU-06
  affects:
    - server/prisma/schema.prisma
    - server/src/routes/students.ts
    - server/src/__tests__/helpers/testDb.ts
tech_stack:
  added: []
  patterns:
    - IDOR guard (findUnique → check studentId → 404 on mismatch) — Award + WorkExperience services
    - logAudit on every service write (CREATE/UPDATE/DELETE)
    - Router({ mergeParams: true }) for nested record routes
    - Zod .strict() on all create/update schemas
    - null-first orderBy for ongoing work experience (D-11 pattern from activity.ts)
    - monthSchema/yearSchema helpers (copied from activity.ts pattern)
key_files:
  created:
    - server/src/schemas/award.ts
    - server/src/schemas/workExperience.ts
    - server/src/services/award.ts
    - server/src/services/workExperience.ts
    - server/src/routes/awards.ts
    - server/src/routes/workExperience.ts
  modified:
    - server/prisma/schema.prisma
    - server/src/__tests__/helpers/testDb.ts
    - server/src/__tests__/records.test.ts
    - server/src/routes/students.ts
decisions:
  - "clearDb() used (prisma as any).award?.deleteMany() during RED phase (Task 1) so the test setup would not throw before prisma generate; replaced with real typed calls after Task 2 prisma generate"
  - "updateAwardSchema and updateWorkExperienceSchema built as explicit partial .strict() objects (same approach as updateActivitySchema) rather than .partial() on create schema — avoids implicit field optionality issues"
  - "AwardLevel validated in Zod as z.enum(['SCHOOL','REGIONAL','STATE','NATIONAL','INTERNATIONAL']) — matches the Prisma enum exactly; invalid values return 400 before reaching service layer"
metrics:
  duration: "~15 min"
  completed: "2026-06-13"
  tasks_completed: 2
  files_changed: 10
---

# Phase 03 Plan 02: Awards & Work Experience Server Slice Summary

**One-liner:** Award + WorkExperience Prisma models (schema only), full CRUD backend (Zod schemas with AwardLevel enum + month/year fields, services with IDOR guard + audit, nested Express routes), and RED integration tests for STU-05/STU-06.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RED integration tests for stu-05 + stu-06 | `974f24b` | `records.test.ts`, `testDb.ts` |
| 2 | Schema models, Prisma generate, Zod schemas, services, routes, students.ts mounts | `3fd9883` | 9 files |

---

## What Was Built

### Task 1: RED Tests (`974f24b`)

Appended to `server/src/__tests__/records.test.ts` — 10 new integration tests across two describe blocks:

**stu-05 (7 tests):** list, create (201 + all field assertions), update (level change → INTERNATIONAL), delete (204), invalid-level (OLYMPIC → 400), IDOR guard (PATCH wrong student → 404), audit log (AuditLog row with model='Award' action='CREATE')

**stu-06 (3 tests):** create (201 + null endYear), ongoing-sort (null endYear first in GET response), IDOR guard (PATCH wrong student → 404)

All 10 tests fail as expected (RED) — routes not yet mounted when tests were written.

Extended `testDb.ts` `clearDb()` — added workExperience and award deleteMany at FK-safe positions before activity/academicResult.

### Task 2: Full Implementation (`3fd9883`)

**Schema (`schema.prisma`):**
- Added `Award` model: UUID pk, studentId FK (onDelete: Cascade), title/issuer/awardMonth/awardYear/level(AwardLevel)/description, two indexes (studentId; studentId+awardYear(Desc)+awardMonth(Desc))
- Added `WorkExperience` model: UUID pk, studentId FK (onDelete: Cascade), employer/role/description/startMonth/startYear/endMonth?/endYear?, one index (studentId)
- Added back-relations to `Student`: `awards Award[]` + `workExperiences WorkExperience[]`
- Ran `npx prisma generate` → Prisma Client 7.8.0 regenerated

**testDb.ts:** Replaced `(prisma as any)?.deleteMany()` stubs with real `prisma.workExperience.deleteMany()` + `prisma.award.deleteMany()` typed calls.

**Zod Schemas:**
- `schemas/award.ts`: `monthSchema` (1–12), `yearSchema` (2000–2040), `createAwardSchema` with `z.enum(['SCHOOL','REGIONAL','STATE','NATIONAL','INTERNATIONAL'])` and `.strict()`, `updateAwardSchema` (explicit partial with same enum)
- `schemas/workExperience.ts`: same monthSchema/yearSchema helpers, `createWorkExperienceSchema` with nullable optional end fields and `.strict()`, `updateWorkExperienceSchema`

**Services:**
- `services/award.ts`: `AwardNotFoundError`, `listAwards` (ordered awardYear/awardMonth desc), `createAward`, `updateAward` (IDOR: `!existing || existing.studentId !== studentId → throw AwardNotFoundError`), `deleteAward` (same IDOR) — all writes call `logAudit()`
- `services/workExperience.ts`: `WorkExperienceNotFoundError`, `listWorkExperiences` (orderBy endYear nulls-first → endMonth nulls-first → startYear desc → startMonth desc, satisfying D-11), `createWorkExperience`, `updateWorkExperience` (IDOR guard), `deleteWorkExperience` (IDOR guard) — all writes call `logAudit()`

**Routes:**
- `routes/awards.ts`: `Router({ mergeParams: true })`, `parseStudentId` helper, GET `/`, POST `/` (201), PATCH `/:awardId` (200), DELETE `/:awardId` (204) — `AwardNotFoundError` → 404
- `routes/workExperience.ts`: identical structure; `WorkExperienceNotFoundError` → 404
- Both use `(req.params as Record<string, string>)['studentId']` pattern (established in 03-01 for Express 5 mergeParams TS compat)

**students.ts:** Added `router.use('/:studentId/awards', awardsRouter)` and `router.use('/:studentId/work-experience', workExperienceRouter)` mounts before `export default`

---

## Verification

```
cd server && npx tsc --noEmit   # exits 0
```

```
# records.test.ts: stu-05 (7 tests) + stu-06 (3 tests) all FAIL (RED — correct for this stage)
# server/src/routes/students.ts contains /:studentId/awards and /:studentId/work-experience mounts
# services contain: existing.studentId !== studentId IDOR guard
# workExperience service contains nulls: 'first' in orderBy
# createAwardSchema level field is z.enum(['SCHOOL','REGIONAL','STATE','NATIONAL','INTERNATIONAL'])
```

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

---

## Threat Model Verification

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-03-06: IDOR on award/workExp update/delete | `if (!existing || existing.studentId !== studentId) throw XNotFoundError` (always 404) | ✅ Implemented in both services |
| T-03-07: Mass assignment | `.strict()` on all create/update schemas | ✅ Implemented |
| T-03-08: Invalid AwardLevel | `z.enum(['SCHOOL','REGIONAL','STATE','NATIONAL','INTERNATIONAL'])` — invalid → 400 | ✅ Implemented + stu-05-invalid-level test |
| T-03-09: Repudiation | `logAudit()` called in service after every create/update/delete | ✅ Implemented |
| T-03-10: Auth spoofing | Global `validateJwt` + `resolveUser` middleware inherited | ✅ No per-router setup needed |

---

## Known Stubs

None — this plan delivers server-side only. No UI components with placeholder data.

---

## Self-Check: PASSED

- [x] `server/src/schemas/award.ts` exists
- [x] `server/src/schemas/workExperience.ts` exists
- [x] `server/src/services/award.ts` exists
- [x] `server/src/services/workExperience.ts` exists
- [x] `server/src/routes/awards.ts` exists
- [x] `server/src/routes/workExperience.ts` exists
- [x] Commits `974f24b` and `3fd9883` exist in git log
- [x] TypeScript: `npx tsc --noEmit` exits 0
- [x] stu-05 (7 tests) + stu-06 (3 tests) = 10 tests FAIL as expected (RED)
