---
phase: 03-student-records-ui
reviewed: 2026-06-13T22:57:00+08:00
depth: standard
files_reviewed: 34
files_reviewed_list:
  - server/prisma/schema.prisma
  - server/src/routes/students.ts
  - server/src/routes/academicResults.ts
  - server/src/routes/activities.ts
  - server/src/routes/awards.ts
  - server/src/routes/workExperience.ts
  - server/src/routes/careerGoals.ts
  - server/src/routes/notes.ts
  - server/src/schemas/academicResult.ts
  - server/src/schemas/activity.ts
  - server/src/schemas/award.ts
  - server/src/schemas/workExperience.ts
  - server/src/schemas/careerGoal.ts
  - server/src/schemas/staffNote.ts
  - server/src/services/academicResult.ts
  - server/src/services/activity.ts
  - server/src/services/award.ts
  - server/src/services/workExperience.ts
  - server/src/services/careerGoal.ts
  - server/src/services/staffNote.ts
  - server/src/__tests__/records.test.ts
  - client/src/App.tsx
  - client/src/lib/periodFormat.ts
  - client/src/components/records/RecordSectionCard.tsx
  - client/src/components/records/MonthYearPicker.tsx
  - client/src/components/records/RecordDeleteDialog.tsx
  - client/src/components/records/AcademicResultsSection.tsx
  - client/src/components/records/ActivitiesSection.tsx
  - client/src/components/records/AwardsSection.tsx
  - client/src/components/records/WorkExperienceSection.tsx
  - client/src/components/records/CareerGoalsSection.tsx
  - client/src/components/records/NotesSection.tsx
  - client/src/components/records/CareerInterestsChecklist.tsx
  - client/src/pages/StudentDetailPage.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 03: Student Records UI — Code Review Report

**Reviewed:** 2026-06-13T22:57:00+08:00
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

The implementation is solid: IDOR guards are consistently applied across all five mutable record services using `existing.studentId !== studentId → 404`, D-16/D-17 (careerGoals and notes GET+POST only) is correctly enforced at the route level with no PATCH/DELETE registered, and all six create schemas have `.strict()`. Audit logging is present on every write path, and the null-first sort ordering for activities and work experience is correctly implemented with Prisma's `nulls: 'first'` clause.

One critical bug was found: the `createActivity`, `updateActivity`, `createWorkExperience`, and `updateWorkExperience` schemas do not validate that `endMonth` and `endYear` are provided together, allowing a partial end-date state that produces incorrect sort order and incorrect display. Beyond that, four warnings (race condition, empty-PATCH no-op, missing DELETE IDOR tests, stale `subjectOther`) and four info items are documented below.

---

## Critical Issues

### CR-01: `endMonth`/`endYear` not validated together — partial end-date corrupts sort and display

**Files:**
- `server/src/schemas/activity.ts:13-14`
- `server/src/schemas/workExperience.ts:13-14`

**Issue:** `endMonth` and `endYear` are declared independently optional/nullable in both create and update schemas. A client can POST `{ ..., endMonth: 6 }` without `endYear`, producing the DB state `endMonth=6, endYear=null`. Because the service sorts by `{ endYear: { sort: 'desc', nulls: 'first' } }`, a record with `endYear=null` is treated as "ongoing" and floats to the top — but a record with `endYear=2024, endMonth=null` is sorted as a dated entry while `formatPeriod` renders it as "… – Present" (because `endMonth == null`). Either combination produces an incorrect result.

The server schema is the last enforcement layer; the client strips `endMonth`/`endYear` together but a malformed or direct-API call can bypass this.

**Fix:** Add a cross-field refinement to both schemas:

```typescript
// activity.ts and workExperience.ts — apply to both create and update schemas
.refine(
  (data) => {
    const hasMonth = data.endMonth != null;
    const hasYear = data.endYear != null;
    return hasMonth === hasYear; // both present or both absent
  },
  {
    message: 'endMonth and endYear must both be provided or both be absent',
    path: ['endMonth'],
  },
)
```

---

## Warnings

### WR-01: TOCTOU race condition in all update/delete service operations

