---
phase: 03-student-records-ui
plan: 03b
subsystem: server + client
tags: [prisma-migration, db-push, shadcn, career-goals, staff-notes, student-detail-page, D-14, D-16, D-17, D-19]
dependency_graph:
  requires: [03-03a, 03-02b]
  provides: [DB-schema-deployed, CareerGoalsSection, NotesSection, CareerInterestsChecklist, StudentDetailPage-complete]
  affects: [phase-04]
tech_stack:
  added:
    - shadcn/checkbox
    - shadcn/textarea
    - shadcn/tooltip
    - shadcn/scroll-area
  patterns:
    - versioned-create-no-update (CareerGoal — D-16)
    - append-only-textarea (NotesSection — D-17/D-19)
    - CareerInterest-enum-array (CareerInterest[] native PostgreSQL enum array)
    - checkpoint-human-verify (db push gated on human confirmation)
key_files:
  created:
    - server/prisma/migrations/20260612_add_records/migration.sql
    - client/src/components/records/CareerGoalsSection.tsx
    - client/src/components/records/NotesSection.tsx
    - client/src/components/records/CareerInterestsChecklist.tsx
    - client/src/components/ui/checkbox.tsx
    - client/src/components/ui/textarea.tsx
    - client/src/components/ui/tooltip.tsx
    - client/src/components/ui/scroll-area.tsx
  modified:
    - server/src/generated/prisma/ (all client files regenerated)
    - client/src/pages/StudentDetailPage.tsx
    - client/src/components/records/ActivitiesSection.tsx
    - client/src/components/records/AwardsSection.tsx
    - client/src/components/records/WorkExperienceSection.tsx
    - server/src/__tests__/records.test.ts
decisions:
  - Migration SQL generated via --from-empty --to-schema (no shadow DB in dev environment)
  - CareerInterest[] uses native PostgreSQL enum array (correct SQL: "CareerInterest"[])
  - db push is the authoritative apply step; migration.sql is documentation only
  - All 6 section types wired in StudentDetailPage in D-02 order (Academics → Activities → Awards → WorkExp → CareerGoals → Notes)
  - stu-04-ongoing-sort test had a copy-paste typo (schoolStudentId in activity POST body) — fixed as Rule 1 bug
metrics:
  duration: ~35 minutes total (Task 1 previous session + Tasks 2+3 continuation)
  completed: 2026-06-13
  tasks_completed: 3
  files_changed: 18
---

# Phase 03 Plan 03b: DB Push + Client Completion Slice Summary

**One-liner:** All 6 record tables deployed to PostgreSQL via db push; CareerGoalsSection (versioned POST-only) + NotesSection (append-only) + CareerInterestsChecklist built; StudentDetailPage completed with all 6 sections in D-02 order; all 62 integration tests GREEN.

## What Was Built

### Task 1 — Migration SQL + Prisma Client Regeneration (previous session, commit aaddca0)

- **`server/prisma/migrations/20260612_add_records/migration.sql`** — Incremental migration SQL documenting all 6 new tables and 2 new enums:
  - `AwardLevel` enum (SCHOOL | REGIONAL | STATE | NATIONAL | INTERNATIONAL)
  - `CareerInterest` enum (12 values: MEDICINE_HEALTH through UNDECIDED)
  - `AcademicResult`, `Activity`, `Award`, `WorkExperience`, `CareerGoal`, `StaffNote` tables — all with studentId FK CASCADE, correct indexes
  - `CareerGoal.interests CareerInterest[]` native PostgreSQL enum array
  - `CareerGoal` and `StaffNote` have `createdAt` only — no `updatedAt` (D-16/D-17 immutability signal)
- **`server/src/generated/prisma/`** — Prisma client regenerated with all new model types
- **DB push confirmed by user** — all 6 tables live in PostgreSQL

### Task 2 — shadcn installs + CareerGoalsSection + NotesSection + CareerInterestsChecklist + StudentDetailPage (commit 9a4be4e)

**shadcn components installed:**
- `client/src/components/ui/checkbox.tsx` — Radix Checkbox (D-14 touch targets)
- `client/src/components/ui/textarea.tsx` — consistent textarea styling
- `client/src/components/ui/tooltip.tsx` — available for future use
- `client/src/components/ui/scroll-area.tsx` — available for future use

**`client/src/components/records/CareerInterestsChecklist.tsx`** (NEW):
- Props: `value: string[], onChange: (v: string[]) => void`
- Exports `CAREER_INTEREST_LABELS: Record<string, string>` mapping all 12 enum keys to display labels
- Renders `<fieldset><legend className="sr-only">` + `grid grid-cols-1 md:grid-cols-2 gap-3`
- Each item: `min-h-[44px]` wrapper div (D-14), Checkbox + Label with `htmlFor` wiring
- Toggle logic: `onChange(checked ? [...value, key] : value.filter(v => v !== key))`

**`client/src/components/records/CareerGoalsSection.tsx`** (NEW):
- Props: `studentId: string`
- `useQuery` queryKey `['student', studentId, 'career-goals']` → GET `/students/:id/career-goals`
- `useMutation` POST-only — creates new version (no PATCH — D-16); on success: `invalidateQueries + toast.success('Career goals saved')`
- Current version: interest Badge chips (variant="secondary"), optional description, attribution line
- Version history: collapsible toggle Button with ChevronRight rotating 90deg; each history entry in `bg-muted/30 rounded p-3`
- Update dialog: CareerInterestsChecklist (controlled) + Textarea (`min-h-[120px]`, `{n}/500` counter) + Discard/Save footer
- Empty state: "No career goals recorded yet."

