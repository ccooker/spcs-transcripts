# Phase 5: Transcript Assembly & Export — Research

**Researched:** 2026-06-14
**Domain:** PDF generation (Puppeteer), rich-text editing (TipTap), Prisma schema design (Json column / singleton)
**Confidence:** MEDIUM

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** PDF engine: `puppeteer` (full bundle) — downloads Chromium on `npm install`; ~170 MB in `node_modules`
- **D-02** Server builds a self-contained HTML string; Puppeteer launches headless Chromium to capture PDF; no separate renderer
- **D-03** Logo embedded as base64 data URI; letterhead HTML injected verbatim from `SchoolSettings.letterheadHtml`
- **D-04** Transcript editor at separate route `/students/:id/transcript`
- **D-05** Rich text editor: **TipTap** — one instance per transcript section; toolbar: Bold, Italic, Bullet list, Ordered list
- **D-06** Six sections: Academics, Activities, Awards, Work Experience, Career Goals, Staff Endorsement
- **D-07** Per-transcript show/hide toggle per section (stored in DB)
- **D-08** Auto-populate on first open from stored records; exact prose templates defined in CONTEXT.md
- **D-09** After first edit, narrative preserved as-is
- **D-10** Records-updated banner when `transcript.recordsUpdatedAt > transcript.updatedAt`
- **D-11** Admin branding at `/settings` — `requireRole('ADMIN')`
- **D-12** `SchoolSettings` singleton: `id`, `schoolName`, `schoolAddress`, `letterheadHtml`, `logoPath`, `updatedAt`
- **D-13** Logo stored under `./data/uploads/branding/`; filename always `logo.{ext}`
- **D-14** Letterhead HTML pasted verbatim; no sanitisation (Admin-only)
- **D-15** No upload progress bar on Settings page
- **D-16** Transcript status (`NONE`/`DRAFT`/`FINALISED`) on `Transcript` model
- **D-17** Any Staff or Admin can change status

### Claude's Discretion
- Exact Prisma field names and migration filename for `Transcript` and `SchoolSettings` models
- How `Transcript` stores 6 sections — JSON column vs separate columns vs child model
- Puppeteer launch flags for Windows Server headless mode
- TipTap extension selection (StarterKit covers all required formats)
- Exact PDF A4 margins
- Auto-save behaviour (1500ms debounce confirmed in UI-SPEC)
- Whether to show PDF preview before download (deferred: v1 triggers download immediately)

### Deferred Ideas (OUT OF SCOPE)
- Global Admin section toggle across all transcripts (v2)
- AI-generated narrative text (explicitly out of scope)
- Drag-and-drop section reordering (v2)
- PDF preview panel before download (v1 = immediate download)
- Batch/cohort PDF export (v2 TRN-05)
- Transcript archive with date/generator/recipient (v2 TRN-04)
- Peer review workflow (v2 TRN-06)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRN-01 | Staff can open a transcript template for any student and fill in narrative text sections (one per record type: academics, activities, awards, work experience, career goals, staff endorsement) | TipTap `useEditor` + `onUpdate` debounce; auto-population from stored records at GET time on server; `Transcript` model with 6 section fields |
| TRN-02 | Staff can set per-student transcript status to Draft or Finalised | `TranscriptStatus` enum already in `schema.prisma`; PATCH endpoint updates `Transcript.status`; no extra role check needed |
| TRN-03 | Staff can export student transcript as formatted PDF with school branding (logo + letterhead configurable by Admin) | Puppeteer `page.setContent` + `page.pdf()`; `SchoolSettings` singleton model; logo as base64 data URI; letterhead HTML verbatim inject |
</phase_requirements>

---

## Summary

Phase 5 combines three independently complex sub-problems: server-side PDF generation with Puppeteer on Windows, a multi-instance rich-text editing UI with TipTap, and a two-model Prisma schema (singleton `SchoolSettings` + per-student `Transcript`). All three sub-problems have established patterns in the project's existing stack (Express 5 ESM, Prisma 7, React, TanStack Query) and can follow the Phase 3/4 patterns with extensions.

The most platform-sensitive piece is Puppeteer on Windows Server. The `puppeteer` full-bundle package (v25.1.0) downloads `~170 MB` of Chrome for Testing during `npm install`. On Windows Server, when Node runs as the SYSTEM account (typical IIS/PM2 service), Chromium's sandbox may fail silently — requiring either `--no-sandbox` in launch args, or a one-time `icacls` command to grant sandbox permissions to the Chrome cache directory. PM2 on this project runs as SYSTEM (STATE.md D: `PM2_HOME set to C:/ProgramData/pm2`) — so `--no-sandbox` **must** be used as the launch flag, or the PDF generation will hang indefinitely.

TipTap's key constraint is **do not use as a controlled React component**. Calling `editor.commands.setContent(value)` on every parent re-render causes flicker and thrashing. The correct pattern is: pass `content` once at initialization, then read via `onUpdate` → `editor.getHTML()` → debounce → PATCH. For multiple editor instances on one page, each `useEditor()` call returns an independent, self-managed ProseMirror instance — no shared state.

