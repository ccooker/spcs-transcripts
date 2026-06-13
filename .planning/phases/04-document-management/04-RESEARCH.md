# Phase 4: Document Management — Research

**Researched:** 2026-06-13
**Domain:** Node.js file upload (multer), PDF validation, Express 5 streaming, React XHR progress, Prisma 7 soft-delete
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Files stored on disk via bind-mounted host path — `./data/uploads` on host → `/app/uploads` in container
- **D-02:** Per-student subfolders: `uploads/students/{studentId}/{uuid}.pdf`
- **D-03:** DB stores metadata only — `originalFilename`, `storedPath`, `typeTag`, `uploaderId`, `studentId`, `deletedAt`; disk stores `{uuid}.pdf`
- **D-04:** Files renamed to `{uuid}.pdf` on disk; original filename preserved in DB
- **D-05:** Soft-deleted files stay on disk unchanged — `deletedAt` in DB hides them; no physical deletion in v1
- **D-06:** Server enforces PDF-only via MIME type + magic bytes check
- **D-07:** Max upload size: 25 MB
- **D-08:** Server creates upload directories on startup if they don't exist
- **D-09:** One file per upload request
- **D-10:** Documents section is a `RecordSectionCard` on the student profile page — after Notes
- **D-11:** Section order: Academics → Activities → Awards → Work Experience → Career Goals → Notes → **Documents**
- **D-12:** Document list table columns: File name | Type tag | Uploaded | Uploader | Actions
- **D-13:** Upload triggered via Dialog — button opens Dialog with file picker + type tag Select
- **D-14:** Downloads served via API streaming — `GET /api/students/:id/documents/:docId/download`
- **D-15:** Response uses `Content-Disposition: attachment; filename="{originalFilename}"`
- **D-16:** Browser saves file with the original filename
- **D-17:** Button-only file picker — native `<input type="file" accept=".pdf">`; no drag-and-drop
- **D-18:** Type tag required during upload — Select in Dialog; cannot upload without selecting a type
- **D-19:** Upload Dialog shows progress bar — uses XMLHttpRequest progress events
- **D-20:** Document type tags: Report Card, Certificate, Award Letter, Work Experience Letter, Reference Letter, Other

### Claude's Discretion
- Multer vs. busboy vs. custom multipart parser for the server-side upload handler
- Exact Prisma model field names and migration filename
- Whether to use `multer.diskStorage` temp directory before moving to the final path, or write directly to destination
- Table pagination/scroll behaviour if a student accumulates many documents
- Error message wording for oversized or non-PDF files

