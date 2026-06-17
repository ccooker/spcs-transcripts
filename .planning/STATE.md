---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Network Document Linking
status: planning
last_updated: "2026-06-16"
last_activity: 2026-06-16
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-16)

**Core value:** A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session — no hunting through spreadsheets, emails, or paper.
**Current milestone:** v2.0 Network Document Linking
**Current focus:** Phase 6 — Share Reconnaissance & Path Configuration

## Current Status

- Roadmap: v2.0 phases 6–11 defined
- Active phase: Phase 6 — Share Reconnaissance & Path Configuration (ready to plan)
- Last action: Milestone v2.0 requirements and roadmap approved

## Phase History

| Phase | Plan | Summary | Completed |
|-------|------|---------|-----------|
| 01-infrastructure-auth | 01 (server-scaffold) | Express 5 ESM server, Prisma 7 schema+migration, 8 RED tests | 2026-06-11 |
| 01-infrastructure-auth | 02 (client-scaffold) | Vite 8 + React + MSAL PKCE client, shadcn/zinc theme, Login/Home/Unauthorized pages | 2026-06-11 |
| 01-infrastructure-auth | 03 (auth) | Express JWT auth stack (HS256 test/RS256 JWKS), resolveUser upsert, requireRole, logAudit, GET /api/auth/me — all 8 tests GREEN | 2026-06-11 |
| 01-infrastructure-auth | 04 (wire) | MSAL acquireTokenSilent apiFetch client, App.tsx /api/auth/me integration, role-gated HomePage with loading skeleton | 2026-06-11 |
| 01-infrastructure-auth | 05 (deploy) | PM2 ecosystem.config.js + IIS web.config (ARR proxy + SPA fallback) + 389-line DEPLOYMENT-RUNBOOK.md; Tasks 1+2 committed; Task 3 awaiting checkpoint:human-verify | 2026-06-11 |
| 02-student-profiles-search | 01 (create) | Student Prisma model, POST /api/students, /students/new form, AppShell — stu-01 tests GREEN | 2026-06-12 |
| 02-student-profiles-search | 02 (detail) | GET/PATCH/DELETE/restore API, StudentDetailPage, ArchiveStudentDialog — stu-02 tests GREEN | 2026-06-12 |
| 02-student-profiles-search | 03 (list) | GET /api/students list API, StudentsListPage, cohort headers — nav-01/02/03 tests GREEN | 2026-06-12 |
| 03-student-records-ui | 01 (server-academics-activities) | AcademicResult + Activity Prisma models, Zod schemas, IDOR-guarded services, nested routes mounted in students.ts, RED tests for STU-03+STU-04 | 2026-06-13 |
| 03-student-records-ui | 01b (client-academics-activities) | TanStack Query + QueryClientProvider; RecordSectionCard/MonthYearPicker/RecordDeleteDialog/periodFormat; AcademicResultsSection + ActivitiesSection; StudentDetailPage placeholder replaced | 2026-06-13 |
| 03-student-records-ui | 02 (server-awards-workexperience) | Award + WorkExperience Prisma models, Zod schemas, IDOR-guarded services, nested routes mounted in students.ts, RED tests for STU-05+STU-06 | 2026-06-13 |
| 03-student-records-ui | 02b (client-awards-workexperience) | AwardsSection (AwardLevel Badge: SCHOOL=secondary/REGIONAL=outline/STATE,NATIONAL,INTERNATIONAL=default) + WorkExperienceSection (formatPeriod, Ongoing checkbox), both added to StudentDetailPage | 2026-06-13 |

