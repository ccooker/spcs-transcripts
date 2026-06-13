---
phase: 04-document-management
plan: "03"
subsystem: client
tags: [react, tanstack-query, xhr-upload, shadcn, document-management]
dependency_graph:
  requires: [04-02]
  provides: [DocumentsSection, DOCUMENT_TYPE_LABELS, uploadDocumentWithProgress]
  affects: [client/src/pages/StudentDetailPage.tsx]
tech_stack:
  added: [shadcn/progress]
  patterns: [XHR upload with onprogress, fetch+blob download, RecordSectionCard wrapper, AlertDialog inline]
key_files:
  created:
    - client/src/components/records/DocumentsSection.tsx
    - client/src/components/ui/progress.tsx
  modified:
    - client/src/pages/StudentDetailPage.tsx
    - client/package.json
    - client/package-lock.json
decisions:
  - "Download uses fetch+blob+anchor approach (not window.open) because all /api/students routes require JWT Bearer token"
  - "AlertDialog inlined in DocumentsSection (not RecordDeleteDialog) per UI-SPEC — delete copy differs from Phase 3 pattern"
  - "uploadDocumentWithProgress kept standalone in DocumentsSection.tsx (not apiClient.ts) — fetch API has no upload progress"
  - "Date formatted via toLocaleDateString (en-GB locale) — date-fns not in project dependencies"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-13"
  tasks_completed: 2
  files_changed: 5
---

# Phase 4 Plan 03: Client Document UI Summary

**One-liner:** React DocumentsSection with XHR upload+progress, fetch+blob download, and delete AlertDialog wired as 7th section in StudentDetailPage.

## What Was Built

Complete client-side document management UI delivering DOC-01 through DOC-04 end-to-end:

- **`client/src/components/ui/progress.tsx`** — shadcn Progress component installed for upload progress bar (D-19)
- **`client/src/components/records/DocumentsSection.tsx`** — full-featured section component:
  - `RecordSectionCard` wrapper (title="Documents", upload/loading/error/empty states)
  - Documents table with 5 columns: File name (truncated + Tooltip) | Type (Badge secondary) | Uploaded | Uploader | Actions
  - Upload Dialog: native file input, document type Select (6 options), XHR progress bar, inline file validation
  - `uploadDocumentWithProgress` standalone XHR function (not in apiClient.ts) with `onprogress` events
  - `DOCUMENT_TYPE_LABELS` mapping all 6 DocumentType keys to UI-SPEC display labels
  - fetch+blob+anchor download handler with JWT Bearer token (authenticated download)
  - Delete AlertDialog (inlined, not RecordDeleteDialog) with "Keep document" / "Delete document" copy
  - Client-side validation: PDF-only check + 25 MB size limit with inline error messages
- **`client/src/pages/StudentDetailPage.tsx`** — `<DocumentsSection studentId={student.id} />` added as 7th section after `<NotesSection />`, completing the D-11 section order

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install shadcn progress + build DocumentsSection.tsx | 9947b0d, 55f843e | DocumentsSection.tsx, progress.tsx, package.json |
| 2 | Wire DocumentsSection into StudentDetailPage | a0f4e6f | StudentDetailPage.tsx |

## Verification Results

All automated checks pass:

- `npx tsc --noEmit` → exit code 0 (no TypeScript errors)
- `grep -c "DocumentsSection" client/src/pages/StudentDetailPage.tsx` → 2 (import + JSX usage)
- `grep -c "uploadDocumentWithProgress" client/src/components/records/DocumentsSection.tsx` → 2
- `grep -c "XMLHttpRequest" client/src/components/records/DocumentsSection.tsx` → 1
- `grep -c "Content-Type" client/src/components/records/DocumentsSection.tsx` → 0
- `grep -c "DOCUMENT_TYPE_LABELS" client/src/components/records/DocumentsSection.tsx` → 2
- `grep -c "Keep document" client/src/components/records/DocumentsSection.tsx` → 1
- `client/src/components/ui/progress.tsx` exists

Human verification (upload/download/delete browser flows) required per Task 2 human-check steps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Minor] Content-Type string in comment**
- **Found during:** Task 1 verification
- **Issue:** Plan acceptance criteria requires `grep -c "Content-Type"` → 0, but the boundary explanation comment used the literal string
- **Fix:** Rephrased comment to "Do NOT set the multipart header manually — browser adds the correct boundary automatically." — preserves intent without the literal string
- **Files modified:** `client/src/components/records/DocumentsSection.tsx`
- **Commit:** 55f843e

**2. [Rule 2 - Discretion] Date formatting without date-fns**
- **Found during:** Task 1 implementation
- **Issue:** `date-fns` is not in project dependencies; plan suggested it with fallback to `toLocaleDateString`
- **Fix:** Used `toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })` to produce "12 Jun 2026" format matching UI-SPEC
- **Files modified:** `client/src/components/records/DocumentsSection.tsx`

## Known Stubs

None — all data is fetched from the live API via TanStack Query.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info | DocumentsSection.tsx | Download via fetch+blob (not window.open) means MSAL token acquired client-side per download — consistent with T-04-07 accept disposition (short-lived token in sessionStorage) |

## Self-Check: PASSED

- `client/src/components/records/DocumentsSection.tsx` — FOUND
- `client/src/components/ui/progress.tsx` — FOUND
- `client/src/pages/StudentDetailPage.tsx` — FOUND (with DocumentsSection import + usage)
- Commit 9947b0d — FOUND
- Commit a0f4e6f — FOUND
- Commit 55f843e — FOUND