For the `Transcript` Prisma model, the recommended approach is **6 separate `String?` columns** (one per section: `academicsHtml`, `activitiesHtml`, etc.) rather than a single JSON column — avoids Prisma Json type-casting overhead, makes partial PATCH straightforward, and keeps TypeScript types precise.

**Primary recommendation:** Use `--no-sandbox` + `--disable-dev-shm-usage` Puppeteer launch flags, separate `String?` columns for transcript sections, and the `onUpdate` debounce pattern for TipTap (not controlled-component pattern).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TipTap rich-text editing | Browser / Client | — | Editor state lives in ProseMirror DOM; no server involvement during editing |
| Auto-populate structured prose | API / Backend | Browser | Server resolves narrative at GET time if no saved content; client may also compute client-side if all data is already fetched |
| Debounced auto-save | Browser / Client | API / Backend | Client owns debounce timer; triggers PATCH to server |
| Transcript status update | API / Backend | Browser | PATCH `/transcript` updates DB; client reflects new value |
| PDF rendering | API / Backend | — | Puppeteer runs server-side; client downloads blob |
| School branding settings | API / Backend | Browser | `SchoolSettings` singleton upsert; logo stored on disk under branding bind-mount |
| Logo file serving | API / Backend | — | Logo read from disk → served via `/api/settings/logo`; same JWT-guarded API pattern as document download |
| Section show/hide toggle | Browser / Client | API / Backend | UI toggle + PATCH saves `sectionVisibility` to `Transcript` |
| Records-updated banner | Browser / Client | API / Backend | Server sets `recordsUpdatedAt` on record mutations; client compares to `transcript.updatedAt` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `puppeteer` | 25.1.0 [WARNING: flagged SUS by legitimacy checker — reason: too-new release; well-established google/puppeteer package with 11M weekly downloads; verify before install] | Server-side headless Chrome PDF generation | Full bundle; downloads bundled Chrome; no separate Chrome install needed; locked D-01 |
| `@tiptap/react` | 3.26.1 [WARNING: flagged SUS by legitimacy checker — reason: too-new release; well-established ueberdosis/tiptap with 9.8M weekly downloads; verify before install] | React `useEditor` hook + `EditorContent` component | Headless; Radix/shadcn/Tailwind compatible; locked D-05 |
| `@tiptap/starter-kit` | 3.26.1 [WARNING: flagged SUS by legitimacy checker — reason: too-new release; same repo as above; verify before install] | All required extensions in one install (bold, italic, bulletList, orderedList, + more) | Single package covers all toolbar features; locked D-05 |