|| 03-student-records-ui | 03a (server-careergoals-staffnotes) | CareerGoal + StaffNote Prisma models (no updatedAt, D-16/D-17), Zod schemas, list+create-only services, GET+POST-only routes mounted; RED tests stu-07+stu-08 | 2026-06-13 |
|| 03-student-records-ui | 03b (db-push+client-complete) | DB push (all 6 tables live in PostgreSQL); shadcn checkbox/textarea/tooltip/scroll-area installed; CareerGoalsSection (versioned POST-only, D-16) + NotesSection (append-only, D-17) + CareerInterestsChecklist (12-item grid, D-14); StudentDetailPage complete with all 6 sections in D-02 order; all 62 integration tests GREEN | 2026-06-13 |
|| 04-document-management | 01 (server-slice) | multer@2.1.1 + @types/multer@2.1.0; DocumentType enum + Document Prisma model; Zod schemas; document service (upload/list/soft-delete/download); documents router (POST/GET/download/DELETE) with MIME+magic bytes validation, MulterError handler; mounted in students.ts; app.ts startup dir creation; docker-compose bind mount; 11 RED test stubs | 2026-06-13 |
|| 04-document-management | 02 (db-push+tests) | prisma db push (DocumentType enum + Document table live in PostgreSQL); prisma generate (full typed client); @ts-ignore stubs removed; docker-compose.override.yml; all 11 document integration tests GREEN; full suite 73 passing | 2026-06-13 |
|| 04-document-management | 03 (client-ui) | shadcn progress installed; DocumentsSection.tsx (XHR upload, fetch+blob download, AlertDialog delete, DOCUMENT_TYPE_LABELS, 5-column table); DocumentsSection added as 7th section in StudentDetailPage; DOC-01 through DOC-04 fully wired end-to-end | 2026-06-13 |
|| 05-transcript-assembly-export | 01 (wave-0-foundation) | Transcript + SchoolSettings Prisma models; puppeteer/TipTap/shadcn Switch installed; PUPPETEER_CACHE_DIR; 8 transcript + 4 settings RED integration test stubs | 2026-06-14 |
|| 05-transcript-assembly-export | 02 (server-services) | prisma db push + generate; transcript/pdf/settings services; listStudents Transcript JOIN; 22 students tests GREEN | 2026-06-14 |
|| 05-transcript-assembly-export | 03 (api-routes) | transcript GET/PUT/export + settings GET/PUT/logo routes; branding dir; 12 transcript+settings tests GREEN; full suite 85 passing | 2026-06-14 |
|| 05-transcript-assembly-export | 04 (client-editor) | TranscriptPage with six TipTap sections, debounced PUT auto-save, status select, PDF export, RecordsUpdatedBanner; View transcript CTA + App route | 2026-06-14 |
|| 05-transcript-assembly-export | 05 (client-settings) | SettingsPage branding form, XHR logo upload, fetch+blob logo preview, Admin Settings nav, /settings route, Staff 403 redirect | 2026-06-14 |

---

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| PDF extraction deferred to v2 | v1 requirements do not include EXT-* items; manual entry + PDF upload/storage is the v1 scope | Roadmap |
| 5-phase structure | Standard granularity; phases derived from requirement categories with natural delivery boundaries | Roadmap |
| Phase 4 independent of Phase 3 | Document management depends on student entity (Phase 2), not on records UI (Phase 3) — can be built in parallel if needed | Roadmap |
| Prisma 7 requires prisma.config.ts for datasource URL | Breaking change from Prisma 6: url removed from schema.prisma datasource block; moved to prisma.config.ts with defineConfig | 01-01 |
| Prisma 7 requires @prisma/adapter-pg for PrismaClient | PrismaClient no longer reads DATABASE_URL env var; requires explicit driver adapter (PrismaPg) | 01-01 |
| Migration SQL generated via prisma migrate diff | No PostgreSQL/Docker available in dev; used --from-empty --to-schema to generate SQL without live DB | 01-01 |
| Plan 03 auth middleware must use HS256 when NODE_ENV=test | TEST_JWT_SECRET env var activates HS256 validation in tests instead of JWKS (Assumption A4 from RESEARCH.md) | 01-01 |
| Both Azure issuer formats required in expressjwt() | Include both sts.windows.net (v1) and login.microsoftonline.com (v2) to prevent 401 for some users (Pitfall 1) | 01-03 |
| AuditLog.actingUserId requires existing User to exist first | FK constraint; test helper must create user before logAudit() call | 01-03 |
| index.ts placed at server/src/index.ts, not server/index.ts | Matches tsconfig rootDir:src and dev script `tsx watch src/index.ts` | 01-03 |
| shadcn v4 CLI requires manual component setup for Vite projects | Interactive prompts in v4 not fully suppressible; components.json, tailwind.config.js, and UI primitives created directly matching v3 format | 01-02 |
| MSAL v5.13.0 removed storeAuthStateInCookie | CacheOptions type in v5 only has cacheLocation; omitted property; sessionStorage cache still enforced | 01-02 |
| API_SCOPE derived from VITE_CLIENT_ID env var | Prevents Pitfall 2 (wrong audience) — Graph tokens rejected by Express aud validation | 01-04 |
| UserInfo type exported from App.tsx | Avoids circular dependency; HomePage imports from @/App without a separate types file | 01-04 |
| Session-expired shows 3 s alert then loginRedirect | Gives user visual feedback before redirect; 401 and network errors both treated as session-expired | 01-04 |
| ecosystem.config.js at workspace root — __dirname resolves correctly for script path ./server/dist/index.js | Placed at workspace root (not server/) so relative script path is valid from PM2 cwd | 01-05 |
| PM2_HOME set to C:/ProgramData/pm2 machine-level — required for Windows service compatibility | User-profile PM2_HOME fails when running as Local Service account; machine-level path required (Pitfall 4) | 01-05 |
| DATABASE_URL uses 127.0.0.1 not localhost in ecosystem.config.js | Prevents IPv6 resolution issues on Windows Server (Pitfall 6) | 01-05 |

