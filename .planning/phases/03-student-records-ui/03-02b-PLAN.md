---
phase: 03-student-records-ui
plan: 02b
type: execute
wave: 2
depends_on:
  - 03-01b
files_modified:
  - client/src/components/records/AwardsSection.tsx
  - client/src/components/records/WorkExperienceSection.tsx
  - client/src/pages/StudentDetailPage.tsx
autonomous: true
requirements:
  - STU-05
  - STU-06

must_haves:
  truths:
    - "AwardsSection rendered in StudentDetailPage below ActivitiesSection; shows award level Badge per UI-SPEC color tokens"
    - "WorkExperienceSection rendered below AwardsSection; formatPeriod used for period column"
    - "Empty states display correct copy: 'No awards yet.' / 'No work experience yet.'"
  artifacts:
    - path: "client/src/components/records/AwardsSection.tsx"
      provides: "Table+Dialog CRUD UI for awards; AwardLevel Badge display; MonthYearPicker for award date"
      exports: ["AwardsSection"]
    - path: "client/src/components/records/WorkExperienceSection.tsx"
      provides: "Table+Dialog CRUD UI for work experience; MonthYearPicker + Ongoing checkbox; period formatting"
      exports: ["WorkExperienceSection"]
  key_links:
    - from: "client/src/components/records/AwardsSection.tsx"
      to: "/api/students/:id/awards"
      via: "useQuery({ queryKey: ['student', studentId, 'awards'] })"
      pattern: "useQuery.*awards"
    - from: "client/src/components/records/WorkExperienceSection.tsx"
      to: "/api/students/:id/work-experience"
      via: "useQuery({ queryKey: ['student', studentId, 'work-experience'] })"
      pattern: "useQuery.*work-experience"
---

## Phase Goal

**As a** careers staff member, **I want to** enter and manage all six types of student record data from within a single student profile page, **so that** I can build a complete student profile without navigating away.

<objective>
Awards & Work Experience client slice: build AwardsSection and WorkExperienceSection components (mirroring AcademicResultsSection and ActivitiesSection patterns from Plan 03-01b) and add both to StudentDetailPage. Runs in Wave 2 in parallel with Plan 03-02 (server backend).

Purpose: Delivers the client half of awards and work experience. Client compiles and renders correctly even before the server tables are pushed — API calls return loading states gracefully until Plan 03-03b completes the DB push.

Output: AwardsSection (with AwardLevel Badge mapping), WorkExperienceSection (with period formatting + Ongoing checkbox), both added to StudentDetailPage.
</objective>

