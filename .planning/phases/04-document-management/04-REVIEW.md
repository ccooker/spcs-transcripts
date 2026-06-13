---
phase: 04-document-management
reviewed: 2026-06-13T03:27:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - server/package.json
  - server/src/__tests__/documents.test.ts
  - server/src/__tests__/helpers/testDb.ts
  - server/prisma/schema.prisma
  - server/src/schemas/document.ts
  - server/src/services/document.ts
  - server/src/routes/documents.ts
  - server/src/routes/students.ts
  - server/src/app.ts
  - docker-compose.yml
  - client/src/components/records/DocumentsSection.tsx
  - client/src/pages/StudentDetailPage.tsx
findings:
  critical: 0
  warning: 7
  info: 4
  total: 11
status: issues_found
---

# Phase 04: Document Management — Code Review Report

**Reviewed:** 2026-06-13T03:27:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The document management implementation covers upload, listing, download, and soft-delete with magic-byte validation, audit logging, and React progress UI. The core happy path is solid and test coverage is good. No security vulnerabilities were found; all seven warnings are data-integrity and robustness issues. The most impactful finding is the file-before-DB write ordering in `uploadDocument`, which can leave orphaned files on disk if the database insert fails. A secondary UX bug causes the upload dialog to show stale state when re-opened after a successful upload. Four info-level items cover test hygiene and minor duplication.

---

## Warnings

### WR-01: File Written to Disk Before DB Insert — Orphaned Files on DB Failure

**File:** `server/src/services/document.ts:26-34`
**Issue:** `writeFile` persists the file to `UPLOAD_ROOT` before `prisma.document.create` is called. If the DB insert fails (network blip, constraint violation, Prisma error), the file remains on disk indefinitely with no DB record and no application-level way to ever serve or clean it up. Over time this creates a growing graveyard of unreferenced files.

**Fix:** Reverse the order — create the DB record first (with a placeholder `storedPath` or a status field), then write the file, then update the record. Alternatively, wrap both in a try/catch that removes the file if the DB insert fails:

```typescript
const uuid = randomUUID()
const storedPath = path.join('students', studentId, `${uuid}.pdf`)
const fullPath = path.join(UPLOAD_ROOT, storedPath)

await mkdir(path.join(UPLOAD_ROOT, 'students', studentId), { recursive: true })

// DB record first — if this fails, nothing was written to disk
const doc = await prisma.document.create({
  data: { studentId, uploaderId, originalFilename, storedPath, typeTag },
  include: { uploader: { select: { displayName: true } } },
})

// Write file after DB succeeds — if this fails, clean up the DB record
try {
  await writeFile(fullPath, buffer)
} catch (writeErr) {
  await prisma.document.delete({ where: { id: doc.id } }).catch(() => {})
  throw writeErr
}
```

---

### WR-02: `originalFilename` Not Length-Validated; No DB VARCHAR Constraint

**File:** `server/src/services/document.ts:32`, `server/prisma/schema.prisma:224`
**Issue:** `originalFilename` is stored directly from `req.file.originalname` with no length check. The Prisma schema declares `originalFilename String` with no `@db.VarChar()` constraint, so the DB will accept arbitrarily long strings. A filename exceeding ~4 KB will cause `encodeURIComponent(doc.originalFilename)` in the `Content-Disposition` header to produce a value that pushes the header past nginx's default 8 KB limit, causing a `431 Request Header Fields Too Large` or `502` on download with no useful error message to the user.

**Fix:** Add a VARCHAR constraint in schema and validate in the service or route:

```prisma
// schema.prisma
originalFilename String @db.VarChar(255)
```

```typescript
// routes/documents.ts — before calling uploadDocument
if (req.file.originalname.length > 255) {
  res.status(400).json({ error: 'Filename is too long (max 255 characters).' })
  return
}
```

---

### WR-03: `fs.existsSync` Synchronous I/O in Async Download Handler

