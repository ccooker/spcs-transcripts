---
phase: 03-student-records-ui
plan: 03a
type: execute
wave: 3
depends_on:
  - 03-02
files_modified:
  - server/prisma/schema.prisma
  - server/src/schemas/careerGoal.ts
  - server/src/schemas/staffNote.ts
  - server/src/services/careerGoal.ts
  - server/src/services/staffNote.ts
  - server/src/routes/careerGoals.ts
  - server/src/routes/notes.ts
  - server/src/routes/students.ts
  - server/src/__tests__/records.test.ts
  - server/src/__tests__/helpers/testDb.ts
autonomous: true
requirements:
  - STU-07
  - STU-08

must_haves:
  truths:
    - "RED integration tests for stu-07 (career goals) and stu-08 (staff notes) exist in records.test.ts and fail (no DB tables yet)"
    - "POST /api/students/:id/career-goals creates a new version row — not an update; no PATCH or DELETE routes registered (D-16)"
    - "GET /api/students/:id/career-goals returns all versions newest-first with author.displayName"
    - "POST /api/students/:id/notes creates a note — no PATCH or DELETE routes registered (D-17)"
    - "GET /api/students/:id/notes returns notes newest-first with author.displayName"
    - "careerGoal service exports only listCareerGoals + createCareerGoal — no update or delete functions"
    - "staffNote service exports only listStaffNotes + createStaffNote — no update or delete functions"
  artifacts:
    - path: "server/src/routes/careerGoals.ts"
      provides: "GET / and POST / only — no PATCH or DELETE (versioned pattern per D-16)"
      exports: ["default router"]
    - path: "server/src/routes/notes.ts"
      provides: "GET / and POST / only — no PATCH or DELETE (append-only per D-17)"
      exports: ["default router"]
    - path: "server/src/services/careerGoal.ts"
      provides: "listCareerGoals (with author.displayName), createCareerGoal (always new row) — no update or delete"
      exports: ["listCareerGoals", "createCareerGoal"]
    - path: "server/src/services/staffNote.ts"
      provides: "listStaffNotes (with author.displayName, newest-first), createStaffNote — no update or delete"
      exports: ["listStaffNotes", "createStaffNote"]
    - path: "server/src/schemas/careerGoal.ts"
      provides: "createCareerGoalSchema with interests array min(1) and description optional; no update schema"
      exports: ["CAREER_INTERESTS", "createCareerGoalSchema"]
    - path: "server/src/schemas/staffNote.ts"
      provides: "createStaffNoteSchema with content min(1) max(500); no update schema"
      exports: ["createStaffNoteSchema"]
    - path: "server/src/__tests__/records.test.ts"
      provides: "RED integration tests covering stu-07 and stu-08 scenarios including POST-only and append-only enforcement"
      contains: "describe('stu-07')"
  key_links:
    - from: "server/src/routes/students.ts"
      to: "server/src/routes/careerGoals.ts"
      via: "router.use('/:studentId/career-goals', careerGoalsRouter)"
      pattern: "router\\.use.*career-goals"
    - from: "server/src/routes/careerGoals.ts"
      to: "server/src/services/careerGoal.ts"
      via: "createCareerGoal — always creates new row, no update path"
      pattern: "createCareerGoal"
---

## Phase Goal

**As a** careers staff member, **I want to** enter and manage all six types of student record data from within a single student profile page, **so that** I can build a complete student profile without navigating away.

<objective>
Career Goals & Staff Notes server slice: write RED integration tests for stu-07 and stu-08 (including append-only and POST-only enforcement tests), add CareerGoal and StaffNote Prisma models to the existing schema (D-16 versioned pattern, D-17 append-only), implement all backend layers (Zod schemas, services exporting only list+create, routes with only GET+POST registered).

Purpose: Delivers the server half of the final two record types. Tests are intentionally RED until Plan 03-03b pushes the schema. Route omission (no PATCH/DELETE registered) is the enforcement mechanism for D-16 and D-17. Runs in Wave 3 after Plan 03-02 completes the Award + WorkExperience server backend.