**Files:**
- `server/src/services/academicResult.ts:64-66, 97-99`
- `server/src/services/activity.ts:67-69, 101-103`
- `server/src/services/award.ts:64-66, 97-99`
- `server/src/services/workExperience.ts:67-69, 101-103`

**Issue:** All four mutable services use a read-then-write pattern:

```typescript
const existing = await prisma.academicResult.findUnique({ where: { id } })
if (!existing || existing.studentId !== studentId) throw new AcademicResultNotFoundError()
await prisma.academicResult.delete({ where: { id } })
```

If two requests delete the same record concurrently, the second request will pass the IDOR check (record still exists at check time) and then throw a Prisma P2025 ("Record to delete does not exist") that is unhandled. This propagates as a 500 to the client. The same race applies to update operations (P2025 on `prisma.*.update`).

**Fix:** Catch P2025 in the delete/update paths and rethrow as the domain error:

```typescript
import { Prisma } from '../generated/prisma/client.js'

// In deleteAcademicResult (and equivalent delete/update functions):
try {
  await prisma.academicResult.delete({ where: { id } })
} catch (err) {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    throw new AcademicResultNotFoundError()
  }
  throw err
}
```

---

### WR-02: Empty `PATCH {}` accepted on all record routes — no-op update logs a spurious audit entry

**Files:**
- `server/src/routes/academicResults.ts:62-86`
- `server/src/routes/activities.ts:59-83`
- `server/src/routes/awards.ts:59-83`
- `server/src/routes/workExperience.ts:59-83`

**Issue:** All four update schemas use `.strict()` with all-optional fields, so a client may send an empty body `{}` which passes Zod validation. The service then executes a Prisma `update` (touching `updatedAt`) and writes an `AuditLog` row with `action: UPDATE` even though no field changed. By contrast, `students.ts:100-103` explicitly rejects empty PATCH bodies with a 400. The record routes lack this guard.

**Fix:** Add the empty-body guard to all record PATCH handlers, following the pattern already established in `students.ts`:

```typescript
router.patch('/:resultId', async (req, res, next) => {
  // ... parse studentId and schema ...
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }
  // ... existing try/catch ...
})
```

---

### WR-03: IDOR test coverage is PATCH-only — DELETE IDOR path is untested for all four mutable record types

**File:** `server/src/__tests__/records.test.ts`

**Issue:** Tests `stu-03-idor`, `stu-04-idor`, `stu-05-idor`, and `stu-06-idor` each verify that a PATCH to a record belonging to a different student returns 404. None of these test cases also attempt a DELETE cross-student. The IDOR guard in all four delete service functions is correct, but if the guard were accidentally removed during a refactor, no test would catch it.

**Fix:** Add a DELETE-IDOR test case alongside each existing PATCH-IDOR case. Example for `stu-03`:

```typescript
it('stu-03-idor-delete: DELETE with resultId belonging to different studentId returns 404', async () => {
  const studentA = await createTestStudent({ schoolStudentId: 'S2024111' })
  const studentB = await createTestStudent({ schoolStudentId: 'S2024112', fullName: 'Lee Siu Ming' })
  const token = staffToken()

  const createRes = await request(app)
    .post(`/api/students/${studentA.id}/academics`)
    .set('Authorization', `Bearer ${token}`)
    .send(validAcademicPayload)
  expect(createRes.status).toBe(201)

  const res = await request(app)
    .delete(`/api/students/${studentB.id}/academics/${createRes.body.id}`)
    .set('Authorization', `Bearer ${token}`)

  expect(res.status).toBe(404)
})
```

---

### WR-04: `subjectOther` not cleared in DB when `subject` changes away from `OTHER` via PATCH

**File:** `server/src/services/academicResult.ts:69-79`

**Issue:** The update service spreads only fields that are non-undefined in the patch body:

```typescript
...(data.subjectOther !== undefined && { subjectOther: data.subjectOther ?? null }),
```

The client correctly omits `subjectOther` from the patch body when `subject !== 'OTHER'` (see `AcademicResultsSection.tsx:206`). Because `data.subjectOther` is `undefined` in that case, the service leaves the existing `subjectOther` value in the DB unchanged. After the PATCH the record has `subject: 'Biology', subjectOther: 'Physics'` — stale data that is invisible in the UI (display logic guards on `subject === 'OTHER'`) but will be present in any future DB queries or transcript exports.

