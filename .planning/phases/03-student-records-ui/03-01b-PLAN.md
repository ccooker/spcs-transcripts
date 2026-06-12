---
phase: 03-student-records-ui
plan: 01b
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/App.tsx
  - client/src/lib/periodFormat.ts
  - client/src/components/records/RecordSectionCard.tsx
  - client/src/components/records/MonthYearPicker.tsx
  - client/src/components/records/RecordDeleteDialog.tsx
  - client/src/components/records/AcademicResultsSection.tsx
  - client/src/components/records/ActivitiesSection.tsx
  - client/src/pages/StudentDetailPage.tsx
autonomous: true
requirements:
  - STU-03
  - STU-04

must_haves:
  truths:
    - "QueryClientProvider wraps the router in App.tsx so all TanStack Query hooks in this and future plans resolve without 'No QueryClient set' error"
    - "AcademicResultsSection renders below the Profile card on /students/:id; shows 'No academic results yet.' empty state with 'Add result' button (D-04)"
    - "ActivitiesSection renders below AcademicResultsSection; shows 'No activities yet.' empty state (D-04)"
    - "Section card headers show title + entry count e.g. 'Academic results (0)' per D-05"
  artifacts:
    - path: "client/src/components/records/RecordSectionCard.tsx"
      provides: "Shared section card wrapper: title+count header, Add button, loading skeleton, error Alert, empty state"
      exports: ["RecordSectionCard"]
    - path: "client/src/components/records/MonthYearPicker.tsx"
      provides: "Month + year pair Selects inside fieldset+legend; w-24 each; null for empty (D-12)"
      exports: ["MonthYearPicker"]
    - path: "client/src/components/records/RecordDeleteDialog.tsx"
      provides: "AlertDialog: 'Delete this entry?' / 'Keep entry' / 'Delete' (D-21)"
      exports: ["RecordDeleteDialog"]
    - path: "client/src/lib/periodFormat.ts"
      provides: "MONTH_NAMES array; formatMonthYear(); formatPeriod() — 'Sep 2022 – Present'"
      exports: ["MONTH_NAMES", "formatMonthYear", "formatPeriod"]
    - path: "client/src/components/records/AcademicResultsSection.tsx"
      provides: "Table+Dialog CRUD UI for academic results; subject preset dropdown + 'Other' conditional Input; uses useQuery/useMutation"
      exports: ["AcademicResultsSection"]
    - path: "client/src/components/records/ActivitiesSection.tsx"
      provides: "Table+Dialog CRUD UI for activities; MonthYearPicker + Ongoing checkbox; uses useQuery/useMutation"
      exports: ["ActivitiesSection"]
  key_links:
    - from: "client/src/components/records/AcademicResultsSection.tsx"
      to: "/api/students/:id/academics"
      via: "useQuery({ queryKey: ['student', studentId, 'academics'] })"
      pattern: "useQuery.*academics"
    - from: "client/src/components/records/ActivitiesSection.tsx"
      to: "/api/students/:id/activities"
      via: "useQuery({ queryKey: ['student', studentId, 'activities'] })"
      pattern: "useQuery.*activities"
    - from: "client/src/App.tsx"
      to: "QueryClientProvider"
      via: "wraps router tree with QueryClient instance"
      pattern: "QueryClientProvider"
---

## Phase Goal

**As a** careers staff member, **I want to** enter and manage all six types of student record data from within a single student profile page, **so that** I can build a complete student profile without navigating away.

<objective>
Academics & Activities client slice: install @tanstack/react-query and wrap App.tsx with QueryClientProvider, create shared UI infrastructure (RecordSectionCard, MonthYearPicker, RecordDeleteDialog, periodFormat.ts), and build AcademicResultsSection + ActivitiesSection components on the StudentDetailPage.

Purpose: Delivers the client half of the first two record type sections. Runs in Wave 1 in parallel with Plan 03-01 (server). UI sections render empty states + dialogs immediately; data flows once Plan 03-03 pushes the schema and the DB is live.