Output: RED test stubs (stu-07, stu-08 including enforcement tests), CareerGoal + StaffNote backend (schema models, Zod, services with no update/delete, GET+POST-only routes mounted in students.ts).
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
@.planning/phases/03-student-records-ui/03-PATTERNS.md
@.planning/phases/03-student-records-ui/03-01-SUMMARY.md
@.planning/phases/03-student-records-ui/03-02-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: RED integration tests for career goals (stu-07) and staff notes (stu-08)</name>
  <files>
    server/src/__tests__/records.test.ts
    server/src/__tests__/helpers/testDb.ts
  </files>
  <read_first>
    - server/src/__tests__/records.test.ts — current state from Plan 03-02 (has stu-03–stu-06); append stu-07 and stu-08 describe blocks after stu-06 block
    - server/src/__tests__/helpers/testDb.ts — current clearDb(); extend to add careerGoal + staffNote deletes at the TOP (FK-safe: must delete before student)
    - server/prisma/schema.prisma — confirm CareerGoal and StaffNote models do NOT yet exist
  </read_first>
  <behavior>
    - stu-07-create: POST /api/students/:id/career-goals with interests:['ENGINEERING','IT_TECHNOLOGY'], description:'Targeting HKU' returns 201 with id, interests, description, author.displayName
    - stu-07-list: GET /api/students/:id/career-goals returns array sorted newest-first (index 0 is most recent)
    - stu-07-versioning: POST twice → GET returns 2 items, newest first; does NOT overwrite first entry
    - stu-07-no-patch: PATCH /api/students/:id/career-goals/:goalId returns 404 (route not registered — D-16 enforcement)
    - stu-07-no-delete: DELETE /api/students/:id/career-goals/:goalId returns 404
    - stu-07-empty-interests: POST with interests:[] returns 400 (min(1) validation)
    - stu-08-create: POST /api/students/:id/notes with content:'Test note' returns 201 with id, content, author.displayName, createdAt
    - stu-08-list: GET /api/students/:id/notes returns notes newest-first
    - stu-08-append-only-no-patch: PATCH /api/students/:id/notes/:noteId returns 404
    - stu-08-append-only-no-delete: DELETE /api/students/:id/notes/:noteId returns 404
    - stu-08-max-length: POST with content of 501 characters returns 400
    - stu-08-audit: POST /notes creates AuditLog row model:'StaffNote' action:'CREATE'
  </behavior>
  <action>
    In testDb.ts: extend clearDb() by adding prisma.staffNote.deleteMany() and prisma.careerGoal.deleteMany() at the very top of the function (before workExperience, award, etc.). Final FK-safe order: staffNote → careerGoal → workExperience → award → activity → academicResult → auditLog → student → user. Use @ts-expect-error stubs for staffNote and careerGoal types (models don't exist until Task 2).

    In records.test.ts: append stu-07 describe block after stu-06 block. Valid career goals payload: { interests:['ENGINEERING','IT_TECHNOLOGY'], description:'Targeting HKU Computer Science department' }. Include stu-07-versioning test: POST career-goals twice with different interests arrays, then GET and assert response[0].interests matches the second POST's interests and response.length === 2. Include stu-07-no-patch: request.patch(`/api/students/${student.id}/career-goals/fake-id`).set(auth).expect(404).

    Append stu-08 describe block. Valid note payload: { content:'Student shows strong aptitude for STEM subjects' }. Include stu-08-max-length: construct string of 501 'a' characters, POST → expect 400. Include stu-08-audit: after POST, check prisma.auditLog.findMany({ where:{ model:'StaffNote', action:'CREATE', recordId:res.body.id } }) has length 1.

    Tests MUST FAIL at this stage (routes don't exist → 404). That is the expected RED state — do not attempt to fix.
  </action>
  <verify>
    <automated>cd server && npm test -- --reporter=verbose 2>&1 | grep -E "(stu-07|stu-08|FAIL|PASS)" | head -20</automated>
  </verify>
  <done>records.test.ts has stu-07 and stu-08 describe blocks failing as expected; testDb.ts clearDb extended with careerGoal + staffNote deletes (or @ts-expect-error stubs)</done>
</task>

<task type="auto">
  <name>Task 2: CareerGoal + StaffNote — schema models, Prisma generate, Zod schemas, services (list+create only), routes (GET+POST only), students.ts mounts</name>
  <files>
    server/prisma/schema.prisma
    server/src/schemas/careerGoal.ts
    server/src/schemas/staffNote.ts
    server/src/services/careerGoal.ts
    server/src/services/staffNote.ts
    server/src/routes/careerGoals.ts
    server/src/routes/notes.ts
    server/src/routes/students.ts
    server/src/__tests__/helpers/testDb.ts
  </files>
  <read_first>
    - server/prisma/schema.prisma — current state after Plan 03-02 (has AcademicResult, Activity, Award, WorkExperience, AwardLevel enum, CareerInterest enum); append CareerGoal + StaffNote; check User model for existing back-relations to add careerGoalsAuthored + staffNotesAuthored named relations
    - server/src/services/award.ts — IDOR guard + logAudit pattern; note careerGoal service does NOT need IDOR guard (no update/delete paths)
    - server/src/routes/academicResults.ts — full file; careerGoals.ts and notes.ts mirror this structure minus PATCH/DELETE verbs
    - server/src/routes/students.ts — current mounts at bottom; add career-goals + notes mounts
    - .planning/phases/03-student-records-ui/03-RESEARCH.md — Pattern 1 (CareerGoal + StaffNote schema), Pattern 4 (versioned create service), Pattern 5 (append-only service), Pattern 7 (careerGoal + staffNote Zod schemas)
    - .planning/phases/03-student-records-ui/03-PATTERNS.md — careerGoal.ts and staffNote.ts service patterns; careerGoals.ts route pattern (GET+POST only)
  </read_first>
  <action>
    SCHEMA (server/prisma/schema.prisma): Append CareerGoal model: id String @id @default(uuid()), studentId String, student Student @relation(fields:[studentId], references:[id], onDelete:Cascade), interests CareerInterest[], description String? @db.VarChar(500), authorId String, author User @relation("CareerGoalAuthor", fields:[authorId], references:[id]), createdAt DateTime @default(now()). NOTE: NO updatedAt field — immutability signal for maintainers (D-16). Add @@index([studentId, createdAt(sort:Desc)]).

    Append StaffNote model: id String @id @default(uuid()), studentId String, student Student @relation(fields:[studentId], references:[id], onDelete:Cascade), content String @db.VarChar(500), authorId String, author User @relation("StaffNoteAuthor", fields:[authorId], references:[id]), createdAt DateTime @default(now()). NOTE: NO updatedAt field — append-only signal (D-17). Add @@index([studentId, createdAt(sort:Desc)]).

    Add back-relations to Student model: careerGoals CareerGoal[] and staffNotes StaffNote[].
    Add back-relations to User model: careerGoalsAuthored CareerGoal[] @relation("CareerGoalAuthor") and staffNotesAuthored StaffNote[] @relation("StaffNoteAuthor"). Read existing User model first to place alongside existing relations without overwriting.

    RUN: cd server && npx prisma generate (regenerates client types including CareerGoal and StaffNote)

    testDb.ts: replace @ts-expect-error stubs for careerGoal and staffNote with real deleteMany calls now that types exist.

    SCHEMAS: Create server/src/schemas/careerGoal.ts — export const CAREER_INTERESTS = ['MEDICINE_HEALTH','LAW','ENGINEERING','BUSINESS_FINANCE','EDUCATION','ARTS_DESIGN','SCIENCE_RESEARCH','IT_TECHNOLOGY','HOSPITALITY','SOCIAL_SERVICES','SPORTS','UNDECIDED'] as const. createCareerGoalSchema: z.object({ interests: z.array(z.enum(CAREER_INTERESTS)).min(1, 'Select at least one interest area'), description: z.string().trim().max(500).optional() }).strict(). NO update schema — career goals are POST-only (D-16).

    Create server/src/schemas/staffNote.ts — createStaffNoteSchema: z.object({ content: z.string().trim().min(1).max(500) }).strict(). NO update schema — staff notes are append-only (D-17).

    SERVICES: Create server/src/services/careerGoal.ts — import PrismaClient type from '../generated/prisma/client.js'; import logAudit from './audit.js'. listCareerGoals(prisma, studentId): prisma.careerGoal.findMany({ where:{ studentId }, include:{ author:{ select:{ displayName:true } } }, orderBy:{ createdAt:'desc' } }). createCareerGoal(prisma, studentId, data:{ interests:CareerInterest[], description?:string }, userId): prisma.careerGoal.create({ data:{ studentId, authorId:userId, interests:data.interests, description:data.description??null }, include:{ author:{ select:{ displayName:true } } } }), then logAudit(prisma, { userId, action:'CREATE', model:'CareerGoal', recordId:goal.id }); return goal. NO updateCareerGoal or deleteCareerGoal — their absence enforces D-16.

    Create server/src/services/staffNote.ts — listStaffNotes(prisma, studentId): findMany where studentId, include author.displayName, orderBy createdAt desc. createStaffNote(prisma, studentId, content:string, userId): create note with studentId + authorId:userId + content, logAudit model:'StaffNote' action:'CREATE', return note with author included. NO update or delete functions.

    ROUTES: Create server/src/routes/careerGoals.ts — Router({ mergeParams:true }). Copy parseStudentId helper from students.ts (reads req.params.studentId). Register ONLY: router.get('/', ...) and router.post('/', ...). DO NOT register router.patch() or router.delete() — route omission is the D-16 enforcement mechanism. GET: call listCareerGoals(prisma, studentId), return array as JSON. POST: safeParse createCareerGoalSchema; on fail: res.status(400).json({ errors }); call createCareerGoal(prisma, studentId, parsed.data, req.user!.id); res.status(201).json(goal).

    Create server/src/routes/notes.ts — identical structure. Router({ mergeParams:true }). ONLY GET and POST registered (D-17 enforcement by omission). POST: safeParse createStaffNoteSchema, call createStaffNote(prisma, studentId, parsed.data.content, req.user!.id), res.status(201).json(note).

    MOUNT: In server/src/routes/students.ts, append: import careerGoalsRouter from './careerGoals.js'; import notesRouter from './notes.js'; router.use('/:studentId/career-goals', careerGoalsRouter); router.use('/:studentId/notes', notesRouter).
  </action>
  <acceptance_criteria>
    - server/prisma/schema.prisma: model CareerGoal has NO updatedAt field; model StaffNote has NO updatedAt field
    - server/prisma/schema.prisma: CareerGoal has interests CareerInterest[] and authorId+author User relation named "CareerGoalAuthor"; User model has careerGoalsAuthored relation
    - server/src/services/careerGoal.ts: does NOT export updateCareerGoal or deleteCareerGoal
    - server/src/services/staffNote.ts: does NOT export updateStaffNote or deleteStaffNote
    - server/src/routes/careerGoals.ts: does NOT contain router.patch or router.delete
    - server/src/routes/notes.ts: does NOT contain router.patch or router.delete
    - server/src/schemas/careerGoal.ts: interests field has .min(1, ...) validation
    - server/src/routes/students.ts: contains `router.use('/:studentId/career-goals'` and `router.use('/:studentId/notes'`
    - `cd server && npx tsc --noEmit` exits 0
    - stu-07 and stu-08 tests visible in `npm test -- --reporter=verbose` output showing FAIL (not compile error)
  </acceptance_criteria>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1 | tail -5 && echo "TypeScript OK"</automated>
  </verify>
  <done>CareerGoal + StaffNote models in schema; prisma generate run; services export only list+create; routes have only GET+POST registered; students.ts mounts both; testDb clearDb complete; server TypeScript compiles</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → /api/students/:id/career-goals | Untrusted POST only; no mutation routes registered; JWT auth inherited |
| client → /api/students/:id/notes | Untrusted POST only; no mutation routes; append-only enforced by route omission |
| service layer → Prisma (CareerGoal create) | Server-internal: always creates new row; no update path exists in service or route |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-11 | Tampering | careerGoals route — attempt to PATCH/DELETE career goal version | mitigate | No PATCH or DELETE routes registered on careerGoalsRouter; any attempt returns 404 (D-16 verified by stu-07-no-patch and stu-07-no-delete tests) |
| T-03-12 | Tampering | notes route — attempt to PATCH/DELETE a note | mitigate | No PATCH or DELETE routes registered on notesRouter; append-only enforced by omission (D-17 verified by stu-08-append-only tests) |
| T-03-13 | Tampering | career goals POST — mass assignment on interests array | mitigate | Zod createCareerGoalSchema with .strict(); interests validated as z.array(z.enum(CAREER_INTERESTS)); unknown fields rejected 400 |
| T-03-14 | Repudiation | careerGoal + staffNote create | mitigate | logAudit() called in service after every create; model:'CareerGoal' and model:'StaffNote'; authorId recorded on row (not just in audit log) |
| T-03-15 | Info Disclosure | career goals response includes author.displayName | accept | DisplayName is not sensitive PII; required for attribution display (D-16, D-19); no email or user ID leaked |
| T-03-SC | Tampering | npm installs | mitigate | No new npm packages in this plan; all dependencies established in prior plans |
</threat_model>

<verification>
- `cd server && npm test -- --reporter=verbose 2>&1 | grep -E "stu-07|stu-08"` shows RED (failing) test output
- `cd server && npx tsc --noEmit` exits 0
- `grep -v "^[[:space:]]*//" server/src/routes/careerGoals.ts | grep "router\.patch\|router\.delete"` returns no results
- `grep -v "^[[:space:]]*//" server/src/routes/notes.ts | grep "router\.patch\|router\.delete"` returns no results
- `grep "updateCareerGoal\|deleteCareerGoal" server/src/services/careerGoal.ts` returns no results
- server/src/routes/students.ts contains `router.use('/:studentId/career-goals'` and `router.use('/:studentId/notes'`
</verification>

<success_criteria>
- CareerGoal model in schema: interests CareerInterest[] field, authorId FK with named relation "CareerGoalAuthor", no updatedAt field (D-16)
- StaffNote model in schema: content VarChar(500), authorId FK with named relation "StaffNoteAuthor", no updatedAt field (D-17)
- careerGoal.ts service: exports ONLY listCareerGoals + createCareerGoal; no update or delete functions
- staffNote.ts service: exports ONLY listStaffNotes + createStaffNote; no update or delete functions
- careerGoals.ts route: GET + POST only; no PATCH or DELETE registered
- notes.ts route: GET + POST only; no PATCH or DELETE registered
- students.ts mounts career-goals and notes sub-routers
- RED tests for stu-07 and stu-08 exist and fail as expected (routes not yet backed by DB tables)
</success_criteria>

<output>
Create `.planning/phases/03-student-records-ui/03-03a-SUMMARY.md` when done
</output>
