# Phase 5: Transcript Assembly & Export — Research

**Researched:** 2026-06-14 (refreshed from 2026-06-13)
**Domain:** PDF generation (Puppeteer), rich text editing (TipTap v3), Prisma schema extension
**Confidence:** MEDIUM — TipTap v3.26.1 and Puppeteer v25.1.0 APIs verified against npm registry 2026-06-14; Prisma patterns cross-checked against existing project patterns; students.test.ts transcriptStatus references confirmed via codebase grep.

> **⚠ TipTap version note:** `05-UI-SPEC.md` Design System table says "TipTap v2 (headless)" — this is an error in the UI-SPEC. TipTap v3.26.1 is the current release (confirmed `npm view @tiptap/react version → 3.26.1`). All patterns in this research use v3 APIs. The planner and executor must install `@tiptap/react@3.26.1` and `@tiptap/starter-kit@3.26.1`, not v2.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** PDF engine: `puppeteer` npm package (full bundle), downloads Chromium on `npm install`
- **D-02** Template strategy: server builds self-contained HTML string; Puppeteer renders it to PDF
- **D-03** Logo embedded as base64 data URI; letterhead HTML injected verbatim from `SchoolSettings.letterheadHtml`
- **D-04** Transcript editor on separate route `/students/:id/transcript`
- **D-05** Rich text editor: TipTap — one instance per section; basic toolbar (bold, italic, bullet list, ordered list)
- **D-06** Six sections: Academics, Activities, Awards, Work Experience, Career Goals, Staff Endorsement
- **D-07** Show/hide per section per transcript (per-transcript toggle stored in DB)
- **D-08** First-open auto-population from stored records; structured prose sentences per record type
- **D-09** After first edit, narrative preserved as-is — no auto-overwrite
- **D-10** Records-updated banner shown when records changed after last edit; Regenerate/Dismiss actions
- **D-11** Admin: `/settings` route with `requireRole('ADMIN')`
- **D-12** `SchoolSettings` singleton: `id='singleton'`, schoolName, schoolAddress, letterheadHtml, logoPath, updatedAt
- **D-13** Logo on disk under `./data/uploads/branding/`; served at `/api/settings/logo`
- **D-14** Letterhead HTML: raw paste, no sanitisation (Admin-only write)
- **D-15** Settings: no upload progress bar
- **D-16** Transcript status (`NONE`/`DRAFT`/`FINALISED`) on `Transcript` model (not `Student`); student list joins `Transcript.status`
- **D-17** Any Staff or Admin can set transcript status (no role restriction beyond standard auth)

### Claude's Discretion
- Exact Prisma field names and migration filename
- How Transcript model relates to sections — JSON column vs. separate columns vs. child model
- Puppeteer launch flags for Windows Server headless mode
- TipTap extension selection (StarterKit + any extras)
- Exact PDF page size (A4) and margin values
- Auto-save behaviour (debounced save-on-change vs. explicit Save button)
- Whether to show PDF preview before download (locked to: no preview — immediate download)

### Deferred Ideas (OUT OF SCOPE)
- Global Admin section toggle across all transcripts (v2)
- AI-generated narrative text
- Drag-and-drop section reordering (v2)
- PDF preview panel before download (v1 triggers immediately)
- Batch/cohort PDF export (v2 TRN-05)
- Transcript archive (v2 TRN-04)
- Peer review workflow (v2 TRN-06)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRN-01 | Staff can open a transcript template for any student and fill in narrative text sections (academics, activities, awards, work experience, career goals, staff endorsement) | TipTap React integration; auto-population logic; Prisma Transcript schema |
| TRN-02 | Staff can set per-student transcript status to Draft or Finalised | Prisma Transcript.status field; PATCH endpoint; Student list JOIN |
| TRN-03 | Staff can export a student's transcript as a formatted PDF with school branding (logo and letterhead configurable by Admin) | Puppeteer Windows Server setup; SchoolSettings singleton; self-contained HTML template |
</phase_requirements>

---

## Summary

Phase 5 adds three interconnected capabilities: a rich-text transcript editor (TipTap v3), server-side PDF generation (Puppeteer v25), and a singleton settings model for school branding. The existing Express 5 ESM + Prisma 7 + Vitest stack is well-suited to all three, but each has specific implementation constraints on this Windows Server, offline deployment.

**Puppeteer v25 on Windows Server requires `--no-sandbox`** regardless of whether the server runs as a normal user or as SYSTEM (via PM2 service). Additionally, Chrome M125+ (shipped in Puppeteer ≥ v22) introduced a Windows sandbox permission requirement for the PDF printing pipeline — the Chromium cache directory must have `ALL APPLICATION PACKAGES` read/execute rights granted via `icacls`. Without this, PDF generation hangs indefinitely. Setting `PUPPETEER_CACHE_DIR` to a machine-level path (e.g. `C:/ProgramData/puppeteer`) rather than a user-profile path is essential when running as SYSTEM.

**TipTap v3.26.1 is the current release.** The v2 → v3 migration introduced one breaking change that directly affects this phase: `setContent()` now emits `onUpdate` by default, which can cause an infinite auto-save loop if content is set programmatically. The fix is passing `{ emitUpdate: false }` when setting initial content. The `shouldRerenderOnTransaction` option now defaults to `false`; toolbar active-state buttons must use `useEditorState` or `onTransaction` callbacks to track formatting.

**For the Prisma schema**, separate named columns per section (rather than a JSON blob) is the right choice: the 6 sections are fixed and known at design time, individual-section PATCHes are trivially typed, and visibility booleans also map cleanly to dedicated columns. The existing `Student.transcriptStatus` field is a planned forward stub that must be **removed** in this phase's migration — D-16 establishes `Transcript.status` as the source of truth, and the student list query must be updated to LEFT JOIN the `Transcript` table.