### Deferred Ideas (OUT OF SCOPE)
- Drag-and-drop file zone
- Multi-file batch upload
- Type tag editable after upload (no PATCH endpoint needed in v1)
- PDF preview in-browser (inline Content-Disposition)
- Linking documents to specific record entries (EV-01/EV-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOC-01 | Staff can upload one or more PDF files to a student's record | multer memoryStorage + magic bytes validation + `fs.writeFile` to UUID path |
| DOC-02 | Staff can view the document list (file name, type tag, upload date, uploader) and download original files | Prisma `findMany` where `deletedAt: null`, `uploader` include; streaming download via `fs.createReadStream` |
| DOC-03 | Staff can soft-delete an uploaded document (retained with audit trail entry) | Prisma `update` setting `deletedAt: new Date()`; `logAudit` with action `DELETE` |
| DOC-04 | Staff can assign a document type tag from a predefined list | `DocumentType` enum in Prisma schema + Zod enum validation; required field on upload |
</phase_requirements>

---

## Summary

Phase 4 adds a Document entity to the SPCS student record system — upload, list, download, and soft-delete PDF files attached to a student's record. The server side involves one new npm dependency (`multer` v2.1.1 for multipart parsing), one new Prisma model (`Document`) with a `DocumentType` enum, and two new route handlers (upload POST, download GET, soft-delete DELETE). The client side involves one new shadcn component (`progress`) and a custom `DocumentsSection` component that uses `XMLHttpRequest` (not `fetch`) to drive a real-time progress bar during upload.

The key architectural decision settled by research is **memoryStorage over diskStorage**. Using `multer.memoryStorage()` allows PDF magic bytes validation directly from `req.file.buffer` before writing to disk — this is the only reliable server-side way to validate file content (MIME headers are spoofable). For 25 MB max files on a school LAN server with minimal concurrent uploads, a single 25 MB buffer spike per request is acceptable.

The XHR upload wrapper must be a standalone function separate from `apiFetch` because the `fetch` API does not expose upload progress events. All other client-server communication uses the existing `apiFetch`/`apiGet`/`apiDelete` helpers unchanged.

**Primary recommendation:** Use `multer.memoryStorage()` → validate magic bytes → `fs.writeFile(dest, req.file.buffer)`. Mount one new nested router `/:studentId/documents` in `students.ts`, following the exact `mergeParams: true` pattern from Phase 3.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multipart parsing + size limit | API / Backend | — | multer middleware; never trust client-reported Content-Length |
| PDF content validation (magic bytes) | API / Backend | — | Client-side check is UX only; magic bytes check runs post-multer in route handler |
| MIME type pre-filter | API / Backend | — | multer `fileFilter` rejects non-PDF before buffering, saves memory |
| File storage on disk | API / Backend | OS / Filesystem | `fs.writeFile` to bind-mounted path; directory created on startup |
| Document metadata persistence | Database / Storage | — | Prisma `Document` model; storedPath is relative to upload root |
| IDOR guard | API / Backend | — | service checks `document.studentId === studentId`; same Phase 3 pattern |
| Upload progress feedback | Browser / Client | — | XHR `upload.onprogress` events; shadcn `Progress` component |
| File streaming to browser | API / Backend | — | `fs.createReadStream` piped to response; Express 5 handles backpressure |
| Soft-delete | API / Backend + Database | — | Route sets `deletedAt`; file stays on disk; audit logged |
| Document type assignment | API / Backend | Browser / Client | Server validates enum value; client shows Select with 6 options |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `multer` | 2.1.1 | Multipart/form-data parsing; file upload middleware | Official Express.js org package; standard for Express file uploads [VERIFIED: npm registry — expressjs/multer] |
| `@types/multer` | 2.1.0 | TypeScript types for multer | Published by DefinitelyTyped; matches multer v2 API [VERIFIED: npm registry] |
| `node:fs` | built-in | `fs.writeFile`, `fs.createReadStream`, `fs.mkdirSync` | Node.js built-in; no extra dependency |
| `node:crypto` | built-in | `crypto.randomUUID()` for UUID filename generation | Built-in since Node 14.17; no `uuid` package needed |
| `node:path` | built-in | `path.join` for safe path construction | Built-in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:stream` | built-in | `fs.createReadStream` error handling in download route | Handle `ENOENT` before piping to response |
| shadcn `progress` | latest | Upload progress bar (D-19) | Install via `npx shadcn@latest add progress` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `multer.memoryStorage()` | `multer.diskStorage()` | diskStorage writes to temp dir first; magic bytes check requires reading disk; two I/O operations vs one; memory spike is acceptable for 25 MB max |
| `multer.memoryStorage()` | raw `busboy` | busboy is lower-level; multer already wraps it and provides `fileFilter`, `limits`, and `req.file`; no benefit in added complexity for this use case |
| `XMLHttpRequest` (upload progress) | `fetch` | `fetch` has no upload progress API; XHR is the only standard way to track multipart upload progress in browsers |

**Installation:**
```bash
cd server
npm install multer@2.1.1
npm install --save-dev @types/multer@2.1.0
```

**Version verification (confirmed 2026-06-13):**
```
multer@2.1.1   (npm dist-tags: { next: '3.0.0-alpha.1', latest: '2.1.1' })
@types/multer@2.1.0
busboy@1.6.0   (multer's internal dependency)
```

---

## Package Legitimacy Audit

> `multer` and `@types/multer` are the only new external packages for this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `multer` | npm | ~11 yrs | ~5M/wk | github.com/expressjs/multer | OK | Approved |
| `@types/multer` | npm | ~9 yrs | ~3M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

**Postinstall check:** `npm view multer 2.1.1 scripts.postinstall` → empty (no postinstall script). Clean. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React)
  │
  ├─[Upload] XHR POST /api/students/:studentId/documents
  │           multipart/form-data: file + typeTag
  │                │
  │            [multer memoryStorage middleware]
  │            - MIME type filter (fileFilter: application/pdf only)
  │            - 25 MB size limit (limits.fileSize)
  │            - 1 file max (limits.files: 1)
  │                │
  │            [Route handler]
  │            - Zod validate typeTag enum
  │            - Magic bytes check: req.file.buffer[0..3] === %PDF
  │            - IDOR: student must exist
  │            - crypto.randomUUID() → uuid.pdf
  │            - fs.mkdirSync uploads/students/{studentId}/ {recursive}
  │            - fs.writeFile uploads/students/{studentId}/{uuid}.pdf
  │            - prisma.document.create(metadata)
  │            - logAudit(CREATE)
  │            → 201 { document }
  │
  ├─[List] GET /api/students/:studentId/documents
  │         → prisma.document.findMany where deletedAt=null + include uploader
  │         → 200 [{ id, originalFilename, typeTag, createdAt, uploader.displayName }]
  │
  ├─[Download] GET /api/students/:studentId/documents/:docId/download
  │             - IDOR guard
  │             - prisma.document.findUnique (deletedAt=null)
  │             - res.setHeader Content-Disposition: attachment; filename="..."
  │             - res.setHeader Content-Type: application/pdf
  │             - fs.createReadStream(storedPath).pipe(res)
  │             → stream (browser saves file)
  │
  └─[Delete] DELETE /api/students/:studentId/documents/:docId
              - IDOR guard
              - prisma.document.update { deletedAt: new Date() }
              - logAudit(DELETE)
              → 200 { document }
```

### Recommended Project Structure

```
server/src/
├── routes/
│   └── documents.ts         # new: Router({ mergeParams: true }), POST / GET / DELETE /:docId / GET /:docId/download
├── services/
│   └── document.ts          # new: listDocuments, uploadDocument, softDeleteDocument, downloadDocument
├── schemas/
│   └── document.ts          # new: documentTypeTagSchema (z.enum), documentParamSchema
server/prisma/
├── schema.prisma            # add: DocumentType enum, Document model
└── migrations/
    └── 20260613_add_document/migration.sql   # new migration

client/src/components/records/
└── DocumentsSection.tsx     # new: RecordSectionCard + table + upload Dialog + delete AlertDialog
```

### Pattern 1: multer memoryStorage with Magic Bytes Validation (Server)

**What:** Buffer the entire uploaded file in memory, then validate MIME (fileFilter) + magic bytes (route handler) before writing to disk.

**When to use:** When PDF-only enforcement at the content level is required and file sizes are bounded (≤25 MB).

```typescript
// Source: multer v2.1.1 official README (github.com/expressjs/multer)
import multer from 'multer'
import { MulterError } from 'multer'

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 1,                    // D-09: one file per request
  },
  fileFilter: (_req, file, cb) => {
    // MIME type check — first line of defence (fast, pre-buffer)
    if (file.mimetype !== 'application/pdf') {
      cb(null, false) // reject silently; route checks req.file presence
    } else {
      cb(null, true)
    }
  },
})

// In the POST route handler, after upload.single('file') middleware:
router.post('/', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: 'Only PDF files are accepted.' })
    return
  }
  // Magic bytes check — second line of defence (content-level)
  const magic = req.file.buffer.subarray(0, 4)
  if (!magic.equals(PDF_MAGIC)) {
    res.status(400).json({ error: 'Only PDF files are accepted.' })
    return
  }
  // ... proceed to write to disk
})
```

### Pattern 2: Writing Buffer to Disk with UUID Filename

**What:** After validation, write the multer buffer to the per-student directory with a UUID filename.

```typescript
// Source: Node.js built-in fs/promises API
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'

async function saveUploadedFile(studentId: string, buffer: Buffer): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, 'students', studentId)
  await mkdir(dir, { recursive: true })           // D-08: auto-create
  const uuid = randomUUID()
  const filename = `${uuid}.pdf`
  const fullPath = path.join(dir, filename)
  await writeFile(fullPath, buffer)
  // storedPath stored in DB is relative to UPLOAD_ROOT
  return path.join('students', studentId, filename)
}
```

### Pattern 3: Streaming Download Route (Express 5)

**What:** Pipe a file from disk to the HTTP response using `fs.createReadStream`, without buffering the entire file in memory.

```typescript
// Source: Node.js docs + Express 5 guide
import fs from 'node:fs'
import path from 'node:path'

router.get('/:docId/download', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    const doc = await getDocumentForDownload(prisma, req.params['docId'], studentId)
    const fullPath = path.join(UPLOAD_ROOT, doc.storedPath)

    // Check file exists before piping — avoids unhandled 'error' event on stream
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found on disk' })
      return
    }

    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFilename}"`)
    res.setHeader('Content-Type', 'application/pdf')

    const stream = fs.createReadStream(fullPath)
    stream.on('error', (err) => {
      // Stream errors after headers sent — destroy response
      if (!res.headersSent) {
        res.status(500).json({ error: 'File read error' })
      } else {
        res.destroy(err)
      }
    })
    stream.pipe(res)
  } catch (err) {
    if (err instanceof DocumentNotFoundError) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    next(err)
  }
})
```

### Pattern 4: XHR Upload with Progress (React client)

**What:** Wrap XMLHttpRequest in a Promise to get upload progress events while still returning a Promise-based API. Do NOT use `apiFetch` — fetch has no upload progress.

**When to use:** Any multipart upload where the UI needs a real-time progress bar.

```typescript
// Source: MDN Web Docs — XMLHttpRequest.upload.onprogress
// Used inside DocumentsSection.tsx — standalone function, not in apiClient.ts

