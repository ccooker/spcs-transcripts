---
status: testing
phase: 03-student-records-ui
source: [03-VERIFICATION.md]
started: 2026-06-13T06:55:00.000Z
updated: 2026-06-13T06:55:00.000Z
---

## Current Test

number: 1
name: All 6 sections visible in D-02 order with correct empty-state copy
expected: |
  Navigate to /students/:id — all 6 sections appear in this order: Academic Results, Activities, Awards, Work Experience, Career Goals, Notes. Each shows its empty-state heading and body text. Section header shows "(0)" count.
awaiting: user response

## Tests

### 1. Visual layout — all 6 sections in D-02 order
expected: Navigate to /students/:id — all 6 sections appear in this order: Academic Results, Activities, Awards, Work Experience, Career Goals, Notes. Each section shows correct empty-state copy with "(0)" count in header.
result: [pending]

### 2. Add academic result → TanStack Query cache invalidation
expected: Click "Add result" in Academic Results section, fill in valid data (subject, grade, calendar year, form level), submit → result appears in the table immediately (no page reload). Count in header updates to "(1)".
result: [pending]

### 3. Career goals versioned display
expected: Add career goals by checking interest checkboxes, submit → interests appear as Badge chips. Add again with different interests → version history shows both entries (newest first) — old entry is preserved, not overwritten.
result: [pending]

### 4. Notes append-only — no edit/delete controls visible
expected: Add a staff note → appears with the author's display name and a formatted timestamp. No edit button. No delete button. Submitting another note adds a second entry above the first (reverse-chronological).
result: [pending]

### 5. Edit academic result → dialog pre-populates correctly
expected: Click edit (pencil) on an existing academic result → dialog opens with all current values pre-filled (subject selected, grade, year, form level). Make a change, save → table updates immediately.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
