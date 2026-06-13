---
status: testing
phase: 05-transcript-assembly-export
source: [05-VERIFICATION.md]
started: 2026-06-14T08:55:00Z
updated: 2026-06-14T08:55:00Z
---

## Current Test

number: 1
name: TipTap toolbar — bold/italic/lists persist after save
expected: |
  Open /students/:id/transcript, select text, click Bold/Italic/List buttons, wait for auto-save, reload page.
  Formatted HTML (<strong>, <em>, lists) persists in section content after reload.
awaiting: user response

## Tests

### 1. TipTap toolbar
expected: Bold/Italic/Bullet/Numbered formatting persists after auto-save and page reload
result: [pending]

### 2. PDF visual branding
expected: After configuring logo + letterhead in /settings, Export PDF on transcript page produces a PDF with school logo, name, address, letterhead, and visible sections
result: [pending]

### 3. Logo preview in Settings
expected: Upload PNG in /settings, save, reload — logo preview displays via authenticated blob URL (not broken image)
result: [pending]

### 4. Records-updated banner
expected: Open transcript, add/edit a record on StudentDetailPage, return to transcript — RecordsUpdatedBanner appears with Regenerate/Dismiss
result: [pending]

### 5. Finalised status indicator
expected: Set status to Finalised — confirm whether read-only/lock UI is required (optional per roadmap; no lock wired currently)
result: [pending]

### 6. Admin vs Staff settings access
expected: Admin sees Settings nav and /settings form; Staff navigating to /settings redirects to /unauthorized
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
