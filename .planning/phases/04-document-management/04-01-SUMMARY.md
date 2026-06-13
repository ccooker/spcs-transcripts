---
phase: 04-document-management
plan: "01"
subsystem: server
tags: [documents, file-upload, multer, prisma, rest-api, soft-delete]
dependency_graph:
  requires: []
  provides:
    - DocumentType enum + Document Prisma model
    - documentTypeTagSchema + documentParamSchema (Zod)
    - UPLOAD_ROOT constant (services/document.ts + app.ts)
    - DocumentNotFoundError class
    - uploadDocument, listDocuments, softDeleteDocument, getDocumentForDownload services
    - documentsRouter (POST / GET / GET /:docId/download / DELETE /:docId)
    - 11 RED integration test stubs (doc-01 through doc-04-all-types)
  affects:
    - server/prisma/schema.prisma
    - server/src/routes/students.ts
    - server/src/app.ts
    - docker-compose.yml
tech_stack:
  added:
    - multer@2.1.1
    - "@types/multer@2.1.0"
  patterns:
    - multer memoryStorage + magic bytes dual-layer PDF validation
    - RFC 5987 Content-Disposition encoding for non-ASCII filenames
    - fs.createReadStream piped to response (streaming download)
    - Relative storedPath (never absolute) in DB
    - Per-student subfolders: uploads/students/{studentId}/{uuid}.pdf
    - fs.mkdirSync recursive at app startup (idempotent)
key_files:
  created:
    - server/src/__tests__/documents.test.ts
    - server/src/schemas/document.ts
    - server/src/services/document.ts
    - server/src/routes/documents.ts
  modified:
    - server/package.json
    - server/src/__tests__/helpers/testDb.ts
    - server/prisma/schema.prisma
    - server/src/routes/students.ts
    - server/src/app.ts
    - docker-compose.yml
decisions:
  - "@ts-ignore used for DocumentType import and prisma.document.* calls in service/schemas until prisma generate runs in plan 04-02"
  - "RFC 5987 filename*=UTF-8'' encoding chosen for Content-Disposition (handles HK school non-ASCII filenames)"
  - "multer.memoryStorage() chosen over diskStorage to enable magic bytes validation without extra disk I/O"
  - "storedPath stored relative to UPLOAD_ROOT to survive container remounts"
  - "document.deleteMany() inserted before student.deleteMany() in clearDb() to respect FK constraint order"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-13"
  tasks_completed: 3
  files_changed: 10
---

# Phase 04 Plan 01: Document Management Server Slice Summary

**One-liner:** multer memoryStorage + PDF magic bytes validation + Document Prisma model + full REST API (POST/GET/download/soft-delete) with 11 RED integration test stubs

## What Was Built

Complete server slice for document management:

- **multer@2.1.1** installed with `@types/multer@2.1.0`
- **Prisma schema**: `DocumentType` enum (6 values) + `Document` model (soft-delete, compound indexes, User/Student back-relations)
- **Zod schemas**: `documentTypeTagSchema` (z.nativeEnum) + `documentParamSchema` (uuid validation)
- **Document service**: `uploadDocument`, `listDocuments`, `softDeleteDocument`, `getDocumentForDownload`, `UPLOAD_ROOT`, `DocumentNotFoundError`
- **Documents router**: `POST /` (multer + MIME filter + magic bytes + typeTag Zod), `GET /` (active only), `GET /:docId/download` (streaming, RFC 5987 Content-Disposition), `DELETE /:docId` (soft-delete + audit log), `MulterError` handler for 25 MB limit
- **students.ts**: `documentsRouter` mounted at `/:studentId/documents`
- **app.ts**: `UPLOAD_ROOT` exported + `fs.mkdirSync` uploads/students on startup
- **docker-compose.yml**: `UPLOAD_ROOT: /app/uploads` env var + `./data/uploads:/app/uploads` bind mount
- **11 RED test stubs** in `documents.test.ts` (doc-01 through doc-04-all-types); all confirmed failing

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 31d2489 | test | Install multer + Wave 0 RED test infrastructure |
| cfac830 | feat | Prisma DocumentType enum + Document model + Zod schema + document service |
| 248fa5d | feat | Documents router + students mount + app startup dir + docker-compose bind mount |

## Decisions Made

1. **`@ts-ignore` for DocumentType until 04-02**: The Prisma generated client doesn't yet have `DocumentType` or `prisma.document.*` — these are suppressed with `@ts-ignore` comments in `schemas/document.ts` and `services/document.ts`. Removing these comments is a task for plan 04-02 after `prisma generate` runs.

2. **RFC 5987 Content-Disposition encoding**: `filename*=UTF-8''${encodeURIComponent(...)}` chosen over simple `filename="..."` to correctly handle Chinese/special characters in filenames from HK school context.

3. **multer.memoryStorage()**: Allows magic bytes validation directly from `req.file.buffer` before writing to disk — impossible with diskStorage without a second disk read.

4. **Relative storedPath**: `path.join('students', studentId, uuid+'.pdf')` stored in DB (not absolute path) so the bind-mount can be remapped without breaking existing records.

5. **clearDb ordering**: `prisma.document.deleteMany()` inserted before `prisma.student.deleteMany()` to honour FK constraint (Document.studentId → Student.id).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `details` type passed to `logAudit`**
- **Found during:** Task 2
- **Issue:** Plan said `details: JSON.stringify({ ... })` but `logAudit` signature expects `Record<string, unknown>`, not a `string`
- **Fix:** Passed raw object `details: { originalFilename, typeTag }` instead of stringified JSON — the service's `logAudit` call already performs `JSON.stringify` internally
- **Files modified:** `server/src/services/document.ts`
- **Commit:** cfac830

## Known Stubs

None — no data-rendering stubs. The 11 test stubs are intentionally RED (they all call `expect(true).toBe(false)`) and will be implemented in plan 04-03 after the DB schema is pushed in 04-02.

## Threat Flags

No new security surface introduced beyond what was modelled in the plan's `<threat_model>`. All STRIDE mitigations (T-04-01 through T-04-06) are implemented:
- T-04-01: MIME filter (fileFilter cb(null,false)) + magic bytes check ✅
- T-04-02: `limits.fileSize: 25*1024*1024` + MulterError handler ✅
- T-04-03: IDOR guard in service (studentId check + deletedAt null check) ✅
- T-04-04: `documentTypeTagSchema` Zod nativeEnum validation ✅
- T-04-05: storedPath constructed server-side from randomUUID; originalFilename only in DB ✅
- T-04-06: path.join(UPLOAD_ROOT, doc.storedPath) normalises traversal sequences ✅

## Self-Check: PASSED

- FOUND: server/src/__tests__/documents.test.ts ✅
- FOUND: server/src/schemas/document.ts ✅
- FOUND: server/src/services/document.ts ✅
- FOUND: server/src/routes/documents.ts ✅
- FOUND: commit 31d2489 ✅
- FOUND: commit cfac830 ✅
- FOUND: commit 248fa5d ✅
