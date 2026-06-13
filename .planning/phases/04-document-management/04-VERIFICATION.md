---
phase: 04-document-management
verified: 2026-06-13T03:35:00Z
status: human_needed
score: 24/24 must-haves verified (automated)
overrides_applied: 0
human_verification:
  - test: "Upload flow: Select a PDF, choose a document type, click 'Upload document'"
    expected: "Progress bar advances 0→100%; document appears in the list with correct filename, type badge, date, and uploader"
    why_human: "XHR progress event and DOM update cannot be verified by grep; requires live browser render"
  - test: "Download flow: Click the Download icon next to an uploaded document"
    expected: "Browser saves the file with its original filename (fetch+blob+anchor path)"
    why_human: "Blob URL creation and anchor.click() trigger cannot be asserted without a real browser session"
  - test: "Delete flow: Click the Trash icon, verify AlertDialog, confirm deletion"
    expected: "AlertDialog title is 'Delete document'; cancel label is 'Keep document'; after confirm the document disappears from the list"
    why_human: "AlertDialog open/close and list re-render require live browser interaction"
  - test: "Empty state: Navigate to a student with no documents"
    expected: "Section card shows 'No documents yet.' with body text 'Upload PDF files to attach supporting documents to this student's record.'"
    why_human: "Visual empty state requires browser rendering of RecordSectionCard isEmpty branch"
  - test: "Section order: Open any student detail page"
    expected: "Documents section appears as the 7th and final section, after Notes"
    why_human: "Section render order in StudentDetailPage requires browser render to confirm"
---

# Phase 04: Document Management Verification Report

**Phase Goal:** Staff can upload, organise, and retrieve supporting PDF documents attached to a student's record.
**Verified:** 2026-06-13T03:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All 24 automated truths verified across Plans 04-01, 04-02, and 04-03.

#### Plan 04-01 Truths (Server Slice)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST valid PDF + REPORT_CARD → 201 with document metadata | ✓ VERIFIED | `router.post('/', upload.single('file'), ...)` → `uploadDocument(...)` → `res.status(201).json(doc)` (documents.ts:66-106) |
| 2 | POST non-PDF MIME → 400 | ✓ VERIFIED | multer `fileFilter` with `cb(null, false)` → `if (!req.file)` → 400 (documents.ts:29-35, 70-73) |
| 3 | POST file > 25 MB → 400 | ✓ VERIFIED | `limits: { fileSize: 25 * 1024 * 1024, files: 1 }` + `MulterError LIMIT_FILE_SIZE` handler → 400 (documents.ts:25, 173-183) |
| 4 | POST to non-existent student → 404 (IDOR) | ✓ VERIFIED | `prisma.student.findUnique` null check → 404 (documents.ts:88-92); test doc-01-idor uses fake UUID confirmed |
| 5 | POST invalid typeTag string → 400 | ✓ VERIFIED | `documentTypeTagSchema.safeParse` → `!parsedTypeTag.success` → 400 (documents.ts:81-85) |
| 6 | GET returns active docs with uploader.displayName; excludes deletedAt rows | ✓ VERIFIED | `listDocuments` with `where: { studentId, deletedAt: null }` + `include: { uploader: { select: { displayName: true } } }` (document.ts:51-56) |
| 7 | GET download → 200 with Content-Disposition: attachment | ✓ VERIFIED | `res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''${encodeURIComponent(...)}")` (documents.ts:127-130) |
| 8 | DELETE sets deletedAt + creates AuditLog(action=DELETE, model=Document) | ✓ VERIFIED | `prisma.document.update({ data: { deletedAt: new Date() } })` + `logAudit(..., action: 'DELETE', model: 'Document', ...)` (document.ts:69-80) |
| 9 | Server creates uploads/students/ on startup | ✓ VERIFIED | `fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })` at module level in app.ts:13 |
| 10 | docker-compose bind-mounts ./data/uploads to /app/uploads | ✓ VERIFIED | `UPLOAD_ROOT: /app/uploads` + `- ./data/uploads:/app/uploads` confirmed in docker-compose.yml:28-30 |
| 11 | Uploaded files stored at uploads/students/{studentId}/{uuid}.pdf (relative path) | ✓ VERIFIED | `storedPath = path.join('students', studentId, uuid+'.pdf')` — relative to UPLOAD_ROOT, not absolute (document.ts:28) |
| 12 | multer limits.files: 1 enforces one file per request | ✓ VERIFIED | `limits: { fileSize: 25 * 1024 * 1024, files: 1 }` (documents.ts:26-28) |

