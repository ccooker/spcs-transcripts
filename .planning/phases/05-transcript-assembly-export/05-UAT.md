---
status: complete
phase: 05-transcript-assembly-export
source: [05-VERIFICATION.md]
started: 2026-06-14T08:55:00Z
updated: 2026-06-14T14:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. TipTap toolbar
expected: Bold/Italic/Bullet/Numbered formatting persists after auto-save and page reload
result: pass

### 2. PDF visual branding
expected: After configuring logo + letterhead in /settings, Export PDF on transcript page produces a PDF with school logo, name, address, letterhead, and visible sections
result: pass

### 3. Logo preview in Settings
expected: Upload PNG in /settings, save, reload — logo preview displays via authenticated blob URL (not broken image)
result: pass

### 4. Records-updated banner
expected: Open transcript, add/edit a record on StudentDetailPage, return to transcript — RecordsUpdatedBanner appears with Regenerate/Dismiss
result: pass

### 5. Finalised status indicator
expected: Set status to Finalised — confirm whether read-only/lock UI is required (optional per roadmap; no lock wired currently)
result: pass

### 6. Admin vs Staff settings access
expected: Admin sees Settings nav and /settings form; Staff navigating to /settings redirects to /unauthorized
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