async function uploadDocumentWithProgress(
  studentId: string,
  file: File,
  typeTag: string,
  token: string,
  onProgress: (percent: number) => void,
): Promise<{ id: string; originalFilename: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('typeTag', typeTag)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid JSON response'))
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))

    xhr.open('POST', `/api/students/${studentId}/documents`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    // Do NOT set Content-Type — browser sets it with the correct boundary
    xhr.send(formData)
  })
}
```

**Acquiring the token for XHR:** Use `msalInstance.acquireTokenSilent` to get `tokenResponse.accessToken` before calling `uploadDocumentWithProgress`. The token acquisition should happen before `xhr.open()`.

### Pattern 5: Prisma Document Model

**What:** Add `DocumentType` enum and `Document` model to `schema.prisma`.

```prisma
// Prisma schema addition — server/prisma/schema.prisma

enum DocumentType {
  REPORT_CARD
  CERTIFICATE
  AWARD_LETTER
  WORK_EXPERIENCE_LETTER
  REFERENCE_LETTER
  OTHER
}

model Document {
  id               String       @id @default(uuid())
  studentId        String
  student          Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  uploaderId       String
  uploader         User         @relation("DocumentUploader", fields: [uploaderId], references: [id])
  originalFilename String
  storedPath       String       // relative to UPLOAD_ROOT, e.g. "students/{studentId}/{uuid}.pdf"
  typeTag          DocumentType
  deletedAt        DateTime?    // null = active; set = soft-deleted (D-05)
  createdAt        DateTime     @default(now())

  @@index([studentId, deletedAt])
  @@index([studentId, createdAt(sort: Desc)])
}
```

**User model must be extended** — add the back-relation to User:
```prisma
model User {
  // ... existing fields ...
  documentsUploaded    Document[]   @relation("DocumentUploader")
}
```

**Student model must be extended** — add the back-relation to Student:
```prisma
model Student {
  // ... existing fields ...
  documents            Document[]
}
```

### Pattern 6: Soft-Delete Service

**What:** Set `deletedAt` rather than calling `prisma.document.delete()`. The file remains on disk.

```typescript
export async function softDeleteDocument(
  prisma: InstanceType<typeof PrismaClient>,
  docId: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.document.findUnique({ where: { id: docId } })
  if (!existing || existing.studentId !== studentId || existing.deletedAt !== null) {
    throw new DocumentNotFoundError()
  }

  const doc = await prisma.document.update({
    where: { id: docId },
    data: { deletedAt: new Date() },
  })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'Document',
    recordId: docId,
    details: { originalFilename: doc.originalFilename, typeTag: doc.typeTag },
  })

  return doc
}
```

### Pattern 7: Directory Auto-Creation on Startup

**What:** `fs.mkdirSync` with `recursive: true` in `app.ts` at module init time, not per-request.

```typescript
// server/src/app.ts — near the top, after imports
import fs from 'node:fs'
import path from 'node:path'

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
// recursive: true is idempotent — no error if directory already exists (D-08)
```

Export `UPLOAD_ROOT` from `app.ts` so routes can reference it:
```typescript
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
```

### Pattern 8: Multer ESM Import (NodeNext)

**What:** With `"module": "NodeNext"` and `"esModuleInterop": true` in tsconfig, multer (CJS) is imported as a default import.

```typescript
// This works because:
// 1. esModuleInterop: true synthesizes default export from module.exports
// 2. NodeNext module resolution loads CJS modules via CJS interop
// 3. Existing codebase uses same pattern for `express`, `helmet`, `cors`
import multer from 'multer'
// MulterError for error handling in catch blocks:
import { MulterError } from 'multer'
```

**Multer error handling in Express 5:** Express 5 propagates errors thrown from async route handlers automatically. Multer middleware errors (e.g., file too large) are passed via the `next(err)` callback. Catch `MulterError` by code:

```typescript
// Error handler in the documents route (not global):
if (err instanceof MulterError) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'File exceeds the 25 MB limit.' })
    return
  }
  res.status(400).json({ error: 'Upload error.' })
  return
}
```

**Note:** Express 5 route handlers that call middleware directly (not using `router.use`) need to wrap multer in a Promise or use it as Express middleware normally. The standard `upload.single('file')` as route middleware works fine with Express 5.

### Pattern 9: Supertest Multipart Upload in Tests

**What:** Supertest supports multipart uploads via `.attach()` — no separate library needed.

```typescript
// In records.test.ts — for DOC-01 through DOC-04
const validPdfBuffer = Buffer.from(
  '%PDF-1.4 1 0 obj<</Type /Catalog>>endobj trailer<</Root 1 0 R>>%%EOF',
  'utf-8',
)

