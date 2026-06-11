# Project Research Summary

**Project:** SPCS Student Transcript System
**Domain:** School careers student transcript web app with on-premise infrastructure
**Researched:** 2026-06-11
**Confidence:** HIGH

## Executive Summary

The SPCS Student Transcript System is a staff-facing internal tool for a school Careers Team — not a SaaS platform, not a public product. Experts build this type of system as a conventional server-rendered web app with a narrow user base (3–8 staff), a well-understood data model (students, academic records, activities, documents), and one primary output artefact (a professional PDF). The recommended approach is Next.js 16 App Router deployed on-premise behind IIS, with Better Auth handling Microsoft Entra ID SSO, Prisma 7 + PostgreSQL for data, filesystem storage for PDF binaries, and `@react-pdf/renderer` for transcript export. This stack minimises operational complexity and licensing cost while satisfying the school's data residency requirements completely — no student data ever leaves the school network.

The most consequential architectural decision is treating PDF upload and extraction as an asynchronous pipeline, not a synchronous HTTP operation. Scanned document OCR can take 30–60 seconds; running it inline blocks the server and times out. A `pg-boss` queue (PostgreSQL-backed, no Redis needed) decouples upload acknowledgment from extraction processing and enables the mandatory staff review step before any extracted data enters a student record. The second major decision is using `@react-pdf/renderer` for transcript generation rather than Puppeteer/headless Chromium — this eliminates a 100MB+ Chromium dependency, reduces generation time to sub-500ms, and removes the browser lifecycle management problem from what is, at its core, a structured paginated document.

The top risks are: (1) Azure AD tenant consent not configured before go-live — school IT Global Administrators must explicitly grant admin consent in M365 EDU tenants where per-user consent is disabled by policy; (2) PDF extraction over-promise — extraction output from varied school document layouts will contain errors and must always go through a staff review step before being committed to any student record; and (3) on-premise deployment failure — the school's Windows Server / IIS environment is meaningfully different from a developer laptop, and a deployment runbook must be written and tested against equivalent infrastructure before the first production release.

---

## Key Findings

### Recommended Stack

The stack research surfaced three important choices that differ from what a developer might reach for by default. **Better Auth 1.6** (not NextAuth/Auth.js) is the correct choice for new projects: Auth.js v5 has been in beta since October 2023 and has still not shipped a stable release as of June 2026; the Auth.js team now maintains Better Auth, and the community recommendation is to start new projects there. **`@react-pdf/renderer` 4.5** (not Puppeteer) is the right tool for transcript PDF generation: transcripts are structured paginated documents, not HTML pages requiring pixel-perfect browser rendering; `@react-pdf/renderer` produces PDFs in under 500ms with a 3MB bundle versus Chromium's 100MB+ and 2–5 second generation time. **`unpdf` 1.6** (not `pdf-parse`) is the correct PDF parsing library: `pdf-parse` internally wraps `pdfjs-dist` with hidden browser globals that cause `window is not defined` errors in Next.js standalone production builds and is unmaintained; `unpdf` is its modern actively-maintained replacement.

The full stack runs on Node.js 22 LTS. Next.js 16 dropped support for Node 18; `unpdf` uses `Promise.withResolvers` which is Node 22 native. PostgreSQL is preferred over SQL Server for greenfield builds (no licensing cost, superior JSONB support for extracted data), though Prisma 7 supports SQL Server via `@prisma/adapter-mssql` if the school already has MSSQL infrastructure. Tailwind CSS 4 (no `tailwind.config.ts`, CSS-first configuration) is bundled with `create-next-app` for Next.js 16 and is a significant build speed improvement over v3.

