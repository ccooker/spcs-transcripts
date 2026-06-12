---
phase: 03-student-records-ui
plan: 01b
subsystem: client
tags: [react, tanstack-query, ui, academics, activities, crud-dialog]
dependency_graph:
  requires:
    - 03-01 (AcademicResult + Activity server endpoints)
  provides:
    - QueryClientProvider wrapping App.tsx router tree
    - RecordSectionCard shared section wrapper
    - MonthYearPicker fieldset+2-Select component
    - RecordDeleteDialog AlertDialog confirm
    - periodFormat.ts (MONTH_NAMES, formatMonthYear, formatPeriod)
    - AcademicResultsSection (table + add/edit dialog) → /api/students/:id/academics
    - ActivitiesSection (table + add/edit dialog) → /api/students/:id/activities
    - StudentDetailPage placeholder replaced with section components
  affects:
    - client/src/App.tsx
    - client/src/pages/StudentDetailPage.tsx
tech_stack:
  added:
    - "@tanstack/react-query ^5"
    - "shadcn dialog component"
  patterns:
    - TanStack Query (useQuery + useMutation + invalidateQueries)
    - React Hook Form + zodResolver for dialog forms
    - RecordSectionCard shared wrapper pattern
    - Client-side Zod schema mirroring server schema
key_files:
  created:
    - client/src/lib/periodFormat.ts
    - client/src/components/records/RecordSectionCard.tsx
    - client/src/components/records/MonthYearPicker.tsx
    - client/src/components/records/RecordDeleteDialog.tsx
    - client/src/components/records/AcademicResultsSection.tsx
    - client/src/components/records/ActivitiesSection.tsx
    - client/src/components/ui/dialog.tsx
  modified:
    - client/src/App.tsx
    - client/src/pages/StudentDetailPage.tsx
    - client/package.json
decisions:
  - "Used native HTML textarea (styled) for Activity description — shadcn Textarea deferred to 03-03b"
  - "Used native HTML input[type=checkbox] for Ongoing/Present — shadcn Checkbox deferred to 03-03b"
  - "Installed shadcn Dialog component as Rule 3 fix (Dialog was not present from Phase 2 despite RESEARCH.md claim)"
  - "PRESET_SUBJECTS defined client-side as const array — not imported from server"
  - "QueryClient instantiated at module level in App.tsx (outside component) per TanStack recommendation"
metrics:
  duration: "~18 minutes"
  completed: "2026-06-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 3
---

# Phase 03 Plan 01b: Academics & Activities Client Slice Summary

**One-liner:** TanStack Query + QueryClientProvider; RecordSectionCard/MonthYearPicker/RecordDeleteDialog/periodFormat shared components; AcademicResultsSection + ActivitiesSection table+dialog CRUD wired to /api/students/:id/academics|activities.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install TanStack Query + shared UI components | `4069ae7` | periodFormat.ts, RecordSectionCard, MonthYearPicker, RecordDeleteDialog, App.tsx |
| 2 | AcademicResultsSection + ActivitiesSection; replace StudentDetailPage placeholder | `f348956` | AcademicResultsSection.tsx, ActivitiesSection.tsx, StudentDetailPage.tsx |

## What Was Built

### Task 1 — Shared Infrastructure

**`@tanstack/react-query` installed** (`^5.x`) in `client/package.json`.

**`client/src/App.tsx`** — `QueryClient` instantiated at module level; `QueryClientProvider` wraps the full router tree so all section components can use `useQuery`/`useMutation` without "No QueryClient set" errors.

**`client/src/lib/periodFormat.ts`** — `MONTH_NAMES` array, `formatMonthYear(month, year)`, `formatPeriod(startMonth, startYear, endMonth, endYear)` returning "Sep 2022 – Present" for null end dates.

**`RecordSectionCard`** — shared Card wrapper. Props: `title`, `count`, `addLabel`, `onAdd`, `isLoading`, `isError`, `onRetry`, `isEmpty`, `emptyHeading`, `emptyBody`, `children`, `hideAddButton`. Shows 3× `h-11` Skeleton rows while loading, destructive Alert on error with Retry button, centered empty-state block, or slot `children`. Add button is `variant="default"` with `Plus` icon.