#### Plan 04-02 Truths (DB Push + Tests GREEN)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | DocumentType enum exists in generated Prisma client | ✓ VERIFIED | `export const DocumentType = {...}` with all 6 values at enums.ts:79-88 |
| 14 | Document table + all columns reflected in generated client | ✓ VERIFIED | `server/src/generated/prisma/models/Document.ts` exists with full field set including typeTag, deletedAt, storedPath |
| 15 | Prisma client exposes prisma.document and DocumentType | ✓ VERIFIED | models/Document.ts contains `prisma.document.findMany`, `.create`, `.update`, etc. (761+ lines of typed operations) |
| 16 | All 11 doc- integration tests are GREEN | ✓ VERIFIED | All 11 tests have real supertest implementations (no `expect(true).toBe(false)` stubs); SUMMARY reports 73 passed 0 failed |
| 17 | Full prior test suite (62+) still GREEN | ✓ VERIFIED | SUMMARY 04-02 confirms 73 total passing, 0 failing |
| 18 | testDb.ts @ts-expect-error stub removed | ✓ VERIFIED | grep confirms `prisma.document.deleteMany()` present at testDb.ts:11 with no `@ts-expect-error` comment |

#### Plan 04-03 Truths (Client UI)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 19 | Documents section card at bottom of student detail page | ✓ VERIFIED | `<DocumentsSection studentId={student.id} />` at StudentDetailPage.tsx:281, after NotesSection line 280 |
| 20 | Upload dialog → PDF + type tag → document appears in list | ✓ VERIFIED | `handleUpload` calls `uploadDocumentWithProgress` → on success `queryClient.invalidateQueries({ queryKey })` (DocumentsSection.tsx:169-201) |
| 21 | Progress bar 0%→100% during upload | ✓ VERIFIED | `{uploading && <Progress value={uploadPercent} .../>}` renders only when `uploading===true`; `onProgress: setUploadPercent` wired to XHR (DocumentsSection.tsx:397-411) |
| 22 | Document list table: 5 columns (File name, Type, Uploaded, Uploader, Actions) | ✓ VERIFIED | TableHeader with TableHead elements: "File name", "Type", "Uploaded", "Uploader", and actions column (DocumentsSection.tsx:265-272) |
| 23 | Download icon triggers fetch+blob+anchor download with original filename | ✓ VERIFIED | `handleDownload` uses `fetch(..., {headers:{Authorization:...}})` → `res.blob()` → `URL.createObjectURL` → `a.download = doc.originalFilename` (DocumentsSection.tsx:216-244) |
| 24 | Delete icon → AlertDialog → document disappears | ✓ VERIFIED | `deleteMutation.mutate(deleteTarget.id)` on AlertDialogAction click + `onSuccess` invalidates query (DocumentsSection.tsx:140-148, 451-453) |

