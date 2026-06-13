---
phase: 4
slug: document-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.3 |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `cd server && npm test -- --testNamePattern "doc-"` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npm test -- --testNamePattern "doc-"`
- **After every plan wave:** Run `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DOC-01 | T-04-01 | POST with non-PDF MIME → 400 | integration | `npm test -- --testNamePattern "doc-01-reject-mime"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | DOC-01 | T-04-01 | POST with wrong magic bytes → 400 | integration | `npm test -- --testNamePattern "doc-01-reject-magic"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | DOC-01 | T-04-02 | POST file > 25 MB → 400 | integration | `npm test -- --testNamePattern "doc-01-size-limit"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | DOC-01 | T-04-03 | POST to another student (IDOR) → 403/404 | integration | `npm test -- --testNamePattern "doc-01-idor"` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | DOC-01 | — | POST valid PDF + typeTag → 201 with metadata | integration | `npm test -- --testNamePattern "doc-01"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | DOC-02 | — | GET /documents returns active docs, excludes soft-deleted | integration | `npm test -- --testNamePattern "doc-02"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | DOC-02 | — | GET /documents/:docId/download → 200 + Content-Disposition attachment | integration | `npm test -- --testNamePattern "doc-02-download"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 02 | 2 | DOC-03 | — | DELETE sets deletedAt; excluded from subsequent GET | integration | `npm test -- --testNamePattern "doc-03"` | ❌ W0 | ⬜ pending |
| 04-03-02 | 02 | 2 | DOC-03 | — | Soft-delete creates AuditLog entry (action=DELETE) | integration | `npm test -- --testNamePattern "doc-03-audit"` | ❌ W0 | ⬜ pending |
| 04-04-01 | 01 | 1 | DOC-04 | T-04-04 | POST with invalid typeTag → 400 | integration | `npm test -- --testNamePattern "doc-04-invalid-type"` | ❌ W0 | ⬜ pending |
| 04-04-02 | 01 | 1 | DOC-04 | — | POST with each of 6 valid type tags → 201 | integration | `npm test -- --testNamePattern "doc-04-all-types"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/__tests__/documents.test.ts` — 11 test stubs covering DOC-01 through DOC-04
- [ ] `clearDb()` in `server/src/__tests__/testDb.ts` — add `await prisma.document.deleteMany()` before `prisma.student.deleteMany()` (FK order)
- [ ] `UPLOAD_ROOT` env var set to `os.tmpdir()` in test context to avoid file system pollution
- [ ] `validPdfBuffer` test fixture: `Buffer.from('%PDF-1.4 1 0 obj...')` with correct magic bytes (`0x25 0x50 0x44 0x46`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload progress bar advances during large file upload | DOC-01 (D-19) | XHR `upload.onprogress` events require a real browser + real file upload | Upload a ~20 MB PDF; verify progress bar visually advances from 0% to 100% before dialog closes |
| Original filename preserved in browser download | DOC-02 (D-16) | Browser `Content-Disposition` filename requires manual download verification | Download a document; verify OS save dialog shows original filename, not UUID |
| File stays on disk after soft-delete | DOC-03 (D-05) | Requires filesystem access inside container | After soft-delete, check `data/uploads/students/{id}/` — file must still exist on disk |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