**Primary recommendation:** Server-side auto-population in the GET endpoint (query all records, build structured prose, return with `autoPopulated: true` flag); thin `pdfService.ts` abstraction over Puppeteer for testability; separate columns schema; singleton upsert with `id='singleton'`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transcript narrative editing | Browser / Client | — | TipTap is a browser-side editor; no SSR needed (Vite CSR app) |
| Auto-population prose generation | API / Backend | — | Records live in DB; server builds prose strings, returns in GET response |
| PDF rendering | API / Backend | — | Puppeteer runs in Node.js server process; not client-accessible |
| Transcript persistence (PATCH) | API / Backend | Database | Express route → Prisma service → PostgreSQL |
| School branding settings | API / Backend | Database / Storage | PUT upserts SchoolSettings; logo written to disk (same bind-mount) |
| Logo serving | API / Backend | CDN / Static | Served through authenticated `/api/settings/logo` route (JWT required on all /api routes) |
| Status select (UI) | Browser / Client | — | Immediate PATCH on select change; TanStack mutation |
| PDF download trigger | Browser / Client | API / Backend | `fetch → blob → anchor` same as Phase 4 document download |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `puppeteer` | `25.1.0` | Full-bundle Puppeteer — downloads Chromium, generates PDF via headless Chrome | Official Google project; bundled Chromium works offline; `--no-sandbox` flag covers Windows Server constraint |
| `@tiptap/react` | `3.26.1` | React integration for TipTap editor (`useEditor`, `EditorContent`) | Official TipTap React adapter; headless — works with shadcn/Tailwind without style conflicts |
| `@tiptap/starter-kit` | `3.26.1` | Bundle of core TipTap extensions (Bold, Italic, BulletList, OrderedList, History, Paragraph, etc.) | Single install covers all required Phase 5 formatting; no extra extension packages needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-switch` | via `npx shadcn@latest add switch` | Show/hide toggle for transcript sections | Already in project as shadcn component (D-07) |

> **Note:** No additional npm packages beyond the three above. All other components (shadcn Switch, Alert, AlertDialog, Select, Button, Skeleton) already installed from Phase 4.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `puppeteer` (full bundle) | `puppeteer-core` + separate Chromium install | puppeteer-core is lighter but requires ops to install/maintain Chromium separately — breaks on-premise "zero ops" goal |
| Separate named columns for sections | Single `Json` column | JSON is acceptable for Prisma 7 but loses column-level TypeScript typing and makes partial PATCHes more complex |
| Separate named columns for sections | `TranscriptSection` child model | Overkill for fixed 6 sections; creates join overhead and 6 round-trips or a findMany with filtering |

**Installation (server):**
```bash
cd server && npm install puppeteer
```

**Installation (client):**
```bash
cd client && npx shadcn@latest add switch && npm install @tiptap/react @tiptap/starter-kit
```

**Version verification (performed 2026-06-13):**
```
puppeteer          → 25.1.0  (published 2026-05-26, 11.7M weekly downloads)
@tiptap/react      → 3.26.1  (published 2026-06-11,  9.9M weekly downloads)
@tiptap/starter-kit→ 3.26.1  (published 2026-06-11, 10.6M weekly downloads)
```

---

## Package Legitimacy Audit

> Run via `gsd-tools query package-legitimacy check --ecosystem npm puppeteer @tiptap/react @tiptap/starter-kit` on 2026-06-13.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `puppeteer` | npm | ~9 yrs | 11.7M/wk | github.com/puppeteer/puppeteer | SUS (too-new version) | Approved — well-established package; SUS flag is a false positive from recent v25.1.0 publish; official Google project |
| `@tiptap/react` | npm | ~5 yrs | 9.9M/wk | github.com/ueberdosis/tiptap | SUS (too-new version) | Approved — established TipTap GmbH package; MIT license; SUS flag is false positive from recent v3.26.1 release |
| `@tiptap/starter-kit` | npm | ~5 yrs | 10.6M/wk | github.com/ueberdosis/tiptap | SUS (too-new version) | Approved — same org and repo as @tiptap/react; false positive |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious (SUS):** All three packages received "too-new" SUS flags. These are false positives — all three packages are from official, well-established organisations with multi-year history and millions of weekly downloads. The "too-new" signal triggers because the specific version was published recently, not because the packages themselves are new. No `checkpoint:human-verify` required.

**Postinstall note for `puppeteer`:** The `node install.mjs` postinstall script downloads Chromium (~170MB). This is expected behaviour from the official package. No network calls are made at runtime.

---

## Architecture Patterns

### System Architecture Diagram

```
[Staff Browser]
      │  GET /students/:id/transcript
      │  PATCH /students/:id/transcript   ← auto-save (debounced 1500ms)
      │  POST /students/:id/transcript/export
      │  GET/PUT /api/settings
      ▼