### Todos

(none yet)

### Blockers

(none yet)

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-06-14:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 01 — 01-UAT.md (partial; Test 8 Production HTTPS blocked — no certificate) | partial |
| uat_gap | Phase 03 — 03-UAT.md (5 pending browser scenarios) | testing |
| verification_gap | Phase 03 — 03-VERIFICATION.md (human_needed pending UAT) | human_needed |

---
*State initialised: 2026-06-11*
*Last updated: 2026-06-16 after milestone v2.0 started*

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 02-student-profiles-search P01 | 28min | 3 tasks | 31 files |
| Phase 02-student-profiles-search P02 | 22min | 3 tasks | 7 files |
| Phase 02-student-profiles-search P03 | 25min | 3 tasks | 9 files |
| Phase 03-student-records-ui P01 | 18min | 2 tasks | 10 files |
| Phase 03-student-records-ui P01b | 18min | 2 tasks | 10 files |
| Phase 03-student-records-ui P02 | 15min | 2 tasks | 10 files |
| Phase 03-student-records-ui P02b | 8min | 1 task | 3 files |
| Phase 05-transcript-assembly-export P01 | 25min | 2 tasks | 11 files |
| Phase 05-transcript-assembly-export P02 | 18min | 2 tasks | 16 files |
| Phase 05-transcript-assembly-export P03 | 10min | 2 tasks | 7 files |
| Phase 05-transcript-assembly-export P04 | 15min | 2 tasks | 7 files |
| Phase 05-transcript-assembly-export P05 | 12min | 2 tasks | 3 files |

## Decisions

- [Phase 02-01]: Student Prisma schema in RED test commit for testDb FK order — prisma.student.deleteMany requires generated client before route 404 RED
- [Phase 02-01]: Manual shadcn UI primitives when CLI overwrite prompt blocked install — npx shadcn add hung on existing button.tsx
- [Phase 02-02]: Manual alert-dialog when shadcn CLI blocked — @radix-ui/react-alert-dialog pre-installed; matches plan 01 pattern
- [Phase 02-02]: PATCH returns 409 on archived students — GET :id still returns archived records for admin detail view
- [Phase 02-02]: StudentForm edit mode keeps schoolStudentId read-only — updateStudentSchema omits ID from PATCH body
- [Phase 02-03]: Badge variants on list table follow 02-UI-SPEC matching StudentDetailPage
- [Phase 02-03]: Cohort header counts from current page data only per RESEARCH A1
- [Phase 02-03]: Default list sort formLevel asc with secondary fullName asc for cohort grouping
- [Phase 03-01]: mergeParams params typed as Record<string,string> — Express 5 strict param inference doesn't propagate parent :studentId into child router; bracket access with cast resolves TS7053
- [Phase 03-01]: updateAcademicResultSchema built manually (not .partial()) — partial update with undefined subject must not require subjectOther; conditional refine guards on subject !== undefined
- [Phase 03-01b]: shadcn Dialog was absent from Phase 2 install — installed in 03-01b as Rule 3 blocking fix
- [Phase 03-01b]: Native HTML checkbox used for ActivitiesSection Ongoing flag — shadcn Checkbox deferred to 03-03b
- [Phase 03-01b]: PRESET_SUBJECTS defined client-side as const array mirroring server Zod schema — not shared import
- [Phase 03-02]: clearDb() uses (prisma as any)?.deleteMany() stubs in Task 1 RED phase so test setup doesn't throw before prisma generate; replaced with typed calls after Task 2
- [Phase 03-02]: updateAwardSchema and updateWorkExperienceSchema are explicit partial .strict() objects (not .partial() on create schema) — consistent with updateActivitySchema pattern from 03-01

| Phase 03-student-records-ui P03a | 15min | 2 tasks | 10 files |
| Phase 03-student-records-ui P03b | ~35min | 3 tasks | 18 files |

- [Phase 03-03a]: CareerGoal and StaffNote models have no updatedAt field -- immutability signal for maintainers (D-16/D-17)
- [Phase 03-03a]: Route omission (no PATCH/DELETE on careerGoals/notes routers) is the enforcement mechanism for D-16 and D-17
- [Phase 03-03a]: @ts-expect-error stubs used for staffNote/careerGoal in Task 1 testDb (models not yet in client); replaced with real calls after prisma generate
- [Phase 03-03b]: stu-04-ongoing-sort test had schoolStudentId in activity POST body (copy-paste typo); strict schema rejected it; fixed by removing the extra field
- [Phase 03-03b]: PostgreSQL port not exposed to host by default; docker-compose.override.yml + server/.env password fix needed for local test run (user approved)
- [Phase 03-03b]: CareerInterestsChecklist uses fieldset+legend for accessibility; 12 items, min-h-[44px] per row (D-14)
- [Phase 04-01]: @ts-ignore used for DocumentType import and prisma.document.* calls until prisma generate runs in plan 04-02
- [Phase 04-01]: RFC 5987 filename*=UTF-8'' Content-Disposition encoding chosen for non-ASCII HK school filenames
- [Phase 04-01]: multer.memoryStorage() chosen to enable magic bytes validation from req.file.buffer before disk write
- [Phase 04-01]: storedPath stored relative to UPLOAD_ROOT (not absolute) to survive container remounts

