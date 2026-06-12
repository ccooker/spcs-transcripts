---
phase: 03-student-records-ui
plan: 03b
type: execute
wave: 4
depends_on:
  - 03-03a
  - 03-02b
files_modified:
  - server/prisma/migrations/20260612_add_records/migration.sql
  - client/src/components/records/CareerGoalsSection.tsx
  - client/src/components/records/NotesSection.tsx
  - client/src/components/records/CareerInterestsChecklist.tsx
  - client/src/pages/StudentDetailPage.tsx
  - client/src/components/records/ActivitiesSection.tsx
  - client/src/components/records/AwardsSection.tsx
  - client/src/components/records/WorkExperienceSection.tsx
  - client/package.json
autonomous: false
requirements:
  - STU-07
  - STU-08

must_haves:
  truths:
    - "npx prisma db push completes without error; all 6 new tables exist in PostgreSQL"
    - "All RED tests from plans 03-01 through 03-03a (stu-03 through stu-08) are GREEN after schema push"
    - "CareerGoalsSection shows current version interests as Badge chips + description; version history collapsible toggle"
    - "NotesSection: inline textarea with Add note button + {n}/500 character count; notes listed newest-first with attribution (D-18, D-19)"
    - "CareerInterestsChecklist: 12-item grid (2 columns on md+); each item min 44px touch area (D-14)"
    - "All 6 section types visible on /students/:id in D-02 order (Academics → Activities → Awards → Work Exp → Career Goals → Notes)"
    - "Description fields in ActivitiesSection, AwardsSection, WorkExperienceSection use shadcn Textarea component (not raw HTML textarea)"
  artifacts:
    - path: "server/prisma/migrations/20260612_add_records/migration.sql"
      provides: "SQL for all 6 new tables + 2 new enums; documentation of schema additions"
    - path: "client/src/components/records/CareerGoalsSection.tsx"
      provides: "Versioned career goals display (current + collapsible history) + Update dialog with CareerInterestsChecklist"
      exports: ["CareerGoalsSection"]
    - path: "client/src/components/records/NotesSection.tsx"
      provides: "Append-only inline textarea + Add note button + character counter + notes list"
      exports: ["NotesSection"]
    - path: "client/src/components/records/CareerInterestsChecklist.tsx"
      provides: "12-item 2-col checkbox grid for career interests multi-select"
      exports: ["CareerInterestsChecklist", "CAREER_INTEREST_LABELS"]
  key_links:
    - from: "client/src/components/records/CareerGoalsSection.tsx"
      to: "/api/students/:id/career-goals"
      via: "useQuery({ queryKey: ['student', studentId, 'career-goals'] })"
      pattern: "useQuery.*career-goals"
    - from: "client/src/components/records/NotesSection.tsx"
      to: "/api/students/:id/notes"
      via: "useMutation POST; useQuery queryKey ['student', studentId, 'notes']"
      pattern: "useQuery.*notes"
---

## Phase Goal

**As a** careers staff member, **I want to** enter and manage all six types of student record data from within a single student profile page, **so that** I can build a complete student profile without navigating away.

<objective>
DB push + client completion slice: push all 6 Prisma models to PostgreSQL (BLOCKING human checkpoint), install remaining shadcn components, build CareerGoalsSection and NotesSection with CareerInterestsChecklist, complete the StudentDetailPage with all 6 sections, upgrade ActivitiesSection/AwardsSection/WorkExperienceSection description fields to shadcn Textarea, and confirm all stu-03 through stu-08 integration tests pass GREEN.

Purpose: Closes the phase — after this plan the database has all 6 tables, all 6 API endpoints are live, all section components are rendered, and the full test suite is green. Staff can immediately use the student detail page to manage all six record types.