<execution_context>
@C:/@code/spcs-transcripts/.cursor/gsd-core/workflows/execute-plan.md
@C:/@code/spcs-transcripts/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-student-records-ui/03-CONTEXT.md
@.planning/phases/03-student-records-ui/03-RESEARCH.md
@.planning/phases/03-student-records-ui/03-UI-SPEC.md
@.planning/phases/03-student-records-ui/03-PATTERNS.md
@.planning/phases/03-student-records-ui/03-01b-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: AwardsSection + WorkExperienceSection components; add to StudentDetailPage</name>
  <files>
    client/src/components/records/AwardsSection.tsx
    client/src/components/records/WorkExperienceSection.tsx
    client/src/pages/StudentDetailPage.tsx
  </files>
  <read_first>
    - client/src/components/records/AcademicResultsSection.tsx — full file from Plan 03-01b; this is the exact analog to replicate for AwardsSection (same useQuery/useMutation structure, same Dialog/Form pattern, same table+actions layout)
    - client/src/components/records/ActivitiesSection.tsx — full file from Plan 03-01b; WorkExperienceSection is structurally identical (employer/role instead of organisation/role, same MonthYearPicker + ongoing pattern)
    - client/src/components/records/MonthYearPicker.tsx — import and usage pattern
    - client/src/lib/periodFormat.ts — formatPeriod usage for WorkExperience period column
    - client/src/pages/StudentDetailPage.tsx — current state from Plan 03-01b (has AcademicResultsSection + ActivitiesSection in flex-col gap-8 div); add AwardsSection + WorkExperienceSection after ActivitiesSection
    - .planning/phases/03-student-records-ui/03-UI-SPEC.md — Section 3 (Awards columns/dialog/award level badge variants), Section 4 (Work Experience columns/dialog), Copywriting Contract (award/work experience dialog titles, toast copy, empty state copy)
  </read_first>
  <action>
    client/src/components/records/AwardsSection.tsx (NEW): Props: studentId:string. Type Award: { id:string, title:string, issuer:string, awardMonth:number, awardYear:number, level:'SCHOOL'|'REGIONAL'|'STATE'|'NATIONAL'|'INTERNATIONAL', description:string|null }. useQuery queryKey=['student',studentId,'awards'], queryFn=apiGet('/students/${studentId}/awards'). useMutation for create (POST), update (PATCH), delete (DELETE) with invalidateQueries on success. Toasts per 03-UI-SPEC Copywriting: 'Award added', 'Award updated', 'Entry deleted', error: "Couldn't save changes. Please try again." / "Couldn't delete entry. Please try again.".

    RecordSectionCard: title="Awards", count={data.length}, addLabel="Add award", emptyHeading="No awards yet.", emptyBody="Add awards and achievements to recognise this student's accomplishments.". Table columns: Title, Issuer, Date (formatMonthYear(awardMonth, awardYear)), Level (Badge), Actions (Pencil + Trash ghost icon buttons).

    Award Level Badge mapping (per 03-UI-SPEC color table): SCHOOL → Badge variant="secondary"; REGIONAL → Badge variant="outline"; STATE → Badge variant="default"; NATIONAL → Badge variant="default"; INTERNATIONAL → Badge variant="default" with className containing font-semibold. Helper function awardLevelBadge(level): returns {variant, className?} object.

    Dialog title: "Add award" / "Edit award". Form fields per 03-UI-SPEC Section 3: Title (Input required), Issuer (Input required), Award month/year (MonthYearPicker label="Award date" required), Level (Select required options: School/Regional/State/National/International), Description (use a basic <textarea> styled with className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Brief description" maxLength=500 — shadcn Textarea is installed in Plan 03-03b and will replace this). Dialog footer: "Discard" + submit "Add award"/"Save award", isPending?"Saving…". RecordDeleteDialog for delete confirmation.

    client/src/components/records/WorkExperienceSection.tsx (NEW): Structurally identical to ActivitiesSection. Props: studentId:string. Type WorkExperience: { id:string, employer:string, role:string, description:string|null, startMonth:number, startYear:number, endMonth:number|null, endYear:number|null }. useQuery queryKey=['student',studentId,'work-experience']. RecordSectionCard: title="Work experience", addLabel="Add work experience", emptyHeading="No work experience yet.", emptyBody="Add work experience entries to document this student's employment history.". Table columns: Employer, Role, Period (formatPeriod), Actions. Dialog: Employer (Input required), Role (Input required), Description (basic <textarea> with same styling as AwardsSection — will be upgraded to shadcn Textarea in Plan 03-03b), Start date (MonthYearPicker required), End date (MonthYearPicker) + Ongoing/Present Checkbox. On Ongoing checked: set endMonth/endYear null, disable end MonthYearPicker. Dialog footer: "Discard" + "Add work experience"/"Save work experience".

    client/src/pages/StudentDetailPage.tsx: In the flex flex-col gap-8 div, add AwardsSection and WorkExperienceSection after ActivitiesSection:
    <AwardsSection studentId={student.id} />
    <WorkExperienceSection studentId={student.id} />
    {/* CareerGoals and Notes sections added in Plan 03-03b */}
    Add imports for AwardsSection and WorkExperienceSection.
  </action>
  <acceptance_criteria>
    - client/src/components/records/AwardsSection.tsx: awardLevelBadge function maps INTERNATIONAL to variant="default" with font-semibold class; useQuery queryKey contains 'awards' segment
    - client/src/components/records/WorkExperienceSection.tsx: uses formatPeriod for Period column; Ongoing Checkbox sets endMonth and endYear to null; useQuery queryKey contains 'work-experience' segment
    - client/src/pages/StudentDetailPage.tsx: contains AwardsSection and WorkExperienceSection JSX within the flex-col div
    - The section order in StudentDetailPage JSX is: AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection (per D-02)
    - `cd client && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | tail -5 && echo "Client TypeScript OK"</automated>
  </verify>
  <done>AwardsSection (with level Badge mapping) and WorkExperienceSection created; both added to StudentDetailPage in correct order; client compiles cleanly</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → /api/students/:id/awards | Client-side fetch; server IDOR guard and Zod validation in Plan 03-02 |
| browser → /api/students/:id/work-experience | Client-side fetch; server IDOR guard in Plan 03-02 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-06b | Tampering | AwardsSection form — level field | mitigate | Select input restricts to valid AwardLevel values; server-side Zod validates in Plan 03-02 regardless |
| T-03-07b | Spoofing | AwardsSection + WorkExperienceSection API calls | accept | JWT auth handled globally; useQuery calls inherit auth header from apiGet client |
| T-03-SC | Tampering | npm installs | mitigate | No new npm packages in this plan; all dependencies established in Plan 03-01b |
</threat_model>

<verification>
- `cd client && npx tsc --noEmit` exits 0
- client/src/pages/StudentDetailPage.tsx: section order is AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection
- client/src/components/records/AwardsSection.tsx: contains awardLevelBadge helper mapping all 5 AwardLevel values
- client/src/components/records/WorkExperienceSection.tsx: contains formatPeriod call in table cell; Ongoing Checkbox nulls endMonth + endYear
</verification>

<success_criteria>
- AwardsSection: level column renders Badge with correct variant per 03-UI-SPEC Award Level Variants table; INTERNATIONAL uses font-semibold (D-13)
- WorkExperienceSection: mirrors ActivitiesSection with employer/role fields; formatPeriod for period column; Ongoing checkbox nulls end-date
- StudentDetailPage: four list-type sections rendered in D-02 order (academics, activities, awards, work exp)
- Client TypeScript compiles cleanly
</success_criteria>

<output>
Create `.planning/phases/03-student-records-ui/03-02b-SUMMARY.md` when done
</output>
