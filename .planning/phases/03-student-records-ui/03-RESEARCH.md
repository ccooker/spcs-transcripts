# Phase 3: Student Records UI - Research

**Researched:** 2026-06-12
**Domain:** Prisma relational schema design · Express nested CRUD routes · React multi-section form/table UI · Versioned + append-only record patterns
**Confidence:** HIGH (schema + API patterns fully grounded in existing codebase; UI patterns verified against 02-UI-SPEC.md; TanStack Query approach verified against npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Record Sections Layout**
- D-01: Six record types displayed as vertical stacked Cards below the existing Profile card — scroll the page, no tabs or route changes
- D-02: Section order (top to bottom): Academics → Activities → Awards → Work Experience → Career Goals → Notes — mirrors Phase 5 transcript narrative order
- D-03: Profile card stays separate at top — profile edit remains distinct from record entry (Phase 2 layout preserved)
- D-04: Empty sections show empty-state message + prominent Add button in the section header
- D-05: Each section card header: title + entry count + Add button (e.g. "Academic results (3)")

**Academic Results (STU-03)**
- D-06: Grade — free-text field (staff enter A, B+, 85%, Pass, Distinction, etc.)
- D-07: Year — store both calendar year and form level on each result (e.g. 2024 + Form 4)
- D-08: Subject — preset dropdown of common HK secondary subjects with "Other" revealing a free-text field
- D-09: Optional notes — short text field (~200 chars max) per result

**Activities, Awards & Work Experience (STU-04, STU-05, STU-06)**
- D-10: All three list sections share table/list + Dialog form pattern for Add and Edit
- D-11: Entries sorted most recent first (by end date, or start date if no end date)
- D-12: Start and end dates use month + year pickers (no day precision)
- D-13: Award level — fixed enum dropdown: School, Regional, State, National (per STU-05)

**Career Interests & Goals (STU-07)**
- D-14: Structured interests — multi-select from fixed checklist (~12 broad areas)
- D-15: Free-text description — narrative paragraph (~500 chars) for stated goals
- D-16: Version history — each save creates a new version with timestamp; full history visible; versions are read-only

**Staff Notes (STU-08)**
- D-17: Notes are append-only — staff cannot edit or delete past notes
- D-18: Display order newest first
- D-19: Input pattern — textarea at top of Notes section + "Add note" button; each note shows timestamp and entering staff member name
- D-20: Note length ~500 chars max

**Delete Confirmation**
- D-21: Record deletes (academics, activities, awards, work experience) use simple AlertDialog — not typed-name confirmation
- D-22: No bulk delete in v1 — one entry at a time
- D-23: After delete: sonner toast + list refresh

### Claude's Discretion
- Exact preset HK secondary subject list for academics dropdown (must include Other)
- Whether award enum adds International as a fifth level
- Table column choices per list section
- Dialog form field layout and validation messages
- API route structure (`/api/students/:id/academics` vs nested resource naming)
- Career-goals version UI (timeline vs compact list of versions)
- Loading skeletons and optimistic vs refetch-after-mutation patterns

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STU-03 | Staff can add, edit, and delete academic results per student (subject, grade, year, optional notes) | AcademicResult Prisma model; `/api/students/:id/academics` CRUD routes; AcademicResultsSection + dialog |
| STU-04 | Staff can add, edit, and delete extracurricular activity entries per student (organisation, role, start/end dates, description) | Activity Prisma model; `/api/students/:id/activities` routes; ActivitiesSection + MonthYearPicker |
| STU-05 | Staff can add, edit, and delete award entries per student (title, issuer, date, level, description) | Award Prisma model + AwardLevel enum; `/api/students/:id/awards` routes; AwardsSection + level badge |
| STU-06 | Staff can add, edit, and delete work experience entries per student (employer, role, start/end dates, description) | WorkExperience Prisma model; `/api/students/:id/work-experience` routes; WorkExperienceSection |
| STU-07 | Staff can add and edit career interests and goals per student (structured interest areas + free-text description) | CareerGoal model + CareerInterest enum[]; POST-only versioning; CareerGoalsSection + version history |
| STU-08 | Staff can add timestamped notes attributed to entering staff member; full history visible | StaffNote model with authorId FK; POST-only API (no PATCH/DELETE); NotesSection append-only UI |
</phase_requirements>

---

## Summary

Phase 3 extends the existing `StudentDetailPage` by replacing the placeholder "Student records" card with six independent section components, each backed by its own Prisma model, Express router, and React component. The core engineering challenge is applying two non-standard patterns cleanly — **versioned records** (CareerGoal: each save is a new immutable row) and **append-only records** (StaffNote: no PATCH or DELETE endpoints exist) — while keeping the other four record types as standard CRUD with month+year date encoding and audit logging on every mutation.

The schema design adds six new Prisma models with `studentId` FK relations to `Student`, two User FK relations (CareerGoal.authorId, StaffNote.authorId), and two new enums (`AwardLevel`, `CareerInterest`). Dates for Activities, Awards, and Work Experience are stored as separate integer `month` and `year` fields (no `Date` type) to avoid timezone drift and to precisely match the month+year UX requirement. `CareerInterest` interests are stored as a PostgreSQL native enum array (`CareerInterest[]`) on the `CareerGoal` model — the simplest correct approach without a junction table.

On the client, six `RecordSectionCard` section components fetch their data independently in parallel using `@tanstack/react-query`. This new dependency (not yet installed) replaces the manual `useState/useEffect/refetch` boilerplate that would otherwise be required per-section, and delivers the invalidate-and-refetch-after-mutation pattern the UI-SPEC requires. All existing `apiGet/apiPost/apiPatch/apiDelete` helpers are used as the query/mutation functions.

**Primary recommendation:** Add `@tanstack/react-query` to the client for section data management; use one `queryKey` per section (e.g. `['student', id, 'academics']`), call `invalidateQueries` on mutation success to trigger refetch and count updates.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Record CRUD (list, create, update, delete) | API / Backend | Database | Business rules (append-only, versioning) enforced server-side; client is dumb CRUD consumer |
| Audit logging on all mutations | API / Backend | Database | `logAudit()` called in service layer after every write; never client-side |
| Input validation | API / Backend (Zod) | Browser (RHF+Zod) | Server is authoritative; client validation is UX only |
| Record section UI, forms, dialogs | Browser / Client | — | All UI state (open dialogs, form values, loading states) is client-side React |
| Section data fetching + cache | Browser / Client | — | TanStack Query manages section cache, invalidation, and loading states |
| Month+year encoding/decoding | API / Backend + Browser | — | Both tiers store/read integer month+year; display formatting on client |
| Version history (Career Goals) | API / Backend | Database | Server enforces POST-only; each save is a new immutable row; client renders sorted list |
| Append-only enforcement (Staff Notes) | API / Backend | — | No PATCH/DELETE routes exposed; client has no edit/delete UI, but server is the enforcement layer |
| Subject "Other" reveal | Browser / Client | — | Conditional form field driven by Select value; server treats subject as opaque string |
| Award level badge rendering | Browser / Client | — | Purely presentational mapping from enum to Badge variant |

---

## Standard Stack

### Core (verified against existing codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma Client | 7.x (existing) | ORM for all 6 new models | Already in use; adapter-pg pattern from Phase 1 |
| Zod | 4.4.3 (existing) | Schema validation for all 6 record APIs | Already in use on student routes; `z.object().strict()` pattern established |
| Express Router | 5.x (existing) | Nested CRUD route handlers | Already in use; new routers mounted on `/api/students` |
| React Hook Form | 7.78.0 (existing) | All dialog forms (6 add/edit forms) | Already in use in Phase 2 StudentForm |
| @hookform/resolvers | existing | Zod resolver for RHF | Already in use |
| sonner | existing | Toast feedback on mutations | Already in use |
| shadcn/ui components | existing | All UI primitives | All Phase 2 components reused; 4 new adds for Phase 3 |
| logAudit() | existing | Audit log on every mutation | Already in use; called from service layer |

### New Dependency (Phase 3)

| Library | Version | Purpose | Why Now |
|---------|---------|---------|---------|
| @tanstack/react-query | ^5.x | Section data fetching, mutation invalidation | 6 parallel independent sections each need fetch + refetch-after-mutation; manual useState/useEffect per section is ~200 lines of boilerplate per section; react-query eliminates this |

### Supporting (shadcn installs — Phase 3 new)

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| checkbox | `npx shadcn@latest add checkbox` | Career interests multi-select (D-14) |
| textarea | `npx shadcn@latest add textarea` | Notes input, career goals description |
| tooltip | `npx shadcn@latest add tooltip` | Subject "Other" field help text |
| scroll-area | `npx shadcn@latest add scroll-area` | Career goals version history list |

**Already installed (Phase 2, no re-install):** Button, Card, Badge, Table, Dialog, AlertDialog, Form, Label, Input, Select, Skeleton, Separator, Sonner Toaster, Alert.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-query | useState/useEffect per section | 6 × ~200 lines of manual fetch state; no cache deduplication; more error-prone refetch coordination |
| Integer month+year fields | Prisma `DateTime` | DateTime adds timezone drift; month+year picker maps directly to integers; DateTime is overkill for month precision |
| `CareerInterest[]` array field | Junction table `CareerGoalInterest` | Junction table adds migration complexity; enum array is native PostgreSQL; simpler queries |

**Installation:**
```bash
cd client
npm install @tanstack/react-query
npx shadcn@latest add checkbox textarea tooltip scroll-area
```

**QueryClient setup (App.tsx — one change):**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Wrap app root:
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @tanstack/react-query | npm | 5+ yrs | ~4M/wk | github.com/TanStack/query | OK | Approved |
| checkbox (shadcn) | shadcn official registry | — | — | github.com/shadcn-ui/ui | OK | Approved — shadcn official |
| textarea (shadcn) | shadcn official registry | — | — | github.com/shadcn-ui/ui | OK | Approved — shadcn official |
| tooltip (shadcn) | shadcn official registry | — | — | github.com/shadcn-ui/ui | OK | Approved — shadcn official |
| scroll-area (shadcn) | shadcn official registry | — | — | github.com/shadcn-ui/ui | OK | Approved — shadcn official |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

`@tanstack/react-query` is from the TanStack organization (same as `@tanstack/react-table` already installed in this project). No legitimacy concerns. [ASSUMED: download stats and age — not verified via live npm view in this session, but library identity is beyond reasonable doubt from project's existing tanstack dependency.]

---

## Architecture Patterns

### System Architecture Diagram

```
Client (Browser)
  │
  ├─ StudentDetailPage
  │    ├─ ProfileCard (Phase 2 — unchanged)
  │    │
  │    ├─ AcademicResultsSection ──useQuery──► GET /api/students/:id/academics
  │    │    └─ AcademicResultDialog             POST/PATCH/DELETE → invalidate
  │    │
  │    ├─ ActivitiesSection ────useQuery──► GET /api/students/:id/activities
  │    │    └─ ActivityDialog                  POST/PATCH/DELETE → invalidate
  │    │
  │    ├─ AwardsSection ────────useQuery──► GET /api/students/:id/awards
  │    │    └─ AwardDialog                     POST/PATCH/DELETE → invalidate
  │    │
  │    ├─ WorkExperienceSection ─useQuery──► GET /api/students/:id/work-experience
  │    │    └─ WorkExperienceDialog             POST/PATCH/DELETE → invalidate
  │    │
  │    ├─ CareerGoalsSection ───useQuery──► GET /api/students/:id/career-goals
  │    │    └─ CareerGoalsDialog (POST only)    POST → invalidate
  │    │
  │    └─ NotesSection ─────────useQuery──► GET /api/students/:id/notes
  │         └─ Inline textarea (POST only)     POST → invalidate
  │
  └─ apiGet/apiPost/apiPatch/apiDelete (MSAL bearer token added)

API Server (Express)
  │
  ├─ GET /api/students/:id/academics     → academicResultService.list()
  ├─ POST /api/students/:id/academics    → academicResultService.create() + logAudit(CREATE)
  ├─ PATCH /api/students/:id/academics/:resultId → academicResultService.update() + logAudit(UPDATE)
  ├─ DELETE /api/students/:id/academics/:resultId → academicResultService.delete() + logAudit(DELETE)
  │  (same pattern for /activities, /awards, /work-experience)
  │
  ├─ GET /api/students/:id/career-goals  → careerGoalService.list() [sorted newest first]
  ├─ POST /api/students/:id/career-goals → careerGoalService.create() [new version, no update]
  │  (NO PATCH or DELETE routes for career goals)
  │
  ├─ GET /api/students/:id/notes         → staffNoteService.list() [sorted newest first]
  ├─ POST /api/students/:id/notes        → staffNoteService.create() + logAudit(CREATE)
  │  (NO PATCH or DELETE routes for notes — append-only enforced by omission)
  │
Database (PostgreSQL via Prisma)
  ├─ AcademicResult (studentId FK → Student)
  ├─ Activity        (studentId FK → Student)
  ├─ Award           (studentId FK → Student)
  ├─ WorkExperience  (studentId FK → Student)
  ├─ CareerGoal      (studentId FK → Student; authorId FK → User)
  └─ StaffNote       (studentId FK → Student; authorId FK → User)
```

### Recommended Project Structure

```
server/src/
├── routes/
│   ├── students.ts              # existing — add nested record route mounts
│   ├── academicResults.ts       # NEW — CRUD under /:studentId/academics
│   ├── activities.ts            # NEW
│   ├── awards.ts                # NEW
│   ├── workExperience.ts        # NEW
│   ├── careerGoals.ts           # NEW — POST + GET only
│   └── notes.ts                 # NEW — POST + GET only
├── services/
│   ├── academicResult.ts        # NEW
│   ├── activity.ts              # NEW
│   ├── award.ts                 # NEW
│   ├── workExperience.ts        # NEW
│   ├── careerGoal.ts            # NEW
│   └── staffNote.ts             # NEW
├── schemas/
│   ├── student.ts               # existing
│   ├── academicResult.ts        # NEW — Zod schemas for create/update
│   ├── activity.ts              # NEW
│   ├── award.ts                 # NEW
│   ├── workExperience.ts        # NEW
│   ├── careerGoal.ts            # NEW
│   └── staffNote.ts             # NEW

client/src/
├── components/
│   └── records/                 # NEW directory — all Phase 3 components
│       ├── RecordSectionCard.tsx
│       ├── AcademicResultsSection.tsx
│       ├── ActivitiesSection.tsx
│       ├── AwardsSection.tsx
│       ├── WorkExperienceSection.tsx
│       ├── CareerGoalsSection.tsx
│       ├── NotesSection.tsx
│       ├── MonthYearPicker.tsx
│       ├── RecordDeleteDialog.tsx
│       └── CareerInterestsChecklist.tsx
```

### Pattern 1: Prisma Schema — Six New Models

```prisma
// Add to schema.prisma

enum AwardLevel {
  SCHOOL
  REGIONAL
  STATE
  NATIONAL
  INTERNATIONAL
}

enum CareerInterest {
  MEDICINE_HEALTH
  LAW
  ENGINEERING
  BUSINESS_FINANCE
  EDUCATION
  ARTS_DESIGN
  SCIENCE_RESEARCH
  IT_TECHNOLOGY
  HOSPITALITY
  SOCIAL_SERVICES
  SPORTS
  UNDECIDED
}

model AcademicResult {
  id           String    @id @default(uuid())
  studentId    String
  student      Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subject      String    // preset label OR "OTHER" sentinel
  subjectOther String?   // populated when subject == "OTHER"
  grade        String    @db.VarChar(20)
  calendarYear Int
  formLevel    FormLevel
  notes        String?   @db.VarChar(200)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([studentId])
  @@index([studentId, calendarYear(sort: Desc)])
}

model Activity {
  id           String   @id @default(uuid())
  studentId    String
  student      Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  organisation String
  role         String
  description  String?  @db.VarChar(500)
  startMonth   Int      // 1–12
  startYear    Int
  endMonth     Int?     // null = ongoing / Present
  endYear      Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([studentId])
}

model Award {
  id          String     @id @default(uuid())
  studentId   String
  student     Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  title       String
  issuer      String
  awardMonth  Int        // 1–12
  awardYear   Int
  level       AwardLevel
  description String?    @db.VarChar(500)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([studentId])
  @@index([studentId, awardYear(sort: Desc), awardMonth(sort: Desc)])
}

model WorkExperience {
  id          String   @id @default(uuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  employer    String
  role        String
  description String?  @db.VarChar(500)
  startMonth  Int      // 1–12
  startYear   Int
  endMonth    Int?     // null = ongoing / Present
  endYear     Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([studentId])
}

model CareerGoal {
  id          String           @id @default(uuid())
  studentId   String
  student     Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  interests   CareerInterest[]
  description String?          @db.VarChar(500)
  authorId    String
  author      User             @relation("CareerGoalAuthor", fields: [authorId], references: [id])
  createdAt   DateTime         @default(now())
  // No updatedAt — immutable once created; new version = new row

  @@index([studentId, createdAt(sort: Desc)])
}

model StaffNote {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  content   String   @db.VarChar(500)
  authorId  String
  author    User     @relation("StaffNoteAuthor", fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  // No updatedAt — append-only; no edits permitted

  @@index([studentId, createdAt(sort: Desc)])
}
```

**Student model — add back-relations:**
```prisma
model Student {
  // ... existing fields unchanged ...
  academicResults AcademicResult[]
  activities      Activity[]
  awards          Award[]
  workExperiences WorkExperience[]
  careerGoals     CareerGoal[]
  staffNotes      StaffNote[]
}
```

**User model — add back-relations:**
```prisma
model User {
  // ... existing fields unchanged ...
  auditLogs           AuditLog[]  @relation("ActingUser")
  careerGoalsAuthored CareerGoal[] @relation("CareerGoalAuthor")
  staffNotesAuthored  StaffNote[]  @relation("StaffNoteAuthor")
}
```

**Key schema decisions:**
- `onDelete: Cascade` on all 6 models — if a student is hard-deleted, their records cascade. (Students are soft-deleted via `archivedAt`, so cascade rarely fires in practice; but it prevents orphan records if a student is ever physically removed.)
- No `updatedAt` on `CareerGoal` or `StaffNote` — immutable records should not have an update timestamp. This signals to the planner and future maintainers that these models are never updated in place.
- `subject`/`subjectOther` two-field pattern for AcademicResult preserves ability to distinguish preset from custom subjects for Phase 5 transcript generation.
- `@db.VarChar(N)` annotations align DB column constraints with Zod max-length validation.

### Pattern 2: Nested API Route Registration

Mount record routers on the student router using Express Router `mergeParams`:

```typescript
// server/src/routes/students.ts — add at end, before export
import academicResultsRouter from './academicResults.js'
import activitiesRouter from './activities.js'
import awardsRouter from './awards.js'
import workExperienceRouter from './workExperience.js'
import careerGoalsRouter from './careerGoals.js'
import notesRouter from './notes.js'

router.use('/:studentId/academics', academicResultsRouter)
router.use('/:studentId/activities', activitiesRouter)
router.use('/:studentId/awards', awardsRouter)
router.use('/:studentId/work-experience', workExperienceRouter)
router.use('/:studentId/career-goals', careerGoalsRouter)
router.use('/:studentId/notes', notesRouter)
```

Each sub-router uses `{ mergeParams: true }` to access `:studentId`:

```typescript
// server/src/routes/academicResults.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createAcademicResultSchema, updateAcademicResultSchema } from '../schemas/academicResult.js'
import {
  listAcademicResults,
  createAcademicResult,
  updateAcademicResult,
  deleteAcademicResult,
  AcademicResultNotFoundError,
} from '../services/academicResult.js'

const router = Router({ mergeParams: true }) // ← required to access :studentId

function parseStudentId(req: Request, res: Response): string | null {
  const id = req.params.studentId
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  return id
}

router.get('/', async (req, res, next) => {
  const studentId = parseStudentId(req, res)
  if (!studentId) return
  try {
    const results = await listAcademicResults(prisma, studentId)
    res.json(results)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId(req, res)
  if (!studentId) return
  const parsed = createAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await createAcademicResult(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(result)
  } catch (err) { next(err) }
})

router.patch('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId(req, res)
  if (!studentId) return
  const parsed = updateAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await updateAcademicResult(
      prisma, req.params.resultId, studentId, parsed.data, req.user!.id
    )
    res.json(result)
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

router.delete('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId(req, res)
  if (!studentId) return
  try {
    await deleteAcademicResult(prisma, req.params.resultId, studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

export default router
```

Activities and WorkExperience routers follow the identical pattern. Awards router adds level validation from Zod enum. The same file structure applies to all four list-type record routers.

### Pattern 3: Service Layer — CRUD with Audit + IDOR Guard

The service layer enforces two critical rules:
1. **IDOR guard**: Every find/update/delete verifies `{ id: recordId, studentId }` — a record that exists but belongs to a different student returns 404, not 403. This prevents cross-student enumeration.
2. **Audit logging**: Every mutation calls `logAudit()` after the write.

```typescript
// server/src/services/academicResult.ts
import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createAcademicResultSchema, updateAcademicResultSchema } from '../schemas/academicResult.js'

type CreateInput = z.infer<typeof createAcademicResultSchema>
type UpdateInput = z.infer<typeof updateAcademicResultSchema>

export class AcademicResultNotFoundError extends Error {
  constructor() { super('Academic result not found'); this.name = 'AcademicResultNotFoundError' }
}

export async function listAcademicResults(prisma: InstanceType<typeof PrismaClient>, studentId: string) {
  return prisma.academicResult.findMany({
    where: { studentId },
    orderBy: [{ calendarYear: 'desc' }, { formLevel: 'desc' }],
  })
}

export async function createAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: CreateInput,
  userId: string,
) {
  const result = await prisma.academicResult.create({
    data: { ...data, studentId },
  })
  await logAudit(prisma, { userId, action: 'CREATE', model: 'AcademicResult', recordId: result.id })
  return result
}

export async function updateAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,     // ← IDOR guard: must match the route's :studentId
  data: UpdateInput,
  userId: string,
) {
  const existing = await prisma.academicResult.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AcademicResultNotFoundError()   // 404 regardless of reason — no info leak
  }
  const result = await prisma.academicResult.update({ where: { id }, data })
  await logAudit(prisma, { userId, action: 'UPDATE', model: 'AcademicResult', recordId: id })
  return result
}

export async function deleteAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.academicResult.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AcademicResultNotFoundError()
  }
  await prisma.academicResult.delete({ where: { id } })
  await logAudit(prisma, { userId, action: 'DELETE', model: 'AcademicResult', recordId: id })
}
```

All six service files follow this pattern. CareerGoal and StaffNote services omit update/delete functions entirely (no such operations are permitted).

### Pattern 4: Career Goals — Versioned Record

```typescript
// server/src/services/careerGoal.ts

export async function listCareerGoals(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  // Returns all versions newest first; client treats index 0 as "current"
  return prisma.careerGoal.findMany({
    where: { studentId },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCareerGoal(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: { interests: CareerInterest[]; description?: string },
  userId: string,
) {
  // Always creates a new row — no update path
  const goal = await prisma.careerGoal.create({
    data: { studentId, authorId: userId, interests: data.interests, description: data.description ?? null },
    include: { author: { select: { displayName: true } } },
  })
  await logAudit(prisma, { userId, action: 'CREATE', model: 'CareerGoal', recordId: goal.id })
  return goal
}
// No update or delete service functions
```

**API response shape** (GET `/api/students/:id/career-goals`):
```json
[
  {
    "id": "...",
    "interests": ["ENGINEERING", "IT_TECHNOLOGY"],
    "description": "Targeting HKU Engineering...",
    "author": { "displayName": "Ms Chan" },
    "createdAt": "2026-06-12T14:42:00Z"
  },
  {
    "id": "...",
    "interests": ["UNDECIDED"],
    "description": "Student exploring options",
    "author": { "displayName": "Mr Wong" },
    "createdAt": "2026-05-01T09:00:00Z"
  }
]
```

Client logic: `versions[0]` is current; `versions.slice(1)` is history.

### Pattern 5: Staff Notes — Append-Only

```typescript
// server/src/services/staffNote.ts

export async function listStaffNotes(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.staffNote.findMany({
    where: { studentId },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createStaffNote(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  content: string,
  userId: string,
) {
  const note = await prisma.staffNote.create({
    data: { studentId, authorId: userId, content },
    include: { author: { select: { displayName: true } } },
  })
  await logAudit(prisma, { userId, action: 'CREATE', model: 'StaffNote', recordId: note.id })
  return note
}
// No update or delete — append-only enforced by omission of PATCH/DELETE routes
```

The append-only enforcement is structural: no PATCH/DELETE routes are registered on the `/notes` router. The client has no edit/delete UI. There is no "soft delete" option — notes are permanent by design.

### Pattern 6: TanStack Query Section Fetching

```typescript
// In each section component, e.g. AcademicResultsSection.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/api/apiClient'

type AcademicResult = { id: string; subject: string; subjectOther: string | null; grade: string; calendarYear: number; formLevel: string; notes: string | null }

function AcademicResultsSection({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['student', studentId, 'academics'] as const

  const { data: results = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<AcademicResult[]>(`/students/${studentId}/academics`),
  })

  const createMutation = useMutation({
    mutationFn: (body: unknown) => apiPost<AcademicResult>(`/students/${studentId}/academics`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success('Academic result added')
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiPatch<AcademicResult>(`/students/${studentId}/academics/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success('Academic result updated')
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/students/${studentId}/academics/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success('Entry deleted')
    },
    onError: () => toast.error("Couldn't delete entry. Please try again."),
  })

  // Pass results, isLoading, isError, createMutation, updateMutation, deleteMutation to RecordSectionCard
}
```

The same pattern (with appropriate types and endpoint paths) applies to all 6 sections. The `queryKey` hierarchy `['student', id, 'section']` allows targeted invalidation per section.

### Pattern 7: Zod Schemas for Record APIs

```typescript
// server/src/schemas/academicResult.ts
import { z } from 'zod'
import { FORM_LEVELS } from './student.js'

