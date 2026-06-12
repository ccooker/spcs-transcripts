---
status: complete
phase: 02-student-profiles-search
source: [02-VERIFICATION.md]
started: 2026-06-12T09:10:00Z
updated: 2026-06-12T19:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create student end-to-end
expected: Success toast, redirect to detail page, student visible in list after navigating back
result: pass

### 2. Archive with typed confirmation
expected: Confirm disabled until name matches (case-insensitive); toast "Student archived"; redirect to /students; student absent from default list
result: pass

### 3. Cohort overview visual layout
expected: Header rows show "Form N" with "Draft: n · Finalised: n · None: n"; each row has transcript status badge; row click opens detail
result: pass

### 4. Search button behavior at runtime
expected: No list refetch while typing only; after Search click, list filters to matching names
result: pass

### 5. Admin archived toggle and list restore
expected: Archived rows visible with muted styling; Restore succeeds with toast and row returns to active state
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — Test 1 issues resolved during UAT session]