**Core technologies:**
- **Next.js 16.2** (App Router): Full-stack framework — current stable (Oct 2025); Turbopack default; `output: 'standalone'` for self-hosted deployment; `proxy.ts` replaces `middleware.ts`
- **TypeScript 6 / React 19.2**: Type safety + UI — bundled with Next.js 16; React Compiler stable; required for reliability in student data systems
- **Node.js 22 LTS**: Server runtime — required by Next.js 16 (dropped Node 18); required by `unpdf` for native `Promise.withResolvers`
- **Better Auth 1.6** (Microsoft social provider): Authentication — replaces Auth.js; handles Entra ID OAuth 2.0 OIDC with built-in session database storage; single-tenant configuration
- **PostgreSQL 17 + Prisma 7.8** (`@prisma/adapter-pg`): Database + ORM — open-source; JSONB for extracted PDF data; Prisma 7 mandates driver adapters + ESM (`"type": "module"`)
- **`@react-pdf/renderer` 4.5**: Transcript PDF generation — no Chromium dependency; sub-500ms; Flexbox layout (Yoga engine); server-side only
- **`unpdf` 1.6** + **`@napi-rs/canvas`**: PDF text extraction — modern replacement for deprecated `pdf-parse`; works in Node.js without browser globals
- **`pg-boss`**: Background job queue — PostgreSQL-backed; no Redis required; handles async extraction pipeline
- **Tailwind CSS 4.3** + **shadcn/ui**: Styling + components — CSS-first config; `@theme` in `globals.css`; shadcn components are owned code (no version lock-in)
- **React Hook Form 7.78** + **Zod 4.4** + **@tanstack/react-table 8.21**: Forms, validation, data tables — standard stack for admin UIs of this type
- **pnpm 9**: Package manager — faster and disk-efficient; use `pnpm create next-app`

**What NOT to use:**
- `pdf-parse` — broken in Next.js standalone production builds; use `unpdf`
- Auth.js v5 / NextAuth — still in beta (v5.0.0-beta.31) as of June 2026; use Better Auth
- Puppeteer / Playwright for PDF generation — 100MB+ Chromium, 2–5s/doc; unjustified for structured document output
- Supabase / Neon / PlanetScale / any cloud database — data residency constraint
- Clerk / Auth0 / WorkOS — SaaS auth; student identity cannot leave the school network
- `jsPDF` / `react-to-print` — imperative canvas API / screenshot-based; not suitable for professional multi-page transcripts

---

### Expected Features

Feature research was corroborated against Parchment, Transcend, SchoolPoint, Rediker AdminPlus, Symplicity CSM, and comparable careers advisor tooling. The MVP is clearly bounded: the core value proposition is "a staff member opens a student record and produces a completed professional transcript PDF in a single session."

**Must have (table stakes) — v1:**
- **Microsoft Entra ID SSO** — gate feature; nothing else works without authentication; school is already on M365
- **Student profile CRUD** (name, year level, contact) — foundational entity; all records attach to this
- **Academic results entry** (subject, grade, year, notes) — core transcript content; must handle letter grades, percentages, pass/fail
- **Extracurricular activities** (org, role, dates, hours, description) — Common App data model; universities expect this
- **Awards and achievements** (title, issuer, date, level) — staff currently hunt through emails for these; level matters (school/regional/state/national)
- **Work experience entries** (employer, role, dates, description) — distinguishes serious applicants for employer and university transcripts
- **Career interests and goals** (structured areas + free-text) — Careers team's core purpose; personalises transcript narrative
- **Staff notes** (timestamped, attributed to entering staff member) — running log replacing paper notes
- **PDF upload per student** (multiple files: report cards, certificates, award letters) — evidence documents must be centralised with the record
- **Document listing, download, deletion, type tagging** — without tagging, documents become an unorganised pile; soft delete preferred
- **PDF data extraction** (digital-native text + scanned OCR pipeline) — key differentiator for reducing manual data entry pain; HIGH complexity
- **Side-by-side extraction review UI** — extracted data is suggestions only; staff must confirm before committing to record
- **Transcript template with fillable narrative sections** — staff-authored prose; template ensures consistency
- **Template auto-population from stored records** — eliminates copy-paste errors; must handle empty sections gracefully
- **PDF transcript export** with school branding (logo, header) — only acceptable format for universities and employers
- **Draft / finalised status flag** — staff need to know which transcripts are approved for sending
- **Student list** with search (name) and filter (year level, transcript status) — 200–600 students requires fast navigation
- **Role-based access** (Admin / Staff) — not all staff should delete records or manage templates
- **Immutable audit trail** (who changed what and when) — legal/governance requirement for student records; must be in schema from day one

**Should have (competitive) — v1.x after validation:**
- **Evidence linking** — attach specific uploaded PDFs as evidence for specific award/activity record entries
- **Transcript version archive** — store prior generated PDFs with date, generator, recipient type; immutable archived renders
- **Record completeness indicators** — flag students with sparse records before transcript season
- **Bulk / cohort transcript generation** — queue-based; zip download; validate at first ATAR season whether one-by-one is the actual bottleneck
- **Internal draft review workflow** — "send for review" flag for two-staff sign-off on sensitive transcripts