it('doc-01-upload: POST /documents returns 201', async () => {
  const student = await createTestStudent()
  const token = staffToken()

  const res = await request(app)
    .post(`/api/students/${student.id}/documents`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
    .field('typeTag', 'REPORT_CARD')

  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({
    originalFilename: 'test.pdf',
    typeTag: 'REPORT_CARD',
  })
})
```

**Test isolation for file system:** Set `UPLOAD_ROOT` env var in tests to `os.tmpdir()` to avoid polluting the project directory. Tests should clean up after themselves, but `os.tmpdir()` is the safe default.

```typescript
// In vitest.config.ts or test setup:
process.env.UPLOAD_ROOT = os.tmpdir()
```

---

### Anti-Patterns to Avoid

- **Storing absolute path in `storedPath`:** If the host mount point changes, all stored paths break. Store relative to `UPLOAD_ROOT` only.
- **Using `multer.diskStorage()` for magic bytes validation:** You can't read the buffer in the `fileFilter` callback with diskStorage; the check would require a second disk read. Use memoryStorage.
- **Setting `Content-Type: multipart/form-data` in XHR headers:** The browser must set this header automatically (it adds the boundary). Manually setting it corrupts the boundary and the server cannot parse the upload.
- **Using `apiFetch` for upload:** `apiFetch` uses the `fetch` API which does not support upload progress. The XHR wrapper is intentionally a separate function.
- **Piping stream before checking IDOR:** Always resolve the document from the DB (IDOR check) before opening the file stream. Opening then finding 403 would start streaming then abort mid-response.
- **express.json() before multer on upload route:** `express.json()` in `app.ts` tries to parse the request body. For multipart, multer handles the body. Since `express.json()` is applied globally, it will attempt to parse and fail — but multer handles multipart internally, so this is fine in practice (express.json ignores non-JSON content types). Still, do not add explicit `express.json()` middleware inline on the upload route.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart parsing | Custom stream reader for `--boundary` sections | `multer` | busboy protocol details: preamble, boundary detection, CRLF handling, partial reads — dozens of edge cases |
| MIME boundary generation | Set `Content-Type: multipart/form-data; boundary=...` manually | Let browser/XHR set it automatically | Boundary must be random, unique, and not appear in file content |
| UUID generation | `Math.random()` filenames | `crypto.randomUUID()` (Node built-in) | Collision-free, cryptographically random, no extra dependency |
| Progress tracking | Polling endpoint for upload status | XHR `upload.onprogress` | Native browser API, zero server overhead |
| PDF content validation | Full PDF parser | Magic bytes check (`0x25 0x50 0x44 0x46`) | First 4 bytes is the industry-standard server-side check; full parsing is overkill for upload validation |
| Recursive directory creation | Walk directory tree manually | `fs.mkdirSync(path, { recursive: true })` | Built-in, idempotent, atomic at OS level |

**Key insight:** The hardest problem in file upload is multipart boundary parsing. multer (via busboy) handles this with 11 years of battle-testing across millions of deployments. Custom parsers always miss edge cases (empty files, very large boundaries, Windows line endings, Unicode filenames).

---

## Common Pitfalls

### Pitfall 1: Multer's `fileFilter` Cannot Reject via Error in Express 5

**What goes wrong:** Calling `cb(new Error('Not a PDF'))` in multer's `fileFilter` causes the error to propagate through Express 5's error handling and returns a 500 instead of a 400.

**Why it happens:** The multer docs show both `cb(null, false)` (reject silently) and `cb(new Error(...))` (reject with error). In Express 5, middleware errors thrown as `Error` objects propagate to the global error handler.

**How to avoid:** Use `cb(null, false)` in `fileFilter` to silently reject. In the route handler, check `if (!req.file)` and return 400 explicitly.

**Warning signs:** Upload of a non-PDF returns 500 instead of 400.

### Pitfall 2: Content-Disposition Filename with Non-ASCII Characters

**What goes wrong:** `Content-Disposition: attachment; filename="résumé.pdf"` breaks on some browsers (encoding issues). RFC 5987 requires percent-encoding for non-ASCII.

**Why it happens:** The simple quoted `filename=` parameter only supports ASCII in strict implementations.

**How to avoid:** For v1 with a HK school context, filenames will be mostly ASCII. If non-ASCII is possible, use `encodeURIComponent` on the filename. A safe approach:
```typescript
res.setHeader(
  'Content-Disposition',
  `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalFilename)}`
)
```

**Warning signs:** Downloaded files have garbled names containing `%` characters or question marks.

### Pitfall 3: `multer` CJS Default Export with NodeNext

**What goes wrong:** TypeScript with `"module": "NodeNext"` may complain about `import multer from 'multer'` if the `@types/multer` declaration uses `export = multer` syntax.

**Why it happens:** `export =` is the TypeScript CJS namespace export syntax. With `esModuleInterop: true`, TypeScript synthesizes a default export, but NodeNext strict mode can still warn.

**How to avoid:** The project already imports `express`, `helmet`, `cors` as default imports with `esModuleInterop: true` — the same pattern works for multer. If TypeScript complains, add `import { createRequire } from 'node:module'` fallback. In practice, `@types/multer@2.1.0` supports `import multer from 'multer'` with `esModuleInterop`.

**Warning signs:** TS error `Module 'multer' has no exported member 'default'`.

### Pitfall 4: Stream Error After Headers Sent on Download

**What goes wrong:** If `fs.createReadStream` emits an error after `res.setHeader()` calls have already been made (e.g., disk I/O error mid-stream), trying to `res.status(500).json(...)` throws `Cannot set headers after they are sent`.

**Why it happens:** Headers are written to the socket before the stream completes. After the first `write()`, you cannot change the status code.

**How to avoid:** Check `res.headersSent` in the stream error handler. If true, call `res.destroy(err)` to terminate the connection. Pre-check file existence with `fs.existsSync` before starting the stream.

**Warning signs:** Client sees a truncated download with no error message; server logs `ERR_HTTP_HEADERS_SENT`.

### Pitfall 5: mergeParams + TypeScript Strict Param Typing (Phase 3 carries forward)

**What goes wrong:** `req.params.studentId` throws TS7053 because Express 5 strict param inference doesn't propagate parent `:studentId` into the child router's `req.params`.

**Why it happens:** Known Express 5 typing issue documented in Phase 3. The parent-mounted param isn't reflected in the child router's TypeScript type.

**How to avoid:** Use the established Phase 3 workaround — `(req.params as Record<string, string>)['studentId']`.

**Warning signs:** TypeScript error `Element implicitly has an 'any' type because expression of type '"studentId"' can't be used to index type 'ParamsDictionary'`.

### Pitfall 6: `clearDb()` Must Delete Documents Before Students

**What goes wrong:** `prisma.student.deleteMany()` before `prisma.document.deleteMany()` fails with a foreign key violation, even with `onDelete: Cascade`, if Prisma 7's Cascade behaviour doesn't apply at the DB level in tests.

**Why it happens:** Cascade deletion is declared in Prisma schema but the PostgreSQL FK may not enforce it the same way in test transactions. The `clearDb` helper deletes in dependency order.

**How to avoid:** Add `await prisma.document.deleteMany()` to `clearDb()` in `testDb.ts` **before** `prisma.student.deleteMany()`. Follow the same ordering pattern as existing Phase 3 models.

**Warning signs:** Tests fail with `Foreign key constraint violated on the constraint: Document_studentId_fkey`.

---

## Code Examples

### Upload Service (document.ts)

```typescript
// Source: established Phase 3 service pattern + Node.js fs/promises API
import { PrismaClient, DocumentType } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'

export class DocumentNotFoundError extends Error {
  constructor() {
    super('Document not found')
    this.name = 'DocumentNotFoundError'
  }
}

export async function uploadDocument(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  uploaderId: string,
  buffer: Buffer,
  originalFilename: string,
  typeTag: DocumentType,
) {
  const dir = path.join(UPLOAD_ROOT, 'students', studentId)
  await mkdir(dir, { recursive: true })
  const uuid = randomUUID()
  const storedPath = path.join('students', studentId, `${uuid}.pdf`)
  await writeFile(path.join(UPLOAD_ROOT, storedPath), buffer)

  const doc = await prisma.document.create({
    data: { studentId, uploaderId, originalFilename, storedPath, typeTag },
    include: { uploader: { select: { displayName: true } } },
  })

  await logAudit(prisma, { userId: uploaderId, action: 'CREATE', model: 'Document', recordId: doc.id })
  return doc
}

export async function listDocuments(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.document.findMany({
    where: { studentId, deletedAt: null },
    include: { uploader: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
```

### Zod Schema for Document Upload

```typescript
// server/src/schemas/document.ts
import { z } from 'zod'
import { DocumentType } from '../generated/prisma/client.js'

export const documentTypeTagSchema = z.nativeEnum(DocumentType)

export const documentParamSchema = z.object({
  docId: z.string().uuid(),
})
```

### React Upload Dialog Skeleton

```typescript
// Conceptual — DocumentsSection.tsx upload handler
const [uploadPercent, setUploadPercent] = useState(0)
const [uploading, setUploading] = useState(false)

async function handleUpload() {
  if (!selectedFile || !selectedType) return
  setUploading(true)
  setUploadPercent(0)
  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: [`api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`],
      account: msalInstance.getActiveAccount()!,
    })
    await uploadDocumentWithProgress(
      studentId,
      selectedFile,
      selectedType,
      tokenResponse.accessToken,
      setUploadPercent,
    )
    setOpen(false)
    toast.success('Document uploaded')
    queryClient.invalidateQueries({ queryKey: ['documents', studentId] })
  } catch {
    toast.error('Upload failed. Please try again.')
  } finally {
    setUploading(false)
    setUploadPercent(0)
  }
}
```

### Migration SQL Template

```sql
-- server/prisma/migrations/20260613_add_document/migration.sql
-- Generated via: npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
-- Apply: npx prisma db push

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM (
  'REPORT_CARD', 'CERTIFICATE', 'AWARD_LETTER',
  'WORK_EXPERIENCE_LETTER', 'REFERENCE_LETTER', 'OTHER'
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "typeTag" "DocumentType" NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Document_studentId_deletedAt_idx" ON "Document"("studentId", "deletedAt");
CREATE INDEX "Document_studentId_createdAt_idx" ON "Document"("studentId", "createdAt" DESC);

ALTER TABLE "Document" ADD CONSTRAINT "Document_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid` npm package | `crypto.randomUUID()` | Node 14.17 | No extra dependency for UUIDs |
| Manual multipart parsing | `multer` (busboy-backed) | ~2014 | Standard for 11 years; never hand-roll |
| Storing absolute paths | Store relative to mount root | Best practice | Surviving container restarts, path remounts |
| `fs.promises` API (old) | `import { mkdir, writeFile } from 'node:fs/promises'` | Node 14 `node:` prefix | Cleaner `node:` protocol prefix, no ambiguity |

**Deprecated/outdated:**
- `multer@1.x` types (`@types/multer@1.x`): Use `@types/multer@2.x` to match multer v2 API
- `req.file.path` with diskStorage for magic bytes: diskStorage doesn't buffer — you'd have to read back from disk

---

## Schema Push Approach

**Pattern from Phase 03-03b (authoritative):** `prisma db push` against the live PostgreSQL (docker-compose postgres must be running).

```bash
# 1. Generate migration SQL (for the migrations/ folder — documentation + replay)
cd server
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > prisma/migrations/20260613_add_document/migration.sql

# 2. Apply to DB (idempotent — db push compares schema to DB state)
npx prisma db push

# 3. Regenerate Prisma client (new DocumentType enum + Document model available in TypeScript)
npx prisma generate
```

**Note:** The migration SQL file is for documentation and replay purposes. `db push` is the authoritative apply step (as established in Phase 1 and confirmed in Phase 3 decisions). No shadow DB is available in this dev environment.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 14.17 | `crypto.randomUUID()` | ✓ | v22.16.0 | — |
| PostgreSQL (via Docker) | `npx prisma db push` | ✓ | 16-alpine (docker-compose) | — |
| `multer` | Upload middleware | Pending install | 2.1.1 | — |
| `@types/multer` | TypeScript types | Pending install | 2.1.0 | — |
| `shadcn progress` | Upload progress bar | Pending install | latest | — |
| `./data/uploads` host directory | Bind-mount volume | Pending creation | — | Auto-created on server startup (D-08) |

**Missing dependencies with no fallback:**
- `multer@2.1.1` — must be installed before upload route works
- `@types/multer@2.1.0` — must be installed for TypeScript compilation
- `shadcn progress` — must be installed for upload Dialog progress bar

**Missing dependencies with fallback:**
- None (all have clear install paths)

---

## Validation Architecture

> `workflow.nyquist_validation: true` in config.json — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.3 |
| Config file | `server/vitest.config.ts` (inferred from existing tests) |
| Quick run command | `cd server && npm test -- --testNamePattern "doc-"` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | POST /documents with valid PDF + typeTag returns 201 with document metadata | integration | `npm test -- --testNamePattern "doc-01"` | ❌ Wave 0 |
| DOC-01 | POST /documents with non-PDF MIME returns 400 | integration | `npm test -- --testNamePattern "doc-01-reject-mime"` | ❌ Wave 0 |
| DOC-01 | POST /documents with wrong magic bytes returns 400 | integration | `npm test -- --testNamePattern "doc-01-reject-magic"` | ❌ Wave 0 |
| DOC-01 | POST /documents with file > 25 MB returns 400 | integration | `npm test -- --testNamePattern "doc-01-size-limit"` | ❌ Wave 0 |
| DOC-01 | POST /documents to another student's record returns 403/404 (IDOR) | integration | `npm test -- --testNamePattern "doc-01-idor"` | ❌ Wave 0 |
| DOC-02 | GET /documents returns active docs with uploader name; excludes soft-deleted | integration | `npm test -- --testNamePattern "doc-02"` | ❌ Wave 0 |
| DOC-02 | GET /documents/:docId/download returns 200 with Content-Disposition attachment | integration | `npm test -- --testNamePattern "doc-02-download"` | ❌ Wave 0 |
| DOC-03 | DELETE /documents/:docId sets deletedAt; doc excluded from subsequent GET | integration | `npm test -- --testNamePattern "doc-03"` | ❌ Wave 0 |
| DOC-03 | Soft-delete creates AuditLog entry with action=DELETE | integration | `npm test -- --testNamePattern "doc-03-audit"` | ❌ Wave 0 |
| DOC-04 | POST /documents with invalid typeTag returns 400 | integration | `npm test -- --testNamePattern "doc-04-invalid-type"` | ❌ Wave 0 |
| DOC-04 | POST /documents with each of 6 valid type tags returns 201 | integration | `npm test -- --testNamePattern "doc-04-all-types"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd server && npm test -- --testNamePattern "doc-"`
- **Per wave merge:** `cd server && npm test` (full 62+ test suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

All test cases for DOC-01 through DOC-04 require new test infrastructure:

- [ ] `server/src/__tests__/documents.test.ts` — all 11 test cases above
- [ ] `clearDb()` in `testDb.ts` must add `await prisma.document.deleteMany()` before `prisma.student.deleteMany()`
- [ ] `UPLOAD_ROOT` env var set to `os.tmpdir()` in test context to avoid file system pollution
- [ ] `validPdfBuffer` test fixture: `Buffer.from('%PDF-1.4 ...')` with correct magic bytes

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` in config.json.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | JWT + resolveUser (existing); IDOR guard in service layer (Phase 3 pattern) |
| V5 Input Validation | yes | MIME type (multer fileFilter) + magic bytes (route handler) + Zod enum for typeTag |
| V12 File Upload | yes | Size limit 25 MB (multer limits); single file (limits.files: 1); PDF-only enforcement; store outside web root |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious file upload (polyglot PDF/executable) | Tampering | Magic bytes check + MIME filter; no server-side execution of uploaded files |
| Path traversal via original filename | Tampering | `originalFilename` stored in DB only; on-disk filename is always `{uuid}.pdf` (D-04) |
| IDOR — download another student's file | Elevation of Privilege | Service checks `document.studentId === studentId` before streaming (same Phase 3 IDOR guard) |
| DoS via large file uploads | Denial of Service | multer `limits.fileSize: 25 * 1024 * 1024` — upload terminated at 25 MB |
| Directory traversal in storedPath | Tampering | `storedPath` written by server from `path.join(UPLOAD_ROOT, 'students', studentId, uuid + '.pdf')` — no user input in path construction |
| Storing secrets in uploaded files (access) | Information Disclosure | Files served only via authenticated JWT-validated endpoint (existing auth middleware) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 25 MB buffer per upload is safe memory-wise on the school server | Standard Stack | If server has very low RAM (< 512 MB) and concurrent uploads spike, OOM possible. Mitigation: the school has 3-8 staff; concurrent uploads are rare. |
| A2 | `import multer from 'multer'` works with `@types/multer@2.1.0` and `NodeNext` module resolution | Pattern 8 | If TypeScript errors, add `createRequire` fallback. The existing `import express from 'express'` pattern confirms CJS interop works in this project. |
| A3 | `fs.existsSync` before piping is sufficient to prevent stream errors | Pattern 3 | Race condition possible (file deleted between check and stream open) — handled by `stream.on('error')` fallback. |

---

## Open Questions (RESOLVED)

1. **UPLOAD_ROOT env var in docker-compose.yml**
   - What we know: D-01 specifies `./data/uploads` on host → `/app/uploads` in container
   - What's unclear: Does the server Dockerfile expose `/app/uploads` as a volume mount, or does `docker-compose.yml` handle it entirely?
   - RESOLVED: `docker-compose.yml` handles it entirely. Plan 04-01 Task 3 adds `UPLOAD_ROOT: /app/uploads` to the `api` service environment block and adds the bind-mount `./data/uploads:/app/uploads` under the `volumes` key. No Dockerfile change needed.

2. **Filename sanitisation for `Content-Disposition`**
   - What we know: D-15 specifies `filename="{originalFilename}"`. School staff upload named PDFs.
   - What's unclear: Whether to sanitise quotes/backslashes in originalFilename before inserting into header.
   - RESOLVED: Plan 04-01 Task 3 uses RFC 5987 encoding (`filename*=UTF-8''${encodeURIComponent(originalFilename)}`) in the `Content-Disposition` header, which handles all special characters without lossy replacement. Original unmodified filename stored in DB (D-03).

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — `multer@2.1.1` from `expressjs` org; `npm view multer dist-tags` confirmed latest
- [VERIFIED: npm registry] — `@types/multer@2.1.0`; no postinstall script
- multer v2.1.1 README (raw.githubusercontent.com/expressjs/multer/v2.1.1/README.md) — API surface, fileFilter, limits, memoryStorage

### Secondary (MEDIUM confidence)
- Existing codebase patterns (Phase 3) — IDOR guard, mergeParams, logAudit, Prisma service layer, nested router mounting
- Node.js built-in docs (known) — `fs/promises`, `crypto.randomUUID()`, `path.join()`, `createReadStream`

### Tertiary (LOW confidence — training knowledge)
- XHR `upload.onprogress` pattern [ASSUMED: MDN standard; well-established since XHR Level 2]
- PDF magic bytes `0x25 0x50 0x44 0x46` = `%PDF` [ASSUMED: ISO 32000-1 PDF standard; universally documented]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — multer version confirmed on npm registry; existing codebase patterns directly observed
- Architecture: HIGH — follows established Phase 3 patterns exactly; no novel patterns introduced
- Pitfalls: HIGH — Phase 3 pitfalls directly observed in codebase (mergeParams, ESM CJS interop); file upload pitfalls are well-documented

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable libraries; npm versions unlikely to change)