| Phase 04-document-management P01 | ~15min | 3 tasks | 10 files |

- [Phase 04-02]: docker-compose.override.yml created to expose postgres:5432 to host for prisma db push
- [Phase 04-02]: doc-01-idor uses fake UUID non-existent student ID to trigger 404 IDOR guard
- [Phase 04-02]: doc-04-all-types creates unique student per type tag to avoid schoolStudentId uniqueness conflicts

| Phase 04-document-management P02 | ~10min | 2 tasks | 8 files |

- [Phase 04-03]: Download uses fetch+blob+anchor (not window.open) — all /api/students routes require JWT Bearer token
- [Phase 04-03]: AlertDialog inlined in DocumentsSection per UI-SPEC — delete copy differs from Phase 3 RecordDeleteDialog
- [Phase 04-03]: Date formatted via toLocaleDateString (en-GB) — date-fns not in project dependencies

| Phase 04-document-management P03 | ~15min | 2 tasks | 5 files |

- [Phase 05-01]: Transcript status on Transcript model not Student per D-16; Student.transcriptStatus field and index removed from schema
- [Phase 05-01]: Section columns use *Content suffix per plan (academicsContent etc.) not *Html from research draft
- [Phase 05-01]: clearDb uses optional chaining on transcript/schoolSettings deleteMany until Plan 02 prisma generate
- [Phase 05-01]: adminToken for settings tests uses BOOTSTRAP_ADMIN_EMAIL pattern not JWT roles claim

| Phase 05-transcript-assembly-export P01 | 25min | 2 tasks | 11 files |
| Phase 05-transcript-assembly-export P02 | 18min | 2 tasks | 16 files |

- [Phase 05-02]: listStudents filters NONE via transcript is null; DRAFT/FINALISED via transcript.status join
- [Phase 05-02]: createStudent/getStudentById return transcriptStatus NONE for backward compat after column removal
- [Phase 05-02]: buildAutoPopulatedContent uses year-only formatPeriod (YYYY–present) for activities and work experience
- [Phase 05-03]: UPLOAD_ROOT read from process.env in route files avoids app.ts circular import with settings router
- [Phase 05-03]: GET transcript maps transcript?.status ?? NONE when no saved Transcript row exists
- [Phase 05-03]: transcript.test.ts academic seed subjects must use PRESET_SUBJECTS enum values
- [Phase 05-04]: apiFetch PUT (not PATCH) for all transcript saves per Plan 03 upsert endpoint
- [Phase 05-04]: TipTap editorKey remount on load/regenerate avoids controlled content re-sync anti-pattern
- [Phase 05-04]: Status select maps NONE to DRAFT display; first status PUT persists Transcript row
- [Phase 05-05]: Logo multipart upload uses XMLHttpRequest PUT — apiFetch Content-Type override breaks multipart boundary
- [Phase 05-05]: Logo preview uses fetch+blob+createObjectURL — img src cannot attach Bearer Authorization header
- [Phase 05-05]: JSON-only settings save uses apiFetch PUT when no new logo file selected

## Current Position

Phase: 6 of 11 (Share Reconnaissance & Path Configuration)
Plan: —
Status: Ready to plan
Last activity: 2026-06-16 — v2.0 roadmap created (Phases 6–11)

## v2.0 Context

### Decisions

- v1 Phase 4 (DOC-01..04 upload model) superseded by v2.0 network share linking — do not build dual storage
- Phase 6 is human-first: share layout documented and admin path verified before any discovery code runs
- Admin can configure share root path (SHR-04) and test connectivity (SHR-05) before discovery
- Phase 11 (EV-*) depends on v1 Phase 3 record entry types (awards, activities, work experience)
- Phase 9 matching depends on v1 Phase 2 Student rows with `schoolStudentId`

### Blockers/Concerns

- Share folder layout unknown until Phase 6 on-site reconnaissance with careers staff
- School IT must provision read-only AD service account before Phase 7 go-live

## Session Continuity

Last session: 2026-06-16
Stopped at: v2.0 roadmap created — ready for `/gsd-plan-phase 6`
Resume file: None