Output: All schema models deployed to PostgreSQL, CareerGoalsSection + NotesSection + CareerInterestsChecklist, all 6 sections on StudentDetailPage in D-02 order, all stu-03–stu-08 tests GREEN.
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
@.planning/phases/03-student-records-ui/03-02b-SUMMARY.md
@.planning/phases/03-student-records-ui/03-03a-SUMMARY.md
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: [BLOCKING] Generate migration SQL + push all 6 models to PostgreSQL</name>
  <files>
    server/prisma/migrations/20260612_add_records/migration.sql
  </files>
  <read_first>
    - server/prisma/schema.prisma — final state with all 6 new models (from Plans 03-01 + 03-02 + 03-03a); verify all 6 models present before proceeding
    - server/prisma/migrations/ — list existing migrations to confirm naming convention (existing: 20260612094000_add_student)
    - .planning/STATE.md (Key Decisions) — "Migration SQL generated via prisma migrate diff — No PostgreSQL/Docker available in dev; used --from-empty --to-schema to generate SQL without live DB"
    - .planning/phases/03-student-records-ui/03-RESEARCH.md — Pattern 10 (migration strategy) and RESOLVED Q1 (CareerInterest enum array fallback: String[] @db.Text[])
  </read_first>
  <action>
    STEP 1 — Generate migration SQL (documentation only; db push is the authoritative apply step):
    Run from server/: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` and save to `prisma/migrations/20260612_add_records/migration.sql` (create directory first with mkdir -p). If this command requires a live database and fails, fall back to: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20260612_add_records/migration.sql`.

    Inspect the generated SQL to confirm CareerInterest[] array type is correct (should produce `_career_interest[]` or `"CareerInterest"[]`). If the array type output is malformed (plain text or unsupported syntax) — per RESOLVED Q1 in 03-RESEARCH.md: update schema.prisma to use `String[] @db.Text[]` for the interests field, re-run `npx prisma generate`, then regenerate the SQL. Note the fallback in SUMMARY.md.

    STEP 2 — Push schema ([BLOCKING]):
    Run: `cd server && npx prisma db push`
    Expected output: "Your database is now in sync with your Prisma schema." If DATABASE_URL is missing, check server/.env and ecosystem.config.js env block. If prompted about data loss (adding tables only, so this would be unexpected), run with --accept-data-loss.

    STEP 3 — Verify tables created:
    Run: `cd server && node -e "const {PrismaClient}=require('./src/generated/prisma/client.js'); const p=new PrismaClient(); p.academicResult.count().then(c=>console.log('academicResult:',c)).catch(e=>console.error(e)).finally(()=>p.\$disconnect())"` — expect "academicResult: 0". Repeat for careerGoal and staffNote.

    STEP 4 — Regenerate client if needed: `cd server && npx prisma generate` if types seem stale.
  </action>
  <what-built>
    Database push deploying all 6 new Prisma models (AcademicResult, Activity, Award, WorkExperience, CareerGoal, StaffNote) to PostgreSQL. Migration SQL saved to migrations directory.
  </what-built>
  <how-to-verify>
    1. Run `cd server && npm test` — stu-03 and stu-04 tests should now PASS (their tables exist)
    2. Run `cd server && node -e "const {PrismaClient}=require('./src/generated/prisma/client.js'); const p=new PrismaClient(); p.careerGoal.count().then(c=>console.log('careerGoal:',c)).finally(()=>p.$disconnect())"` — should print "careerGoal: 0"
    3. Confirm `npx prisma db push` output showed success (no error lines)
  </how-to-verify>
  <resume-signal>Type "db push verified" to continue to client tasks, or describe any errors encountered</resume-signal>
  <verify>
    <automated>cd server && npx prisma db push 2>&1 | tail -3</automated>
  </verify>
  <done>All 6 Prisma models deployed to PostgreSQL; migration SQL documented; stu-03 and stu-04 tests begin passing</done>
</task>

