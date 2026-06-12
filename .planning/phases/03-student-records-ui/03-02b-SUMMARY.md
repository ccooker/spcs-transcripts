---
phase: 03-student-records-ui
plan: 02b
subsystem: client
tags: [react, tanstack-query, awards, work-experience, ui]
dependency_graph:
  requires: [03-01b]
  provides: [AwardsSection, WorkExperienceSection]
  affects: [StudentDetailPage]
tech_stack:
  added: []
  patterns: [useQuery/useMutation CRUD, RecordSectionCard, MonthYearPicker, RecordDeleteDialog]
key_files:
  created:
    - client/src/components/records/AwardsSection.tsx
    - client/src/components/records/WorkExperienceSection.tsx
  modified:
    - client/src/pages/StudentDetailPage.tsx
decisions:
  - "AwardLevel Badge mapping: SCHOOL=secondary, REGIONAL=outline, STATE/NATIONAL=default, INTERNATIONAL=default+font-semibold"
  - "WorkExperienceSection mirrors ActivitiesSection pattern exactly (employer/role replacing organisation/role)"
  - "Plain HTML textarea used for description fields — shadcn Textarea deferred to 03-03b per plan"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-13"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 03 Plan 02b: AwardsSection + WorkExperienceSection Summary

**One-liner:** Awards CRUD with AwardLevel Badge mapping and WorkExperience CRUD with period formatting + Ongoing checkbox, both wired into StudentDetailPage.

## What Was Built

### Task 1: AwardsSection + WorkExperienceSection components; add to StudentDetailPage

**Commit:** `26402a4`

**AwardsSection** (`client/src/components/records/AwardsSection.tsx`):
- Props: `studentId: string`
- Type `Award`: `{ id, title, issuer, awardMonth, awardYear, level: AwardLevel, description }`
- `useQuery` with `queryKey=['student', studentId, 'awards']`, fetching `/students/${studentId}/awards`
- Create (POST), update (PATCH), delete (DELETE) mutations with `invalidateQueries` on success
- `awardLevelBadge()` helper mapping all 5 AwardLevel values to Badge variant/className
- `RecordSectionCard`: title="Awards", emptyHeading="No awards yet."
- Table columns: Title, Issuer, Date (`formatMonthYear`), Level (Badge), Actions
- Dialog: Title + Issuer (Input), Award date (MonthYearPicker), Level (Select), Description (textarea)
- Toast copy: "Award added" / "Award updated" / "Entry deleted" / error messages per UI-SPEC

**WorkExperienceSection** (`client/src/components/records/WorkExperienceSection.tsx`):
- Props: `studentId: string`
- Type `WorkExperience`: `{ id, employer, role, description, startMonth, startYear, endMonth, endYear }`
- `useQuery` with `queryKey=['student', studentId, 'work-experience']`, fetching `/students/${studentId}/work-experience`
- Create/update/delete mutations identical to ActivitiesSection pattern
- `RecordSectionCard`: title="Work experience", emptyHeading="No work experience yet."
- Table columns: Employer, Role, Period (`formatPeriod`), Actions
- Dialog: Employer + Role (Input), Description (textarea), Start date (MonthYearPicker), End date (MonthYearPicker) + Ongoing checkbox
- Ongoing checkbox sets `endMonth`/`endYear` to `null` and disables End date picker

**StudentDetailPage** (`client/src/pages/StudentDetailPage.tsx`):
- Added imports for AwardsSection and WorkExperienceSection
- Section order in `flex flex-col gap-8` div: AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection (per D-02)
- Comment updated: `{/* CareerGoals and Notes sections added in Plan 03-03b */}`

## Verification

- `cd client && npx tsc --noEmit` → exit 0 ✓
- Section order in StudentDetailPage matches D-02 ✓
- `awardLevelBadge` maps all 5 AwardLevel values ✓
- INTERNATIONAL maps to `variant="default"` with `className="font-semibold"` ✓
- `formatPeriod` used in WorkExperienceSection Period column ✓
- Ongoing checkbox sets `endMonth`/`endYear` to `null` ✓
- `useQuery` queryKey contains `'awards'` / `'work-experience'` segments ✓

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints introduced in this plan (client-only slice). API calls target `/students/:id/awards` and `/students/:id/work-experience` already defined in Plan 03-02 server plan. No new trust boundaries introduced.

## Self-Check: PASSED

- `client/src/components/records/AwardsSection.tsx` — created ✓
- `client/src/components/records/WorkExperienceSection.tsx` — created ✓
- `client/src/pages/StudentDetailPage.tsx` — modified ✓
- Commit `26402a4` exists ✓
