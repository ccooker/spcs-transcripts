---
phase: 02-student-profiles-search
reviewed: 2026-06-12T12:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - server/prisma/schema.prisma
  - server/src/schemas/student.ts
  - server/src/services/student.ts
  - server/src/routes/students.ts
  - server/src/app.ts
  - server/src/__tests__/students.test.ts
  - server/src/__tests__/helpers/testDb.ts
  - client/package.json
  - client/src/api/apiClient.ts
  - client/src/components/layout/AppShell.tsx
  - client/src/components/students/StudentForm.tsx
  - client/src/lib/formLevels.ts
  - client/src/pages/HomePage.tsx
  - client/src/pages/StudentNewPage.tsx
  - client/src/App.tsx
  - client/src/main.tsx
  - client/src/components/students/ArchiveStudentDialog.tsx
  - client/src/pages/StudentDetailPage.tsx
  - client/src/components/ui/alert-dialog.tsx
  - client/src/pages/StudentsListPage.tsx
  - client/src/components/students/StudentsDataTable.tsx
  - client/src/components/students/StudentColumns.tsx
  - client/src/components/students/CohortGroupHeader.tsx
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-12T12:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 02 delivers a coherent student CRUD vertical slice: Prisma `Student` model, Zod-validated Express routes with audit logging, and React pages for create, detail/edit/archive, and paginated list with cohort headers. Auth middleware, role gating on restore/`includeArchived`, and parameterized Prisma queries are applied consistently.

No critical security vulnerabilities or data-loss bugs were found. Six warnings cover incorrect error semantics on restore, unvalidated `:id` params, search wildcard behavior, pagination edge cases, a graduation-year UI/server mismatch, and spurious audit entries on empty PATCH. Three info items note dead code and stale copy.

## Warnings

### WR-01: Restore on active student returns misleading 409

**File:** `server/src/services/student.ts:193-194`
**Issue:** When `restoreStudent` is called on a student that is not archived, it throws `StudentArchivedError`, which maps to HTTP 409 with body `{ error: 'Student is archived' }`. The student is actually active, so the status code and message are inverted — API consumers and logs will misread the failure.
**Fix:**
```typescript
export class StudentAlreadyActiveError extends Error {
  constructor() {
    super('Student is not archived')
    this.name = 'StudentAlreadyActiveError'
  }
}

// In restoreStudent:
if (!existing.archivedAt) {
  throw new StudentAlreadyActiveError()
}

// In routes/students.ts handleStudentError:
if (err instanceof StudentAlreadyActiveError) {
  res.status(409).json({ error: 'Student is not archived' })
  return
}
```

### WR-02: Malformed `:id` path params may surface as 500

**File:** `server/src/routes/students.ts:55-94`
**Issue:** `req.params.id` is passed directly to Prisma without UUID validation. Tests cover well-formed unknown UUIDs (404), but malformed strings (e.g. `not-a-uuid`) can trigger Prisma driver errors that bypass `handleStudentError` and fall through to an unhandled 500. Only JWT errors have a global handler in `app.ts`.
**Fix:** Add a shared param schema and validate before service calls:
```typescript
const studentIdParamSchema = z.string().uuid()

router.get('/:id', async (req, res, next) => {
  const parsed = studentIdParamSchema.safeParse(req.params.id)
  if (!parsed.success) {
    res.status(404).json({ error: 'Student not found' })
    return
  }
  // use parsed.data
})
```

### WR-03: Search query treats `%` and `_` as SQL LIKE wildcards

**File:** `server/src/services/student.ts:70`
**Issue:** `fullName: { contains: q, mode: 'insensitive' }` generates a SQL `ILIKE '%…%'` pattern. Characters `%` and `_` retain wildcard semantics, so `q=%` matches every name (within other filters), and `_` matches any single character. Staff can accidentally — or intentionally — bypass name filtering.
**Fix:** Escape LIKE metacharacters before querying:
```typescript
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

...(q ? { fullName: { contains: escapeLikePattern(q), mode: 'insensitive' as const } } : {}),
```

### WR-04: List page can show empty state when results exist on a prior page

**File:** `client/src/pages/StudentsListPage.tsx:84-98`, `client/src/components/students/StudentsDataTable.tsx:79-96`
**Issue:** `pageIndex` is reset when filters/sort/search change, but not after a fetch returns `data: []` while `meta.total > 0` (e.g. user on page 2, enough rows archived elsewhere, or stale page after concurrent edits). The table renders the "No students found" empty state even though matching students exist on page 1.
**Fix:** After fetch, clamp page index and refetch if needed:
```typescript
const res = await apiGet<ListResponse>(`/students?${buildQueryString()}`)
if (res.data.length === 0 && res.meta.total > 0 && pageIndex > 0) {
  setPageIndex(0)
  return // let effect refetch at page 0
}
setStudents(res.data)
setTotal(res.meta.total)
setTotalPages(res.meta.totalPages)
```

### WR-05: Graduation year dropdown narrower than server validation

**File:** `client/src/components/students/StudentForm.tsx:24-25`, `server/src/schemas/student.ts:16`
**Issue:** Server accepts `graduationYear` from 2020–2040. The client dropdown only offers `currentYear` through `currentYear + 6` (7 options). Editing a student whose stored year falls outside that window leaves the Select with a value not present in options — the field may render blank and cannot be re-selected without manual API calls.
**Fix:** Align client options with server bounds, or derive options from `Math.max(2020, currentYear - N)` through `2040`.

### WR-06: Empty PATCH body writes audit log without changes

**File:** `server/src/schemas/student.ts:25`, `server/src/services/student.ts:123-149`
**Issue:** `updateStudentSchema` is fully partial; `PATCH /api/students/:id` with `{}` passes validation. `updateStudent` builds an empty Prisma `data` object but still calls `logAudit` with action `UPDATE`. This pollutes the audit trail with no-op mutations.
**Fix:** Reject empty payloads at the route or service layer:
```typescript
if (Object.keys(parsed.data).length === 0) {
  res.status(400).json({ error: 'No fields to update' })
  return
}
```

## Info

### IN-01: Orphaned list stub page

**File:** `client/src/pages/StudentsPage.tsx`
**Issue:** Plan 01 stub replaced by `StudentsListPage` in Plan 03; this file is no longer imported or routed. Dead code increases maintenance noise.
**Fix:** Delete `StudentsPage.tsx` or re-export from the new page if a rename alias is needed.

### IN-02: HomePage copy references Phase 2 as future work

**File:** `client/src/pages/HomePage.tsx:26-28`
**Issue:** Welcome text still says student records "will appear here in Phase 2" although Phase 2 student navigation is complete.
**Fix:** Update copy to point users to the Students nav link.

### IN-03: Duplicate `FORM_LEVELS` constants

**File:** `server/src/schemas/student.ts:3-10`, `client/src/lib/formLevels.ts:1-8`
**Issue:** Identical enum values maintained in two places. A future form level added on one side only will cause silent client/server validation drift.
**Fix:** Consider a shared package or generated types from the Prisma schema for the client bundle.

---

_Reviewed: 2026-06-12T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