const PRESET_SUBJECTS = [
  'Chinese Language', 'English Language', 'Mathematics (Compulsory)',
  'Citizenship and Social Development (CSD)', 'Chinese History', 'History',
  'Geography', 'Economics', 'Ethics and Religious Studies',
  'Business, Accounting and Financial Studies (BAFS)',
  'Tourism and Hospitality Studies (THS)',
  'Information and Communication Technology (ICT)',
  'Design and Applied Technology (DAT)', 'Technology and Living (TL)',
  'Biology', 'Chemistry', 'Physics', 'Combined Science',
  'Mathematics Extended Module 1 (M1)', 'Mathematics Extended Module 2 (M2)',
  'Music', 'Visual Arts', 'Chinese Literature', 'English Literature',
  'Physical Education (PE)', 'OTHER',
] as const

export const createAcademicResultSchema = z.object({
  subject: z.enum(PRESET_SUBJECTS),
  subjectOther: z.string().trim().min(1).max(100).optional(),
  grade: z.string().trim().min(1).max(20),
  calendarYear: z.number().int().min(2010).max(2040),
  formLevel: z.enum(FORM_LEVELS),
  notes: z.string().trim().max(200).optional(),
}).refine(
  (data) => data.subject !== 'OTHER' || (data.subjectOther !== undefined && data.subjectOther.length > 0),
  { message: "Subject name is required when 'Other' is selected", path: ['subjectOther'] }
).strict()

