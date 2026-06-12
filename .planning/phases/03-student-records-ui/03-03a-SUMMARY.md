---
phase: 03-student-records-ui
plan: 03a
subsystem: server
tags: [career-goals, staff-notes, prisma, zod, express, tdd-red, D-16, D-17]
dependency_graph:
  requires: [03-02]
  provides: [CareerGoal-backend, StaffNote-backend, RED-stu-07, RED-stu-08]
  affects: [03-03b]
tech_stack:
  added: []
  patterns:
    - versioned-create-no-update (CareerGoal — D-16)
    - append-only-no-update (StaffNote — D-17)
    - GET-POST-only-route (D-16/D-17 enforcement by omission)
    - logAudit-on-create
key_files:
  created:
    - server/src/schemas/careerGoal.ts
    - server/src/schemas/staffNote.ts
    - server/src/services/careerGoal.ts
    - server/src/services/staffNote.ts
    - server/src/routes/careerGoals.ts
    - server/src/routes/notes.ts
  modified:
    - server/prisma/schema.prisma
    - server/src/routes/students.ts
    - server/src/__tests__/records.test.ts
    - server/src/__tests__/helpers/testDb.ts
decisions:
  - CareerGoal and StaffNote models have no updatedAt field — immutability signal for maintainers (D-16/D-17)
  - Route omission (no PATCH/DELETE registered) is the enforcement mechanism for D-16 and D-17
  - logAudit called on every create for CareerGoal and StaffNote
metrics:
  duration: ~15 minutes
  completed: 2026-06-13
  tasks_completed: 2
  files_changed: 10
---

# Phase 03 Plan 03a: Career Goals & Staff Notes Server Slice Summary

**One-liner:** CareerGoal (versioned POST-only, D-16) and StaffNote (append-only POST-only, D-17) full server backend with RED integration tests for stu-07 and stu-08.

## What Was Built

### Task 1 — RED Integration Tests (TDD RED)
- **`server/src/__tests__/records.test.ts`** — appended `stu-07` and `stu-08` describe blocks (12 new tests):
  - `stu-07`: create (201 + author.displayName), list (200 + array), versioning (POST twice → 2 rows newest-first), no-patch (404 — D-16), no-delete (404 — D-16), empty-interests validation (400)
  - `stu-08`: create (201 + author.displayName + createdAt), list (200 + array), no-patch (404 — D-17), no-delete (404 — D-17), max-length 501 chars (400), audit log (AuditLog row model:StaffNote)
- **`server/src/__tests__/helpers/testDb.ts`** — extended `clearDb()` with `staffNote.deleteMany()` and `careerGoal.deleteMany()` at top (FK-safe order before student/auditLog); `@ts-expect-error` stubs used in Task 1, replaced with real calls after `prisma generate` in Task 2
- All 12 tests fail as expected (DB tables deferred to Plan 03-03b) — correct RED state

### Task 2 — Schema, Services, Routes, Mounts
- **`server/prisma/schema.prisma`**:
  - `CareerGoal` model: `interests CareerInterest[]`, `description String? @db.VarChar(500)`, `authorId+author User @relation("CareerGoalAuthor")`, `createdAt` only — **no `updatedAt`** (D-16 immutability signal), `@@index([studentId, createdAt(sort: Desc)])`
  - `StaffNote` model: `content String @db.VarChar(500)`, `authorId+author User @relation("StaffNoteAuthor")`, `createdAt` only — **no `updatedAt`** (D-17 append-only signal), `@@index([studentId, createdAt(sort: Desc)])`
  - Back-relations added to `Student`: `careerGoals CareerGoal[]`, `staffNotes StaffNote[]`
  - Back-relations added to `User`: `careerGoalsAuthored CareerGoal[] @relation("CareerGoalAuthor")`, `staffNotesAuthored StaffNote[] @relation("StaffNoteAuthor")`
  - `npx prisma generate` run — client regenerated with new types
- **`server/src/schemas/careerGoal.ts`**: `CAREER_INTERESTS` const, `createCareerGoalSchema` with `interests` array `min(1)` + `description` optional; `.strict()`; no update schema
- **`server/src/schemas/staffNote.ts`**: `createStaffNoteSchema` with `content` `min(1) max(500)`; `.strict()`; no update schema
- **`server/src/services/careerGoal.ts`**: exports only `listCareerGoals` (findMany desc) + `createCareerGoal` (always new row + logAudit); no update or delete functions
- **`server/src/services/staffNote.ts`**: exports only `listStaffNotes` (findMany desc) + `createStaffNote` (new row + logAudit); no update or delete functions
- **`server/src/routes/careerGoals.ts`**: `Router({ mergeParams: true })`, GET `/` + POST `/` only — no PATCH or DELETE registered
- **`server/src/routes/notes.ts`**: `Router({ mergeParams: true })`, GET `/` + POST `/` only — no PATCH or DELETE registered
- **`server/src/routes/students.ts`**: added mounts `router.use('/:studentId/career-goals', careerGoalsRouter)` and `router.use('/:studentId/notes', notesRouter)`

## Verification Results

- `npx tsc --noEmit` exits 0 — TypeScript compiles cleanly
- All 12 stu-07/stu-08 tests fail as expected (no DB tables until Plan 03-03b)
- No PATCH or DELETE routes registered in careerGoals.ts or notes.ts (D-16/D-17 enforcement verified)
- No `updateCareerGoal`, `deleteCareerGoal`, `updateStaffNote`, `deleteStaffNote` exported from services

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ZodError property name**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Used `parsed.error.errors` — property is `issues` on ZodError (Zod v4 naming)
- **Fix:** Changed to `parsed.error.issues` in both careerGoals.ts and notes.ts routes
- **Files modified:** `server/src/routes/careerGoals.ts`, `server/src/routes/notes.ts`
- **Commit:** 3ac7632

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 (TDD RED) | 8dc5eac | test(03-03a): add failing RED tests for stu-07 career goals and stu-08 staff notes |
| Task 2 (Implementation) | 3ac7632 | feat(03-03a): implement CareerGoal + StaffNote backend (schema, services, routes) |

## Known Stubs

None — all service/route logic is complete. Tests remain RED only because DB tables are not yet created (deferred to Plan 03-03b which runs `prisma migrate`/`db push`).

## Threat Flags

None — no new network endpoints beyond those specified in the plan threat model.

## Self-Check: PASSED

- [x] `server/src/schemas/careerGoal.ts` — FOUND
- [x] `server/src/schemas/staffNote.ts` — FOUND
- [x] `server/src/services/careerGoal.ts` — FOUND
- [x] `server/src/services/staffNote.ts` — FOUND
- [x] `server/src/routes/careerGoals.ts` — FOUND
- [x] `server/src/routes/notes.ts` — FOUND
- [x] Commit 8dc5eac — FOUND
- [x] Commit 3ac7632 — FOUND