**Defer (v2+):**
- Multi-recipient transcript variants (university vs employer vs student copy) — build after single-template usage reveals actual differences needed
- SIS integration (SIMON, Compass) — defer until manual entry pain is confirmed and school IT is ready
- Reporting / analytics dashboards — filtered list is sufficient for 3–8 staff
- Custom template editor for non-developer staff
- Bulk student CSV import

**Anti-features to avoid:**
- Student self-service portal (doubles auth complexity, raises privacy governance requirements)
- AI-generated narrative text (liability for formal documents; staff must own tone and content)
- Email delivery from within the system (SMTP/API configuration adds scope with minimal benefit at this scale)
- Digital signature / QR verification codes (overkill for ~500 documents/year sent by known staff)

---

### Architecture Approach

The system is a conventional N-tier web app deployed entirely on-premise on a single Windows Server: IIS acts as reverse proxy (SSL termination, port 443 → localhost:3000), Next.js runs under PM2, PostgreSQL provides the database, and the local filesystem holds PDF binaries in a path outside the web root. Microsoft Entra ID is contacted for authentication only — no student data ever leaves the school network. The architecture decomposes into four main patterns: a Confidential Client MSAL flow (server-side OAuth 2.0 with HTTP-only encrypted session cookies — never localStorage); a Database-as-Truth / Filesystem-as-Storage pattern for PDFs (metadata and paths in PostgreSQL; binaries on disk via `/uploads/{studentId}/{uuid}.pdf`); an async queue-based extraction pipeline via `pg-boss`; and server-side transcript assembly via `@react-pdf/renderer`.

The data model segments student records into separate tables from the start (academic results, extracurriculars, awards, work experience, documents, notes) rather than a single wide student table — this enables granular access controls, retention policies, and clean extension without schema surgery later.