**Fix:** Explicitly clear `subjectOther` when `subject` is being changed to a non-OTHER value:

```typescript
// In updateAcademicResult service, after the IDOR check:
const data: Prisma.AcademicResultUpdateInput = {
  ...(data.subject !== undefined && { subject: data.subject }),
  ...(data.subject !== undefined && data.subject !== 'OTHER' && { subjectOther: null }),
  ...(data.subjectOther !== undefined && data.subject === 'OTHER' && { subjectOther: data.subjectOther ?? null }),
  // ...other fields
}
```

---

## Info

### IN-01: `parseStudentId` function duplicated in all six record route files

**Files:** `academicResults.ts:18-33`, `activities.ts:15-30`, `awards.ts:15-30`, `workExperience.ts:15-30`, `careerGoals.ts:9-24`, `notes.ts:9-24` (also duplicated in `students.ts:25-40`)

**Issue:** An identical `parseStudentId` function is copy-pasted into each of the seven route files. Any change to its logic (e.g., validation message, schema) must be replicated seven times.

**Fix:** Extract to a shared helper, e.g., `server/src/routes/_helpers.ts`, and import from all route files.

---

### IN-02: `MonthYearPicker` year range (last 10 years) diverges from server schema allowed range

**File:** `client/src/components/records/MonthYearPicker.tsx:24-25`

**Issue:** The picker generates `Array.from({ length: 11 }, (_, i) => currentYear - i)` — only the last 10 years, no future years. The server validates `yearSchema: z.number().int().min(2000).max(2040)`. Two gaps:

1. A future end date (e.g., a planned internship ending in 2027) cannot be entered via the UI.
2. Activity or work experience entries from before `currentYear - 10` (legal per server schema) cannot be entered.

**Fix:** Extend the range to include future years for end dates (at minimum the next 2–3 years) and align the past-year floor with the server schema. Consider making the range configurable via props:

```typescript
interface MonthYearPickerProps {
  // ...
  minYear?: number;  // default 2010
  maxYear?: number;  // default currentYear + 3
}
```

---

### IN-03: `careerGoalFormSchema` weakens enum type safety via `as [string, ...string[]]` cast

**File:** `client/src/components/records/CareerGoalsSection.tsx:39-43`

**Issue:**
```typescript
const CAREER_INTEREST_KEYS = Object.keys(CAREER_INTEREST_LABELS);
// typed as string[] at compile time
interests: z.array(z.enum(CAREER_INTEREST_KEYS as [string, ...string[]])).min(1, ...)
```
The `Object.keys()` return type is `string[]`, losing the const-tuple shape `z.enum()` expects. The cast silences TypeScript but removes the compile-time guarantee that only valid interest keys are accepted. If `CAREER_INTEREST_LABELS` is modified, the schema divergence will not be caught at compile time.

**Fix:** Use the same const array pattern as the server schema:
```typescript
// In CareerInterestsChecklist.tsx or a shared constants file:
export const CAREER_INTEREST_KEYS = [
  'MEDICINE_HEALTH', 'LAW', 'ENGINEERING', ...
] as const;

// In CareerGoalsSection.tsx:
interests: z.array(z.enum(CAREER_INTEREST_KEYS)).min(1, 'Select at least one interest'),
```

---

### IN-04: GET record routes return `200 []` for a non-existent student UUID

**Files:** All six record route GET handlers (`academicResults.ts:35-44`, `activities.ts:32-41`, etc.)

**Issue:** When a valid UUID that belongs to no student is used (e.g., `GET /api/students/<fabricated-uuid>/academics`), the service queries Prisma with `where: { studentId }` which returns an empty array — a 200 response. The route does not verify the student actually exists. This silently succeeds rather than returning 404. While it does not expose cross-student data (empty array contains nothing), it produces a misleading response and may confuse UI loading states.

**Fix:** Add a lightweight student existence check before the query, or verify the student exists in each list service. The check can be a fast `findUnique` on `{ id: studentId, select: { id: true } }`.

---

_Reviewed: 2026-06-13T22:57:00+08:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