<task type="auto">
  <name>Task 2: Install shadcn components + CareerGoalsSection + NotesSection + CareerInterestsChecklist + StudentDetailPage update</name>
  <files>
    client/src/components/records/CareerGoalsSection.tsx
    client/src/components/records/NotesSection.tsx
    client/src/components/records/CareerInterestsChecklist.tsx
    client/src/pages/StudentDetailPage.tsx
    client/package.json
  </files>
  <read_first>
    - client/src/components/records/AcademicResultsSection.tsx — full file (Plan 03-01b); copy useQuery/useMutation/queryClient.invalidateQueries pattern for CareerGoalsSection and NotesSection
    - client/src/components/records/RecordSectionCard.tsx — full file; CareerGoalsSection uses this wrapper; NotesSection uses it with hideAddButton=true
    - client/src/pages/StudentDetailPage.tsx — current state (4 sections from Plans 03-01b + 03-02b); add CareerGoalsSection + NotesSection
    - .planning/phases/03-student-records-ui/03-UI-SPEC.md — Section 5 (Career Goals section layout, version history toggle, Update dialog), Section 6 (Notes section layout, textarea, attribution, character count), Appendix B (CareerInterestsChecklist 12 items), Copywriting Contract (career goals + notes toast copy, empty state copy)
    - .planning/phases/03-student-records-ui/03-RESEARCH.md — Pattern 4 (career goals API response shape: index 0 is current, slice(1) is history), Pattern 5 (staff notes with author.displayName), Pattern 6 (TanStack Query fetching pattern)
    - .planning/phases/03-student-records-ui/03-PATTERNS.md — CareerGoalsSection version history toggle pattern, CareerInterestsChecklist with Checkbox imports
  </read_first>
  <action>
    INSTALL shadcn components:
    cd client && npx shadcn@latest add checkbox textarea tooltip scroll-area
    All four are from the official shadcn registry (pre-audited [OK] in 03-RESEARCH.md Package Legitimacy table). If CLI prompts to overwrite existing files, answer Y. Components install to client/src/components/ui/.

    client/src/components/records/CareerInterestsChecklist.tsx (NEW): Props: value:string[], onChange:(v:string[])=>void. Export CAREER_INTEREST_LABELS: Record<string,string> mapping all 12 enum values: { MEDICINE_HEALTH:'Medicine / Health', LAW:'Law', ENGINEERING:'Engineering', BUSINESS_FINANCE:'Business / Finance', EDUCATION:'Education', ARTS_DESIGN:'Arts / Design', SCIENCE_RESEARCH:'Science / Research', IT_TECHNOLOGY:'IT / Technology', HOSPITALITY:'Hospitality', SOCIAL_SERVICES:'Social Services', SPORTS:'Sports', UNDECIDED:'Undecided / Exploring' }. Render <fieldset><legend className="sr-only">Career interests</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-3"> mapping 12 interest keys. Each item: <div className="flex items-center gap-2 min-h-[44px]"><Checkbox id={key} checked={value.includes(key)} onCheckedChange={(checked)=>onChange(checked ? [...value,key] : value.filter(v=>v!==key))} /><Label htmlFor={key}>{CAREER_INTEREST_LABELS[key]}</Label></div>. Import Checkbox from @/components/ui/checkbox; Label from @/components/ui/label.

    client/src/components/records/CareerGoalsSection.tsx (NEW): Props: studentId:string. Type CareerGoalVersion: { id:string, interests:string[], description:string|null, author:{ displayName:string }, createdAt:string }. useQuery queryKey=['student',studentId,'career-goals'], queryFn=apiGet<CareerGoalVersion[]>(`/students/${studentId}/career-goals`). useMutation for create: POST to /students/${studentId}/career-goals; on success: invalidateQueries + toast.success('Career goals saved'); on error: toast.error("Couldn't save changes. Please try again."). const versions = data ?? []; const current = versions[0]; const history = versions.slice(1).

    RecordSectionCard: title="Career goals", count={versions.length}, addLabel="Update career goals", onAdd=openUpdateDialog, isEmpty=versions.length===0, emptyHeading="No career goals recorded yet.", emptyBody="Add the first entry to begin building this student's career profile.".

    Current version display (when versions.length > 0): sub-heading "Interests" (text-sm font-medium), interest chips as <Badge variant="secondary" className="mr-1 mb-1">{CAREER_INTEREST_LABELS[interest]}</Badge> in a flex flex-wrap gap-2 div. Sub-heading "Goals & description" if current.description exists. Description text as text-sm leading-relaxed. Attribution: "Updated {formatted date} by {current.author.displayName}" as text-sm text-muted-foreground.

    Version history: if history.length > 0, show Button variant="ghost" size="sm" labeled "Version history ({history.length} previous)" / "Hide version history" with ChevronRight icon (rotate 90deg when expanded). useState(false) for historyExpanded. When expanded, map history versions: each as div bg-muted/30 rounded p-3 mb-2 showing attribution header + secondary expand toggle for full content.

    Update dialog: title "Update career goals". useForm with zodResolver. Fields: interests (CareerInterestsChecklist as controlled component, pre-populate from current?.interests) + description (Textarea from @/components/ui/textarea, placeholder="Describe this student's goals, university targets, or career aspirations", maxLength=500, className="min-h-[120px]", {n}/500 counter below). Footer: "Discard" + "Save career goals"/"Saving…". On submit: POST new version (never PATCH — D-16).

    client/src/components/records/NotesSection.tsx (NEW): Props: studentId:string. Type StaffNote: { id:string, content:string, author:{ displayName:string }, createdAt:string }. useQuery queryKey=['student',studentId,'notes']. useMutation POST; on success: invalidateQueries + toast.success('Note added') + setNoteContent(''). State: noteContent:string=''.

    RecordSectionCard with hideAddButton=true: title="Notes", count={notes.length}. Card body: 1) Input area: <Label htmlFor="new-note">Add a note</Label><Textarea id="new-note" placeholder="Add a note about this student…" value={noteContent} onChange={(e)=>setNoteContent(e.target.value)} maxLength={500} className="min-h-[80px] mt-1.5" aria-describedby="note-char-count" />. Below: <span id="note-char-count">{noteContent.length}/500</span> + Clear button (disabled when empty) + Add note button (disabled when noteContent.trim() empty or isPending, label: isPending?'Adding…':'Add note'). 2) Notes list: empty → "No notes yet. Add the first note above." as text-sm text-muted-foreground text-center py-4. Non-empty → <ul> with each note: attribution (displayName · datetime), <p className="text-sm leading-relaxed mt-1">{note.content}</p>, <Separator className="mt-3 mb-3" />. No edit/delete controls (D-17). formatNoteDate helper: new Date(createdAt).toLocaleString('en-HK',{ day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).

    client/src/pages/StudentDetailPage.tsx: In the flex flex-col gap-8 div, after WorkExperienceSection add:
    <CareerGoalsSection studentId={student.id} />
    <NotesSection studentId={student.id} />
    Add imports for CareerGoalsSection and NotesSection. Final D-02 order: AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection → CareerGoalsSection → NotesSection.
  </action>
  <acceptance_criteria>
    - client/src/components/records/CareerInterestsChecklist.tsx: renders 12 Checkbox+Label pairs; CAREER_INTEREST_LABELS maps all 12 enum values; each item has min-h-[44px] on wrapper div (D-14)
    - client/src/components/records/CareerGoalsSection.tsx: POST mutation creates new version (no PATCH call); historyExpanded toggle button present; Textarea from @/components/ui/textarea used for description field
    - client/src/components/records/NotesSection.tsx: noteContent character counter shows {n}/500; Add note button disabled when noteContent.trim() is empty; no edit/delete icons on note list items (D-17)
    - client/src/pages/StudentDetailPage.tsx: contains all 6 section component imports and JSX in D-02 order
    - `cd client && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | tail -5 && echo "Client TypeScript OK"</automated>
  </verify>
  <done>shadcn checkbox/textarea/tooltip/scroll-area installed; CareerGoalsSection (versioned history + update dialog) + NotesSection (inline append-only textarea) + CareerInterestsChecklist created; all 6 sections on StudentDetailPage in D-02 order; client TypeScript compiles</done>
</task>

<task type="auto">
  <name>Task 3: Upgrade description Textareas in ActivitiesSection + AwardsSection + WorkExperienceSection; turn all stu-03–stu-08 tests GREEN</name>
  <files>
    client/src/components/records/ActivitiesSection.tsx
    client/src/components/records/AwardsSection.tsx
    client/src/components/records/WorkExperienceSection.tsx
  </files>
  <read_first>
    - client/src/components/records/ActivitiesSection.tsx — full file (from Plan 03-01b); find the description form field using raw HTML <textarea> (className includes "rounded-md border border-input") or fallback — replace with shadcn Textarea
    - client/src/components/records/AwardsSection.tsx — full file (from Plan 03-02b); find the description field using basic textarea with inline className — replace with shadcn Textarea
    - client/src/components/records/WorkExperienceSection.tsx — full file (from Plan 03-02b); same replacement for description Textarea in the dialog
    - client/src/components/ui/textarea.tsx — just installed in Task 2; confirm import path: @/components/ui/textarea
    - server/src/__tests__/records.test.ts — read failing tests to understand expected behaviors; check if any test failures are implementation bugs vs missing tables
  </read_first>
  <action>
    In each of ActivitiesSection.tsx, AwardsSection.tsx, WorkExperienceSection.tsx:
    1. Add import: import { Textarea } from '@/components/ui/textarea';
    2. Find the description form field — look for a raw HTML <textarea> element (className with "rounded-md border border-input") or an Input element used as fallback. Replace with <Textarea placeholder="Brief description of role and responsibilities" maxLength={500} className="min-h-[80px]" /> (adjust placeholder per section context: AwardsSection → "Brief description", WorkExperienceSection → "Brief description of role and responsibilities").
    3. Preserve the enclosing FormField/FormControl/FormMessage wrapper — only replace the inner input element.
    4. Remove any fallback comments like "// Use basic textarea until shadcn installed".

    RUN TESTS — make all RED tests GREEN:
    cd server && npm test
    All stu-03 through stu-08 tests should now pass (DB tables exist after Task 1). If any test fails unexpectedly, debug and fix before completing. Common failure causes: testDb clearDb FK order violation (check staffNote deletes before careerGoal before student), missing include clause in service (author.displayName not returned for career goals/notes), wrong orderBy direction (check newest-first for notes and career-goals), IDOR guard throwing wrong error class. Fix the implementation until `npm test` passes fully green.
  </action>
  <acceptance_criteria>
    - client/src/components/records/ActivitiesSection.tsx: description field uses <Textarea from "@/components/ui/textarea" /> (not raw HTML textarea or Input)
    - client/src/components/records/AwardsSection.tsx: description field uses <Textarea from "@/components/ui/textarea" />
    - client/src/components/records/WorkExperienceSection.tsx: description field uses <Textarea from "@/components/ui/textarea" />
    - `cd client && npx tsc --noEmit` exits 0
    - `cd server && npm test` exits 0 with all stu-03 through stu-08 tests PASSING
    - `cd server && npm test 2>&1 | grep -E "Tests.*passed|passed"` shows total passing count
  </acceptance_criteria>
  <verify>
    <automated>cd server && npm test 2>&1 | tail -15</automated>
  </verify>
  <done>Description fields upgraded to shadcn Textarea in ActivitiesSection, AwardsSection, WorkExperienceSection; all stu-03 through stu-08 integration tests GREEN; client TypeScript compiles cleanly</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npx prisma db push | Trusted admin operation; DATABASE_URL from secure environment config |
| client → /api/students/:id/career-goals | Untrusted POST only; no mutation routes; JWT auth inherited from Plan 03-03a |
| client → /api/students/:id/notes | Untrusted POST only; append-only enforced by route omission in Plan 03-03a |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-16 | Tampering | npx prisma db push — schema migration | mitigate | Run only in controlled environment with verified DATABASE_URL; output inspected before confirming (human checkpoint gate) |
| T-03-17 | Info Disclosure | career goals + notes response includes author.displayName | accept | DisplayName is not sensitive PII; required for attribution display (D-16, D-19); no email or user ID leaked |
| T-03-SC | Tampering | npm/shadcn installs — checkbox, textarea, tooltip, scroll-area | mitigate | All four are from shadcn official registry (github.com/shadcn-ui/ui); pre-audited [OK] in 03-RESEARCH.md Package Legitimacy table; human can verify install output |
</threat_model>

<verification>
- `cd server && npm test` exits 0 — all stu-03 through stu-08 tests PASS
- `cd server && npx tsc --noEmit` exits 0
- `cd client && npx tsc --noEmit` exits 0
- server/prisma/migrations/20260612_add_records/migration.sql exists with CREATE TABLE statements
- client/src/pages/StudentDetailPage.tsx: section order verified — AcademicResultsSection → ActivitiesSection → AwardsSection → WorkExperienceSection → CareerGoalsSection → NotesSection (D-02)
- `grep "Textarea" client/src/components/records/ActivitiesSection.tsx | grep "ui/textarea"` returns match

<human-check>
Navigate to /students/:id for any student. Verify:
1. All six section cards are visible in order: Academic results → Activities → Awards → Work experience → Career goals → Notes
2. Each empty section shows correct empty-state copy and an Add button (except Notes, which shows the inline textarea)
3. Click "Add result" in Academic results, fill the form, submit — result appears in the table immediately
4. Click "Update career goals", select at least one interest, add description, save — current version shows interests as Badge chips and description text
5. Type a note in the Notes textarea, click "Add note" — note appears in the list with your name and timestamp
6. Submit approval once all 6 sections work correctly
</human-check>
</verification>

<success_criteria>
- npx prisma db push succeeds; all 6 new tables verified in database
- migration.sql documents the full schema additions
- CareerGoalsSection: shows current version interests as Badge chips + description; collapsible version history; POST creates new version (D-16)
- NotesSection: inline textarea with {n}/500 counter; Add note disabled when empty; notes newest-first with displayName + datetime; no edit/delete (D-17)
- CareerInterestsChecklist: 12 items in 2-col grid; min-h-[44px] per item; controlled toggle array (D-14)
- StudentDetailPage: all 6 sections in D-02 order; gap-8 between sections
- ActivitiesSection, AwardsSection, WorkExperienceSection: description fields use shadcn Textarea component
- All stu-03 through stu-08 integration tests GREEN
</success_criteria>

<output>
Create `.planning/phases/03-student-records-ui/03-03b-SUMMARY.md` when done
</output>