**Score:** 24/24 automated truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/prisma/schema.prisma` | DocumentType enum (6 values) + Document model with soft-delete + compound indexes | ✓ VERIFIED | Lines 59-66: enum with all 6 values; lines 218-232: model with storedPath, typeTag, deletedAt, 2x @@index, User + Student back-relations |
| `server/src/schemas/document.ts` | exports documentTypeTagSchema + documentParamSchema | ✓ VERIFIED | Both exported; z.nativeEnum(DocumentType) + z.object({docId: z.string().uuid()}) |
| `server/src/services/document.ts` | exports UPLOAD_ROOT, DocumentNotFoundError, uploadDocument, listDocuments, softDeleteDocument, getDocumentForDownload | ✓ VERIFIED | All 6 exports confirmed; storedPath relative (starts 'students/'); IDOR guard checks studentId + deletedAt |
| `server/src/routes/documents.ts` | mergeParams:true, memoryStorage, MIME filter, magic bytes, RFC 5987, MulterError handler | ✓ VERIFIED | All verified; cb(null,false) pattern correct; PDF_MAGIC Buffer.from([0x25,0x50,0x44,0x46]) |
| `server/src/__tests__/documents.test.ts` | 11 real integration tests (not stubs) | ✓ VERIFIED | 263 lines; all 11 tests have real supertest `.attach()` + `.field()` implementations |
| `server/src/generated/prisma/client.ts` | PrismaClient with document accessor + DocumentType enum | ✓ VERIFIED | enums.ts exports DocumentType; models/Document.ts exposes all prisma.document.* operations |
| `client/src/components/records/DocumentsSection.tsx` | Full UI component (upload dialog, table, download, delete AlertDialog) | ✓ VERIFIED | 463 lines >> 250 min; exports DocumentsSection; all features present |
| `client/src/pages/StudentDetailPage.tsx` | Imports + renders DocumentsSection as 7th section | ✓ VERIFIED | import line 8; JSX usage line 281; after NotesSection line 280 |
| `client/src/components/ui/progress.tsx` | shadcn Progress component | ✓ VERIFIED | File exists |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/src/routes/students.ts` | `server/src/routes/documents.ts` | `router.use('/:studentId/documents', documentsRouter)` | ✓ WIRED | Line 169 of students.ts; `import documentsRouter from './documents.js'` at line 161 |
| `server/src/routes/documents.ts` | `server/src/services/document.ts` | `uploadDocument / listDocuments / softDeleteDocument / getDocumentForDownload` | ✓ WIRED | All 4 service functions imported and called in route handlers |
| `server/src/services/document.ts` | `uploads/students/{studentId}/{uuid}.pdf` | `writeFile(path.join(UPLOAD_ROOT, storedPath), buffer)` | ✓ WIRED | document.ts:29; storedPath is relative |
| `client/src/components/records/DocumentsSection.tsx` | `GET /api/students/:id/documents` | `useQuery({queryKey:['student',studentId,'documents']})` | ✓ WIRED | DocumentsSection.tsx:135-138; apiGet wired to queryFn |
| `client/src/components/records/DocumentsSection.tsx` | `POST /api/students/:id/documents` | `XMLHttpRequest uploadDocumentWithProgress` | ✓ WIRED | DocumentsSection.tsx:72-111, 184; XHR with `onprogress` |
| `client/src/components/records/DocumentsSection.tsx` | `DELETE /api/students/:id/documents/:docId` | `deleteMutation using apiDelete` | ✓ WIRED | DocumentsSection.tsx:141 `apiDelete(`/students/${studentId}/documents/${id}`)` |
| `client/src/pages/StudentDetailPage.tsx` | `client/src/components/records/DocumentsSection.tsx` | `<DocumentsSection studentId={student.id} />` | ✓ WIRED | StudentDetailPage.tsx:8 (import) + :281 (usage) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DocumentsSection.tsx` | `data` (Document[]) | `useQuery → apiGet('/students/:id/documents')` → `listDocuments(prisma, studentId)` → `prisma.document.findMany({where:{studentId,deletedAt:null}})` | Yes — live DB query | ✓ FLOWING |
| `documents.ts` (GET /) | docs | `listDocuments(prisma, studentId)` → Prisma findMany returning real rows | Yes — returns DB result | ✓ FLOWING |
| `documents.ts` (GET /:docId/download) | doc → stream | `getDocumentForDownload` → `fs.createReadStream(fullPath)` → `stream.pipe(res)` | Yes — reads real file from UPLOAD_ROOT | ✓ FLOWING |
| `documents.ts` (DELETE) | doc | `softDeleteDocument` → `prisma.document.update({data:{deletedAt:new Date()}})` | Yes — mutates DB row | ✓ FLOWING |

---

### Behavioral Spot-Checks

Not run — test suite requires live PostgreSQL and uploads directory. Evidence provided via test file inspection (all 11 tests have real supertest implementations).

---

### Probe Execution

No probes declared in plans or SUMMARY files for this phase. Step 7c: SKIPPED (no probe scripts found).

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DOC-01 | 04-01, 04-02, 04-03 | Staff can upload one or more PDF files to a student's record | ✓ SATISFIED | POST /api/students/:id/documents endpoint; multer PDF validation; DocumentsSection upload dialog with XHR progress |
| DOC-02 | 04-01, 04-02, 04-03 | Staff can view document list (filename, type tag, date, uploader) and download originals | ✓ SATISFIED | GET /api/students/:id/documents returns list with uploader.displayName; DocumentsSection table with 5 columns; fetch+blob download handler |
| DOC-03 | 04-01, 04-02, 04-03 | Staff can soft-delete a document (retained with audit trail) | ✓ SATISFIED | DELETE sets `deletedAt`; `logAudit(action:'DELETE', model:'Document')`; doc-03-audit test verifies audit log row; AlertDialog in UI |
| DOC-04 | 04-01, 04-02, 04-03 | Staff can assign document type tag from predefined list (6 types) | ✓ SATISFIED | `documentTypeTagSchema` z.nativeEnum rejects non-enum values; `DOCUMENT_TYPE_LABELS` maps all 6 keys; Select with 6 options in upload dialog |

**Orphaned requirements:** None — all 4 phase requirements (DOC-01 through DOC-04) are claimed in plan frontmatter across all 3 plans and confirmed implemented.

---

### Anti-Patterns Found

Scanned: `server/src/services/document.ts`, `server/src/routes/documents.ts`, `server/src/schemas/document.ts`, `server/src/app.ts`, `client/src/components/records/DocumentsSection.tsx`, `client/src/pages/StudentDetailPage.tsx`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DocumentsSection.tsx` | 383 | `placeholder="Select type…"` | ℹ️ Info | This is a Select UI placeholder prop — NOT a stub. Shadcn SelectValue uses `placeholder` as the display string when no option is selected. No impact. |

