---
phase: 05-transcript-assembly-export
plan: 03
subsystem: api
tags: [express, zod, multer, transcript, school-settings, vitest]

requires:
  - phase: 05-transcript-assembly-export
    provides: transcript/pdf/settings services from Plan 02
provides:
  - GET/PUT /api/students/:id/transcript with auto-populate, visibility, status, regenerate
  - POST /api/students/:id/transcript/export returning application/pdf
  - Admin-only GET/PUT /api/settings and GET /api/settings/logo
  - branding/ upload directory created on app startup
affects:
  - 05-transcript-assembly-export plan 04 (TranscriptPage client UI)
  - 05-transcript-assembly-export plan 05 (SettingsPage client UI)

tech-stack:
  added: []
  patterns: [nested transcript router with mergeParams, Admin-only settings router with multer logo upload, UPLOAD_ROOT via env constant in routes]

key-files:
  created:
    - server/src/schemas/transcript.ts
    - server/src/schemas/settings.ts
    - server/src/routes/transcript.ts
    - server/src/routes/settings.ts
  modified:
    - server/src/routes/students.ts
    - server/src/app.ts
    - server/src/__tests__/transcript.test.ts

key-decisions:
  - "UPLOAD_ROOT read from process.env in route files to avoid app.ts circular import with settings router"
  - "GET transcript maps transcript?.status ?? NONE and flattens getOrBuild result for client contract"
  - "Export audit uses transcript id when row exists, studentId as fallback when auto-populated only"

patterns-established:
  - "transcript router: assertStudentExists before GET/PUT/export; regenerate merges buildAutoPopulatedContent into upsert"
  - "settings router: requireRole(ADMIN) on entire router; logoUpload 5MB image/* filter"

requirements-completed: [TRN-01, TRN-02, TRN-03]

duration: 10min
completed: 2026-06-14
---

# Phase 5 Plan 03: Transcript & Settings API Routes Summary

**Nested transcript GET/PUT/export routes and Admin-only settings CRUD with logo serve — all 12 Phase 5 integration tests GREEN**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-14T07:38:00Z
- **Completed:** 2026-06-14T07:40:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Mounted transcript router at `/api/students/:studentId/transcript` with Zod-validated PUT, auto-populate GET, and PDF export POST
- Mounted Admin-only settings router at `/api/settings` with JSON and multipart PUT, logo streaming GET
- Created `branding/` directory on app startup for school logo storage
- All 8 transcript.test.ts and 4 settings.test.ts tests pass; full server suite 85/85 GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Transcript Zod schemas + router + students.ts mount** - `75b0d53` (feat)
2. **Task 2: Settings router + app.ts mount + branding directory** - `8ff6652` (feat)

## Files Created/Modified

- `server/src/schemas/transcript.ts` - upsertTranscriptSchema with partial strict fields and regenerate flag
- `server/src/routes/transcript.ts` - GET/PUT/POST export handlers with IDOR guard and audit on export
- `server/src/routes/students.ts` - nested transcript router mount after documents
- `server/src/schemas/settings.ts` - settingsBodySchema for schoolName/address/letterheadHtml
- `server/src/routes/settings.ts` - Admin-only GET/PUT/logo with multer image upload
- `server/src/app.ts` - branding mkdir and `/api/settings` mount
- `server/src/__tests__/transcript.test.ts` - fixed academic subject enums to valid PRESET_SUBJECTS values

## Decisions Made

- Used `process.env.UPLOAD_ROOT ?? 'uploads'` in route files instead of importing from `app.ts` to avoid circular dependency when mounting settings router
- Export handler logs audit with transcript row id when saved, studentId when only auto-populated content exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed invalid academic subject values in transcript.test.ts**
- **Found during:** Task 1 verification
- **Issue:** Test POST bodies used `Mathematics` and `English` which are not in PRESET_SUBJECTS enum — academic creates returned 400, auto-populate and records-banner tests failed
- **Fix:** Changed to `Mathematics (Compulsory)` and `English Language`
- **Files modified:** server/src/__tests__/transcript.test.ts
- **Verification:** npx vitest run transcript.test.ts — 8/8 pass
- **Committed in:** 75b0d53 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test fix required for valid seed data; route implementation unchanged.

## Issues Encountered

None beyond the test subject enum mismatch above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HTTP endpoints ready for TranscriptPage (Plan 04) and SettingsPage (Plan 05) client wiring
- Full server test suite green with no regressions

## Self-Check: PASSED

- FOUND: server/src/schemas/transcript.ts
- FOUND: server/src/routes/transcript.ts
- FOUND: server/src/schemas/settings.ts
- FOUND: server/src/routes/settings.ts
- FOUND: commit 75b0d53
- FOUND: commit 8ff6652

---
*Phase: 05-transcript-assembly-export*
*Completed: 2026-06-14*
