# Phase 5: Transcript Assembly & Export - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can open a dedicated transcript editor page for any student, see sections pre-filled with structured prose generated from stored records, edit each section using a rich text editor, show/hide individual sections, set the transcript status to Draft or Finalised, and export a school-branded PDF. Admin can configure school branding (school name, address, logo image, HTML/CSS letterhead template) via a settings page. PDF is generated server-side using Puppeteer — it renders a self-contained HTML string (built from the transcript content + school branding) to PDF.

Does **not** include: AI-generated narrative text, linking documents to transcript sections (v2 EV-01/EV-02), bulk/cohort PDF export (v2 TRN-05), transcript archiving (v2 TRN-04), peer review workflow (v2 TRN-06), or student self-service.

</domain>

<decisions>
## Implementation Decisions

### PDF Generation
- **D-01:** PDF engine: **Puppeteer (full bundle)** — `puppeteer` npm package, downloads Chromium automatically during `npm install`; ~170 MB in `node_modules`; works out of the box on Windows Server without additional setup
- **D-02:** Template strategy: **server builds a self-contained HTML string** — Express route constructs an HTML string from transcript content + `SchoolSettings` branding; Puppeteer launches headless Chromium, loads the HTML, and captures to PDF; no separate renderer process or client URL required
- **D-03:** Logo and letterhead assets are embedded in the HTML string at export time (logo as base64 data URI, letterhead HTML injected verbatim from `SchoolSettings.letterheadHtml`)

### Transcript Editing UI
- **D-04:** Transcript editor lives on a **separate route** — `/students/:id/transcript`; accessible via a "View Transcript" button/link on `StudentDetailPage`
- **D-05:** Rich text editor: **TipTap** — headless, Radix/shadcn/Tailwind compatible; basic toolbar (bold, italic, bullet list, numbered list); one TipTap editor instance per transcript section
- **D-06:** Six transcript sections matching TRN-01: **Academics, Activities, Awards, Work Experience, Career Goals, Staff Endorsement**
- **D-07:** Staff can **show/hide individual sections** per student (per-transcript toggle stored in DB, not a global Admin setting); hidden sections are omitted from the exported PDF

### Auto-Population
- **D-08:** On **first open** (no saved narrative), each section is **pre-filled with structured prose** generated from the student's stored records:
  - Academics: one sentence per result — "Achieved [Grade] in [Subject] ([Year])."
  - Activities: one sentence per entry — "[Role] at [Organisation] ([period])."
  - Awards: one sentence per entry — "[Title] ([Level]) from [Issuer] ([Date])."
  - Work Experience: one sentence per entry — "[Role] at [Employer] ([period])."
  - Career Goals: career interests list + free-text description prose
  - Staff Endorsement: blank (staff-authored only)
- **D-09:** After first edit, **narrative is preserved as-is** — subsequent record additions do NOT overwrite staff edits
- **D-10:** When records are updated/added **after** staff has saved narrative, a **banner is shown** on the transcript editor: "Records have been updated since you last edited — regenerate draft?" with "Regenerate" (overwrites with fresh structured prose) and "Dismiss" actions; regeneration is explicit and user-initiated