**Version verification:** All three packages verified against npm registry on 2026-06-14. [ASSUMED — registry existence confirmed, but "too-new" SUS flag from legitimacy checker; official GitHub repos confirmed as google/puppeteer and ueberdosis/tiptap]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `multer` (already installed) | ^2.1.1 | Multipart form handling for logo upload on Settings page | Reuse existing multer instance pattern from Phase 4 |
| `node:fs/promises` (built-in) | Node 22 | Read logo file to base64 for PDF injection | Already used in `document.ts`; no new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `puppeteer` (full bundle) | `puppeteer-core` + manual Chrome install | `puppeteer-core` requires Chrome already installed; on Windows Server with no internet access in prod, full bundle avoids ops config; locked D-01 |
| `@tiptap/starter-kit` | Individual TipTap extension packages | Starter-kit is simpler; no benefit to splitting unless removing unwanted extensions reduces bundle size materially (it doesn't for this use case) |
| Separate `String?` columns for transcript sections | `Json` column `sections: Json` | Separate columns: type-safe, partial PATCH easy, no Prisma.JsonValue casting. Json: one field, but requires Zod parse on read and `Prisma.InputJsonValue` on write. Separate columns win for this fixed-schema use case. |

**Installation (server):**
```bash
cd server
npm install puppeteer
```

**Installation (client):**
```bash
cd client
npx shadcn@latest add switch
npm install @tiptap/react @tiptap/starter-kit
```

---

## Package Legitimacy Audit

> All three new npm packages were run through the legitimacy seam on 2026-06-14.

| Package | Registry | Age (latest ver) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----------------|-------------|-------------|---------|-------------|
| `puppeteer` | npm | Published 2026-05-26 | 11,693,017 | github.com/puppeteer/puppeteer | SUS (too-new) | **Approved with checkpoint** — established Google-owned package; SUS flag is version freshness, not legitimacy concern |
| `@tiptap/react` | npm | Published 2026-06-11 | 9,872,817 | github.com/ueberdosis/tiptap | SUS (too-new) | **Approved with checkpoint** — established Tiptap GmbH package; MIT license |
| `@tiptap/starter-kit` | npm | Published 2026-06-11 | 10,646,601 | github.com/ueberdosis/tiptap | SUS (too-new) | **Approved with checkpoint** — same repo as @tiptap/react |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `puppeteer`, `@tiptap/react`, `@tiptap/starter-kit` — planner MUST add `checkpoint:human-verify` before each install task. All three have high download counts and known legitimate source repositories; "too-new" flag reflects version recency, not hallucination or slopsquatting risk.

**Postinstall scripts:**
- `puppeteer`: `node install.mjs` — downloads bundled Chromium. Expected and documented behaviour. No external network calls beyond Chrome download CDN. Production environment has no internet access — Chromium download must happen at build/deploy time, not at production runtime. **Planner must include a step to run `npm install` during deployment (offline cache or build step).**
- `@tiptap/react`, `@tiptap/starter-kit`: no postinstall scripts.

---

## Architecture Patterns

### System Architecture Diagram

```
CLIENT (Browser)
  TranscriptPage
  ├── GET /api/students/:id/transcript
  │     → Server: find Transcript record
  │         if no saved content → build auto-population prose from records
  │         return { sections, sectionVisibility, status, updatedAt, recordsUpdatedAt }
  ├── 6× TipTapEditor (useEditor per section)
  │     onUpdate → debounce 1500ms → PATCH /api/students/:id/transcript
  ├── Status Select → PATCH /api/students/:id/transcript { status }
  └── Export PDF button
        → POST /api/students/:id/transcript/export
              Server:
                1. Fetch Transcript + Student + SchoolSettings
                2. Read logo file → base64 data URI
                3. Build self-contained HTML string
                4. puppeteer.launch() → page.setContent(html) → page.pdf()
                5. browser.close()
                6. Pipe PDF Buffer → response (Content-Disposition: attachment)
              Client: fetch → blob → URL.createObjectURL → <a download>

SettingsPage (Admin)
  GET /api/settings → SchoolSettings singleton (upsert ID='singleton')
  PUT /api/settings (multipart if logo, JSON otherwise)
        Server: multer logo upload → save to ./uploads/branding/logo.{ext}
                upsert SchoolSettings where id='singleton'
  GET /api/settings/logo → pipe logo file to response
```

### Recommended Project Structure

```
server/src/
├── routes/
│   ├── transcript.ts         # GET/PATCH /:studentId/transcript, POST /:studentId/transcript/export
│   └── settings.ts           # GET/PUT /settings, GET /settings/logo
├── services/
│   ├── transcript.ts         # getOrInitTranscript, upsertTranscript, buildAutoPopulation
│   ├── pdfExport.ts          # generateTranscriptPdf (Puppeteer launch + html build)
│   └── settings.ts           # getSettings, upsertSettings
├── schemas/
│   ├── transcript.ts         # Zod: upsertTranscriptSchema, transcriptParamSchema
│   └── settings.ts           # Zod: settingsBodySchema

client/src/
├── pages/
│   ├── TranscriptPage.tsx    # /students/:id/transcript
│   └── SettingsPage.tsx      # /settings
├── components/
│   └── transcript/
│       ├── TranscriptSectionCard.tsx
│       ├── TipTapEditor.tsx
│       └── RecordsUpdatedBanner.tsx
```

### Pattern 1: Puppeteer PDF Generation

**What:** Launch headless Chromium, call `page.setContent(html)`, call `page.pdf()`, return `Buffer`.
**When to use:** Any server-side PDF export — avoid keeping browser instance alive between requests.

```typescript
// Source: pptr.dev/next/api/puppeteer.pdfoptions + github.com/puppeteer/puppeteer issue #12857 (SYSTEM account fix)
import puppeteer from 'puppeteer'

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',           // Required when running as Windows SYSTEM account (PM2 service)
      '--disable-dev-shm-usage', // Prevents /dev/shm issues on constrained servers
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
```

**Key insight:** Always `close()` in a `finally` block — leaked browser processes on Windows Server accumulate and will eventually crash the PM2 process.

### Pattern 2: TipTap `useEditor` with debounced save

**What:** Initialize editor once with initial content; read via `onUpdate`; never sync parent state back into editor on re-render.
**When to use:** All six `TranscriptSectionCard` instances.

```typescript
// Source: tiptap.dev/docs/guides/output-json-html + github.com/ueberdosis/tiptap issue #2403
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useRef } from 'react'

function TipTapEditor({ initialHtml, onSave }: { initialHtml: string; onSave: (html: string) => void }) {
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml,           // Only used at mount time — does NOT re-initialize on parent re-render
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onSave(editor.getHTML())    // Debounced 1500ms
      }, 1500)
    },
  })

  return <EditorContent editor={editor} />
}
```

**Critical anti-pattern:**
```typescript
// BAD — do NOT do this: re-syncing causes flicker and thrashing
useEffect(() => {
  if (editor && externalValue !== editor.getHTML()) {
    editor.commands.setContent(externalValue)  // ← triggers onUpdate → state → re-render loop
  }
}, [externalValue, editor])
```

### Pattern 3: Prisma SchoolSettings Singleton

**What:** Upsert by fixed string ID `'singleton'` — guarantees exactly one row.
**When to use:** Settings models with single-instance guarantee.

```typescript
// Source: [ASSUMED] — standard Prisma upsert singleton pattern
await prisma.schoolSettings.upsert({
  where: { id: 'singleton' },
  update: { schoolName, schoolAddress, letterheadHtml, logoPath },
  create: { id: 'singleton', schoolName, schoolAddress, letterheadHtml, logoPath },
})
```

### Pattern 4: Auto-Population Prose Builder

**What:** Server-side function that takes arrays of student records and returns HTML strings per section.
**When to use:** `GET /api/students/:id/transcript` when `Transcript` row does not exist or all section fields are null.

```typescript
// Source: [ASSUMED] — structured prose format from CONTEXT.md D-08
function buildAcademicsHtml(results: AcademicResult[]): string {
  if (results.length === 0) return ''
  const sentences = results.map(r => `Achieved ${r.grade} in ${r.subject} (${r.calendarYear}).`)
  return '<p>' + sentences.join(' ') + '</p>'
}

function buildActivitiesHtml(activities: Activity[]): string {
  if (activities.length === 0) return ''
  const sentences = activities.map(a => {
    const period = a.endYear
      ? `${a.startMonth}/${a.startYear}–${a.endMonth}/${a.endYear}`
      : `${a.startMonth}/${a.startYear}–present`
    return `${a.role} at ${a.organisation} (${period}).`
  })
  return '<p>' + sentences.join(' ') + '</p>'
}
// ... similar for awards, workExperience, careerGoals
```

**Decision: run auto-population server-side** at `GET /transcript` time. The server already owns all six record types; building prose server-side avoids shipping raw record arrays to the client just for text generation, and means the client gets ready-to-display HTML strings regardless of whether records are pre-fetched.

### Pattern 5: Logo Base64 Embedding for PDF

**What:** Read logo file from disk → convert to base64 data URI → inject into HTML template.
**When to use:** PDF export route — avoids Puppeteer needing filesystem access or HTTP fetch inside headless Chrome.

```typescript
// Source: [ASSUMED] — standard Node.js fs + base64 encoding
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function getLogoDataUri(logoPath: string): Promise<string | null> {
  if (!logoPath) return null
  try {
    const fullPath = path.join(UPLOAD_ROOT, 'branding', path.basename(logoPath))
    const buf = await readFile(fullPath)
    const ext = path.extname(logoPath).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null  // Logo missing → PDF exports without logo (graceful degradation)
  }
}
```

**Important:** Use `data:image/{type};base64,...` directly in the HTML `<img src="...">` tag. Do **not** use `headerTemplate` in `page.pdf()` for the logo — base64 images in `headerTemplate` have a known rendering bug (the `img/png` MIME separator may need to be escaped as `img//png`). Injecting logo into the main HTML body via `setContent()` is reliable. [LOW confidence — based on StackOverflow report, not official docs]

### Anti-Patterns to Avoid

- **Running Puppeteer without `--no-sandbox` on Windows Server SYSTEM account:** Browser will hang on PDF generation after M127 Chrome because sandbox permissions are not configured. Always include `--no-sandbox` when running as PM2 service under SYSTEM. [LOW confidence — based on github.com/puppeteer/puppeteer issue #12857]
- **TipTap controlled-component pattern:** Syncing editor content from React state on every `onUpdate` causes re-render loops. Use `content` prop only at initialization; read via `onUpdate` callback.
- **Keeping Puppeteer browser instance alive across requests:** A single-use PDF service that launches and closes per request is safer on Windows Server than a persistent browser pool (simpler error handling, no zombie processes).
- **Using Prisma `Json` column for transcript sections:** `Prisma.JsonValue` read type is a deep union that requires unsafe casting or Zod parse. Separate `String?` columns for the 6 section fields avoid this entirely.
- **External resources in PDF HTML template:** Puppeteer renders HTML with network access disabled or unreliable in production. All CSS must be inline `<style>` blocks; all images must be base64 data URIs. No `<link rel="stylesheet">`, no `@import url(...)`, no external font CDN references.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation from HTML | Custom wkhtmltopdf wrapper, jsPDF layout engine | `puppeteer` `page.pdf()` | wkhtmltopdf not maintained; jsPDF can't render CSS Grid/Flex; Puppeteer handles full Chrome rendering |
| Rich text editing | `<textarea>` with manual bold/italic string manipulation, Draft.js, Slate | `@tiptap/react` + `StarterKit` | TipTap is headless (no bundled CSS conflicts with Tailwind), Radix-compatible, and saves/loads HTML natively |
| Singleton DB row | Manual count-then-insert logic | Prisma `upsert` with fixed ID `'singleton'` | Atomic; handles concurrent requests safely |
| Base64 image encoding | npm `btoa` polyfill | `buf.toString('base64')` (Node built-in) | Node 22 `Buffer` has native base64; no extra dependency needed |
| Debounced save | Lodash `debounce` | Inline `useRef(setTimeout)` pattern | Project has no Lodash dependency; single-purpose inline debounce avoids new dep for trivial use case |

---

## Common Pitfalls

### Pitfall 1: Puppeteer hangs on Windows Server SYSTEM account

**What goes wrong:** `page.pdf()` call never resolves; Express request times out; PM2 restarts.
**Why it happens:** Since Chrome M127, the Chromium sandbox requires filesystem permissions on the Chrome cache directory. Running as SYSTEM account (as PM2 does when installed as a Windows service) means the sandbox can't set up correctly.
**How to avoid:** Always pass `args: ['--no-sandbox', '--disable-dev-shm-usage']` to `puppeteer.launch()`. [LOW confidence — from github.com/puppeteer/puppeteer issue #12857]
**Warning signs:** `page.pdf()` hangs indefinitely; no error thrown; Express timeout after 30s.

### Pitfall 2: Puppeteer Chromium not downloaded in no-internet production environment

**What goes wrong:** `puppeteer.launch()` throws `Could not find Chrome (ver. xxx)` in production.
**Why it happens:** `puppeteer`'s postinstall (`node install.mjs`) downloads Chrome for Testing from Google's CDN during `npm install`. If `npm install` is run offline (no internet in production), Chrome is not downloaded.
**How to avoid:** Run `npm install` as part of the **deployment step before the server goes offline**, or commit the `node_modules/.cache/puppeteer/chrome-*` directory to the deployment package. The DEPLOYMENT-RUNBOOK.md deploy step should explicitly note that `npm install --production` must be run **before** cutting network access. [LOW confidence — operational inference, not verified via docs]
**Warning signs:** Error at launch time mentioning `chrome-headless-shell` or a version string; `Could not find Chromium`.

### Pitfall 3: TipTap `content` prop does not re-initialize editor on prop change

**What goes wrong:** Navigating from one student's transcript to another (same route, different `:id`) leaves stale content in TipTap editors.
**Why it happens:** React component instance reuses the existing `useEditor` instance; the `content` prop is only read at mount time.
**How to avoid:** Add `key={studentId}` to `TranscriptPage` or `TipTapEditor` components — React will unmount/remount when `studentId` changes, forcing `useEditor` re-initialization. [MEDIUM confidence — cited from tiptap.dev/docs/guides/output-json-html and community issues]
**Warning signs:** TipTap shows previous student's text after navigating to a different student.

### Pitfall 4: Prisma `Json` null sentinel required for top-level null

**What goes wrong:** TypeScript error `Type 'null' is not assignable to type 'InputJsonValue'` when setting a Json field to `null`.
**Why it happens:** Prisma's `Json` write type is `InputJsonValue`, which does not accept plain JavaScript `null` at the top level — you must use `Prisma.JsonNull` or `Prisma.DbNull`.
**How to avoid:** Use separate `String?` columns for transcript sections (this project's recommended approach) — avoids Json entirely. If Json is used elsewhere, always use `Prisma.JsonNull` for null. [MEDIUM confidence — cited from prisma.io docs and github.com/prisma/prisma issue #9247]

### Pitfall 5: TipTap `onUpdate` callback stale closure

**What goes wrong:** `onUpdate` callback captures an old closure over `studentId` or `sectionName`, causing saves to write to the wrong section.
**Why it happens:** `useEditor`'s `onUpdate` option is set once at mount time; if the callback references mutable variables via closure, it captures the initial value.
**How to avoid:** Use a `useRef` to hold a mutable save function reference, then update the ref inside `useEffect`. Or pass `sectionName` as a stable prop and capture it in the debounce closure at mount time (it won't change for a given editor instance).

### Pitfall 6: External resources in Puppeteer HTML break in production

**What goes wrong:** PDF exports fine in development (where the server has internet access) but produces blank/broken sections in production.
**Why it happens:** The production server has no internet access. Any `<link>`, `<img src="https://...">`, or `@import url(...)` in the HTML template silently fails.
**How to avoid:** All CSS must be in `<style>` tags; all images must be base64 data URIs. Test PDF export with network disabled in dev to catch this early. [LOW confidence — operational inference based on project constraint]

### Pitfall 7: `recordsUpdatedAt` tracking requires touching `Transcript` on record mutations

**What goes wrong:** The "records updated" banner (D-10) never shows, even after adding new records.
**Why it happens:** `Transcript.recordsUpdatedAt` only updates if record CREATE/UPDATE/DELETE handlers also UPDATE the related `Transcript` row.
**How to avoid:** Add a `touchTranscriptRecordsUpdatedAt(prisma, studentId)` helper that runs `prisma.transcript.updateMany({ where: { studentId }, data: { recordsUpdatedAt: new Date() } })` inside each existing record service (academicResults, activities, etc.). This is a cross-cutting concern that must be added to all Phase 3 record services. [ASSUMED]

---

## Code Examples

### Verified TipTap Editor Component

```typescript
// Source: tiptap.dev/docs/guides/output-json-html [CITED]
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface TipTapEditorProps {
  initialHtml: string
  placeholder?: string
  onSave: (html: string) => void
  'aria-label': string
}

export function TipTapEditor({ initialHtml, placeholder, onSave, 'aria-label': ariaLabel }: TipTapEditorProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml || '',
    editorProps: {
      attributes: {
        class: 'prose text-base leading-relaxed min-h-[160px] p-4 focus:outline-none',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => onSave(editor.getHTML()), 1500)
    },
  })

  if (!editor) return null

  return (
    <div>
      {/* Toolbar */}
      <div role="toolbar" className="bg-muted/40 border-b px-2 py-1 flex gap-1">
        <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        {/* italic, bulletList, orderedList buttons follow same pattern */}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

### Puppeteer PDF Export Route

```typescript
// Source: pptr.dev/next/api/puppeteer.pdfoptions [CITED]
router.post('/export', async (req, res, next) => {
  const studentId = parseStudentId(...)
  if (!studentId) return

  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } })
    const transcript = await prisma.transcript.findUnique({ where: { studentId } })
    const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } })

    const logoDataUri = settings?.logoPath
      ? await getLogoDataUri(settings.logoPath)
      : null

    const html = buildTranscriptHtml({ student, transcript, settings, logoDataUri })

    const pdfBuffer = await generatePdf(html)

    const filename = `transcript-${student.fullName.replace(/\s+/g, '-')}.pdf`
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)

    await logAudit(prisma, { userId: req.user!.id, action: 'CREATE', model: 'PdfExport', recordId: studentId })
  } catch (err) {
    next(err)
  }
})
```

### Self-Contained HTML Template (No External Resources)

```typescript
// Source: [ASSUMED] — project constraint D-02/D-03 and pitfall 6 above
function buildTranscriptHtml({ student, transcript, settings, logoDataUri }: TranscriptHtmlParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    /* All CSS inline — no external stylesheet references */
    body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; margin: 0; }
    .letterhead { margin-bottom: 24px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 14pt; font-weight: bold; margin-bottom: 8px; }
    /* Inline prose styles to match TipTap output */
    p { margin: 0 0 8px; }
    ul, ol { margin: 0 0 8px; padding-left: 20px; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    /* Force background and color rendering in print */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div class="letterhead">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="School logo" style="height:60px; width:auto;">` : ''}
    ${settings?.letterheadHtml ?? ''}
  </div>
  <h1>${student.fullName} — Transcript</h1>
  ${transcript?.academicsVisible !== false ? `
    <div class="section">
      <div class="section-title">Academics</div>
      ${transcript?.academicsHtml ?? ''}
    </div>` : ''}
  <!-- ... other sections ... -->
</body>
</html>`
}
```

---

## Prisma Schema Design

### Recommended: `Transcript` model with separate `String?` columns

```prisma
// [ASSUMED] — field names per Claude's discretion; approach chosen over Json column
model Transcript {
  id               String           @id @default(uuid())
  studentId        String           @unique        // one transcript per student
  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  status           TranscriptStatus @default(NONE)

  // Six section HTML strings — null means "not yet saved" (triggers auto-population on GET)
  academicsHtml        String?
  activitiesHtml       String?
  awardsHtml           String?
  workExperienceHtml   String?
  careerGoalsHtml      String?
  staffEndorsementHtml String?

  // Section visibility (default all visible)
  academicsVisible        Boolean @default(true)
  activitiesVisible       Boolean @default(true)
  awardsVisible           Boolean @default(true)
  workExperienceVisible   Boolean @default(true)
  careerGoalsVisible      Boolean @default(true)
  staffEndorsementVisible Boolean @default(true)

  // Banner tracking (D-10): when any linked record was last mutated
  recordsUpdatedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([studentId])
  @@index([status])
}