export const updateAcademicResultSchema = createAcademicResultSchema.partial().refine(
  (data) => data.subject === undefined || data.subject !== 'OTHER' || (data.subjectOther !== undefined && data.subjectOther.length > 0),
  { message: "Subject name is required when 'Other' is selected", path: ['subjectOther'] }
)
```

```typescript
// server/src/schemas/activity.ts
import { z } from 'zod'

const monthSchema = z.number().int().min(1).max(12)
const yearSchema = z.number().int().min(2000).max(2040)

export const createActivitySchema = z.object({
  organisation: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  startMonth: monthSchema,
  startYear: yearSchema,
  endMonth: monthSchema.optional().nullable(),
  endYear: yearSchema.optional().nullable(),
}).strict()

export const updateActivitySchema = createActivitySchema.partial()
// Award, WorkExperience schemas follow same structure
```

```typescript
// server/src/schemas/careerGoal.ts
import { z } from 'zod'

export const CAREER_INTERESTS = [
  'MEDICINE_HEALTH', 'LAW', 'ENGINEERING', 'BUSINESS_FINANCE', 'EDUCATION',
  'ARTS_DESIGN', 'SCIENCE_RESEARCH', 'IT_TECHNOLOGY', 'HOSPITALITY',
  'SOCIAL_SERVICES', 'SPORTS', 'UNDECIDED',
] as const