### Branding Administration
- **D-11:** Admin accesses branding via `/settings` (Admin-only route, enforced with `requireRole('ADMIN')`)
- **D-12:** `SchoolSettings` Prisma model — single-row singleton table: `id`, `schoolName` (text), `schoolAddress` (text, optional), `letterheadHtml` (text — HTML/CSS pasted in a `<textarea>`), `logoPath` (relative path to uploaded logo image on disk), `updatedAt`
- **D-13:** School logo stored on disk — same bind-mount directory as documents (`./data/uploads`), under a `./data/uploads/branding/` subfolder; stored filename is always `logo.{ext}` (overwritten on re-upload)
- **D-14:** Letterhead HTML textarea: Admin pastes raw HTML/CSS; stored verbatim in DB; injected into Puppeteer HTML template as the page header; no sanitisation required (Admin-only write access)
- **D-15:** Settings page includes: school name field, address field, logo upload (button + file picker, image/* MIME), letterhead HTML textarea, Save button; no progress bar needed (logo typically small)

### Transcript Status (TRN-02)
- **D-16:** Transcript status (`NONE` / `DRAFT` / `FINALISED`) stored on the `Transcript` model (not on `Student`); the `Student` list filter (NAV-02) joins to `Transcript.status` to resolve the per-student status display
- **D-17:** Any Staff or Admin user can set status to Draft or Finalised from the transcript editor (no role restriction beyond standard auth)

### Claude's Discretion
- Exact Prisma field names and migration filename for `Transcript` and `SchoolSettings` models
- How `Transcript` model relates to sections — one JSON column vs. separate columns per section vs. a `TranscriptSection` child model
- Puppeteer launch flags for Windows Server headless mode (e.g., `--no-sandbox`, `--disable-setuid-sandbox`)
- TipTap extension selection (StarterKit covers bold/italic/lists; additional extensions only if needed)
- Exact PDF page size (A4) and margin values in Puppeteer `page.pdf()` options
- Auto-save behaviour during editing (debounced save-on-change vs. explicit Save button)
- Whether to show a PDF preview before download or trigger download immediately

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — TRN-01 through TRN-03 (Phase 5 scope); also AUTH-02 (Admin role for branding config) and NAV-02 (student list status filter that joins transcript status)
- `.planning/ROADMAP.md` — Phase 5 goal and 5 success criteria

### Project Context
- `.planning/PROJECT.md` — On-premise constraint; school network only; core value statement
- `.planning/STATE.md` — Key decisions log (Prisma 7 patterns, auth middleware, audit logging); all apply here

### Prior Phase Context
- `.planning/phases/04-document-management/04-CONTEXT.md` — File storage pattern (bind-mount `./data/uploads`), audit logging, IDOR guard, RecordSectionCard; branding logo follows the same disk storage approach
- `.planning/phases/03-student-records-ui/03-CONTEXT.md` — All 6 record types' data shape; D-02 section order; RecordSectionCard pattern; TanStack Query conventions
- `.planning/phases/02-student-profiles-search/02-CONTEXT.md` — Student entity, StudentDetailPage structure, AppShell nav, shadcn/zinc/blue tokens
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — JWT auth middleware, `requireRole`, `logAudit()`, IDOR guard pattern

### Existing Code
- `client/src/pages/StudentDetailPage.tsx` — Add "View Transcript" button/link leading to `/students/:id/transcript`
- `client/src/components/records/RecordSectionCard.tsx` — May be reused for transcript section cards on the editor page
- `server/src/routes/students.ts` — Mount transcript router under `/:studentId/transcript`
- `server/src/services/audit.ts` — `logAudit()` on transcript save, finalise, PDF export, and settings update
- `server/src/middleware/auth.ts` — JWT + resolveUser (applied to all `/api` routes)
- `server/src/middleware/requireRole.ts` — Enforce `ADMIN` role on `/api/settings` routes
- `docker-compose.yml` — Existing bind-mount `./data/uploads:/app/uploads`; branding subfolder `./data/uploads/branding/` lives under the same mount

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecordSectionCard` — wrap each transcript section (Academics, Activities, etc.) with the same header/loading/error/empty pattern
- `logAudit()` — call on `TRANSCRIPT_SAVE`, `TRANSCRIPT_FINALISE`, `PDF_EXPORT`, `SETTINGS_UPDATE`
- `requireRole` middleware — enforce Admin-only on branding settings routes
- TanStack Query `useQuery` + `useMutation` — same data-fetching pattern as all Phase 3/4 sections
- `apiFetch` / `apiClient.ts` — authenticated API calls; PDF export will need a fetch+blob+anchor pattern (same as Phase 4 document download)
- Sonner `toast.success` / `toast.error` — consistent feedback on save, export, settings update

### Established Patterns
- UUID primary keys on all Prisma models
- Express routes under `/api/students/:studentId/*` with `mergeParams: true` (Phase 3 nested router pattern); transcript router mounts as `/:studentId/transcript`
- Prisma service layer — no raw queries in routes
- IDOR guard: service checks `transcript.studentId === studentId` before serving/updating
- Zod validation on all request bodies + params
- Audit log entry on every create/update/delete
- Server creates directories on startup (`app.ts`) — apply to `./uploads/branding/` too
- Soft-delete pattern (Phase 4) — transcript does not need soft-delete (Phase 5 has no delete requirement)
- `docker-compose.yml` bind-mount — branding logo reuses existing `./data/uploads` mount

### Integration Points
- New `/students/:id/transcript` client route — add to `App.tsx` router
- New `Transcript` Prisma model with `studentId` FK; `SchoolSettings` singleton model
- New API routes: `GET/PUT /api/students/:studentId/transcript` (get/save narrative), `POST /api/students/:studentId/transcript/export` (PDF download), `GET/PUT /api/settings` (branding)
- `StudentDetailPage.tsx` — add "View Transcript" CTA button
- `StudentsListPage.tsx` / student list API — existing NAV-02 status filter already expects transcript status; join `Transcript` table to resolve `status` per student
- `server/src/app.ts` — ensure `./uploads/branding/` created on startup

</code_context>

<specifics>
## Specific Ideas

- PDF export uses `fetch + blob + anchor` download pattern (same as Phase 4 document download — JWT Bearer token required on all `/api` routes)
- Puppeteer HTML template: the letterhead HTML is injected verbatim from `SchoolSettings.letterheadHtml`; logo is embedded as a base64 data URI read from disk at export time; avoids any filesystem path issues in headless Chromium
- The "regenerate draft" banner (D-10) is a non-blocking info banner — not an AlertDialog; staff can dismiss it and keep editing
- Staff Endorsement section starts blank (no auto-population) — it is the staff member's personal commendation, not derivable from records
- TRN-02 status field uses the same `NONE / DRAFT / FINALISED` values already referenced by NAV-02; the student list status column will now have real data to display

</specifics>

<deferred>
## Deferred Ideas

- Global Admin toggle for which transcript sections appear across all transcripts — deferred to v2 (v1 is per-staff, per-student show/hide)
- AI-generated narrative text — explicitly out of scope per REQUIREMENTS.md (liability for formal documents)
- Drag-and-drop section reordering — v2 enhancement
- PDF preview panel before download — noted as a nice-to-have; v1 triggers download immediately
- Batch/cohort PDF export (v2 TRN-05)
- Transcript archive with date/generator/recipient (v2 TRN-04)
- Peer review workflow (v2 TRN-06)

</deferred>

---

*Phase: 5-Transcript Assembly & Export*
*Context gathered: 2026-06-13*