Output: @tanstack/react-query installed; QueryClientProvider in App.tsx; shared record UI components (RecordSectionCard, MonthYearPicker, RecordDeleteDialog, periodFormat); AcademicResultsSection + ActivitiesSection replacing the StudentDetailPage placeholder.
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
@.planning/phases/02-student-profiles-search/02-UI-SPEC.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @tanstack/react-query + QueryClientProvider; shared UI components (RecordSectionCard, MonthYearPicker, RecordDeleteDialog, periodFormat)</name>
  <files>
    client/src/App.tsx
    client/src/lib/periodFormat.ts
    client/src/components/records/RecordSectionCard.tsx
    client/src/components/records/MonthYearPicker.tsx
    client/src/components/records/RecordDeleteDialog.tsx
  </files>
  <read_first>
    - client/src/App.tsx — full file; find where to wrap router/app tree with QueryClientProvider
    - client/src/components/students/ArchiveStudentDialog.tsx — AlertDialog pattern for RecordDeleteDialog; in-flight loading state pattern
    - .planning/phases/03-student-records-ui/03-RESEARCH.md — Pattern 6 (TanStack Query section fetching pattern), Pattern 8 (MonthYearPicker)
    - .planning/phases/03-student-records-ui/03-PATTERNS.md — RecordSectionCard, MonthYearPicker, RecordDeleteDialog pattern code excerpts
  </read_first>
  <action>
    INSTALL: cd client && npm install @tanstack/react-query (adds to package.json; no shadcn installs in this plan — checkbox/textarea/tooltip/scroll-area deferred to Plan 03-03).

    App.tsx: import { QueryClient, QueryClientProvider } from '@tanstack/react-query'. Create const queryClient = new QueryClient() OUTSIDE the component (module-level, not inside render). Wrap the router/app JSX tree with &lt;QueryClientProvider client={queryClient}&gt;...&lt;/QueryClientProvider&gt;. This is a single wrap — read the current App.tsx structure to find the exact insertion point.

    client/src/lib/periodFormat.ts (NEW): export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']. export function formatMonthYear(month:number, year:number): string — returns MONTH_NAMES[month-1] + ' ' + year. export function formatPeriod(startMonth, startYear, endMonth:number|null, endYear:number|null): string — if endMonth===null||endYear===null returns start + ' – Present'; else returns start + ' – ' + formatMonthYear(endMonth,endYear).

    client/src/components/records/RecordSectionCard.tsx (NEW): Props interface RecordSectionCardProps: title:string, count?:number, addLabel:string, onAdd:()=>void, isLoading?:boolean, isError?:boolean, onRetry?:()=>void, isEmpty?:boolean, emptyHeading?:string, emptyBody?:string, children?:React.ReactNode, hideAddButton?:boolean. Card with aria-busy={isLoading}. CardHeader: flex flex-row items-center justify-between space-y-0 pb-4. Left: &lt;h2&gt; with text-xl font-semibold leading-tight for title + &lt;span className="text-sm font-normal text-muted-foreground"&gt; ({count??0}) &lt;/span&gt;. Right: Button variant="default" size="sm" with Plus icon + addLabel (hidden when hideAddButton). CardContent: if isLoading show 3× &lt;Skeleton className="h-11 w-full" /&gt; in space-y-3; if isError show &lt;Alert variant="destructive"&gt;&lt;AlertDescription&gt;Couldn't load {title.toLowerCase()}. Try again.{onRetry && &lt;button onClick={onRetry} className="underline ml-1"&gt;Retry&lt;/button&gt;}&lt;/AlertDescription&gt;&lt;/Alert&gt;; if isEmpty show &lt;div className="py-8 text-center"&gt; with emptyHeading in text-sm font-medium and emptyBody in text-sm text-muted-foreground mt-1; else render children. Import Card/CardContent/CardHeader/CardTitle from @/components/ui/card; Button from @/components/ui/button; Skeleton from @/components/ui/skeleton; Alert/AlertDescription from @/components/ui/alert; Plus from lucide-react.

    client/src/components/records/MonthYearPicker.tsx (NEW): Props: label:string, monthValue:number|null|undefined, yearValue:number|null|undefined, onMonthChange:(v:number|null)=>void, onYearChange:(v:number|null)=>void, required?:boolean, disabled?:boolean. Render &lt;fieldset className="space-y-1.5"&gt;&lt;legend className="text-sm font-medium leading-none"&gt;{label}{required&&&lt;span aria-hidden&gt; *&lt;/span&gt;}&lt;/legend&gt;&lt;div className="flex gap-2"&gt; with two Select components (month and year). Month Select: options 1–12 mapped from MONTHS array ({value:1,label:'Jan'}…{value:12,label:'Dec'}), SelectTrigger className="w-24" aria-label="Month", value={monthValue?.toString()??''}, onValueChange={(v)=>onMonthChange(v?Number(v):null)}. Year Select: options from yearOptions(currentYear) = Array.from({length:11},(_,i)=>currentYear-i), SelectTrigger className="w-24" aria-label="Year", value={yearValue?.toString()??''}, onValueChange={(v)=>onYearChange(v?Number(v):null)}.

    client/src/components/records/RecordDeleteDialog.tsx (NEW): Props: open:boolean, onOpenChange:(o:boolean)=>void, onConfirm:()=>Promise&lt;void&gt;, isDeleting:boolean. Uses AlertDialog (already installed). AlertDialogTitle: "Delete this entry?". AlertDialogDescription: "This action cannot be undone." AlertDialogCancel disabled={isDeleting}: "Keep entry". AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isDeleting}: isDeleting ? "Deleting…" : "Delete".
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | tail -5 && echo "Client TypeScript OK"</automated>
  </verify>
  <done>@tanstack/react-query installed; QueryClientProvider wrapping app in App.tsx; RecordSectionCard + MonthYearPicker + RecordDeleteDialog + periodFormat.ts created; client compiles cleanly</done>