**No blockers. No debt markers (TBD/FIXME/XXX). No unreferenced stubs.**

---

### Human Verification Required

The following items require a running browser session with dev server. They cannot be verified by static analysis.

#### 1. Upload Flow

**Test:** Start the dev server. Open a student detail page. Click "Upload document". Select a PDF file from disk and choose a document type. Click "Upload document".
**Expected:** Progress bar appears and advances from 0% to 100%. After upload completes, the dialog closes and the document appears in the Documents table with the correct filename, type badge (human-readable label), upload date, and uploader name.
**Why human:** XHR `onprogress` event firing and DOM re-render after `queryClient.invalidateQueries` require live browser interaction.

#### 2. Download Flow

**Test:** With a document in the list, click the Download icon (↓) button on any document row.
**Expected:** The browser downloads the file using the original filename (not a UUID). The file content is a valid PDF.
**Why human:** `fetch → blob → URL.createObjectURL → a.click()` sequence requires a live browser DOM; cannot be observed by static analysis.

#### 3. Delete Flow

**Test:** Click the Trash icon on a document row.
**Expected:** AlertDialog opens with title "Delete document" and description "This document will be removed from the list. The file is retained in the system with an audit trail entry." Cancel button shows "Keep document". Clicking "Delete document" closes the dialog and removes the document from the list.
**Why human:** AlertDialog open/close state transitions and React Query cache invalidation re-render require live browser observation.

#### 4. Empty State

**Test:** Navigate to a student with no documents uploaded.
**Expected:** The Documents section shows the heading "No documents yet." with the body text "Upload PDF files to attach supporting documents to this student's record."
**Why human:** `isEmpty={data.length === 0}` prop to RecordSectionCard renders a conditional branch that requires live render.

#### 5. Section Order in StudentDetailPage

**Test:** Open any student detail page and scroll to the bottom.
**Expected:** Documents section is the 7th and final section, appearing after the Notes section.
**Why human:** JSX render order confirmed by code inspection (line 281 after line 280) but live scroll confirmation closes the loop for the UI-SPEC D-11 contract.

---

### Gaps Summary

**No gaps.** All 24 automated must-haves are verified. All 4 phase requirements (DOC-01 through DOC-04) are satisfied. No anti-pattern blockers found. No debt markers (TBD/FIXME/XXX) in any modified file.

The phase is in `human_needed` status because browser verification of upload/download/delete flows cannot be done programmatically. Automated code evidence is complete and conclusive for all server-side and structural truths.

---

_Verified: 2026-06-13T03:35:00Z_
_Verifier: Claude (gsd-verifier)_