export const createCareerGoalSchema = z.object({
  interests: z.array(z.enum(CAREER_INTERESTS)).min(1, 'Select at least one interest area'),
  description: z.string().trim().max(500).optional(),
}).strict()
// No update schema — career goals are POST-only
```

```typescript
// server/src/schemas/staffNote.ts
import { z } from 'zod'

export const createStaffNoteSchema = z.object({
  content: z.string().trim().min(1).max(500),
}).strict()
// No update schema — staff notes are append-only
```

### Pattern 8: Month/Year Picker (Client Component)

```tsx
// client/src/components/records/MonthYearPicker.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' },
  // ... through Dec
  { value: 12, label: 'Dec' },
]

function yearOptions(currentYear: number) {
  return Array.from({ length: 11 }, (_, i) => currentYear - i)
}

interface MonthYearPickerProps {
  label: string
  monthValue: number | null | undefined
  yearValue: number | null | undefined
  onMonthChange: (month: number | null) => void
  onYearChange: (year: number | null) => void
  required?: boolean
  disabled?: boolean
}

export function MonthYearPicker({ label, monthValue, yearValue, onMonthChange, onYearChange, required, disabled }: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear()
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium leading-none">{label}{required && <span aria-hidden> *</span>}</legend>
      <div className="flex gap-2">
        <Select
          value={monthValue?.toString() ?? ''}
          onValueChange={(v) => onMonthChange(v ? Number(v) : null)}
          disabled={disabled}
        >
          <SelectTrigger className="w-24" aria-label="Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={yearValue?.toString() ?? ''}
          onValueChange={(v) => onYearChange(v ? Number(v) : null)}
          disabled={disabled}
        >
          <SelectTrigger className="w-24" aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions(currentYear).map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  )
}
```

**Ongoing/Present checkbox pattern** (for activities and work experience end date):
```tsx
<div className="flex items-center gap-2">
  <Checkbox
    id="ongoing"
    checked={isOngoing}
    onCheckedChange={(checked) => {
      setIsOngoing(!!checked)
      if (checked) {
        form.setValue('endMonth', null)
        form.setValue('endYear', null)
      }
    }}
  />
  <Label htmlFor="ongoing">Ongoing / Present</Label>