[Express 5 API — /api routes (JWT auth)]
      │
      ├─ transcriptRouter
      │     ├─ GET  → transcriptService.getOrBuild(studentId)
      │     │           ├─ prisma.transcript.findUnique (studentId)
      │     │           ├─ if null: query all 5 record tables → build prose → return { autoPopulated: true }
      │     │           └─ if exists: return saved content + check maxRecordTimestamp vs updatedAt
      │     ├─ PUT  → transcriptService.upsert(studentId, body)
      │     └─ POST /export → pdfService.generate(transcript, settings)
      │                            ├─ settingsService.get()  (SchoolSettings)
      │                            ├─ fs.readFile(logoPath) → base64
      │                            ├─ buildHtmlTemplate(content, branding, base64Logo)
      │                            ├─ puppeteer.launch({ args: ['--no-sandbox', ...] })
      │                            ├─ page.setContent(html, { waitUntil: 'domcontentloaded' })
      │                            └─ page.pdf({ format: 'A4', printBackground: true })
      │
      ├─ settingsRouter (Admin only — requireRole('ADMIN'))
      │     ├─ GET /api/settings       → settingsService.get()
      │     ├─ PUT /api/settings       → settingsService.upsert(body, logoFile?)
      │     └─ GET /api/settings/logo  → pipe fs.createReadStream(logoPath) [JWT required]
      │
      └─ [Prisma 7 + PrismaPg adapter]
            ├─ Transcript  (studentId UNIQUE FK, 6×content, 6×visible, status)
            └─ SchoolSettings (id='singleton', schoolName, letterheadHtml, logoPath)
```

### Recommended Project Structure
```
server/src/
├─ routes/
│   ├─ transcript.ts       # GET/PUT /:studentId/transcript, POST /:studentId/transcript/export
│   └─ settings.ts         # GET/PUT /api/settings, GET /api/settings/logo
├─ services/
│   ├─ transcript.ts       # getOrBuild(), upsert(), computeMaxRecordTimestamp()
│   ├─ pdf.ts              # generatePdf(html) → Buffer (thin Puppeteer wrapper)
│   └─ settings.ts         # get(), upsert()
└─ __tests__/
    └─ transcript.test.ts  # Integration tests (transcript CRUD + PDF route with mocked pdfService)

client/src/
├─ pages/
│   ├─ TranscriptPage.tsx
│   └─ SettingsPage.tsx
└─ components/transcript/
    ├─ TranscriptSectionCard.tsx
    ├─ TipTapEditor.tsx
    └─ RecordsUpdatedBanner.tsx