</task>

<task type="auto">
  <name>Task 2: AcademicResultsSection + ActivitiesSection; replace StudentDetailPage placeholder</name>
  <files>
    client/src/components/records/AcademicResultsSection.tsx
    client/src/components/records/ActivitiesSection.tsx
    client/src/pages/StudentDetailPage.tsx
  </files>
  <read_first>
    - client/src/pages/StudentDetailPage.tsx — full file; locate placeholder Card block (search for "Student records" text ~line 267-277); note existing import block and Card/CardHeader usage
    - client/src/components/students/StudentForm.tsx — useForm+zodResolver, FormField/FormItem/FormLabel/FormControl/FormMessage pattern, Select with string↔number conversion
    - client/src/api/apiClient.ts — apiGet/apiPost/apiPatch/apiDelete signatures and return types
    - .planning/phases/03-student-records-ui/03-UI-SPEC.md — Section 1 (Academics columns/dialog), Section 2 (Activities columns/dialog), Copywriting Contract (section headers, dialog titles, toast copy, validation messages), Interaction Specifications, Accessibility Baseline
    - .planning/phases/03-student-records-ui/03-RESEARCH.md — Pattern 9 (Subject Other reveal)
    - .planning/phases/03-student-records-ui/03-PATTERNS.md — AcademicResultsSection, ActivitiesSection pattern assignments with code excerpts
  </read_first>
  <action>
    client/src/components/records/AcademicResultsSection.tsx (NEW): Props: studentId:string. Type AcademicResult: {id:string, subject:string, subjectOther:string|null, grade:string, calendarYear:number, formLevel:string, notes:string|null}. useQuery queryKey=['student',studentId,'academics'], queryFn=apiGet&lt;AcademicResult[]&gt;(`/students/${studentId}/academics`). useMutation for create (POST → invalidate + toast.success('Academic result added')), update (PATCH → invalidate + toast.success('Academic result updated')), delete (DELETE → invalidate + toast.success('Entry deleted')). onError for all mutations: toast.error("Couldn't save changes. Please try again.") for create/update; toast.error("Couldn't delete entry. Please try again.") for delete. State: dialogOpen:boolean, editTarget:AcademicResult|null, deleteTarget:AcademicResult|null. RecordSectionCard props: title="Academic results", count={data.length}, addLabel="Add result", onAdd=openAddDialog, isLoading, isError, onRetry=refetch, isEmpty=data.length===0, emptyHeading="No academic results yet.", emptyBody="Add results to track this student's academic performance.". Table inside card: columns Subject, Grade, Year, Form, Notes (truncated 60 chars), Actions (Pencil+Trash ghost icon buttons). Subject cell: result.subject==='OTHER' ? result.subjectOther : result.subject. Dialog (shadcn Dialog): title "Add academic result"/"Edit academic result". Form fields: Subject (Select from PRESET_SUBJECTS; last option 'Other' triggers conditional Input for subjectOther — watch('subject')==='OTHER' per D-08, RESOLVED in 03-RESEARCH.md Q2), Grade (Input placeholder="e.g. A, B+, 85%, Distinction" maxLength=20), Calendar year (Select current year – 10yr range, string→number conversion), Form level (Select FORM_1–FORM_6 → display 'Form 1'–'Form 6'), Notes (Input placeholder="Optional — short note" maxLength=200). useForm({ resolver: zodResolver(academicResultFormSchema) }) where form schema mirrors server Zod schema (define client-side schema separately using PRESET_SUBJECTS constant). Dialog footer: Button variant="outline" "Discard" + submit Button variant="default" isPending?"Saving…":"Add result"/"Save result". Pre-populate form with editTarget values when editing.

    client/src/components/records/ActivitiesSection.tsx (NEW): Props: studentId:string. Type Activity: {id:string, organisation:string, role:string, description:string|null, startMonth:number, startYear:number, endMonth:number|null, endYear:number|null}. Same useQuery/useMutation pattern as AcademicResultsSection but for /activities endpoint. RecordSectionCard: title="Activities", emptyHeading="No activities yet.", emptyBody="Add extracurricular activities to build this student's profile.", addLabel="Add activity". Table columns: Organisation, Role, Period (formatPeriod(startMonth,startYear,endMonth,endYear)), Actions. Dialog: organisation (Input placeholder="e.g. SPCS Drama Society"), role (Input placeholder="e.g. President, Member"), description (use a basic HTML textarea styled with className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" for now — shadcn Textarea is installed in Plan 03-03; this component will be updated then per plan 03-03 Task 3), start date (MonthYearPicker label="Start date" required), end date (MonthYearPicker label="End date") + Checkbox "Ongoing / Present" — when checked set endMonth/endYear to null and disable the MonthYearPicker. Form schema validates startMonth required, endMonth/endYear optional nullable.

    client/src/pages/StudentDetailPage.tsx: Replace the placeholder Card (the one containing "Student records" as CardTitle and "Academic results, activities, awards, and other records will be available here…" as CardContent text) with:
    &lt;div className="flex flex-col gap-8"&gt;
      &lt;AcademicResultsSection studentId={student.id} /&gt;
      &lt;ActivitiesSection studentId={student.id} /&gt;
      {/* Awards and WorkExperience sections added in Plan 03-02 */}
      {/* CareerGoals and Notes sections added in Plan 03-03 */}
    &lt;/div&gt;
    Add imports for AcademicResultsSection and ActivitiesSection at top of file. Keep all other page code unchanged.
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | tail -5 && echo "Client TypeScript OK"</automated>
  </verify>
  <done>AcademicResultsSection + ActivitiesSection created; StudentDetailPage placeholder replaced with section components; client compiles cleanly</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → /api/students/:id/academics | Untrusted: browser-side request; JWT cookie required by server middleware |
| client → /api/students/:id/activities | Untrusted: browser-side request; JWT cookie required by server middleware |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-05 | Tampering | npm install @tanstack/react-query | mitigate | Package approved in RESEARCH.md Package Legitimacy Audit; same TanStack org as @tanstack/react-table already in project |
| T-03-SC | Tampering | npm/shadcn installs | mitigate | slopcheck — @tanstack/react-query verified [OK] in 03-RESEARCH.md Package Legitimacy table |
</threat_model>

<verification>
- `cd client && npx tsc --noEmit` exits 0
- client/package.json contains "@tanstack/react-query" in dependencies
- client/src/App.tsx contains QueryClientProvider and QueryClient instantiation
- client/src/lib/periodFormat.ts: formatPeriod(9,2022,null,null) returns 'Sep 2022 – Present'
- client/src/components/records/AcademicResultsSection.tsx: imports useQuery and useMutation from '@tanstack/react-query'; queryKey includes 'academics' segment
- client/src/components/records/ActivitiesSection.tsx: imports MonthYearPicker; uses formatPeriod in table Period column; useQuery queryKey includes 'activities' segment
- client/src/pages/StudentDetailPage.tsx: no longer contains "Student records will be available here" text; contains AcademicResultsSection and ActivitiesSection imports and JSX
</verification>

<success_criteria>
- @tanstack/react-query installed; QueryClientProvider wraps app
- RecordSectionCard (shared wrapper), MonthYearPicker (fieldset+2 Selects), RecordDeleteDialog (AlertDialog simple confirm), periodFormat (formatPeriod returning "Present" for null end-date)
- AcademicResultsSection: table+dialog with subject preset + Other reveal (D-08), useQuery/useMutation connecting to /api/students/:id/academics
- ActivitiesSection: table+dialog with MonthYearPicker + Ongoing checkbox, useQuery/useMutation connecting to /api/students/:id/activities
- StudentDetailPage: placeholder replaced; AcademicResultsSection + ActivitiesSection rendered
</success_criteria>

<output>
Create `.planning/phases/03-student-records-ui/03-01b-SUMMARY.md` when done
</output>
