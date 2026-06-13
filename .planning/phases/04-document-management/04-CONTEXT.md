# Phase 4: Document Management - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can upload PDF files to a student's record, view and download them, assign document type tags, and soft-delete files — all from a Documents section card on the student profile page. Files are stored on-premise on disk (outside the web root) in a bind-mounted Docker volume, and served exclusively through an authenticated API endpoint. This phase adds a `Document` Prisma model, file upload middleware, CRUD API routes, and a DocumentsSection UI component. Does **not** include PDF data extraction (v2 EXT-01 through EXT-03), linking documents to specific record entries (v2 EV-01/EV-02), or transcript generation (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### File Storage
- **D-01:** Files stored on disk via a **bind-mounted host path** — `./data/uploads` on host → `/app/uploads` in container via `docker-compose.yml`; survives container restarts and is accessible to ops team
- **D-02:** On-disk organisation: **per-student subfolders** — `uploads/students/{studentId}/{uuid}.pdf`
- **D-03:** Database stores metadata only — `originalFilename`, `storedPath` (relative to upload root), `typeTag`, `uploaderId` (FK to User), `studentId` (FK to Student), `deletedAt` (soft-delete); disk stores `{uuid}.pdf`
- **D-04:** Files are **renamed to `{uuid}.pdf`** on disk; original filename preserved in DB
- **D-05:** Soft-deleted files **stay on disk unchanged** — `deletedAt` in DB hides them from listings; no physical deletion in v1
- **D-06:** Server enforces **PDF-only** via MIME type + magic bytes check; non-PDF uploads rejected at the API layer
- **D-07:** Max upload size: **25 MB**
- **D-08:** Server **creates upload directories on startup** if they don't exist — zero ops setup required
- **D-09:** **One file per upload request** — no multi-file batch upload in v1

### Upload UI
- **D-10:** Documents section is a **RecordSectionCard** on the student profile page — same pattern as Phase 3 record sections; appears **after Notes** (bottom of page) in section order
- **D-11:** Section order: Academics → Activities → Awards → Work Experience → Career Goals → Notes → **Documents**
- **D-12:** Document list table columns: **File name | Type tag | Uploaded | Uploader | Actions** (per DOC-02)
- **D-13:** Upload triggered via **Dialog** — "Upload document" button opens a Dialog with a file picker (button-only, native browser file picker) + required type tag Select

### Download
- **D-14:** Downloads served via **API streaming** — `GET /api/students/:id/documents/:docId/download`; JWT validated, IDOR checked, file piped to response
- **D-15:** Response uses `Content-Disposition: attachment; filename="{originalFilename}"` — forces browser download with original filename
- **D-16:** Browser saves file with the **original filename** uploaded by staff

### Upload UX
- **D-17:** File picker: **button-only** — native `<input type="file" accept=".pdf">` inside the Dialog; no drag-and-drop
- **D-18:** Type tag: **required during upload** — Select in the upload Dialog; cannot upload without selecting a type (DOC-04)
- **D-19:** Upload Dialog shows a **progress bar** — uses `fetch` with `XMLHttpRequest` progress events; "Uploading…" state on submit button
- **D-20:** Document type tags (DOC-04): **Report Card, Certificate, Award Letter, Work Experience Letter, Reference Letter, Other**

### Claude's Discretion
- Multer vs. busboy vs. custom multipart parser for the server-side upload handler
- Exact Prisma model field names and migration filename
- Whether to use a `multer.diskStorage` temp directory before moving to the final path, or write directly to destination
- Table pagination/scroll behaviour if a student accumulates many documents
- Error message wording for oversized or non-PDF files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — DOC-01 through DOC-04 (Phase 4 scope); exact field and behaviour definitions
- `.planning/ROADMAP.md` — Phase 4 goal and 4 success criteria
- `.planning/PROJECT.md` — On-premise constraint, school context (data must not leave school network)

### Prior Phase Context
- `.planning/phases/03-student-records-ui/03-CONTEXT.md` — RecordSectionCard pattern, section layout, Phase 3 UI conventions
- `.planning/phases/02-student-profiles-search/02-CONTEXT.md` — Student entity, StudentDetailPage structure, AppShell
- `.planning/phases/02-student-profiles-search/02-UI-SPEC.md` — shadcn/zinc/blue tokens, Card/Table/Dialog patterns (canonical UI contract)
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Auth middleware, audit logging (AUTH-03), IDOR guard pattern

### Existing Code
- `client/src/pages/StudentDetailPage.tsx` — Add DocumentsSection at the bottom, after NotesSection
- `client/src/components/records/RecordSectionCard.tsx` — Reuse for DocumentsSection wrapper
- `server/src/routes/students.ts` — Mount documents router under `/:studentId/documents`
- `server/src/services/audit.ts` — `logAudit()` on upload and soft-delete
- `server/src/middleware/auth.ts` — JWT + resolveUser middleware chain (applied to all `/api` routes)
- `docker-compose.yml` — Add bind-mount volume for `./data/uploads:/app/uploads`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecordSectionCard` — wrap DocumentsSection with the same header/loading/error/empty pattern as Phase 3
- `RecordDeleteDialog` — reuse or extend for soft-delete confirmation (same AlertDialog pattern)
- `apiPost` / `apiGet` / `apiDelete` — extend for document endpoints; upload needs `Content-Type: multipart/form-data` (separate from JSON apiFetch)
- `logAudit()` — call on `UPLOAD` and `SOFT_DELETE` actions
- TanStack Query `useQuery` + `useMutation` — same data-fetching pattern as all Phase 3 sections
- Sonner `toast.success` / `toast.error` — consistent feedback

### Established Patterns
- UUID primary keys on all entities
- Express routes under `/api/students/:studentId/*` with `mergeParams: true` (Phase 3 nested router pattern)
- Prisma service layer — no raw queries in routes
- IDOR guard: service checks `document.studentId === studentId` before serving/deleting
- Zod validation in routes for request body + params

### Integration Points
- Add `DocumentsSection` to `StudentDetailPage.tsx` after `NotesSection`
- New `Document` Prisma model with `studentId` FK to `Student` and `uploaderId` FK to `User`
- New API route `/:studentId/documents` mounted in `students.ts`
- `docker-compose.yml` needs a `volumes` bind-mount for `./data/uploads:/app/uploads`
- Upload handler needs `multer` (or equivalent) middleware — new npm dependency on server
- Download route pipes `fs.createReadStream(storedPath)` to response — no new dependency

</code_context>

<specifics>
## Specific Ideas

- Upload directory auto-creation on server startup ensures the bind-mount works even if `./data/uploads` doesn't exist on the host yet
- Progress bar during upload improves UX for 25 MB scanned PDFs on a school LAN (potentially slow)
- Type tag required at upload time (not editable after) keeps the data model simple — no PATCH endpoint needed for Phase 4
- `Content-Disposition: attachment; filename="originalFilename"` ensures staff always get the original meaningful filename, not a UUID

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop file zone — nice UX improvement, noted for v2 or a future iteration
- Multi-file batch upload — noted; DOC-01 says "one or more" but one-at-a-time keeps v1 simple
- Type tag editable after upload — would require a PATCH endpoint; deferred to v2
- PDF preview in-browser (inline Content-Disposition) — deferred; download-only is simpler and sufficient for v1
- Linking documents to specific record entries (EV-01/EV-02) — explicitly v2 requirements

</deferred>

---

*Phase: 4-Document Management*
*Context gathered: 2026-06-13*