**`client/src/components/records/NotesSection.tsx`** (NEW):
- Props: `studentId: string`
- `useQuery` queryKey `['student', studentId, 'notes']` → GET `/students/:id/notes`
- `useMutation` POST; on success: `invalidateQueries + toast.success('Note added') + setNoteContent('')`
- Inline textarea (no dialog): Label + `<Textarea id="new-note" aria-describedby="note-char-count" min-h-[80px]>`
- `{noteContent.length}/500` char counter, Clear button (disabled when empty), Add note button (disabled when `!trim()`)
- Notes list: `<ul>` newest-first, each with `displayName · datetime` attribution, content `<p>`, `<Separator>` between items
- No edit/delete controls on note items (D-17)
- `hideAddButton={true}` on RecordSectionCard (textarea IS the add mechanism)

**`client/src/pages/StudentDetailPage.tsx`** (MODIFIED):
- Added imports: `CareerGoalsSection`, `NotesSection`
- Section order in `flex flex-col gap-8`: AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection → **CareerGoalsSection** → **NotesSection** (D-02)
- Removed the `{/* CareerGoals and Notes sections added in Plan 03-03b */}` comment placeholder

### Task 3 — Textarea upgrades + all tests GREEN (commit 3561eab)

**Description field upgrades** (shadcn `<Textarea>` replaces raw `<textarea>`):
- **`ActivitiesSection.tsx`** — added `import { Textarea } from '@/components/ui/textarea'`; replaced raw `<textarea>` (plain className) with `<Textarea placeholder="Brief description of involvement" maxLength={500} className="min-h-[80px]" />`
- **`AwardsSection.tsx`** — same replacement; placeholder "Brief description"
- **`WorkExperienceSection.tsx`** — same replacement; placeholder "Brief description of role and responsibilities"

**Test suite — all 62 tests GREEN:**
- `stu-03` through `stu-08` (records.test.ts, 32 tests): all pass
- `stu-01`, `stu-02` (students.test.ts, 22 tests): all pass
- auth, audit, requireRole (8 tests): all pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `Controller` import in CareerGoalsSection.tsx**
- **Found during:** Task 2 TypeScript compile
- **Issue:** `import { useForm, Controller } from 'react-hook-form'` — `Controller` never used (FormField render-prop pattern used instead)
- **Fix:** Removed `Controller` from the import
- **Files modified:** `client/src/components/records/CareerGoalsSection.tsx`
- **Commit:** 9a4be4e

**2. [Rule 1 - Bug] stu-04-ongoing-sort test: extra `schoolStudentId` field in activity POST body**
- **Found during:** Task 3 test run (`npm test`)
- **Issue:** Second activity POST sent `{ ...validActivityPayload, organisation: 'Ongoing Club', schoolStudentId: 'S2024103' }` — `schoolStudentId` is not an activity field; `createActivitySchema.strict()` rejects it with 400; only 1 activity created instead of 2; test expected `res.body.length` to be 2
- **Fix:** Removed `schoolStudentId: 'S2024103'` from the second activity POST — it was a copy-paste typo from `createTestStudent` helper
- **Files modified:** `server/src/__tests__/records.test.ts`
- **Commit:** 3561eab

**3. [Rule 3 - Blocking] PostgreSQL port not exposed to host for test run**
- **Found during:** Task 3 `npm test` (all tests failing with "Can't reach database server at 127.0.0.1:5432")
- **Issue:** `docker-compose.yml` does not expose PostgreSQL port 5432 to the host; test DATABASE_URL targets `127.0.0.1:5432`; also `server/.env` had password "password" but PostgreSQL uses "changeme"
- **Fix:** Created `docker-compose.override.yml` (ports: `5432:5432`); ran `docker compose up -d --no-deps postgres` (user-approved); corrected `server/.env` DATABASE_URL password to "changeme"; ran tests successfully
- **Files modified:** `docker-compose.override.yml` (temp, not committed); `server/.env` (not committed — gitignored)
- **Commit:** N/A (infrastructure-only changes not committed to source)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | aaddca0 | feat(03-03b): add migration SQL for 6 record tables + regenerate Prisma client |
| Task 2 | 9a4be4e | feat(03-03b): install shadcn components; add CareerGoalsSection, NotesSection, CareerInterestsChecklist |
| Task 3 | 3561eab | feat(03-03b): upgrade description Textareas; fix stu-04-ongoing-sort test; all 62 tests GREEN |

## Known Stubs

None — all 6 section components are fully wired to their respective API endpoints. Data flows from server → TanStack Query → component → display.

## Threat Flags

None — no new network endpoints introduced in this plan beyond those in the threat model. All client-side calls target `/api/students/:id/{career-goals,notes}` already defined in Plan 03-03a threat model.

## Self-Check: PASSED

- [x] `client/src/components/records/CareerGoalsSection.tsx` — FOUND
- [x] `client/src/components/records/NotesSection.tsx` — FOUND
- [x] `client/src/components/records/CareerInterestsChecklist.tsx` — FOUND
- [x] `client/src/components/ui/checkbox.tsx` — FOUND
- [x] `client/src/components/ui/textarea.tsx` — FOUND
- [x] `client/src/pages/StudentDetailPage.tsx` — contains CareerGoalsSection + NotesSection in D-02 order
- [x] `grep "Textarea" client/src/components/records/ActivitiesSection.tsx` → matches `ui/textarea`
- [x] `grep "Textarea" client/src/components/records/AwardsSection.tsx` → matches `ui/textarea`
- [x] `grep "Textarea" client/src/components/records/WorkExperienceSection.tsx` → matches `ui/textarea`
- [x] Commit aaddca0 — FOUND
- [x] Commit 9a4be4e — FOUND
- [x] Commit 3561eab — FOUND
- [x] `cd server && npm test` → 62/62 PASSED
- [x] `cd client && npx tsc --noEmit` → exit 0