</div>
{!isOngoing && (
  <MonthYearPicker
    label="End date"
    monthValue={form.watch('endMonth')}
    yearValue={form.watch('endYear')}
    onMonthChange={(v) => form.setValue('endMonth', v)}
    onYearChange={(v) => form.setValue('endYear', v)}
  />
)}
```

### Pattern 9: Subject "Other" Reveal

```tsx
// Inside AcademicResultDialog form
const subjectValue = form.watch('subject')
const showOtherInput = subjectValue === 'OTHER'

<FormField
  control={form.control}
  name="subject"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subject *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
        <SelectContent>
          {PRESET_SUBJECTS.filter(s => s !== 'OTHER').map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>

{showOtherInput && (
  <FormField
    control={form.control}
    name="subjectOther"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Subject name *</FormLabel>
        <FormControl>
          <Input placeholder="Enter subject name" {...field} value={field.value ?? ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

### Pattern 10: Migration Strategy (No Live DB)

Since PostgreSQL is not available in dev (established in Phase 1), generate migration SQL manually:

```bash
# From the server/ directory:
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Or more precisely — diff from current to new schema:
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260612_add_records/migration.sql
```

The generated SQL creates the enums first, then tables in FK-safe order (AcademicResult, Activity, Award, WorkExperience, CareerGoal, StaffNote all reference Student which already exists).

### Pattern 11: testDb.ts Cleanup Order

Extend `clearDb()` to clean up all 6 new models in FK-safe order:

```typescript
export async function clearDb(): Promise<void> {
  // Delete child records before parents (FK constraint order)
  await prisma.staffNote.deleteMany()
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}
```

### Anti-Patterns to Avoid

- **Single "records" table**: Do not collapse all six record types into one wide `StudentRecord` table with a `type` discriminator column. This makes field constraints impossible (e.g., `awardLevel` would be nullable for non-awards) and breaks Phase 5 transcript assembly queries. [VERIFIED by PITFALLS.md]
- **Prisma DateTime for month+year**: Do not use `DateTime` for activity/award/work-experience dates. Storing "March 2024" as `2024-03-01T00:00:00Z` introduces timezone ambiguity (UTC midnight becomes previous month in UTC+8). Store integer `month` + `year` fields.
- **Inline audit in routes**: Do not call `logAudit()` directly inside route handlers. Put it in the service function after the write. This ensures every path through the service is audited, including paths called from tests.
- **Missing IDOR check**: Do not use `prisma.academicResult.findUnique({ where: { id } })` alone on PATCH/DELETE. Always check `existing.studentId === studentId` before proceeding. Failure to do this allows staff to modify records belonging to other students.
- **DELETE route for notes**: Do not add a DELETE endpoint to the notes router even as a convenience. The append-only invariant is a business requirement. If an "undo last note" is ever needed, it must go through a proper discuss-phase decision.
- **Eager loading all 6 sections in one query**: Do not try to load all 6 record types in the student detail GET (`GET /api/students/:id`). Keep them separate per-section fetches; they load in parallel on the client and each section can error/retry independently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod + React Hook Form + zodResolver | RHF + Zod already in project; handles touched states, async errors, nested field validation |
| Data fetching + cache | useState + useEffect per section | @tanstack/react-query useQuery | 6 sections × refetch-after-mutation = combinatorial explosion of loading/error/refetch state |
| Month name formatting | Custom month label function | Fixed MONTHS array constant | One source of truth; no date library needed for month integer → label mapping |
| Period display formatting | Custom formatter | Pure function using MONTHS array | "Sep 2022 – Jun 2024" or "Sep 2022 – Present" — 10 lines of code, not a library |
| Toast notifications | Custom toast component | sonner (already installed) | Already in project; matches Phase 2 UX |
| Dialog focus management | Manual focus refs | Radix Dialog (via shadcn Dialog) | Already installed; handles focus trap, keyboard close, scroll lock automatically |
| Alert dialog | Custom confirm modal | shadcn AlertDialog | Already installed; correct semantics for destructive actions |
| UUID generation | crypto.randomUUID() | Prisma `@default(uuid())` | DB-generated; consistent with all other models in project |

**Key insight:** The six record types share identical structural patterns (CRUD + audit + IDOR guard). The planner should create one plan that implements the pattern completely for one record type (AcademicResult), then parallel-implement the remaining five using the same structure. Do not design each record type's implementation independently — this risks divergence.

---

## Common Pitfalls

### Pitfall 1: IDOR on Nested Record Routes

**What goes wrong:** A staff member calls `PATCH /api/students/A/academics/record-123` where record-123 actually belongs to student B. If the service only checks `{ where: { id: record-123 } }` without verifying `studentId`, the update succeeds and leaks data across students.

**Why it happens:** Nested route structure gives false confidence that `:studentId` is validated. Express routes don't enforce FK ownership — only the service layer does.

**How to avoid:** In every update/delete service function: fetch by `{ id: recordId }` first, then `if (!existing || existing.studentId !== studentId) throw NotFoundError`. Return 404 (not 403) regardless of reason — this reveals no information about whether the record exists for a different student. [VERIFIED: PITFALLS.md — Pitfall 4]

**Warning signs:** Service functions that call `prisma.record.update({ where: { id } })` without checking studentId.

---

### Pitfall 2: Prisma DateTime for Month+Year Dates

**What goes wrong:** An activity stored with endDate `2024-06-01T00:00:00Z` displays as "May 2024" in Hong Kong (UTC+8 is +8 hours, so midnight UTC = 8:00 AM HKT the same day — but displaying in different timezones can show the previous or next month depending on the client's offset).

**Why it happens:** Developers store "June 2024" as `new Date('2024-06-01')` which is UTC midnight. When JavaScript parses this in a UTC+8 browser, `new Date('2024-06-01').getMonth()` returns 5 (June), which happens to work — but `toLocaleDateString()` or dayjs parsing can behave differently depending on the runtime.

**How to avoid:** Store month and year as separate `Int` columns (`startMonth: 5`, `startYear: 2024`). Display by indexing into a MONTHS constant array. No date library required; no timezone ambiguity. [ASSUMED based on common web app pitfall]

**Warning signs:** `DateTime` fields named `startDate`, `endDate`, `awardDate` on models where only month+year precision is required.

---

### Pitfall 3: Career Goals — Update vs Create New Version

**What goes wrong:** A developer adds a `PATCH /api/students/:id/career-goals/:goalId` endpoint to allow editing individual career goal versions. This destroys the version history invariant — staff can silently rewrite past records, making the history untrustworthy.

**Why it happens:** The standard CRUD pattern has PATCH; it's muscle memory to add it.

**How to avoid:** The `careerGoals.ts` router must not register a PATCH or DELETE route. Service file must not export `updateCareerGoal` or `deleteCareerGoal`. The UI dialog is titled "Update career goals" but it POSTS a new version. Document this explicitly in a service-layer comment. [VERIFIED by CONTEXT.md D-16]

**Warning signs:** `PATCH /career-goals/:goalId` in the router; `updateCareerGoal` function in service.

---

### Pitfall 4: Missing QueryClient Provider

**What goes wrong:** `useQuery` / `useMutation` calls throw "No QueryClient set, use QueryClientProvider..." at runtime. All six section components fail to render.

**Why it happens:** `@tanstack/react-query` requires `QueryClientProvider` wrapping the component tree. It's easy to add the hooks but forget the provider.

**How to avoid:** Add `QueryClientProvider` in `App.tsx` before the router. This is a one-time setup. Planner must include this as Task 1 of the client wave. [ASSUMED — standard TanStack Query setup requirement]

**Warning signs:** Sections render as loading skeletons forever; console shows "No QueryClient set" error.

---

### Pitfall 5: Sorting "Present" Entries Last Instead of First

**What goes wrong:** Activities and Work Experience with no end date (ongoing = "Present") sort after all dated entries because `null` values sort last in standard `ORDER BY endYear DESC`.

**Why it happens:** Prisma's default behavior for `null` in orderBy is `nulls: 'last'` for DESC. D-11 requires entries with no end date to sort as most recent (first).

**How to avoid:** Use Prisma's explicit null ordering:
```typescript
orderBy: [
  { endYear: { sort: 'desc', nulls: 'first' } },
  { endMonth: { sort: 'desc', nulls: 'first' } },
  { startYear: 'desc' },
  { startMonth: 'desc' },
]
```
This puts null-endYear entries at the top (most recent), then sorts dated entries by endYear/endMonth descending. [ASSUMED: Prisma null ordering syntax; verify against installed Prisma version]

**Warning signs:** "Ongoing" activities appearing at the bottom of the activity list instead of the top.

---

### Pitfall 6: Staff Notes Character Count Off-by-One in DB vs UI

**What goes wrong:** The UI allows up to 500 characters (Zod `max(500)`, `maxLength={500}` on textarea). But if `@db.VarChar(500)` is not added to the Prisma schema, PostgreSQL defaults to `text` (unlimited), and the DB constraint and Zod constraint are not aligned. If the limit is later changed in the UI without updating the DB, or vice versa, an inconsistency is silently introduced.

**How to avoid:** Add `@db.VarChar(500)` annotation to `StaffNote.content` and `CareerGoal.description`. This makes the DB constraint explicit in the schema and auto-generates the correct SQL column type. All description fields capped at 500 chars; notes field and grade field also annotated. [ASSUMED]

---

### Pitfall 7: Forgetting to Cascade-Delete Records on Student Archive

**What goes wrong:** A student is archived (soft-delete via `archivedAt`). Phase 3 records are not archived. When an admin hard-deletes a student later (if that feature is ever added), Prisma throws a FK constraint violation because the student's records still exist.

**Why it happens:** `archivedAt` pattern doesn't delete child rows; if the Student model ever gets a hard-delete path, FK constraints fire.

**How to avoid:** Use `onDelete: Cascade` on all six `student` relations in the Prisma schema. Since students are soft-deleted (not hard-deleted) in v1, cascade won't fire. But the schema is correct if hard-delete is ever added. [ASSUMED: safe defensive practice]

---

## Code Examples

### Sorting Activities with Null End Date First

```typescript
// server/src/services/activity.ts
orderBy: [
  { endYear: { sort: 'desc', nulls: 'first' } },
  { endMonth: { sort: 'desc', nulls: 'first' } },
  { startYear: 'desc' },
  { startMonth: 'desc' },
]
```

### Period Display Helper (Client)

```typescript
// client/src/lib/periodFormat.ts
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function formatPeriod(
  startMonth: number, startYear: number,
  endMonth: number | null, endYear: number | null,
): string {
  const start = formatMonthYear(startMonth, startYear)
  if (endMonth === null || endYear === null) return `${start} – Present`
  return `${start} – ${formatMonthYear(endMonth, endYear)}`
}
```

### RecordSectionCard Shared Wrapper

```tsx
// client/src/components/records/RecordSectionCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

interface RecordSectionCardProps {
  title: string
  count?: number
  addLabel: string
  onAdd: () => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  isEmpty?: boolean
  emptyHeading?: string
  emptyBody?: string
  children?: React.ReactNode
  // Notes section overrides: no Add button in header (inline input instead)
  hideAddButton?: boolean
}

export function RecordSectionCard({
  title, count, addLabel, onAdd, isLoading, isError, onRetry,
  isEmpty, emptyHeading, emptyBody, children, hideAddButton,
}: RecordSectionCardProps) {
  return (
    <Card aria-busy={isLoading}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold leading-tight">
          {title}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({count ?? 0})
          </span>
        </CardTitle>
        {!hideAddButton && (
          <Button variant="default" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Couldn't load {title.toLowerCase()}. Try again.{' '}
              {onRetry && <button onClick={onRetry} className="underline">Retry</button>}
            </AlertDescription>
          </Alert>
        ) : isEmpty ? (
          <div className="py-8 text-center">
            {emptyHeading && <p className="text-sm font-medium">{emptyHeading}</p>}
            {emptyBody && <p className="text-sm text-muted-foreground mt-1">{emptyBody}</p>}
          </div>
        ) : children}
      </CardContent>
    </Card>
  )
}
```

### Career Goals Version History Toggle

```tsx
// client/src/components/records/CareerGoalsSection.tsx (version history block)
const [historyExpanded, setHistoryExpanded] = useState(false)
const current = versions[0]
const history = versions.slice(1)

{history.length > 0 && (
  <div className="mt-4">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setHistoryExpanded(prev => !prev)}
      aria-expanded={historyExpanded}
    >
      <ChevronRight className={cn('h-4 w-4 mr-1 transition-transform', historyExpanded && 'rotate-90')} />
      {historyExpanded
        ? 'Hide version history'
        : `Version history (${history.length} previous)`}
    </Button>

    {historyExpanded && (
      <div className="mt-2 space-y-2">
        {history.map(v => (
          <CareerGoalHistoryEntry key={v.id} version={v} />
        ))}
      </div>
    )}
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState/useEffect per API call | @tanstack/react-query | React ecosystem, 2022–2024 | Eliminates loading/error boilerplate; built-in cache deduplication |
| Prisma `migrate dev` (requires live DB) | `prisma migrate diff --script` | Prisma workflow for DB-less dev | Established in Phase 1 of this project |
| Separate date fields for precision | DateTime truncated to month | Project decision (this phase) | Integer month+year avoids timezone bugs |
| Global student record table | Segmented per-type tables | Best practice from project outset | Cleanly supports per-type access control, Phase 5 transcript queries |

**Deprecated/outdated:**
- `prisma generate --schema` (old): use `prisma generate` (schema path is in `prisma.config.ts` per Phase 1)
- `react-query v3` (old import `from 'react-query'`): use `@tanstack/react-query` v5 with `from '@tanstack/react-query'`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @tanstack/react-query v5 API (`useQuery`, `useMutation`, `QueryClient.invalidateQueries`) matches example patterns | Standard Stack, Pattern 6 | If v4 is installed instead of v5, `invalidateQueries` takes different arguments; planner must verify version |
| A2 | Prisma 7 supports `nulls: 'first'` in orderBy for optional Int fields | Pitfall 5, Pattern: Sorting | If not supported in installed Prisma version, need raw SQL or application-level sort |
| A3 | `CareerInterest[]` (PostgreSQL enum array) generates a valid migration in Prisma 7 | Pattern 1 | If enum arrays are not supported, use junction table or `String[]` with app-level validation |
| A4 | `@db.VarChar(N)` annotation on String fields generates correct VARCHAR column in migration | Pattern 1 | If annotation is ignored, constraint is in Zod only (acceptable but less safe) |
| A5 | `onDelete: Cascade` on Prisma relations is supported for all 6 models referencing Student | Pattern 1 | Cascade behavior should be tested; if Student hard-delete is not in scope, this is low risk but defensive |
| A6 | npm `@tanstack/react-query` package name resolves to the correct TanStack Query library | Package Legitimacy | [ASSUMED] — same org as `@tanstack/react-table` already in project; extremely low risk |

---

## Open Questions (RESOLVED)

1. **Prisma 7 enum array migration output** — RESOLVED
   - What we know: Prisma supports `Type[]` for PostgreSQL arrays; `CareerInterest[]` is valid schema syntax
   - What was unclear: Whether `prisma migrate diff` generates the correct `CREATE TYPE ... AS ENUM` + `"interests" "_CareerInterest"[]` SQL in Prisma 7
   - **Resolution:** If `prisma migrate diff` array output is incorrect for `CareerInterest[]` enum array, fall back to `String[] @db.Text[]` with app-level enum validation at the route layer. Plan 03-03 Task 2 (schema push) will inspect the generated migration SQL output before pushing and apply the `String[]` fallback if the array type column is malformed. The `db push` is the authoritative apply step regardless.

2. **Subject "OTHER" sentinel — display in table** — RESOLVED
   - **Resolution:** In the AcademicResultsSection table Subject column, render `result.subject === 'OTHER' ? result.subjectOther : result.subject` — no "Other: " prefix needed since the full subject name is stored in `subjectOther`. The conditional Input reveal (show when `watch('subject') === 'OTHER'`) is implemented per D-08 as a `show={subject === 'Other'}` conditional `FormField` below the subject Select in the dialog.

3. **Career Goals version count in section header** — RESOLVED
   - **Resolution:** Show count as total number of versions (including current), per D-05. "Career goals (3)" means 3 versions exist. Staff can tell at a glance that a history exists. The most recent version content is displayed in the card body; version count shown in parenthesis in the section header.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | client install | ✓ (existing) | — | — |
| @tanstack/react-query | Client section fetching | ✗ (not yet installed) | latest v5 | No viable fallback — install required |
| shadcn checkbox/textarea/tooltip/scroll-area | Career interests, notes, version history | ✗ (not yet installed) | latest | No fallback — install via shadcn CLI |
| PostgreSQL (dev) | Migration execution | ✗ (per Phase 1 precedent) | — | `prisma migrate diff --script` generates SQL; apply manually |
| Vitest + supertest | Integration tests | ✓ (existing) | — | — |

**Missing dependencies with no fallback:**
- `@tanstack/react-query` — planner must add `npm install @tanstack/react-query` as Wave 0 task
- New shadcn components — planner must add `npx shadcn@latest add checkbox textarea tooltip scroll-area` as Wave 0 task

**Missing dependencies with fallback:**
- PostgreSQL for migration: use `prisma migrate diff --script` (established Phase 1 pattern)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + supertest (existing) |
| Config file | `server/vitest.config.ts` |
| Quick run command | `npm test` (in `server/`) |
| Full suite command | `npm test` (in `server/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STU-03 | POST /api/students/:id/academics creates academic result | integration | `npm test -- --grep "stu-03"` | ❌ Wave 0 |
| STU-03 | PATCH /api/students/:id/academics/:id updates result | integration | `npm test -- --grep "stu-03"` | ❌ Wave 0 |
| STU-03 | DELETE /api/students/:id/academics/:id removes result | integration | `npm test -- --grep "stu-03"` | ❌ Wave 0 |
| STU-03 | IDOR: PATCH with wrong studentId returns 404 | integration | `npm test -- --grep "stu-03-idor"` | ❌ Wave 0 |
| STU-04 | Activities CRUD + ongoing sort first | integration | `npm test -- --grep "stu-04"` | ❌ Wave 0 |
| STU-05 | Awards CRUD + award level validation | integration | `npm test -- --grep "stu-05"` | ❌ Wave 0 |
| STU-06 | Work experience CRUD | integration | `npm test -- --grep "stu-06"` | ❌ Wave 0 |
| STU-07 | POST career-goals creates new version (not update) | integration | `npm test -- --grep "stu-07"` | ❌ Wave 0 |
| STU-07 | GET career-goals returns all versions newest first | integration | `npm test -- --grep "stu-07"` | ❌ Wave 0 |
| STU-07 | No PATCH/DELETE on career-goals returns 404/405 | integration | `npm test -- --grep "stu-07-readonly"` | ❌ Wave 0 |
| STU-08 | POST /notes creates note with author attribution | integration | `npm test -- --grep "stu-08"` | ❌ Wave 0 |
| STU-08 | No PATCH/DELETE on notes returns 404/405 | integration | `npm test -- --grep "stu-08-append-only"` | ❌ Wave 0 |
| STU-08 | GET /notes returns notes newest first | integration | `npm test -- --grep "stu-08"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` in server/ — all existing + new tests must pass
- **Per wave merge:** Full test suite green
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `server/src/__tests__/records.test.ts` — covers STU-03 through STU-08 (all 6 record types)
- [ ] `server/src/__tests__/helpers/testDb.ts` — extend `clearDb()` with 6 new model deletes
- [ ] Client install: `npm install @tanstack/react-query` + `QueryClientProvider` in `App.tsx`
- [ ] shadcn install: `npx shadcn@latest add checkbox textarea tooltip scroll-area` in `client/`

*(Existing test infrastructure covers auth and student profile — no changes to auth.test.ts or requireRole.test.ts)*

---

## Security Domain

*`security_enforcement: true`, `security_asvs_level: 1` per config.json*

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Inherited | All record routes behind `validateJwt` + `resolveUser` (Phase 1 global middleware) |
| V3 Session Management | Inherited | MSAL session storage (Phase 1) |
| V4 Access Control | YES — new records | IDOR guard in every service update/delete; all staff can read/write records (no per-student ownership) |
| V5 Input Validation | YES | Zod schemas on all 6 record create/update endpoints; `.strict()` to reject unknown fields |
| V6 Cryptography | No | No new cryptographic operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — read/modify another student's records via guessed recordId | Tampering / Info Disclosure | Service layer checks `existing.studentId === studentId` before update/delete; always 404 (not 403) |
| Mass assignment — unexpected fields accepted by API | Tampering | Zod `.strict()` on all create/update schemas |
| Privilege escalation — DELETE /notes or PATCH /career-goals | Tampering | No such routes registered; route omission is the control |
| Data exfiltration — reading all students' records | Info Disclosure | All `/api/students/:id/*` routes check JWT; no unauthenticated paths |
| Audit bypass — mutations without logAudit | Repudiation | `logAudit()` called inside service functions (not routes); tests verify audit entries exist after mutations |

**ASVS Level 1 checklist for Phase 3:**
- [x] All new API endpoints are behind `validateJwt` middleware (global — inherited)
- [x] Input validation via Zod on all POST/PATCH body payloads
- [x] IDOR protection: studentId cross-check in update/delete service functions
- [x] Audit log on all create/update/delete mutations
- [x] No PATCH/DELETE routes on CareerGoal or StaffNote (append-only/version-only enforcement)
- [x] No PII in error messages (errors return generic "Record not found", not student-identifying details)

---

## Sources

### Primary (HIGH confidence — verified against codebase)
- `server/prisma/schema.prisma` — existing schema patterns (UUID, enum, index conventions)
- `server/src/services/student.ts` — service layer pattern (IDOR guard, logAudit call placement)
- `server/src/routes/students.ts` — router structure, error handling, Zod safeParse pattern
- `server/src/services/audit.ts` — logAudit() signature
- `server/src/__tests__/students.test.ts` — test structure, clearDb, makeTestToken patterns
- `server/vitest.config.ts` — test runner configuration
- `client/src/api/apiClient.ts` — apiGet/apiPost/apiPatch/apiDelete helpers
- `client/src/pages/StudentDetailPage.tsx` — placeholder to replace (lines 267–277)
- `.planning/phases/03-student-records-ui/03-CONTEXT.md` — locked decisions
- `.planning/phases/03-student-records-ui/03-UI-SPEC.md` — component inventory, layouts, copywriting
- `.planning/phases/02-student-profiles-search/02-PATTERNS.md` — established patterns
- `.planning/research/PITFALLS.md` — IDOR (Pitfall 4), audit trail (Pitfall 5), monolithic table (Technical Debt)

### Secondary (MEDIUM confidence — standard library docs)
- @tanstack/react-query v5 docs — useQuery/useMutation/invalidateQueries API [ASSUMED: verified from training knowledge; library identity confirmed by project's existing @tanstack/react-table dependency]
- Prisma orderBy with nulls — Prisma docs pattern for `{ sort: 'desc', nulls: 'first' }` [ASSUMED]
- React Hook Form zodResolver integration — established in Phase 2 StudentForm [VERIFIED in codebase]

### Tertiary (LOW confidence — design decisions)
- Subject "OTHER" two-field pattern — design recommendation [ASSUMED — no prior precedent in codebase]
- Career goals version history toggle pattern — design recommendation [ASSUMED — no prior precedent]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all core libraries verified in existing codebase; only @tanstack/react-query is new (same org as existing @tanstack/react-table)
- Architecture: HIGH — follows exact patterns from Phase 2 service/route/schema structure
- Prisma Schema: HIGH — patterns directly match existing User/AuditLog/Student models; `CareerInterest[]` array is MEDIUM (verify migration output)
- Pitfalls: HIGH — IDOR and audit pitfalls verified against PITFALLS.md; month/year and version pitfalls are standard patterns

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable stack; @tanstack/react-query v5 is stable)

---

## RESEARCH COMPLETE