**File:** `server/src/routes/documents.ts:122`
**Issue:** `fs.existsSync(fullPath)` is a synchronous filesystem call inside an async route handler. It blocks the Node.js event loop for the duration of the disk stat — all other in-flight requests stall. Under concurrent download load this introduces unnecessary latency spikes.

Furthermore, the check is redundant: the `stream.on('error', ...)` handler at line 134 already gracefully handles the case where the file does not exist (`ENOENT`). Removing `existsSync` and relying solely on the stream error handler is both more correct (eliminates the TOCTOU race between stat and open) and faster.

**Fix:** Remove the `existsSync` block entirely and update the stream error handler to distinguish `ENOENT`:

```typescript
// Remove lines 122-125 (existsSync check), keep stream error handler
const stream = fs.createReadStream(fullPath)
stream.on('error', (streamErr: NodeJS.ErrnoException) => {
  if (!res.headersSent) {
    const status = streamErr.code === 'ENOENT' ? 404 : 500
    const message = streamErr.code === 'ENOENT' ? 'File not found on disk' : 'File read error'
    res.status(status).json({ error: message })
  } else {
    res.destroy(streamErr)
  }
})
stream.pipe(res)
```

---

### WR-04: Upload Dialog State Not Reset After Successful Upload

**File:** `client/src/components/records/DocumentsSection.tsx:192`
**Issue:** On a successful upload, `setUploadDialogOpen(false)` is called directly (line 192). This sets the React state to `false` and closes the dialog, but it does **not** call `handleDialogOpenChange`. The `handleDialogOpenChange` function (which resets `selectedFile`, `selectedType`, `fileError`, and clears the file input ref) is only triggered by user-driven close events (Escape key, overlay click, "Discard upload" button). Programmatic close via direct state assignment bypasses it.

The result: when the user clicks "Upload document" for a second time, the dialog opens with the previous file name and type tag still populated. The file input ref also retains its previous value (line 208–211 reset only runs in `handleDialogOpenChange`).

**Fix:** Call `handleDialogOpenChange(false)` instead of `setUploadDialogOpen(false)` after upload success, or explicitly reset state inline:

```typescript
// In handleUpload, success branch
setSelectedFile(null)
setSelectedType('')
setFileError(null)
if (fileInputRef.current) fileInputRef.current.value = ''
setUploadDialogOpen(false)
toast.success('Document uploaded')
void queryClient.invalidateQueries({ queryKey })
```

---

### WR-05: `parseStudentId` Duplicated Between `students.ts` and `documents.ts`

**File:** `server/src/routes/documents.ts:38-53`, `server/src/routes/students.ts:25-40`
**Issue:** `parseStudentId` is defined identically in both route files — same signature, same logic, same error responses. Any future change (e.g., better error wording, adding trace logging) must be made in both places.

**Fix:** Extract to a shared utility, e.g. `server/src/routes/_helpers.ts`:

```typescript
// routes/_helpers.ts
import type express from 'express'
import { studentIdParamSchema } from '../schemas/student.js'

export function parseStudentId(
  id: string | string[] | undefined,
  res: express.Response,
): string | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) { res.status(404).json({ error: 'Student not found' }); return null }
  const parsed = studentIdParamSchema.safeParse(raw)
  if (!parsed.success) { res.status(404).json({ error: 'Student not found' }); return null }
  return parsed.data
}
```

---

### WR-06: `URL.revokeObjectURL` Called Synchronously After `a.click()`

**File:** `client/src/components/records/DocumentsSection.tsx:240-241`
**Issue:** In `handleDownload`, `URL.revokeObjectURL(url)` is called on the very next line after `a.click()`. The browser schedules the download asynchronously; on slower systems or under memory pressure the download may not have started before the URL is revoked, causing a silent failure (the browser requests the blob URL, gets a `NetworkError`, and silently abandons the download with no feedback to the user).

