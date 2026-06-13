---
status: testing
phase: 04-document-management
source: [04-VERIFICATION.md]
started: 2026-06-13T03:31:00.000Z
updated: 2026-06-13T03:31:00.000Z
---

## Current Test

number: 1
name: Upload flow — progress bar and document appears in list
expected: |
  Staff clicks "Upload document", selects a PDF, picks a document type, clicks Submit — progress bar advances from 0% to 100%, then the document appears in the list table.
awaiting: user response

## Tests

### 1. Upload flow
expected: Staff clicks "Upload document", selects a PDF, picks a document type, submits — progress bar advances; document appears in list after upload completes.
result: [pending]

### 2. Download flow
expected: Clicking the Download icon fetches the file via authenticated fetch+blob+anchor and triggers browser save with the original filename.
result: [pending]

### 3. Delete flow
expected: Delete icon opens AlertDialog with title "Delete document", cancel button reads "Keep document"; confirming removes the document from the list.
result: [pending]

### 4. Empty state
expected: A student with no documents shows "No documents yet." with the body text "Upload PDF files to attach supporting documents to this student's record."
result: [pending]

### 5. Section order
expected: Documents section is visually last (7th) in the student detail page — appearing after the Notes section.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