**Major components:**
1. **IIS Reverse Proxy** — SSL termination, port 443 → localhost:3000; requires URL Rewrite + ARR modules; must disable `Accept-Encoding` forwarding to prevent 500.52 compression errors
2. **Next.js App (App Router, SSR)** — serves all pages server-side; API routes for uploads and exports; Server Actions for data mutations; `proxy.ts` for session validation on every protected request
3. **Better Auth + Microsoft Entra ID** — OAuth 2.0 Authorization Code flow; single-tenant; sessions stored in PostgreSQL; HTTP-only Secure SameSite=Strict cookies; `openid`, `profile`, `email` scopes only
4. **Student + Records Module** — CRUD for all student data types; UUID public IDs; server-side auth on every data endpoint; immutable audit log table in schema
5. **PDF Upload Service** — validates by magic bytes (`%PDF` header); renames to UUID; writes outside web root; inserts DB row (status=`pending`); enqueues `pg-boss` job; returns 201 immediately
6. **PDF Extraction Pipeline** — `pg-boss` background worker; detects digital-native vs scanned; `unpdf` for text extraction; Tesseract.js for OCR on scanned pages; results stored as JSONB; status polled by UI
7. **Extraction Review UI** — side-by-side: source PDF viewer left, extracted fields right; explicit Accept/Edit per field; extracted data never auto-saves to student record
8. **Transcript Assembler + Export** — aggregates all student data in single batch query (no N+1); renders via `@react-pdf/renderer` React component; streams `application/pdf` buffer; serve only via authenticated route
9. **PostgreSQL + Prisma 7** — structured data + file metadata + Better Auth sessions + `pg-boss` queue tables; `prisma.config.ts` with `PrismaPg` adapter; ESM required
10. **File System** — PDF binaries at `/uploads/{studentId}/{uuid}.pdf` (or `D:\transcripts-uploads\` on Windows); never in web root; included in school backup schedule

---

### Critical Pitfalls

Research identified 9 critical pitfalls. The top 6 are listed with prevention strategies; all must be addressed proactively — none can be retrofitted:

1. **PDF Extraction Over-Promise** — School documents vary enormously; naive extractors produce garbled output on grid-layout report cards, and produce nothing on scanned certificates. *Prevention:* Build the review-and-confirm UI from day one. All extracted data is a suggestion, not authoritative. Fail gracefully to manual entry. Never auto-save extraction results. Detect digital-native vs scanned before attempting extraction.

2. **Azure AD Tenant Consent Block** — M365 EDU tenants disable per-user consent by policy; the Global Administrator must explicitly grant admin consent via `https://login.microsoftonline.com/{tenant-id}/adminconsent?client_id={app-id}` before any staff can log in. This step is frequently missed and causes go-live failure. *Prevention:* Document the admin consent URL as a mandatory deployment step in the runbook. Request only minimal permissions. Test against a trial M365 EDU tenant (not a personal Azure subscription — they have different consent policies).

3. **MSAL Token Lifecycle Mishandled** — Access tokens expire after ~60–75 minutes; skipping `acquireTokenSilent` first causes disruptive redirect loops that lose unsaved form data. Multiple `PublicClientApplication` instances cause cache corruption and `interaction_in_progress` errors. *Prevention:* Centralise token acquisition into a single module; one instance across the app lifecycle; always try silent first, then fall back to interactive on `InteractionRequiredAuthError`; test explicitly on Safari where iframe-based silent refresh fails.

4. **IDOR on Student Records** — Sequential integer PKs in URLs allow enumeration of all student records by incrementing the ID. The small staff user base creates false confidence that this is not a real exposure. *Prevention:* Use UUIDs as public-facing identifiers from schema design. Enforce server-side authorization on every data endpoint in the service layer, not just at the route level. Never expose integer DB PKs in URLs or API responses.

5. **No Immutable Audit Trail** — Without an append-only audit log, "who changed this?" cannot be answered — a legal/governance requirement for student records. Retrofitting requires re-examining every write path in the codebase. *Prevention:* Audit log table in the database schema from day one. Log every create/update/delete with: timestamp, actor (user ID + display name), record type, record ID, before/after snapshot. Application code must not be able to update or delete audit rows. Expose a read-only audit view in the admin section.

6. **On-Premise Deployment "Works On My Machine" Failure** — School Windows Servers are hardened, managed by IT, may have Group Policy restrictions, no internet access, and specific IIS ARR configuration requirements (disable `Accept-Encoding` forwarding; enable `preserveHostHeader`). *Prevention:* Write the deployment runbook before any feature work begins. Bundle all runtime dependencies — no `npm install` at deploy time. All file paths via environment variables. Provide a Docker-based alternative if IT prefers it. Test the runbook on equivalent Windows Server hardware before production release.

**Additional pitfalls to track:**
7. **PDF Upload Security** — Validate by magic bytes, not `Content-Type`; UUID-rename all files on disk; store outside web root; enforce 20MB size limit; serve via authenticated endpoint only
8. **Transcript PDF Page Break Failures** — Use `break-inside: avoid` (not deprecated `page-break-inside`); avoid `overflow: auto` on section containers; embed fonts as base64 data URIs; test with real production-length data (long extracurricular lists, many awards)
9. **Student Data in Cloud Services** — Audit every dependency for network calls; PDF extraction must use only on-premise libraries; configure error tracking to scrub PII from payloads; log only opaque record IDs

---

## Implications for Roadmap

Architecture research provides a clear build-order dependency graph. The system must be built bottom-up: each layer must be stable and testable before the layer above it is added. Seven phases map directly to the dependency chain.

### Phase 1: Infrastructure & Auth Foundation
**Rationale:** Nothing else works without authenticated context. Azure AD SSO is the gate for every feature. On-premise deployment configuration must be established before any feature is built, or deployment failure is discovered too late. IIS + PM2 + PostgreSQL + Better Auth must all be operational together as the foundation.
**Delivers:** Working login via Microsoft account; session management; route protection middleware; deployment runbook for school IT; admin consent workflow documented and tested; role-based access scaffolding (Admin / Staff)
**Features (FEATURES.md):** Microsoft Entra ID SSO, role-based access
**Pitfalls to avoid:** Azure AD tenant consent block (Pitfall 2), MSAL token lifecycle (Pitfall 3), on-premise deployment failure (Pitfall 8), data sent to cloud services (Pitfall 9)
**Research flag:** Needs planning research — Azure AD app registration, Better Auth Microsoft provider config, IIS ARR setup, Windows Server PM2 service setup

### Phase 2: Database Schema & Student CRUD
**Rationale:** The core data model must exist before any feature is built on top of it. Schema mistakes (monolithic student table, integer IDs, missing audit log, missing soft delete) are expensive to fix once data exists. This phase establishes all the structural decisions that downstream phases depend on.
**Delivers:** Complete Prisma schema (students, academic results, extracurriculars, awards, work experience, career goals, staff notes, documents, audit log, users); PostgreSQL migrations; student profile CRUD API; student list with search and pagination; UUID public IDs throughout; audit log on all writes
**Features (FEATURES.md):** Student profile CRUD, student list search/filter, cohort overview, staff notes, audit trail
**Pitfalls to avoid:** IDOR via sequential IDs (Pitfall 4), no immutable audit trail (Pitfall 5), monolithic student record table (technical debt), missing soft delete (technical debt)
**Research flag:** Standard patterns — well-documented; Prisma 7 schema design is straightforward

### Phase 3: Student Records UI
**Rationale:** With auth and the data model solid, staff can start entering data immediately. This phase validates the UI patterns and data model before the more complex PDF features are layered on top. Entry forms for all record types (academic results, extracurriculars, awards, work experience, career goals) are individually low-complexity but must collectively feel cohesive.
**Delivers:** Full CRUD UI for all student record types; student profile page with tabbed record sections; form validation (Zod + React Hook Form); TanStack Table for data listings; record completeness visibility (which sections have entries vs empty)
**Features (FEATURES.md):** Academic results, extracurriculars, awards, work experience, career goals, staff notes
**Stack (STACK.md):** shadcn/ui, React Hook Form, Zod, @tanstack/react-table, sonner toasts
**Pitfalls to avoid:** N+1 queries on record fetch (performance trap), no pagination on lists (performance trap)
**Research flag:** Standard patterns — CRUD UI is well-understood; no deep research needed

### Phase 4: PDF Upload & Document Management
**Rationale:** Document upload depends on the student entity and the filesystem storage pattern established in Phase 2. This phase introduces the PDF binary pipeline (upload → validate → store → queue), which Phase 5 (extraction) builds directly on top of. File security must be correct from the first upload.
**Delivers:** Multi-file PDF upload per student; magic-byte validation; UUID rename on disk; storage outside web root; authenticated file serving endpoint; document listing with type tagging; soft delete; upload directory environment variable configuration; `pg-boss` queue initialisation
**Features (FEATURES.md):** PDF upload, document listing/download/deletion, document type tagging
**Pitfalls to avoid:** PDF upload security failures (Pitfall 6), files in web root (security), synchronous extraction blocking HTTP (Pitfall 1 / architecture anti-pattern)
**Research flag:** Standard patterns for upload handling; `pg-boss` integration is straightforward

### Phase 5: PDF Extraction Pipeline
**Rationale:** Extraction is the highest-complexity feature in the system. It must be async (queue-based), handle two document types (digital-native and scanned), produce suggestions only, and have a mandatory staff review step. This phase cannot be simplified by skipping the review UI — that is the feature, not a nice-to-have.
**Delivers:** `pg-boss` background worker; `unpdf` text extraction for digital-native PDFs; Tesseract.js OCR for scanned documents; structured JSONB extraction output; extraction status polling endpoint; side-by-side extraction review UI (source PDF viewer + extracted fields + Accept/Edit per field); graceful fallback to manual entry on extraction failure
**Features (FEATURES.md):** PDF data extraction, extraction result review and editing, store original alongside extracted data
**Stack (STACK.md):** `unpdf`, `@napi-rs/canvas`, `pg-boss`
**Pitfalls to avoid:** PDF extraction over-promise (Pitfall 1), synchronous extraction (performance trap), extraction auto-save without review (UX pitfall), data sent to cloud OCR API (Pitfall 9)
**Research flag:** Needs planning research — Tesseract.js configuration on Windows Server, OCR accuracy expectations for school document types, side-by-side PDF viewer component options

### Phase 6: Transcript Assembly & PDF Export
**Rationale:** The capstone feature. Depends on all student data being present (Phases 2–5) and the auth layer (Phase 1). This phase assembles all structured data + staff-authored narrative into the `@react-pdf/renderer` template and exports a school-branded PDF. Page break behaviour and empty-section handling must be explicitly tested with real production-length data.
**Delivers:** Transcript template as `@react-pdf/renderer` React component; template with fillable narrative sections (staff-authored prose per data category); template auto-population from stored records; draft / finalised status flag; PDF export endpoint streaming `application/pdf`; school branding (logo + header via configuration); HTML preview before export; empty-section graceful handling
**Features (FEATURES.md):** Transcript template, template auto-population, draft/finalised status, PDF export, school branding
**Stack (STACK.md):** `@react-pdf/renderer` 4.5
**Pitfalls to avoid:** Transcript PDF page break failures (Pitfall 7), N+1 queries on assembly (aggregate all data in single batch query), PDF preview generating full PDF on every click (performance trap), transcript template locked in code (technical debt)
**Research flag:** Needs planning research — `@react-pdf/renderer` Flexbox layout patterns for multi-section transcript, font embedding as base64 data URIs, empty-section conditional rendering

### Phase 7: Polish, Hardening & Deployment Runbook
**Rationale:** The final pass before school use. Covers all the "looks done but isn't" checklist items from PITFALLS.md: session expiry handling, HTTPS with school-CA-signed certificate, IIS ARR configuration verification, backup integration for the uploads directory, audit log admin view, error handling with PII-scrubbed logging, and the deployment runbook tested end-to-end on equivalent Windows Server hardware.
**Delivers:** Graceful session expiry with re-authentication (no lost form data); HTTPS verified with school CA certificate; IIS ARR configuration documented and tested; uploads directory included in school backup schedule; read-only audit log view in admin section; error boundaries and toast notifications throughout; log scrubbing (no student PII in log statements); complete deployment runbook; PM2 Windows startup service configuration
**Pitfalls to avoid:** All "Looks Done But Isn't" checklist items from PITFALLS.md
**Research flag:** IIS ARR Windows Server configuration — standard patterns exist but school-specific config needs validation with school IT

---

### Phase Ordering Rationale

- **Auth first:** Every subsequent feature requires an authenticated session. Building anything else first produces code that must be refactored when auth is added.
- **Schema before UI:** Database schema mistakes (integer IDs, missing audit log, monolithic table) become expensive once data exists. The schema must be established and stable before UI features are built on it.
- **Records UI before PDF:** The records UI validates the data model and UI patterns with low complexity. Discovering schema issues at this stage is much cheaper than discovering them during the PDF extraction pipeline build.
- **Upload before extraction:** Extraction depends on the upload pipeline (filesystem storage, `pg-boss` queue). Building them together increases complexity and testing surface.
- **Extraction before transcript:** The transcript assembler's value depends on student records being populated — including via extraction. Staff need to see real extraction results working before the transcript feature is meaningful.
- **Transcript last (except polish):** The capstone feature. Requires all upstream data to be correct and complete. Any rework in earlier phases would contaminate the transcript template if built earlier.
- **Polish as dedicated phase:** Security hardening, deployment runbook, and error handling are not afterthoughts — they have their own pitfalls. A dedicated final phase ensures they receive the attention they require.

---

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1 (Auth + Infrastructure):** Azure AD Better Auth Microsoft provider configuration specifics; IIS ARR module setup for Next.js 16 `proxy.ts`; PM2 Windows service startup via NSSM; admin consent URL and M365 EDU tenant testing procedure
- **Phase 5 (PDF Extraction):** Tesseract.js configuration and language pack installation on Windows Server; OCR accuracy benchmarks on typical school document types (report card grids, certificate layouts); side-by-side PDF viewer component for the review UI (`react-pdf` viewer or iframe); extraction failure rate expectations to set staff expectations correctly
- **Phase 6 (Transcript Export):** `@react-pdf/renderer` Flexbox layout for multi-section transcript with conditional empty sections; school logo embedding as base64 data URI; font selection and embedding for professional output; page break behaviour with `@react-pdf/renderer`'s Yoga engine

**Phases with standard, well-documented patterns (skip deep research):**

- **Phase 2 (Schema + CRUD):** Prisma 7 schema design is thoroughly documented; UUID strategy and audit log patterns are well-established
- **Phase 3 (Records UI):** CRUD UI with shadcn/ui, React Hook Form, Zod, and TanStack Table is a standard pattern with extensive community examples
- **Phase 4 (PDF Upload):** File upload with `pg-boss` queue and filesystem storage is a standard Node.js pattern; `unpdf` documentation is clear

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology recommendations verified against primary sources (official docs, npm registry) as of 2026-06-11. Version compatibility matrix cross-checked. |
| Features | HIGH | Domain is well-understood; corroborated against 10+ comparable school records and careers advisor systems; anti-features derive from project constraints, not inference |
| Architecture | HIGH | Standard patterns (N-tier web app, filesystem storage, async queue, MSAL confidential client flow) are thoroughly documented; on-premise Windows Server deployment is well-understood |
| Pitfalls | HIGH (Azure AD, file security) / MEDIUM (PDF extraction accuracy, on-premise ops) | Azure AD pitfalls are from official Microsoft documentation; PDF extraction accuracy pitfalls are from practitioner accounts and empirical testing articles |

**Overall confidence:** HIGH

### Gaps to Address

- **PDF extraction accuracy on real school documents:** Research can document the approach and the review-UI requirement, but actual extraction accuracy for SPCS's specific document corpus (which schools supply report cards, what formats certificates take) can only be validated with real samples. *Handle during Phase 5 planning:* obtain 5–10 representative documents from the school and run extraction benchmarks before committing to heuristic vs ML-based structuring.

- **School IT environment specifics:** Windows Server version, existing SQL Server vs fresh PostgreSQL installation, IIS version, network proxy configuration, Group Policy restrictions — these vary by school and affect the deployment runbook. *Handle during Phase 1 planning:* initiate a discovery call with school IT before writing the runbook; document actual server configuration.

- **M365 EDU tenant consent policy:** Whether the school's EDU tenant has per-user consent disabled (likely) or allows it must be confirmed before auth phase begins. *Handle during Phase 1:* ask school IT to confirm consent policy and identify the Global Administrator who will perform admin consent before go-live.

- **Transcript template content and layout:** The specific sections, ordering, and formatting of the SPCS transcript are not defined in research. *Handle during Phase 6 planning:* obtain an existing SPCS transcript or brief from the Careers Team before designing the `@react-pdf/renderer` template.

---

## Sources

### Primary (HIGH confidence)
- npm registry (direct version queries, 2026-06-11) — all package versions
- Next.js 16 official blog (nextjs.org/blog/next-16) — framework features, standalone output, proxy.ts
- Better Auth docs (better-auth.com/docs) — Microsoft social provider, Auth.js deprecation, session management
- Auth.js migration notice (github.com/nextauthjs/next-auth/discussions/13252) — official Better Auth handover
- Prisma 7.0.0 release notes (prisma.io/docs) — driver adapter pattern, ESM requirement, prisma.config.ts
- shadcn/ui Tailwind v4 docs (ui.shadcn.com/docs/tailwind-v4) — CSS-first config, component updates
- Microsoft Learn — MSAL Node overview, admin consent, error codes (HIGH confidence — official source)
- OWASP File Upload Cheat Sheet — magic-byte validation, file storage security
- Microsoft Learn — MSAL error handling, redirect URI best practices, AADSTS error codes
- IIS reverse proxy pitfalls (techcommunity.microsoft.com) — ARR configuration, 500.52 errors

### Secondary (MEDIUM confidence)
- PkgPulse: unpdf vs pdf-parse vs pdfjs-dist 2026 — community analysis cross-checked with npm
- DEV Community — PDF Generation: Puppeteer vs @react-pdf/renderer (production comparison)
- Medium — Deploying Node.js in IIS with PM2 reverse proxy
- Travis Horn — Reverse-proxying Node.js apps on Windows with IIS
- Next.js file upload patterns (oneuptime.com/blog, cadence.withremote.ai) — verified against Next.js docs
- FPF EdTech Service Provider's Guide to Student Privacy (2025) — data residency and privacy governance
- PDF generation best practices (pdf4.dev) — page break CSS, font embedding
- "I Tested 12 Best-in-Class PDF Table Extraction Tools" (Medium) — empirical extraction accuracy data

### Tertiary (MEDIUM–LOW confidence)
- School software feature benchmarking (Parchment, Transcend, SchoolPoint, Rediker, Symplicity CSM, OpenEduCat, ampEducator, CoreCampus, Prentus, Evocos) — feature expectations cross-referenced across platforms; specific implementation details not verified
- PostgreSQL Wiki — BinaryFilesInDB (filesystem vs BYTEA tradeoffs) — foundational reference, not school-specific
- DocuWare System Architecture White Paper — N-tier document management reference model

---
*Research completed: 2026-06-11*
*Ready for roadmap: yes*