**Fix:** Revoke after a short timeout to ensure the browser has started reading the blob:

```typescript
a.click()
setTimeout(() => URL.revokeObjectURL(url), 1000)
```

---

### WR-07: Weak Default `POSTGRES_PASSWORD` in `docker-compose.yml`

**File:** `docker-compose.yml:6`
**Issue:** `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}` falls back to `changeme` if the environment variable is not set. A deployment where the `.env` file is absent or incomplete will silently use this weak password. Because the `postgres` service has no `ports` mapping, it is not directly reachable from outside Docker, but any container on the same Docker network (including a compromised `api` container) can authenticate with this credential.

**Fix:** Remove the default value to force the operator to provide a password explicitly, and document this in the runbook:

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}
```

---

## Info

### IN-01: `clearDb` Registered Twice Per Test — Double Execution

**File:** `server/src/__tests__/helpers/testDb.ts:17`, `server/src/__tests__/documents.test.ts:35`
**Issue:** `testDb.ts` calls `beforeEach(clearDb)` at module scope (line 17) as a side-effect of being imported. `documents.test.ts` also calls `beforeEach(clearDb)` explicitly at line 35. Both hooks run before each test, resulting in 14 extra `deleteMany` calls per test (harmless since the tables are already empty on the second pass, but wasteful).

**Fix:** Remove the manual `beforeEach(clearDb)` from `documents.test.ts` (and any other test file that imports `testDb.ts`) — the side-effect in the helper is sufficient. Alternatively, remove the side-effect from `testDb.ts` and require callers to register it explicitly; this is less surprising.

---

### IN-02: `doc-01-idor` Test Is Misnamed — Tests 404, Not IDOR

**File:** `server/src/__tests__/documents.test.ts:85-102`
**Issue:** The test name and comments say "IDOR" but the test only verifies that posting to a nonexistent student UUID returns 404. A true IDOR test would attempt to use one authenticated user's credentials to access or mutate another user's resources. Because the application intentionally grants all authenticated staff access to all students' documents, there is no meaningful IDOR to test here — but the misleading name may cause future reviewers to believe IDOR has been validated when it has not.

**Fix:** Rename the test to `doc-01-nonexistent-student: POST to nonexistent studentId returns 404`.

---

### IN-03: No Audit Trail for Document Downloads

**File:** `server/src/routes/documents.ts:108-148`
**Issue:** `uploadDocument` and `softDeleteDocument` both write audit log entries. The download endpoint (`GET /:docId/download`) does not. For a system handling sensitive student documents, the absence of download logging means there is no way to answer "who downloaded this document and when" in a compliance or data-breach investigation.

**Fix:** Add an audit log call in `getDocumentForDownload` or in the download route handler after the document is fetched:

```typescript
await logAudit(prisma, {
  userId: req.user!.id,
  action: 'READ',  // requires adding READ to AuditAction enum, or reuse CREATE
  model: 'Document',
  recordId: doc.id,
  details: { originalFilename: doc.originalFilename },
})
```

Note: adding `READ` to the `AuditAction` enum requires a schema migration.

---

### IN-04: `UPLOAD_ROOT` Defined Independently in Two Modules

**File:** `server/src/app.ts:12`, `server/src/services/document.ts:8`
**Issue:** Both modules independently read `process.env.UPLOAD_ROOT ?? 'uploads'`. `app.ts` uses its copy to pre-create the directory on startup; `services/document.ts` uses its copy for all file operations. They will always agree (same env var, same default, read at startup), but having two sources of truth means a future refactor that changes the default in one place will silently diverge.

**Fix:** Export `UPLOAD_ROOT` from `services/document.ts` (it already exports it) and import it in `app.ts`:

```typescript
// app.ts
import { UPLOAD_ROOT } from './services/document.js'
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
```

Remove the duplicate declaration on `app.ts:12`.

---

_Reviewed: 2026-06-13T03:27:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
