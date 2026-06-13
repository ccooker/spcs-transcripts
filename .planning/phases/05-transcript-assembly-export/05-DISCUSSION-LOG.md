# Phase 5: Transcript Assembly & Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 5-transcript-assembly-export
**Areas discussed:** PDF generation approach, Transcript editing UX, Auto-population, School branding administration

---

## PDF Generation Approach

### PDF Engine

| Option | Description | Selected |
|--------|-------------|----------|
| Puppeteer (full bundle) | Headless Chromium; letterhead = CSS layout; logo = img; ~80–120 MB install | ✓ |
| pdfkit | Programmatic PDF construction; lightweight ~2 MB; manual coordinate drawing for branding | |
| @react-pdf/renderer | JSX → PDF via React components; ~15 MB; limited CSS support | |

**User's choice:** Puppeteer (full bundle)
**Notes:** Puppeteer chosen for full visual fidelity — CSS layout means letterhead and branding work exactly as designed; school network on-premise install so the extra Chromium bundle size is not a concern.

### Puppeteer Deployment Variant

| Option | Description | Selected |
|--------|-------------|----------|
| puppeteer (full) | Downloads Chromium automatically during npm install; zero extra setup on Windows Server | ✓ |
| puppeteer-core | Smaller install; requires Chrome/Edge present on server; path must be configured | |

**User's choice:** puppeteer full bundle
**Notes:** Simplicity preferred — ops team shouldn't need to install Chrome separately.

### HTML Template Source

| Option | Description | Selected |
|--------|-------------|----------|
| Server builds self-contained HTML string | Template literal/Handlebars; branding assets embedded as base64; no extra server required | ✓ |
| Puppeteer navigates to /transcript-print client route | Reuses React UI; requires Puppeteer to reach the server; fragile in on-premise setups | |

**User's choice:** Server builds self-contained HTML string
**Notes:** On-premise reliability — no dependency on the React dev/prod server being reachable from Puppeteer.

---

## Transcript Editing UX

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| Separate /students/:id/transcript page | Full-screen editing; clean separation from StudentDetailPage; "View Transcript" CTA | ✓ |
| Tab or collapsible panel on StudentDetailPage | Single URL; but page already long with 7 section cards | |

**User's choice:** Separate page

### Section Editor

| Option | Description | Selected |
|--------|-------------|----------|
| One textarea per section | Plain text; consistent with Phase 3 patterns | |
| Rich text editor (TipTap/Quill) per section | Bold, bullets, links; appropriate for professional documents | ✓ |

**User's choice:** Rich text editor
**Notes:** Transcripts are formal documents — rich text formatting (bullets, bold) is appropriate for professional output.

### Rich Text Library

| Option | Description | Selected |
|--------|-------------|----------|
| TipTap | Headless; Radix/shadcn/Tailwind compatible; ~50 kB core; bold/italic/bullet/numbered list | ✓ |
| Quill | Older, heavier; brings own CSS that may clash with Tailwind/shadcn | |
| Plain textarea fallback | Simpler; consistent with Phase 3 notes/goals pattern | |

**User's choice:** TipTap

### Transcript Sections

| Option | Description | Selected |
|--------|-------------|----------|
| All six fixed | Academics, Activities, Awards, Work Experience, Career Goals, Staff Endorsement | |
| Staff can show/hide individual sections per student | Per-transcript toggle; hidden sections omitted from PDF | ✓ |

**User's choice:** Per-student show/hide by staff (not global Admin setting)
**Notes:** Clarified as a per-transcript toggle (staff decides for each student), not a global Admin configuration. Admin-level section toggle deferred to v2.

---

## Auto-Population

### First-Open Behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Blank editor + collapsible reference panel | Staff write narrative; records visible for reference | |
| Pre-filled draft from stored records | Structured prose generated from records; staff edit/polish | ✓ |
| Blank editor only | Simplest; staff open StudentDetailPage separately | |

**User's choice:** Pre-filled structured prose
**Notes:** The core value prop is reducing staff effort — starting with a draft from records aligns with "no hunting through spreadsheets".

### Pre-fill Format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured prose list | One sentence per record; e.g. "Achieved A in Mathematics (2024)." | ✓ |
| Raw data dump | Table or bullet list; staff would need to rewrite entirely | |
| Single paragraph summary | More polished; harder to generate correctly without AI | |

**User's choice:** Structured prose list

### After Edit — Record Updates

| Option | Description | Selected |
|--------|-------------|----------|
| Keep edited narrative as-is | Staff own the narrative; no overwrite | |
| Show "Records updated" banner with regenerate option | Non-blocking; staff choose whether to regenerate | ✓ |
| Auto-regenerate (dangerous) | Overwrites staff edits automatically | |

**User's choice:** Show banner with explicit "Regenerate" action
**Notes:** Staff must confirm regeneration — it will overwrite their narrative. Dismiss option lets them ignore the banner and keep editing.

---

## School Branding Administration

### Branding Storage

| Option | Description | Selected |
|--------|-------------|----------|
| App settings page with upload | Admin UI at /settings; logo stored on disk; branding in DB | ✓ |
| Static file on server disk | Ops-style; Admin needs filesystem access; no DB model | |
| Env var path | Zero UI; requires server restart to change | |

**User's choice:** App settings page

### Letterhead Content

| Option | Description | Selected |
|--------|-------------|----------|
| Logo + school name + tagline/address | Text fields + image upload; rendered in PDF header | |
| Logo image only | Baked into the uploaded image; Admin updates image to change details | |
| Full HTML/CSS letterhead template | Admin pastes HTML/CSS; maximum flexibility | ✓ |

**User's choice:** Full HTML/CSS letterhead template
**Notes:** Pairs naturally with Puppeteer — the HTML letterhead is injected verbatim into the Puppeteer render template; Admin has full control over the exact layout.

### HTML Letterhead Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea in settings page | Admin pastes HTML/CSS; stored in DB as string; injected at export time | ✓ |
| File upload (.html file) | File stored on disk; Admin edits externally | |

**User's choice:** Textarea in settings page
**Notes:** Admin-only write access means no sanitisation concern; in-app editing is more convenient than external file management.

---

## Claude's Discretion

- Exact Prisma field names for `Transcript` and `SchoolSettings` models
- `Transcript` section storage — one JSON column vs. separate columns per section vs. child model
- Puppeteer launch flags for Windows Server headless mode
- TipTap extension selection (StarterKit + any extras needed)
- Exact PDF page size (A4) and margin values
- Auto-save behaviour (debounced vs. explicit Save button)
- PDF preview before download vs. immediate download trigger

## Deferred Ideas

- Global Admin toggle for transcript sections (deferred to v2)
- AI-generated narrative text (explicitly out of scope per REQUIREMENTS.md)
- Drag-and-drop section reordering (v2)
- PDF preview panel before download (v2 nice-to-have)
- Batch/cohort PDF export (v2 TRN-05)
- Transcript archive (v2 TRN-04)
- Peer review workflow (v2 TRN-06)