model SchoolSettings {
  id             String   @id                   // always 'singleton'
  schoolName     String
  schoolAddress  String?
  letterheadHtml String?
  logoPath       String?  // relative path: 'branding/logo.png'
  updatedAt      DateTime @updatedAt
}
```

**Why separate Boolean visibility columns over a JSON `sectionVisibility` field:**
- 12 primitive columns (6 html + 6 visible) vs 1 Json field + 6 html fields
- Prisma Booleans are type-safe; no casting
- Partial PATCH straightforward: `{ where: { studentId }, data: { academicsVisible: false } }`
- Migration: `prisma migrate diff --from-schema-datasource --to-schema-datamodel` (same pattern as all prior phases per STATE.md)

**`Student.transcriptStatus` field already exists in schema.prisma:** The current `Student` model has `transcriptStatus TranscriptStatus @default(NONE)`. Per D-16, the actual authoritative status lives on `Transcript.status`. The planner should decide whether to:
  - Keep `Student.transcriptStatus` as a denormalized mirror (updated whenever `Transcript.status` changes) — NAV-02 queries can filter without a join; or
  - Remove it and update the existing student list query to JOIN `Transcript` for status.
  The current schema already uses `Student.transcriptStatus` for the existing list filter — keeping it as a mirror with a service-layer sync is the lowest-churn approach. [ASSUMED]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `headless: 'new'` | `headless: true` (default) | Puppeteer v22 (PR #11815) | `'new'` string option removed; `true` now means new headless Chrome |
| `headless: true` = old headless shell | `headless: true` = new headless Chrome | Puppeteer v22 | New headless has better CSS/font support; better PDF quality |
| TipTap v1 (`@tiptap/core` separate install) | TipTap v2+ (`@tiptap/react` + `@tiptap/starter-kit` covers both) | TipTap v2 | Simpler install; `useEditor` hook API stable |

**Deprecated/outdated:**
- `headless: 'new'` string option: removed in Puppeteer v22. Use `headless: true` (default).
- `puppeteer-core` with system Chrome: valid for environments with pre-installed Chrome, but this project uses the full bundle (D-01).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.3 |
| Config file | `server/vitest.config.ts` |
| Quick run command | `cd server && npx vitest run src/__tests__/transcript.test.ts` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRN-01 | GET /api/students/:id/transcript returns auto-populated HTML on first open | integration | `npx vitest run src/__tests__/transcript.test.ts` | ❌ Wave 0 |
| TRN-01 | PATCH /api/students/:id/transcript saves section HTML and preserves on subsequent GET | integration | same | ❌ Wave 0 |
| TRN-01 | Section visibility toggle saves to DB | integration | same | ❌ Wave 0 |
| TRN-02 | PATCH status=DRAFT and status=FINALISED succeed; PATCH without auth returns 401 | integration | same | ❌ Wave 0 |
| TRN-03 | POST /api/students/:id/transcript/export returns PDF Buffer with Content-Type application/pdf | integration | same | ❌ Wave 0 |
| TRN-03 | GET /api/settings returns singleton (or 404 if not set) | integration | `npx vitest run src/__tests__/settings.test.ts` | ❌ Wave 0 |
| TRN-03 | PUT /api/settings (Admin) upserts SchoolSettings | integration | same | ❌ Wave 0 |
| TRN-03 | PUT /api/settings (Staff) returns 403 | integration | same | ❌ Wave 0 |

**Note on PDF export testing:** `page.pdf()` returns a real binary PDF Buffer. Tests should verify: response status 200, `Content-Type: application/pdf`, and non-zero `Content-Length`. Tests should **not** attempt to parse or render the PDF — binary content verification is sufficient. Running Puppeteer in CI requires the bundled Chromium to be downloaded; the vitest config's `testTimeout: 15000` may need to increase to 30000ms for the export test to accommodate Puppeteer launch time. [ASSUMED]

### Sampling Rate

- **Per task commit:** `cd server && npx vitest run src/__tests__/transcript.test.ts`
- **Per wave merge:** `cd server && npm test`
- **Phase gate:** Full suite green (`npm test`) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `server/src/__tests__/transcript.test.ts` — covers TRN-01 and TRN-02
- [ ] `server/src/__tests__/settings.test.ts` — covers TRN-03 settings routes
- [ ] `server/src/__tests__/helpers/testDb.ts` — add `prisma.transcript.deleteMany()` and `prisma.schoolSettings.deleteMany()` to `clearDb()` (after `prisma generate` for new models)
- [ ] Vitest `testTimeout` may need increase to 30000ms for PDF export test (Puppeteer launch overhead)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT Bearer (existing `validateJwt` middleware on all `/api` routes) |
| V3 Session Management | no | Stateless JWT; no session |
| V4 Access Control | yes | `requireRole('ADMIN')` on `/api/settings` write routes; IDOR guard `transcript.studentId === studentId` |
| V5 Input Validation | yes | Zod schemas on all request bodies; transcript section HTML stored verbatim (no XSS risk — HTML is only rendered in Puppeteer PDF, never in the browser DOM without sanitisation) |
| V6 Cryptography | no | No new crypto; JWT signing uses existing HS256/RS256 setup |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on transcript (accessing another student's transcript) | Elevation of privilege | Service checks `transcript.studentId === studentId` before return/update; same IDOR guard pattern as Phase 3/4 |
| Letterhead HTML injection into PDF | Tampering | Admin-only write (D-14, `requireRole('ADMIN')`); HTML injected only into Puppeteer PDF, never rendered in browser DOM — no XSS risk in browser |
| PDF export of another student's transcript | Elevation of privilege | Same IDOR guard on export route; `studentId` from authenticated URL param |
| Chromium sandbox escape from malicious PDF HTML | Elevation of privilege | Letterhead HTML is Admin-authored only; no user-generated HTML is injected verbatim without trust boundary |
| Logo file path traversal | Information disclosure | Logo filename is always `logo.{ext}` (server-controlled); `storedPath` uses `path.basename()` before `path.join(UPLOAD_ROOT, 'branding', ...)` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server code | ✓ | v22.16.0 | — |
| npm | Package install | ✓ | 10.9.2 | — |
| puppeteer Chromium download | PDF export | ✗ (not yet installed) | — | Must be installed before deployment; no internet access in prod = must download at build time |
| PostgreSQL | Prisma | ✓ (Docker, per STATE.md) | — | — |
| `./data/uploads/branding/` dir | Logo storage | ✗ (not yet created) | — | `app.ts` startup dir-creation handles this (same pattern as Phase 4) |

**Missing dependencies with no fallback:**
- Puppeteer Chromium: must be downloaded during `npm install` — run install step before offline deployment

**Missing dependencies with fallback:**
- `./data/uploads/branding/` directory: created automatically by server startup code (pattern from Phase 4 document storage)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Auto-population prose should be built server-side at GET time | Architecture Patterns | If wrong: client must receive raw record arrays and build prose client-side — adds client logic, no correctness impact |
| A2 | `Student.transcriptStatus` should be kept as a denormalized mirror of `Transcript.status` | Prisma Schema Design | If wrong: NAV-02 query needs JOIN instead of simple `where` filter — minor query change, no functional impact |
| A3 | `touchTranscriptRecordsUpdatedAt` helper needed in all Phase 3 record services | Common Pitfalls | If wrong: D-10 banner never shows — correctness gap for new records added after first transcript open |
| A4 | Puppeteer `testTimeout` needs increase to 30000ms for export tests | Validation Architecture | If wrong: test suite times out on PDF export test — CI failure, not a production issue |
| A5 | Logo MIME type derived from file extension (not stored separately) | Code Examples | If wrong: MIME type wrong for data URI — broken image in PDF for unusual extensions |
| A6 | All six `Boolean` visibility columns default `true` (sections included by default) | Prisma Schema Design | If wrong: sections hidden by default — staff must explicitly enable each section, poor UX |

---

## Open Questions

1. **Should `Student.transcriptStatus` be removed and replaced with a `Transcript` join for NAV-02?**
   - What we know: `Student.transcriptStatus` exists and is used by the current student list query; `Transcript.status` will be the authoritative source
   - What's unclear: whether to keep the denormalized mirror (sync on every status change) or do a join at query time
   - Recommendation: Keep `Student.transcriptStatus` as a mirror, sync in `upsertTranscript` service — avoids changing the working NAV-02 query

2. **Puppeteer Chromium install in production (no internet access)**
   - What we know: Production server has no internet access (on-premise school network); `npm install` downloads Chrome during postinstall
   - What's unclear: Whether the deployment runbook already handles this, or if it needs a new step
   - Recommendation: Add an explicit note to DEPLOYMENT-RUNBOOK.md that `npm install --production` must be run on a machine with internet access before transferring to the production server

3. **PDF export timeout in Express**
   - What we know: Puppeteer launch + page.pdf() typically takes 2–5 seconds
   - What's unclear: Whether the Express default 30s timeout is sufficient for A4 PDFs with letterhead
   - Recommendation: Set no explicit timeout (30s default is sufficient for a simple A4 transcript), but add a `try/finally` with `browser.close()` to avoid hung processes

---

## Sources

### Primary (MEDIUM confidence)
- [pptr.dev/next/api/puppeteer.pdfoptions](https://pptr.dev/next/api/puppeteer.pdfoptions) — `page.pdf()` options: `format`, `printBackground`, `margin`, `headerTemplate`
- [tiptap.dev/docs/guides/output-json-html](https://tiptap.dev/docs/guides/output-json-html) — `editor.getHTML()`, `editor.commands.setContent()`, HTML as storage format
- [prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) — `Prisma.JsonValue` read type, `Prisma.InputJsonValue` write type, null sentinel requirement

### Secondary (LOW confidence)
- [github.com/puppeteer/puppeteer/issues/12857](https://github.com/puppeteer/puppeteer/issues/12857) — `--no-sandbox` required when running as Windows SYSTEM account
- [github.com/puppeteer/puppeteer/issues/12471](https://github.com/puppeteer/puppeteer/issues/12471) — PDF printing hang on Windows; `icacls` fix; M127 sandbox permissions
- [github.com/puppeteer/puppeteer/blob/main/docs/guides/headless-modes.md](https://github.com/puppeteer/puppeteer/blob/main/docs/guides/headless-modes.md) — `headless: true` = new headless Chrome (v22+); `'new'` string removed
- [github.com/ueberdosis/tiptap/issues/2403](https://github.com/ueberdosis/tiptap/issues/2403) — controlled-component anti-pattern confirmation; `useEventCallback` recommendation
- [stackoverflow.com/questions/75712860](https://stackoverflow.com/questions/75712860/base64-image-is-broken-when-trying-to-render-image-in-headertemplate-puppeteer) — base64 in `headerTemplate` has known bug; use body HTML instead

### Tertiary (LOW confidence — training knowledge, not verified this session)
- Auto-population prose builder pattern (A1) — `[ASSUMED]`
- `Student.transcriptStatus` mirror approach (A2) — `[ASSUMED]`
- `touchTranscriptRecordsUpdatedAt` cross-cutting pattern (A3) — `[ASSUMED]`

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — packages confirmed on npm registry; versions verified; SUS flags are freshness-based, not legitimacy concerns; official GitHub repos confirmed
- Architecture: MEDIUM — Puppeteer and TipTap patterns confirmed from official docs/issues; Prisma schema design confirmed from official docs
- Pitfalls: LOW/MEDIUM — Puppeteer Windows Server flags from GitHub issues (not official docs); TipTap controlled-component pitfall from community discussion

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable libraries; Puppeteer v25 current)