```

### Pattern 1: Puppeteer PDF Generation Service (Windows Server)

**What:** Thin wrapper around Puppeteer that launches Chromium once per request, renders HTML, returns a `Buffer`.
**When to use:** Every call to `POST /api/students/:studentId/transcript/export`.

```typescript
// server/src/services/pdf.ts
// Source: puppeteer docs + GitHub issue #12471 (Windows M125+ sandbox fix)
import puppeteer from 'puppeteer'

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,          // uses Chrome Headless Shell (default in v22+)
    args: [
      '--no-sandbox',              // Required: Windows Server / SYSTEM account
      '--disable-setuid-sandbox',  // Required: complement to --no-sandbox
      '--disable-dev-shm-usage',   // Required: prevents /dev/shm OOM in constrained envs
      '--disable-gpu',             // Reduces crashes on headless Windows
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' }) // fast; no external resources
    await page.emulateMediaType('print')  // apply @media print CSS rules
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,    // render CSS backgrounds (letterhead colors/images)
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
```

**Windows SYSTEM account pitfall:** If `PUPPETEER_CACHE_DIR` is not set, Chromium is cached under `%USERPROFILE%/.cache/puppeteer`. When PM2 runs as SYSTEM (Phase 1 pattern: `PM2_HOME=C:/ProgramData/pm2`), `%USERPROFILE%` resolves to `C:\Windows\System32\config\systemprofile`. Set `PUPPETEER_CACHE_DIR=C:/ProgramData/puppeteer` in `ecosystem.config.js` so the cache lands in a predictable, accessible path.

**Chrome M125+ Windows printing hang:** After `npm install`, run once on the server:
```powershell
icacls "C:/ProgramData/puppeteer/chrome-headless-shell" /grant "*S-1-15-2-2:(OI)(CI)(RX)"
```
Add this to the DEPLOYMENT-RUNBOOK.md. [CITED: github.com/puppeteer/puppeteer/issues/12471]

### Pattern 2: Embedding Logo as Base64 Data URI

**What:** Read logo from disk, encode as base64, embed directly in HTML. Prevents any filesystem path issues in headless Chromium.

```typescript
// server/src/services/transcript.ts (HTML builder helper)
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function buildPdfHtml(
  transcript: TranscriptWithSections,
  settings: SchoolSettings,
  uploadRoot: string,
): Promise<string> {
  let logoDataUri = ''
  if (settings.logoPath) {
    const logoBuffer = await readFile(path.join(uploadRoot, settings.logoPath))
    const ext = path.extname(settings.logoPath).slice(1).toLowerCase()
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    logoDataUri = `data:${mimeType};base64,${logoBuffer.toString('base64')}`
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; margin: 0; }
    /* No external font imports — all fonts must be system fonts or embedded */
    ${settings.letterheadHtml ?? ''}
  </style>
</head>
<body>
  ${logoDataUri ? `<img src="${logoDataUri}" alt="School logo" style="height:60px;" />` : ''}
  <h1>${settings.schoolName}</h1>
  ${settings.schoolAddress ? `<p>${settings.schoolAddress}</p>` : ''}
  <hr />
  <!-- transcript sections inserted here -->
  ${buildSectionsHtml(transcript)}
</body>
</html>`
}
```

> **No external resources rule:** Do not use Google Fonts, CDN CSS, or any `<link href="https://...">` in the HTML template. Chromium runs in offline mode in production — external resources silently fail, breaking layout. [ASSUMED — derived from on-premise deployment constraint]

### Pattern 3: TipTap Editor Instance (per section)

```typescript
// client/src/components/transcript/TipTapEditor.tsx
// Source: https://tiptap.dev/docs/editor/getting-started/install/react
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'

interface TipTapEditorProps {
  initialContent: string   // HTML string (may be empty for Staff Endorsement)
  onChange: (html: string) => void
  placeholder?: string
}

export function TipTapEditor({ initialContent, onChange, placeholder }: TipTapEditorProps) {
  const isFirstRender = useRef(true)

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || '',
    immediatelyRender: true,  // CSR (Vite) — always true
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // When initialContent changes externally (e.g. Regenerate Draft), update editor
  useEffect(() => {
    if (!editor || isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // TipTap v3 API: setContent(content, options) — options object as 2nd arg (NOT boolean)
    // { emitUpdate: false } prevents triggering onUpdate → auto-save loop
    // v2 had setContent(content, emitUpdate_bool) — DO NOT use boolean 2nd arg in v3
    editor.commands.setContent(initialContent || '', { emitUpdate: false })
  }, [initialContent, editor])

  // useEditorState for toolbar active state (v3: shouldRerenderOnTransaction defaults to false)
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor?.isActive('bold') ?? false,
      isItalic: editor?.isActive('italic') ?? false,
      isBulletList: editor?.isActive('bulletList') ?? false,
      isOrderedList: editor?.isActive('orderedList') ?? false,
    }),
  })

  return (
    <div>
      {/* Toolbar using editorState for active states */}
      <div role="toolbar" className="bg-muted/40 border-b px-2 py-1 flex gap-1">
        <Button variant={editorState?.isBold ? 'secondary' : 'ghost'} size="icon"
          onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        {/* ... italic, bulletList, orderedList */}
      </div>
      <EditorContent editor={editor} className="min-h-[160px] p-4 prose text-base leading-relaxed" />
    </div>
  )
}
```

**Key v3 change for toolbar:** `shouldRerenderOnTransaction` defaults to `false` in v3. Without `useEditorState`, toolbar buttons will never reflect the active formatting state. `useEditorState` with a selector is the v3 pattern. [CITED: tiptap.dev/docs/guides/upgrade-tiptap-v2]

### Pattern 4: Prisma Transcript Schema

**Recommendation: Separate named columns** — 6 content columns + 6 visibility columns + status + timestamp fields.

```prisma
// Additions to server/prisma/schema.prisma

model Transcript {
  id        String           @id @default(uuid())
  studentId String           @unique  // one transcript per student
  student   Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  status    TranscriptStatus @default(DRAFT)

  // Section narrative content (HTML strings from TipTap)
  academicsContent        String? @db.Text
  activitiesContent       String? @db.Text
  awardsContent           String? @db.Text
  workExperienceContent   String? @db.Text
  careerGoalsContent      String? @db.Text
  staffEndorsementContent String? @db.Text

  // Per-section visibility (false = excluded from exported PDF)
  academicsVisible        Boolean @default(true)
  activitiesVisible       Boolean @default(true)
  awardsVisible           Boolean @default(true)
  workExperienceVisible   Boolean @default(true)
  careerGoalsVisible      Boolean @default(true)
  staffEndorsementVisible Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([studentId])
  @@index([status])
}

model SchoolSettings {
  id             String   @id @default("singleton")
  schoolName     String
  schoolAddress  String?  @db.Text
  letterheadHtml String?  @db.Text
  logoPath       String?  // relative path under UPLOAD_ROOT: "branding/logo.{ext}"
  updatedAt      DateTime @updatedAt
}
```

**Student.transcriptStatus migration:** The existing `Student.transcriptStatus TranscriptStatus @default(NONE)` field was a planned stub that must be removed in this phase. D-16 establishes `Transcript.status` as the source of truth. The student list query (`listStudents` service) must be updated to LEFT JOIN `Transcript` and map `transcript?.status ?? 'NONE'` to the response. Add the Transcript relation to the Student model block and remove `transcriptStatus`:

```prisma
model Student {
  // ... existing fields ...
  // REMOVE: transcriptStatus TranscriptStatus @default(NONE)
  // ADD:
  transcript       Transcript?
  // ... rest unchanged
}
```

Generate migration SQL via `prisma migrate diff` (same pattern established in Phase 1):
```bash
npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel server/prisma/schema.prisma --script > server/prisma/migrations/20260613_phase5_transcript/migration.sql
```

### Pattern 5: SchoolSettings Singleton Upsert

```typescript
// server/src/services/settings.ts
export async function upsertSettings(
  prisma: PrismaClient,
  data: { schoolName: string; schoolAddress?: string; letterheadHtml?: string; logoPath?: string },
) {
  return prisma.schoolSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })
}

export async function getSettings(prisma: PrismaClient) {
  return prisma.schoolSettings.findUnique({ where: { id: 'singleton' } })
}
```

### Pattern 6: Server-Side Auto-Population

**Recommendation: Compute in the GET handler.** When `Transcript` record does not exist for this student (first open), the GET endpoint queries all 5 record types and builds structured prose strings, returning them with `autoPopulated: true`. The client renders these in TipTap without persisting them — the first auto-save (after 1500ms idle) creates the Transcript record.

```typescript
// server/src/services/transcript.ts

type AutoPopulatedContent = {
  academicsContent: string | null
  activitiesContent: string | null
  awardsContent: string | null
  workExperienceContent: string | null
  careerGoalsContent: string | null
  staffEndorsementContent: null  // always blank
}

export async function buildAutoPopulatedContent(
  prisma: PrismaClient,
  studentId: string,
): Promise<AutoPopulatedContent> {
  const [academics, activities, awards, workExps, careerGoals] = await Promise.all([
    prisma.academicResult.findMany({ where: { studentId }, orderBy: { calendarYear: 'desc' } }),
    prisma.activity.findMany({ where: { studentId }, orderBy: { startYear: 'desc' } }),
    prisma.award.findMany({ where: { studentId }, orderBy: { awardYear: 'desc' } }),
    prisma.workExperience.findMany({ where: { studentId }, orderBy: { startYear: 'desc' } }),
    prisma.careerGoal.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 }),
  ])

  return {
    academicsContent: academics.length
      ? academics.map(r => `<p>Achieved ${r.grade} in ${r.subject} (${r.calendarYear}).</p>`).join('')
      : null,
    activitiesContent: activities.length
      ? activities.map(a => `<p>${a.role} at ${a.organisation} (${formatPeriod(a)}).</p>`).join('')
      : null,
    awardsContent: awards.length
      ? awards.map(a => `<p>${a.title} (${a.level}) from ${a.issuer} (${a.awardYear}).</p>`).join('')
      : null,
    workExperienceContent: workExps.length
      ? workExps.map(w => `<p>${w.role} at ${w.employer} (${formatPeriod(w)}).</p>`).join('')
      : null,
    careerGoalsContent: careerGoals.length
      ? buildCareerGoalsContent(careerGoals[0])
      : null,
    staffEndorsementContent: null,
  }
}
```

**Records-updated banner computation (no extra DB field needed):** Compute at GET time by querying the max `updatedAt`/`createdAt` across all 5 record tables:

```typescript
export async function computeMaxRecordTimestamp(
  prisma: PrismaClient,
  studentId: string,
): Promise<Date | null> {
  // Query max timestamp from each record type in parallel
  const [maxAcademic, maxActivity, maxAward, maxWorkExp, maxCareerGoal] = await Promise.all([
    prisma.academicResult.findFirst({ where: { studentId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.activity.findFirst({ where: { studentId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.award.findFirst({ where: { studentId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.workExperience.findFirst({ where: { studentId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.careerGoal.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ])
  const timestamps = [
    maxAcademic?.updatedAt, maxActivity?.updatedAt, maxAward?.updatedAt,
    maxWorkExp?.updatedAt, maxCareerGoal?.createdAt,
  ].filter(Boolean) as Date[]
  return timestamps.length ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
}
```

GET response shape:
```typescript
{
  transcript: TranscriptRow | null,
  autoPopulated: boolean,         // true = no saved content, content is generated
  showRecordsBanner: boolean,     // maxRecordTimestamp > transcript.updatedAt
  // If autoPopulated: true, content fields are pre-populated strings (not yet in DB)
  academicsContent: string | null,
  // ... all 6 content fields
}
```

### Anti-Patterns to Avoid

- **Never use `page.goto(url)` for self-contained HTML:** Use `page.setContent(html)` instead. `page.goto()` requires a running URL which creates a server-on-server dependency.
- **Never embed TipTap state in React component state directly:** TipTap manages its own ProseMirror state. Only serialize to HTML (`editor.getHTML()`) when saving. Storing HTML in React state and passing it back to TipTap on every render creates re-initialization loops.
- **Never use `headless: 'new'` with `--no-sandbox` on older Puppeteer builds:** In Puppeteer v21, this combination had instability (issue #10367). `headless: true` in v22+ uses Chrome Headless Shell, which is stable with `--no-sandbox`. [CITED: github.com/puppeteer/puppeteer/issues/10367]
- **Never launch multiple concurrent Puppeteer browsers per request without pooling:** The phase scope is low concurrency (3–8 staff), so launch-per-request is fine. For higher concurrency, add a browser pool.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML → PDF conversion | Custom wkhtmltopdf wrapper, html-pdf, jsPDF | `puppeteer` page.pdf() | Puppeteer has full Chrome CSS support; alternatives have broken table/flexbox rendering |
| Rich text editing | `<textarea>` with manual HTML, contentEditable | TipTap + StarterKit | contentEditable has cross-browser clipboard and selection edge cases; TipTap abstracts ProseMirror |
| Singleton DB pattern | `findFirst()` + conditional `create` | Prisma `upsert({ where: { id: 'singleton' } })` | Race condition on concurrent writes with create/update split |
| Base64 encoding | Manual Buffer iteration | `buffer.toString('base64')` | Node.js built-in; no dependency needed |
| Debounced auto-save | `setTimeout` + manual cleanup | `useCallback` + `useEffect` cleanup ref pattern (or `use-debounce` if already in project) | Manual debounce misses cleanup on unmount, causing memory leaks and stale closures |

**Key insight:** Puppeteer is the only correct choice for full-fidelity PDF generation of HTML content with modern CSS. Alternatives like `html-pdf` (PhantomJS-based, abandoned 2020) or `jsPDF` (canvas-based, poor HTML rendering) will produce misaligned letterhead layouts.

---

## Common Pitfalls

### Pitfall 1: Puppeteer SYSTEM-Account Chromium Cache Path
**What goes wrong:** `npm install puppeteer` succeeds during deployment, but the server process (PM2 as Windows service, running as SYSTEM) can't find Chromium at runtime.
**Why it happens:** Puppeteer caches Chromium to `~/.cache/puppeteer`. When PM2 runs as SYSTEM, `~` resolves to `C:\Windows\System32\config\systemprofile` — different from the user account that ran `npm install`.
**How to avoid:** Set `PUPPETEER_CACHE_DIR=C:/ProgramData/puppeteer` in `ecosystem.config.js` (same approach as `PM2_HOME=C:/ProgramData/pm2` from Phase 1). Run `npm install` as the same account, or set this env var globally before `npm install`.
**Warning signs:** `Error: Failed to launch the browser process!` or `Cannot find chrome executable` in PM2 logs.

### Pitfall 2: Windows Chrome M125+ PDF Hang (no timeout, no error)
**What goes wrong:** `page.pdf()` call hangs indefinitely and never rejects. The HTTP request to `/transcript/export` times out.
**Why it happens:** Chrome M125+ (Puppeteer ≥ v22 ships Chrome 127+) added a sandbox for the PDF compositor on Windows. The compositor subprocess needs `ALL APPLICATION PACKAGES` read permission on the Chromium directory. [CITED: github.com/puppeteer/puppeteer/issues/12471]
**How to avoid:** After first `npm install puppeteer` on the Windows Server, run:
```powershell
icacls "C:/ProgramData/puppeteer/chrome-headless-shell" /grant "*S-1-15-2-2:(OI)(CI)(RX)"
```
Add this step to DEPLOYMENT-RUNBOOK.md.
**Warning signs:** `POST /transcript/export` returns no response; `browser.close()` in the finally block is never reached; no error logged.

### Pitfall 3: TipTap `setContent` Auto-Save Loop
**What goes wrong:** Setting initial content via `editor.commands.setContent(html)` fires `onUpdate`, which triggers the debounced save, which may fire again after save response.
**Why it happens:** TipTap v3 changed `setContent` to emit updates by default (was silent in v2). [CITED: tiptap.dev/docs/guides/upgrade-tiptap-v2]
**How to avoid:** Pass `false, { emitUpdate: false }` as the second and third arguments to `setContent()` when programmatically setting content. Only use `onUpdate` for user-initiated edits.
**Warning signs:** Network tab shows rapid repeated PATCH requests to `/transcript`; auto-save indicator flickering.

### Pitfall 4: TipTap Toolbar Buttons Always Inactive (v3)
**What goes wrong:** Bold/Italic/List toolbar buttons never show active state even when cursor is inside bold text.
**Why it happens:** `shouldRerenderOnTransaction` defaults to `false` in TipTap v3 — the React component does not re-render when cursor moves into formatted text.
**How to avoid:** Use `useEditorState` hook with a selector that extracts `isActive('bold')` etc. Do not rely on component re-renders for toolbar state.
**Warning signs:** Toolbar buttons appear grey even when cursor is inside bold/italic text.

### Pitfall 5: Student.transcriptStatus / Transcript.status Conflict
**What goes wrong:** Phase 5 migration adds `Transcript.status` but leaves `Student.transcriptStatus` in place — student list query reads `Student.transcriptStatus` (default NONE), ignoring the new `Transcript.status` field.
**Why it happens:** The schema already has `Student.transcriptStatus TranscriptStatus @default(NONE)` (added in Phase 2 as a forward stub). D-16 says status belongs on `Transcript`.
**How to avoid:** The Phase 5 migration must: (1) add `Transcript` model with `status` field, (2) remove `transcriptStatus` from `Student` model, (3) update `listStudents` service to LEFT JOIN `Transcript` and return `transcript?.status ?? 'NONE'`.
**Warning signs:** Student list still shows "None" for all students after setting transcript to Draft.

### Pitfall 6: External Resources in PDF HTML Template
**What goes wrong:** Letterhead HTML references Google Fonts (`<link href="https://fonts.googleapis.com/...">`), external CDN CSS, or absolute image paths. PDF renders broken layout — missing fonts, missing images, misaligned letterhead.
**Why it happens:** Puppeteer's Chromium runs offline in production (on-premise, no internet). External resource requests time out silently.
**How to avoid:** The HTML template must be fully self-contained. Use only system fonts (`Arial`, `Times New Roman`, `Georgia`) or embed font data URIs. Logo is embedded as base64 (Pattern 2). Check Admin letterhead HTML for external resource references at save time (optional: warn in UI, not block).
**Warning signs:** PDF looks fine in dev (internet available) but broken in production.

### Pitfall 7: Prisma `@db.Text` Missing for HTML Columns
**What goes wrong:** TipTap-generated HTML stored in the content columns silently truncates at 191 characters (MySQL default) or throws a constraint violation.
**Why it happens:** Without `@db.Text`, Prisma maps `String` to `varchar(191)` on MySQL. PostgreSQL is more lenient (`text` type auto-selected), but explicit `@db.Text` makes the intent clear and prevents issues if the DB is ever migrated.
**How to avoid:** All 6 `*Content` columns and `letterheadHtml` must use `@db.Text`. Already shown in the schema pattern above.

---

## Code Examples

### Express Route: POST /transcript/export
```typescript
// server/src/routes/transcript.ts
// Source: same fetch+blob+anchor pattern as Phase 4 document download
import { generatePdf } from '../services/pdf.js'

transcriptRouter.post('/export', async (req, res, next) => {
  try {
    const studentId = (req.params as Record<string, string>).studentId
    // 1. Load transcript + settings
    const [transcript, settings] = await Promise.all([
      transcriptService.getByStudentId(prisma, studentId),
      settingsService.get(prisma),
    ])
    if (!transcript) {
      res.status(404).json({ error: 'No transcript found — save first' })
      return
    }
    // 2. Build self-contained HTML
    const html = await buildPdfHtml(transcript, settings, UPLOAD_ROOT)
    // 3. Generate PDF
    const pdfBuffer = await generatePdf(html)
    // 4. Stream response
    const student = await getStudentById(prisma, studentId)
    const filename = `transcript-${student.fullName.replace(/\s+/g, '-')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)

    await logAudit(prisma, { userId: req.user!.id, action: 'CREATE', model: 'TranscriptPdf', recordId: studentId, details: { filename } })
  } catch (err) {
    next(err)
  }
})
```

### Client: PDF Export (fetch + blob + anchor)
```typescript
// client/src/pages/TranscriptPage.tsx (export handler)
// Source: same pattern as Phase 4 document download
const handleExport = async () => {
  setExporting(true)
  try {
    const response = await apiFetch(`/api/students/${studentId}/transcript/export`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Export failed')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${studentName}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Export failed. Please try again.')
  } finally {
    setExporting(false)
  }
}
```

### Debounced Auto-Save Hook
```typescript
// client/src/hooks/useDebouncedCallback.ts
import { useCallback, useRef } from 'react'

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `headless: 'new'` string literal | `headless: true` (boolean) | Puppeteer v21+ | `headless: true` now maps to headless shell; string literal deprecated |
| Puppeteer stores Chromium in `node_modules/.local-chromium` | Puppeteer stores Chromium in `~/.cache/puppeteer` | Puppeteer v20 | Cache survives `npm ci` re-runs; but breaks SYSTEM-account deployments without explicit `PUPPETEER_CACHE_DIR` |
| TipTap `setContent(html, emitUpdate)` (boolean 2nd arg) | `setContent(content, options)` where options is an object `{ emitUpdate?: boolean }` | TipTap v3.0 | **Must use options object, not boolean.** `setContent(html, { emitUpdate: false })` — the boolean second arg from v2 is no longer accepted |
| TipTap re-renders on every transaction by default | `shouldRerenderOnTransaction: false` default | TipTap v3.0 | Must use `useEditorState` for toolbar active states |

