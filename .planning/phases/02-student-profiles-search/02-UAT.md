---
status: testing
phase: 02-student-profiles-search
source: [02-VERIFICATION.md]
started: 2026-06-12T09:10:00Z
updated: 2026-06-12T09:10:00Z
---

## Current Test

number: 1
name: Create student end-to-end
expected: |
  Sign in as staff, navigate to /students/new, fill required fields (name, form level, graduation year, school ID), click Create student.
  Success toast "Student created", redirect to /students/:uuid detail page; student appears in /students list when navigating back.
awaiting: user response

## Tests

### 1. Create student end-to-end
expected: Success toast, redirect to detail page, student visible in list after navigating back
result: [pending]

### 2. Archive with typed confirmation
expected: Confirm disabled until name matches (case-insensitive); toast "Student archived"; redirect to /students; student absent from default list
result: [pending]

### 3. Cohort overview visual layout
expected: Header rows show "Form N" with "Draft: n · Finalised: n · None: n"; each row has transcript status badge; row click opens detail
result: [pending]

### 4. Search button behavior at runtime
expected: No list refetch while typing only; after Search click, list filters to matching names
result: [pending]

### 5. Admin archived toggle and list restore
expected: Archived rows visible with muted styling; Restore succeeds with toast and row returns to active state
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
