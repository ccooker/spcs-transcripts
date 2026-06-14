# Milestones

## v1.0 MVP (Shipped: 2026-06-14)

**Phases completed:** 5 phases, 22 plans, 37 tasks

**Timeline:** 2026-06-11 → 2026-06-14 (4 days) | **Commits:** 150 | **Tests:** 85 integration tests passing

**Known deferred items at close:** 3 (see STATE.md Deferred Items)

### Known Gaps

- Phase 01 UAT Test 8 (Production HTTPS on Windows Server + IIS) — blocked pending certificate deployment
- Phase 03 UAT — 5 browser scenarios not executed (`/gsd-verify-work 3`)
- Phase 03 VERIFICATION — remains `human_needed` until Phase 3 UAT completes
- v1.0-MILESTONE-AUDIT.md stale (2026-06-12); re-run `/gsd-audit-milestone` recommended before v1.1 planning

**Key accomplishments:**

- Express 5 ESM server project with Prisma 7 (User+AuditLog schema, migration SQL) and 8-test RED suite declaring the auth contract for AUTH-01/AUTH-02/AUTH-03
- Vite 8 + React + MSAL PKCE client with shadcn/ui zinc theme, Inter font, and all 3 Phase 1 UI-SPEC screens.
- Express JWT auth stack with HS256 test / RS256 JWKS prod modes, user upsert via `resolveUser`, `requireRole` factory, and `logAudit` service — all 8 RED tests turned GREEN.
- MSAL acquireTokenSilent + Express /api/auth/me wired end-to-end; role-gated HomePage with loading skeleton and session-expired redirect completes the walking skeleton.
- PM2 ecosystem.config.js + IIS web.config (ARR API proxy + SPA fallback) + 389-line Windows Server deployment runbook covering PostgreSQL, IIS ARR, PM2 Windows service, HTTPS, and Entra ID app registration
- End-to-end create-student flow: Prisma Student model, POST /api/students with audit log, and /students/new form inside AppShell
- Student detail vertical slice: GET/PATCH/DELETE/restore API with soft-archive audit trail, and detail page with edit mode and type-name archive confirmation
- Server-paginated GET /api/students with search/filter/sort and TanStack data table at /students with cohort group headers and admin archived toggle
- AcademicResult + Activity Prisma models (schema only), full CRUD backend (Zod, services with IDOR guard + audit, nested Express routes), and RED integration tests for STU-03/STU-04.
- TanStack Query + QueryClientProvider; RecordSectionCard/MonthYearPicker/RecordDeleteDialog/periodFormat shared components; AcademicResultsSection + ActivitiesSection table+dialog CRUD wired to /api/students/:id/academics|activities.
- Award + WorkExperience Prisma models (schema only), full CRUD backend (Zod schemas with AwardLevel enum + month/year fields, services with IDOR guard + audit, nested Express routes), and RED integration tests for STU-05/STU-06.
- Awards CRUD with AwardLevel Badge mapping and WorkExperience CRUD with period formatting + Ongoing checkbox, both wired into StudentDetailPage.
- CareerGoal (versioned POST-only, D-16) and StaffNote (append-only POST-only, D-17) full server backend with RED integration tests for stu-07 and stu-08.
- All 6 record tables deployed to PostgreSQL via db push; CareerGoalsSection (versioned POST-only) + NotesSection (append-only) + CareerInterestsChecklist built; StudentDetailPage completed with all 6 sections in D-02 order; all 62 integration tests GREEN.
- multer memoryStorage + PDF magic bytes validation + Document Prisma model + full REST API (POST/GET/download/soft-delete) with 11 RED integration test stubs
- prisma db push applied DocumentType enum + Document table to PostgreSQL; prisma generate gave full TypeScript types; all 11 doc- integration tests turned GREEN (73 total passing)
- React DocumentsSection with XHR upload+progress, fetch+blob download, and delete AlertDialog wired as 7th section in StudentDetailPage.
- Transcript and SchoolSettings Prisma models, Puppeteer/TipTap packages, and 12 RED integration test stubs defining the Phase 5 API contract
- Transcript auto-population service, Puppeteer PDF wrapper, SchoolSettings singleton, and listStudents Transcript JOIN after live schema push
- Nested transcript GET/PUT/export routes and Admin-only settings CRUD with logo serve — all 12 Phase 5 integration tests GREEN
- TipTap transcript editor with debounced PUT auto-save, status select, PDF export, and View transcript navigation wired to Plan 03 API
- Admin branding settings at /settings with XHR logo upload, authenticated blob preview, and role-gated AppShell nav completing TRN-03 client slice

---