**Deprecated/outdated:**
- `html-pdf` npm package: PhantomJS-based, abandoned 2020 — do not use
- `wkhtmltopdf`: No longer maintained as of 2023; poor CSS Grid/Flexbox support — do not use
- TipTap v2 `@tiptap/extension-*` packages individually: StarterKit in v3 covers all Phase 5 formatting needs

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.3 |
| Config file | `server/vitest.config.ts` (existing) |
| Quick run command | `cd server && npx vitest run --reporter=verbose transcript.test.ts` |
| Full suite command | `cd server && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRN-01 | GET /transcript returns auto-populated content when no saved narrative | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-01 | PUT /transcript saves section content; GET returns saved content | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-01 | PUT /transcript with show/hide per section stored correctly | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-01 | GET /transcript showRecordsBanner=true when records updated after transcript.updatedAt | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-02 | PUT /transcript status DRAFT → FINALISED returns 200 | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-02 | Student list (GET /students) returns status DRAFT for student with DRAFT transcript | Integration | `vitest run students.test.ts` | ❌ needs update |
| TRN-03 | POST /transcript/export returns 200, Content-Type: application/pdf, body starts with %PDF | Integration (mocked pdfService) | `vitest run transcript.test.ts` | ❌ Wave 0 |
| TRN-03 | GET /api/settings returns 200 with settings fields (or null if not set) | Integration | `vitest run settings.test.ts` | ❌ Wave 0 |
| TRN-03 | PUT /api/settings upserts correctly; second PUT does not duplicate | Integration | `vitest run settings.test.ts` | ❌ Wave 0 |
| TRN-03 | PUT /api/settings by STAFF returns 403 | Integration | `vitest run settings.test.ts` | ❌ Wave 0 |
| TRN-01–03 | IDOR: GET/PUT /transcript for wrong studentId returns 404 | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 |

**PDF route testing strategy:** Mock `generatePdf` in the test file with `vi.mock('../services/pdf.js', () => ({ generatePdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')) }))`. The test verifies the route sets correct headers and streams a PDF-like buffer. This avoids Chromium download/launch in CI.

### Sampling Rate
- **Per task commit:** `cd server && npx vitest run --reporter=verbose transcript.test.ts`
- **Per wave merge:** `cd server && npx vitest run` (full 73+ test suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/src/__tests__/transcript.test.ts` — covers TRN-01, TRN-02, TRN-03 route tests (vi.mock pdf service)
- [ ] `server/src/__tests__/settings.test.ts` — covers Admin-only guard, upsert, GET logo route
- [ ] `server/src/__tests__/helpers/testDb.ts` — add `prisma.transcript.deleteMany()` and `prisma.schoolSettings.deleteMany()` to `clearDb()`
- [ ] Update `server/src/__tests__/students.test.ts` — student list must now JOIN Transcript for status; existing `nav-02-filter` tests need updating to create Transcript records

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `validateJwt` + `resolveUser` middleware on all `/api` routes |
| V3 Session Management | yes (inherited) | JWT Bearer token pattern from Phase 1 |
| V4 Access Control | yes | `requireRole('ADMIN')` on settings routes; IDOR guard (transcript.studentId === studentId) |
| V5 Input Validation | yes | Zod schemas on all request bodies; no SQL injection (Prisma ORM) |
| V6 Cryptography | no | No new cryptographic operations in Phase 5 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: access another student's transcript | Information Disclosure | Service checks `transcript.studentId === studentId` before serving/updating |
| Privilege escalation: Staff writes to /api/settings | Elevation of Privilege | `requireRole('ADMIN')` middleware |
| HTML injection via letterheadHtml | Tampering | Admin-only write access; D-14 explicitly allows raw HTML paste for Admin |
| Chromium sandbox escape | Tampering | N/A — Puppeteer renders school-authored HTML only; no user-controlled HTML from untrusted sources reaches Chromium |
| PDF blob served without auth | Information Disclosure | POST /transcript/export route is under `/api` (JWT validated); response blob delivered over same authenticated connection |
| Logo served without auth | Information Disclosure | GET /api/settings/logo is under `/api` (JWT validated) — same as document download pattern from Phase 4 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Puppeteer runtime | ✓ | 22.x (from Phase 1) | — |
| PostgreSQL | Prisma DB | ✓ | 15.x (via Docker) | — |
| Chromium (~170MB) | Puppeteer PDF | ✓ after `npm install puppeteer` | Downloaded by postinstall | — |
| Internet (for npm install) | Puppeteer Chromium download | ✓ at install time | — | Pre-download on internet machine, copy to server |
| `icacls` | Windows sandbox permissions | ✓ | Windows Server built-in | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None after `npm install puppeteer` runs.

**First-install note:** Puppeteer's postinstall downloads ~170MB of Chromium. On a school server with slow outbound internet, this may take several minutes. Download once on a machine with good connectivity and commit the cache, or set `PUPPETEER_SKIP_DOWNLOAD=true` + pre-install Chromium manually using `npx puppeteer browsers install chrome-headless-shell`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Auto-population should be computed server-side in the GET endpoint (not client-side) | Architecture Patterns | If client-side is required, TranscriptPage needs an extra fetch for all 5 record types; server is simpler |
| A2 | `waitUntil: 'domcontentloaded'` is sufficient for self-contained HTML (no networkidle0 needed) | Pattern 1 | If letterhead CSS has animation/font loading, networkidle0 may be needed; test with real letterhead in UAT |
| A3 | A3: PDF margins of 20mm are appropriate for a school transcript | Code Examples | May need adjustment per school preference; configurable as a SchoolSettings field in v2 |
| A4 | Separate named columns (not JSON) is the correct schema choice for sections | Prisma schema | If sections become dynamic in v2, JSON would be more flexible; for v1 with 6 fixed sections, columns are better |

---

## Open Questions

1. **`Student.transcriptStatus` removal — RESOLVED**
   - What we know: Existing schema has this column; D-16 says status goes on Transcript model; student list filter currently reads from Student
   - **Confirmed via grep (2026-06-14):** `server/src/__tests__/students.test.ts` references `transcriptStatus` at **7 locations**: lines 40 (type assertion), 61 and 131 (response assertion `transcriptStatus: 'NONE'`), 335 (`prisma.student.update data: { transcriptStatus: 'DRAFT' }`), 372–383 (`nav-02-status` test filters `GET /api/students?transcriptStatus=NONE` and asserts `row.transcriptStatus`).
   - **Action required for planner:** The Phase 5 plan must include a task to update `students.test.ts` — the `nav-02-status` test must be changed to create a `Transcript` record (with `status: 'NONE'` default) rather than setting `Student.transcriptStatus` directly. The list API response shape must return `transcriptStatus` (renamed from `Transcript.status`) for backward compatibility with the existing test assertions, or the test assertions must be updated.

2. **Logo MIME type serving — RESOLVED**
   - Recommendation: Infer from `path.extname(logoPath)` — simple, no schema change needed.

3. **Concurrent PDF export requests — OPEN**
   - What we know: 3–8 staff users; one export per request; launch-per-request approach chosen
   - What's unclear: How long does Puppeteer take per request on this server's hardware?
   - Recommendation: Instrument with `Date.now()` in the service; if > 10 seconds, add a 30s request timeout; pooling deferred to v2.

---

## Sources

### Primary (MEDIUM confidence — official docs via WebSearch + verified against npm registry)
- [tiptap.dev/docs/editor/getting-started/install/react] — useEditor hook, EditorContent, immediatelyRender, onUpdate pattern
- [tiptap.dev/docs/guides/upgrade-tiptap-v2] — setContent API change, shouldRerenderOnTransaction, useEditorState requirement
- [github.com/puppeteer/puppeteer/issues/12471] — Windows Chrome M125+ PDF hang; icacls fix for chrome-headless-shell
- [github.com/puppeteer/puppeteer/issues/12857] — Puppeteer v22.14.0 requires --no-sandbox when running as Windows SYSTEM
- [prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields] — Json field typing, prisma-json-types-generator

### Secondary (MEDIUM confidence — official docs inferred from project patterns + npm registry)
- Package legitimacy check: all 3 packages returned legitimate signals (high download counts, official GitHub repos, MIT/Apache licenses)
- npm view puppeteer/tiptap version: confirmed version numbers 2026-06-13

### Tertiary (LOW confidence — training knowledge tagged [ASSUMED])
- Prisma schema column naming conventions (field names, index strategies)
- PDF margin defaults (20mm)
- waitUntil: 'domcontentloaded' sufficiency for self-contained HTML

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — package versions confirmed against npm registry; TipTap v3 API verified against official docs
- Architecture: MEDIUM — patterns derived from official docs and direct analogy to existing Phase 4 patterns
- Pitfalls: MEDIUM — Puppeteer Windows pitfalls verified against official GitHub issues; TipTap v3 breaking changes verified against upgrade guide

**Research date:** 2026-06-14 (refreshed; original 2026-06-13)
**Valid until:** 2026-07-14 (TipTap and Puppeteer are actively maintained; check for patch releases)

---

## Refresh Notes (2026-06-14)

**Changes from original 2026-06-13 version:**
- **Fixed `setContent` API:** Code example now correctly uses `setContent(content, { emitUpdate: false })` — the v2 boolean second argument form was incorrectly shown in the original.
- **TipTap v2 vs v3 warning added** to document header — `05-UI-SPEC.md` Design System table incorrectly states "TipTap v2" but v3.26.1 is current (confirmed `npm view`).
- **Open Question 1 resolved:** `students.test.ts` has 7 references to `transcriptStatus` (lines 40, 61, 131, 335, 372, 377, 383). The nav-02-status test must be rewritten to seed Transcript records.
- **Package versions re-verified:** puppeteer@25.1.0, @tiptap/react@3.26.1, @tiptap/starter-kit@3.26.1 confirmed via `npm view` 2026-06-14.
