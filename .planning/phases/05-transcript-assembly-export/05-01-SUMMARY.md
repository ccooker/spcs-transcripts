---
phase: 05-transcript-assembly-export
plan: 01
subsystem: database
tags: [prisma, puppeteer, tiptap, vitest, transcript, school-settings]

requires:
  - phase: 04-document-management
    provides: Document upload patterns, test file structure, multer/file-I/O conventions
provides:
  - Transcript and SchoolSettings Prisma models (schema only; DB push in Plan 02)
  - puppeteer, @tiptap/react@3.26.1, @tiptap/starter-kit, shadcn Switch installed
  - PUPPETEER_CACHE_DIR in ecosystem.config.js
  - RED integration test stubs for transcript and settings APIs
affects:
  - 05-transcript-assembly-export plan 02 (prisma generate, db push, route implementation)

tech-stack:
  added: [puppeteer@25.1.0, @tiptap/react@3.26.1, @tiptap/starter-kit@3.26.1, shadcn switch]
  patterns: [schema-first Wave 0, RED integration stubs before routes, optional-chaining clearDb stubs]

key-files:
  created:
    - server/src/__tests__/transcript.test.ts
    - server/src/__tests__/settings.test.ts
    - client/src/components/ui/switch.tsx
  modified:
    - server/prisma/schema.prisma
    - ecosystem.config.js
    - server/package.json
    - client/package.json
    - server/src/__tests__/helpers/testDb.ts
    - server/src/__tests__/students.test.ts

key-decisions:
  - "Transcript status moved from Student.transcriptStatus to Transcript.status per D-16"
  - "Six section content columns use *Content suffix (not *Html) per plan field names"
  - "clearDb uses optional chaining on transcript/schoolSettings until Plan 02 prisma generate"

patterns-established:
  - "Wave 0 RED: vi.mock pdf service before imports in transcript.test.ts"
  - "testDb: delete transcript/schoolSettings first with @ts-expect-error + optional chaining"

requirements-completed: []

duration: 25min
completed: 2026-06-14
---

# Phase 5 Plan 01: Wave 0 Foundation Summary

**Transcript and SchoolSettings Prisma models, Puppeteer/TipTap packages, and 12 RED integration test stubs defining the Phase 5 API contract**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-14T07:22:00Z
- **Completed:** 2026-06-14T07:47:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added `Transcript` model (6 content + 6 visibility columns, status enum) and `SchoolSettings` singleton to schema; removed `Student.transcriptStatus`
- Installed `puppeteer`, `@tiptap/react@3.26.1`, `@tiptap/starter-kit@3.26.1`; added shadcn `Switch` component
- Configured `PUPPETEER_CACHE_DIR: 'C:/ProgramData/puppeteer'` in `ecosystem.config.js` for Windows PM2 SYSTEM account
- Created 8 transcript + 4 settings RED integration test stubs; updated `testDb.ts` and `students.test.ts` seeding

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema + npm installs + ecosystem.config.js** - `689ffdf` (feat)
2. **Task 2: RED test stubs** - `00cbb52` (test)

## Files Created/Modified

- `server/prisma/schema.prisma` - Transcript + SchoolSettings models; Student.transcript relation; transcriptStatus removed
- `ecosystem.config.js` - PUPPETEER_CACHE_DIR for Chromium cache on Windows service account
- `server/package.json` / `server/package-lock.json` - puppeteer dependency
- `client/package.json` / `client/package-lock.json` - TipTap packages
- `client/src/components/ui/switch.tsx` - shadcn Switch for section visibility toggles (Plan 03+)
- `server/src/__tests__/transcript.test.ts` - 8 RED stubs (TRN-01/02/03 + IDOR) with pdf mock
- `server/src/__tests__/settings.test.ts` - 4 RED stubs (Admin guard, GET, PUT upsert, logo)
- `server/src/__tests__/helpers/testDb.ts` - clearDb deletes transcript/schoolSettings first
- `server/src/__tests__/students.test.ts` - seeds Transcript record for nav-02 list filter test

## Decisions Made

- Kept `TranscriptStatus` enum (NONE/DRAFT/FINALISED) on `Transcript.status` only; API response field name `transcriptStatus` unchanged in list tests per backward-compat plan
- Used `adminToken()` via `BOOTSTRAP_ADMIN_EMAIL` pattern (not JWT roles claim) for settings tests — matches existing auth.test.ts bootstrap behavior
- Section field names use `*Content` suffix per plan (not `*Html` from RESEARCH.md draft)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Optional chaining on clearDb transcript/schoolSettings deleteMany**
- **Found during:** Task 2 (RED test verification)
- **Issue:** `(prisma as any).transcript.deleteMany()` throws at runtime because model not yet in generated Prisma client
- **Fix:** Changed to `(prisma as any).transcript?.deleteMany()` and `schoolSettings?.deleteMany()` — same pattern as Phase 03-02 RED phase
- **Files modified:** `server/src/__tests__/helpers/testDb.ts`
- **Verification:** clearDb no longer throws before DB connection; tests proceed to route-level failures
- **Committed in:** `00cbb52`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for RED test harness to run before Plan 02 `prisma generate`. No scope creep.

## Issues Encountered

- Docker Desktop not running during verification — vitest could not reach PostgreSQL at 127.0.0.1:5432. Test files compile and enumerate 8+4 test names; route-level 404 RED verification deferred to Plan 02 with DB available.
- `gsd-tools state advance-plan` failed — STATE.md lacks Current Plan / Total Plans in Phase fields expected by SDK; STATE and ROADMAP updated manually.

## User Setup Required

None - no external service configuration required. Ensure Docker PostgreSQL is running before executing Plan 02 integration tests.

## Next Phase Readiness

- Plan 02 can run `prisma db push` + `prisma generate` to activate typed client and remove `@ts-expect-error` stubs
- RED tests define GREEN targets for transcript routes (`GET/PUT /transcript`, `POST /export`) and settings routes (`GET/PUT /settings`, `GET /logo`)
- Puppeteer Chromium downloaded during `npm install`; production deploy must run install before offline cutover

## Self-Check: PASSED

- FOUND: .planning/phases/05-transcript-assembly-export/05-01-SUMMARY.md
- FOUND: server/src/__tests__/transcript.test.ts
- FOUND: server/src/__tests__/settings.test.ts
- FOUND: commit 689ffdf
- FOUND: commit 00cbb52

---
*Phase: 05-transcript-assembly-export*
*Completed: 2026-06-14*