**`MonthYearPicker`** — `<fieldset>` + `<legend>` with two side-by-side `w-24` Selects (month Jan–Dec, year rolling 10-year from current). Accepts `monthValue`/`yearValue` (number|null|undefined), `onMonthChange`/`onYearChange` callbacks, `required`, `disabled` props.

**`RecordDeleteDialog`** — minimal `AlertDialog`: title "Delete this entry?", description "This action cannot be undone.", cancel "Keep entry", confirm destructive "Delete" / "Deleting…". Props: `open`, `onOpenChange`, `onConfirm: () => Promise<void>`, `isDeleting`.

### Task 2 — Section Components

**`AcademicResultsSection`** — `useQuery` queryKey `['student', studentId, 'academics']` fetching `GET /api/students/:id/academics`. Three mutations (POST create, PATCH update, DELETE). Table columns: Subject, Grade, Year, Form, Notes (60-char truncate), Actions (ghost Pencil + Trash). Dialog: Subject Select from `PRESET_SUBJECTS` const, conditional "Subject name" Input when subject==='OTHER' (D-08), Grade Input, Calendar Year Select (current−10yr), Form Level Select, Notes Input. Client-side Zod schema with `.refine()` for Other validation mirrors server schema.

**`ActivitiesSection`** — `useQuery` queryKey `['student', studentId, 'activities']`. Table columns: Organisation, Role, Period (via `formatPeriod`), Actions. Dialog: Organisation/Role Inputs, description `<textarea>` (plain HTML styled, shadcn Textarea deferred), `MonthYearPicker` for start date, `MonthYearPicker` for end date + native `input[type=checkbox]` "Ongoing / Present" that sets `endMonth`/`endYear` to null and disables pickers.

**`StudentDetailPage.tsx`** — placeholder `<Card>` ("Student records will be available here") replaced with `<div className="flex flex-col gap-8">` containing `<AcademicResultsSection>` and `<ActivitiesSection>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing shadcn Dialog component**
- **Found during:** Task 2 — TypeScript error `Cannot find module '@/components/ui/dialog'`
- **Issue:** The plan and RESEARCH.md stated Dialog was "already installed" from Phase 2, but inspection showed it was absent from `client/src/components/ui/`
- **Fix:** Installed shadcn dialog via `npx shadcn@latest add dialog --yes`
- **Files modified:** `client/src/components/ui/dialog.tsx`, `client/package.json`
- **Commit:** `f348956`

**2. [Rule 2 - Missing component] Native checkbox for ActivitiesSection Ongoing**
- **Found during:** Task 2 — shadcn Checkbox (`@/components/ui/checkbox`) not installed (deferred to 03-03b per plan note)
- **Issue:** Plan note explicitly says `checkbox/textarea/tooltip/scroll-area` deferred to 03-03b; can't import from a non-existent component
- **Fix:** Used `<input type="checkbox">` with Tailwind styling; will be upgraded to shadcn Checkbox in 03-03b
- **Files modified:** `client/src/components/records/ActivitiesSection.tsx`

## Known Stubs

None. Both sections render empty states correctly when no data is returned; all mutations wire to live API endpoints. The sections will show loading skeletons until 03-01 server migration is applied.

## Threat Flags

None. All API calls use the existing `apiGet`/`apiPost`/`apiPatch`/`apiDelete` helpers which attach JWT bearer tokens automatically. No new trust boundaries introduced.

## Verification

- ✅ `cd client && npx tsc --noEmit` exits 0
- ✅ `client/package.json` contains `"@tanstack/react-query"`
- ✅ `client/src/App.tsx` contains `QueryClientProvider` and `QueryClient` at module level
- ✅ `client/src/lib/periodFormat.ts` exports `MONTH_NAMES`, `formatMonthYear`, `formatPeriod`
- ✅ `AcademicResultsSection.tsx` imports `useQuery`/`useMutation` from `@tanstack/react-query`; queryKey includes `'academics'`
- ✅ `ActivitiesSection.tsx` imports `MonthYearPicker`; uses `formatPeriod` in Period column; queryKey includes `'activities'`
- ✅ `StudentDetailPage.tsx` no longer contains "Student records will be available here"; imports `AcademicResultsSection` and `ActivitiesSection`

## Self-Check: PASSED

- All 7 new files exist on disk
- Both commits (`4069ae7`, `f348956`) present in git log
- TypeScript compiles cleanly
