---
phase: 02-student-profiles-search
fixed_at: 2026-06-12T17:14:00Z
review_path: .planning/phases/02-student-profiles-search/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-06-12T17:14:00Z
**Source review:** `.planning/phases/02-student-profiles-search/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

**Server tests:** 30 passed (4 files) after all fixes.

## Fixed Issues

### WR-01: Restore on active student returns misleading 409

**Files modified:** `server/src/services/student.ts`, `server/src/routes/students.ts`
**Commit:** 57fb1e4
**Applied fix:** Added `StudentAlreadyActiveError` and throw it when restoring a non-archived student; mapped to HTTP 409 with `{ error: 'Student is not archived' }`.

### WR-02: Malformed `:id` path params may surface as 500

**Files modified:** `server/src/schemas/student.ts`, `server/src/routes/students.ts`
**Commit:** e303ccb
**Applied fix:** Added `studentIdParamSchema` (UUID) and `parseStudentId` helper; all `/:id` routes return 404 for malformed IDs before calling Prisma.

### WR-03: Search query treats `%` and `_` as SQL LIKE wildcards

**Files modified:** `server/src/services/student.ts`
**Commit:** 702cdde
**Applied fix:** Added `escapeLikePattern` to escape `%`, `_`, and `\` before `contains` search.

### WR-04: List page can show empty state when results exist on a prior page

**Files modified:** `client/src/pages/StudentsListPage.tsx`
**Commit:** fd8446e
**Applied fix:** When fetch returns empty `data` but `meta.total > 0` on a non-zero page, reset `pageIndex` to 0 and let the effect refetch.

### WR-05: Graduation year dropdown narrower than server validation

**Files modified:** `client/src/components/students/StudentForm.tsx`
**Commit:** ae0a1fa
**Applied fix:** Graduation year options now span 2020–2040 to match server schema bounds.

### WR-06: Empty PATCH body writes audit log without changes

**Files modified:** `server/src/routes/students.ts`
**Commit:** 1cab92e
**Applied fix:** Reject PATCH with empty body via 400 `{ error: 'No fields to update' }` before calling `updateStudent`.

## Skipped Issues

None — all in-scope findings were fixed. Info findings (IN-01 through IN-03) were out of scope per `fix_scope: critical_warning`.

---

_Fixed: 2026-06-12T17:14:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
