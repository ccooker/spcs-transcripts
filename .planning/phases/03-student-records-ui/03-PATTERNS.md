# Phase 3: Student Records UI — Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 36 (new/modified)
**Analogs found:** 35 / 36

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/prisma/schema.prisma` | model | CRUD | `server/prisma/schema.prisma` (Student/AuditLog models) | exact |
| `server/src/routes/students.ts` | route | CRUD | itself | exact |
| `server/src/routes/academicResults.ts` | route | CRUD | `server/src/routes/students.ts` | exact |
| `server/src/routes/activities.ts` | route | CRUD | `server/src/routes/students.ts` | exact |
| `server/src/routes/awards.ts` | route | CRUD | `server/src/routes/students.ts` | exact |
| `server/src/routes/workExperience.ts` | route | CRUD | `server/src/routes/students.ts` | exact |
| `server/src/routes/careerGoals.ts` | route | request-response | `server/src/routes/students.ts` | role-match (GET+POST subset) |
| `server/src/routes/notes.ts` | route | request-response | `server/src/routes/students.ts` | role-match (GET+POST subset) |
| `server/src/services/academicResult.ts` | service | CRUD | `server/src/services/student.ts` | exact |
| `server/src/services/activity.ts` | service | CRUD | `server/src/services/student.ts` | exact |
| `server/src/services/award.ts` | service | CRUD | `server/src/services/student.ts` | exact |
| `server/src/services/workExperience.ts` | service | CRUD | `server/src/services/student.ts` | exact |
| `server/src/services/careerGoal.ts` | service | request-response | `server/src/services/student.ts` | role-match (POST-only) |
| `server/src/services/staffNote.ts` | service | request-response | `server/src/services/student.ts` | role-match (POST-only) |
| `server/src/schemas/academicResult.ts` | schema | CRUD | `server/src/schemas/student.ts` | exact |
| `server/src/schemas/activity.ts` | schema | CRUD | `server/src/schemas/student.ts` | exact |
| `server/src/schemas/award.ts` | schema | CRUD | `server/src/schemas/student.ts` | exact |
| `server/src/schemas/workExperience.ts` | schema | CRUD | `server/src/schemas/student.ts` | exact |
| `server/src/schemas/careerGoal.ts` | schema | request-response | `server/src/schemas/student.ts` | role-match |
| `server/src/schemas/staffNote.ts` | schema | request-response | `server/src/schemas/student.ts` | role-match |
| `server/src/__tests__/records.test.ts` | test | CRUD | `server/src/__tests__/students.test.ts` | exact |
| `server/src/__tests__/helpers/testDb.ts` | test utility | CRUD | itself | exact |
| `server/prisma/migrations/…_add_records/` | migration | — | `server/prisma/migrations/20260612094000_add_student/` | role-match |
| `client/src/App.tsx` | provider | — | itself | exact |
| `client/src/pages/StudentDetailPage.tsx` | page | request-response | itself | exact |
| `client/src/components/records/RecordSectionCard.tsx` | component | request-response | `client/src/pages/StudentDetailPage.tsx` (Card block) | role-match |
| `client/src/components/records/AcademicResultsSection.tsx` | component | CRUD | `client/src/pages/StudentDetailPage.tsx` + `StudentForm.tsx` | role-match |
| `client/src/components/records/ActivitiesSection.tsx` | component | CRUD | `client/src/components/records/AcademicResultsSection.tsx` | exact (sister) |
| `client/src/components/records/AwardsSection.tsx` | component | CRUD | `client/src/components/records/AcademicResultsSection.tsx` | exact (sister) |
| `client/src/components/records/WorkExperienceSection.tsx` | component | CRUD | `client/src/components/records/ActivitiesSection.tsx` | exact (sister) |
| `client/src/components/records/CareerGoalsSection.tsx` | component | request-response | `client/src/pages/StudentDetailPage.tsx` | role-match |
| `client/src/components/records/NotesSection.tsx` | component | request-response | `client/src/pages/StudentDetailPage.tsx` | role-match |
| `client/src/components/records/RecordDeleteDialog.tsx` | component | request-response | `client/src/components/students/ArchiveStudentDialog.tsx` | exact |
| `client/src/components/records/MonthYearPicker.tsx` | component | — | `client/src/components/students/StudentForm.tsx` (Select pattern) | role-match |
| `client/src/components/records/CareerInterestsChecklist.tsx` | component | — | `client/src/components/students/StudentForm.tsx` | role-match |
| `client/src/lib/periodFormat.ts` | utility | transform | — | no analog |

---

## Pattern Assignments

### `server/prisma/schema.prisma` (model — MODIFY)

**Analog:** `server/prisma/schema.prisma` (existing Student, AuditLog, FormLevel patterns)

**Enum pattern** (lines 10–28 — existing enum declarations to follow):
```prisma
enum Role {
  ADMIN
  STAFF
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

enum FormLevel {
  FORM_1
  FORM_2
  FORM_3
  FORM_4
  FORM_5
  FORM_6
}
```

**Model pattern** (lines 61–80 — Student model: UUID pk, optional fields, indexes):
```prisma
model Student {
  id              String           @id @default(uuid())
  fullName        String
  formLevel       FormLevel
  graduationYear  Int
  schoolStudentId String           @unique
  studentEmail    String?
  archivedAt      DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([fullName])
  @@index([formLevel, archivedAt])
}
```

**Key differences for Phase 3:**
- New enums `AwardLevel` and `CareerInterest` — declare before their models (same position as `FormLevel`)
- Six new models, all with `studentId String` FK + `student Student @relation(..., onDelete: Cascade)` + `@@index([studentId])`
- `CareerGoal` and `StaffNote` have no `updatedAt` — immutable rows
- `CareerGoal` has `interests CareerInterest[]` (PostgreSQL native enum array)
- `CareerGoal` and `StaffNote` have `authorId String` + `author User @relation(...)` for attribution
- Add back-relations to `Student` model and `User` model after the six new models are declared

---

### `server/src/routes/students.ts` (route — MODIFY: add nested mounts)

**Analog:** itself (lines 1–155)

**Import pattern** (lines 1–21):
```typescript
import { Router } from 'express'
import { Prisma, Role } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { requireRole } from '../middleware/requireRole.js'
import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentIdParamSchema,
  updateStudentSchema,
} from '../schemas/student.js'
import {
  archiveStudent,
  createStudent,
  getStudentById,
  listStudents,
  restoreStudent,
  StudentAlreadyActiveError,
  StudentArchivedError,
  StudentNotFoundError,
  updateStudent,
} from '../services/student.js'
```

**`parseStudentId` helper** (lines 25–40 — copy this pattern into every new record router):
```typescript
function parseStudentId(
  id: string | string[] | undefined,
  res: import('express').Response,
): string | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  const parsed = studentIdParamSchema.safeParse(raw)
  if (!parsed.success) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  return parsed.data
}
```

**Key differences for Phase 3:**
- Add 6 router import + `router.use('/:studentId/academics', academicResultsRouter)` mounts at the bottom of the file, before `export default router`
- The nested routers use `{ mergeParams: true }` — see new record route files below

---

### `server/src/routes/academicResults.ts` (route — NEW, full CRUD)

**Analog:** `server/src/routes/students.ts`

**Router init with mergeParams** (from RESEARCH.md Pattern 2 — no direct codebase analog yet):
```typescript
const router = Router({ mergeParams: true }) // required to inherit :studentId from parent
```

**GET list pattern** (based on `students.ts` lines 58–76):
```typescript
router.get('/', async (req, res, next) => {
  const studentId = parseStudentId(req.params.studentId, res)
  if (!studentId) return
  try {
    const results = await listAcademicResults(prisma, studentId)
    res.json(results)
  } catch (err) {
    next(err)
  }
})
```

**POST create pattern** (based on `students.ts` lines 136–153 — Zod safeParse + 201):
```typescript
router.post('/', async (req, res, next) => {
  const studentId = parseStudentId(req.params.studentId, res)
  if (!studentId) return
  const parsed = createAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await createAcademicResult(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})
```

**PATCH update pattern** (based on `students.ts` lines 90–110 — catches custom error):
```typescript
router.patch('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId(req.params.studentId, res)
  if (!studentId) return
  const parsed = updateAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await updateAcademicResult(prisma, req.params.resultId, studentId, parsed.data, req.user!.id)
    res.json(result)
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})
```

**DELETE pattern** (based on `students.ts` lines 112–122 — 204 No Content for hard-delete):
```typescript
router.delete('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId(req.params.studentId, res)
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
```

**Key differences from students.ts:**
- `Router({ mergeParams: true })` — required for `:studentId` access
- `parseStudentId` reads from `req.params.studentId` (not `req.params.id`)
- DELETE returns `204` (hard delete, no body) rather than the student object
- `NotFoundError` class name scoped to this record type (e.g. `AcademicResultNotFoundError`)
- `activities.ts`, `awards.ts`, `workExperience.ts` follow identical structure — only type names and service imports change
- `careerGoals.ts` and `notes.ts` omit PATCH and DELETE routes entirely

---

### `server/src/services/academicResult.ts` (service — NEW, full CRUD)

**Analog:** `server/src/services/student.ts`

**Error class pattern** (lines 13–32 — one custom error per service):
```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createAcademicResultSchema, updateAcademicResultSchema } from '../schemas/academicResult.js'

type CreateInput = z.infer<typeof createAcademicResultSchema>
type UpdateInput = z.infer<typeof updateAcademicResultSchema>

export class AcademicResultNotFoundError extends Error {
  constructor() {
    super('Academic result not found')
    this.name = 'AcademicResultNotFoundError'
  }
}
```

**Create pattern with audit** (lines 34–59 — create + logAudit immediately after):
```typescript
export async function createStudent(
  prisma: InstanceType<typeof PrismaClient>,
  data: CreateStudentInput,
  userId: string,
) {
  const student = await prisma.student.create({ data: { ...data } })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'Student',
    recordId: student.id,
  })

  return student
}
```

**IDOR guard pattern** (lines 122–165 — check existing + studentId match before update):
```typescript
export async function updateStudent(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  data: UpdateStudentInput,
  userId: string,
) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) {
    throw new StudentNotFoundError()
  }
  // Phase 3 addition: IDOR guard — also check studentId matches:
  // if (!existing || existing.studentId !== studentId) throw new XNotFoundError()

  const student = await prisma.student.update({ where: { id }, data })
  await logAudit(prisma, { userId, action: 'UPDATE', model: 'Student', recordId: student.id })
  return student
}
```

**Key differences for Phase 3:**
- Every update/delete service function receives `studentId` as a parameter
- IDOR check: `if (!existing || existing.studentId !== studentId) throw new XNotFoundError()` — use 404 regardless of reason (no info leak)
- `logAudit` model string matches the Prisma model name exactly: `'AcademicResult'`, `'Activity'`, `'Award'`, `'WorkExperience'`
- `activity.ts` and `workExperience.ts` services add `nulls: 'first'` ordering for null end-dates (D-11)
- `careerGoal.ts` and `staffNote.ts` export only `list*` and `create*` — no update or delete functions at all

---

### `server/src/services/careerGoal.ts` (service — NEW, POST-only versioned)

**Analog:** `server/src/services/student.ts` (createStudent + logAudit sub-pattern)

**Versioned create — always a new row** (RESEARCH.md Pattern 4):
```typescript
export async function createCareerGoal(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: { interests: CareerInterest[]; description?: string },
  userId: string,
) {
  // Always creates a new row — no update path exists
  const goal = await prisma.careerGoal.create({
    data: { studentId, authorId: userId, interests: data.interests, description: data.description ?? null },
    include: { author: { select: { displayName: true } } },
  })
  await logAudit(prisma, { userId, action: 'CREATE', model: 'CareerGoal', recordId: goal.id })
  return goal
}
// NO updateCareerGoal or deleteCareerGoal — immutable by design (D-16)
```

**List with author include** (RESEARCH.md Pattern 4):
```typescript
export async function listCareerGoals(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.careerGoal.findMany({
    where: { studentId },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
```

**Key differences from CRUD services:**
- `staffNote.ts` follows the identical pattern; `model: 'StaffNote'`
- `include: { author: { select: { displayName: true } } }` on both list and create — attribution is always included in response

---

### `server/src/schemas/academicResult.ts` (schema — NEW)

**Analog:** `server/src/schemas/student.ts`

**z.object().strict() + create/update pair pattern** (lines 14–27):
```typescript
import { z } from 'zod'

export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    formLevel: z.enum(FORM_LEVELS),
    graduationYear: z.number().int().min(2020).max(2040),
    schoolStudentId: z.string().trim().min(1).max(50),
    studentEmail: z.email().optional().or(z.literal('')),
  })
  .strict()                         // ← reject unknown fields

export const updateStudentSchema = createStudentSchema.partial().omit({ schoolStudentId: true })
```

**Key differences for Phase 3:**
- Academic schema uses `.refine()` for the subject/subjectOther conditional validation
- Activity/Award/WorkExperience schemas add `monthSchema` + `yearSchema` helpers
- `careerGoal.ts` schema: `interests` field uses `z.array(z.enum(CAREER_INTERESTS)).min(1, '...')`
- `staffNote.ts` schema: no update schema — only `createStaffNoteSchema`
- All schemas use `.strict()` (mass-assignment protection — ASVS V5)
- Import `FORM_LEVELS` from `./student.js` in `academicResult.ts` for `formLevel` field

---

### `server/src/__tests__/records.test.ts` (test — NEW)

**Analog:** `server/src/__tests__/students.test.ts`

**File structure pattern** (lines 1–45 — imports, helpers, beforeEach):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

async function createTestStudent(overrides = {}) {
  const token = staffToken()
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Chan Tai Man', formLevel: 'FORM_4', graduationYear: 2027, schoolStudentId: 'S2024001', ...overrides })
  expect(res.status).toBe(201)
  return res.body as { id: string }
}

beforeEach(clearDb)
```

**CRUD test pattern** (lines 47–113 — describe block + status + body assertions):
```typescript
describe('POST /api/students', () => {
  it('stu-01-create: POST /api/students with valid body returns 201 with student fields', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ fullName: validPayload.fullName })
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
```

**Audit log assertion pattern** (lines 99–112 — verify AuditLog row exists):
```typescript
  it('auth-03-create: successful create writes exactly one AuditLog with CREATE action', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)
    expect(res.status).toBe(201)
    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'CREATE', recordId: res.body.id },
    })
    expect(logs).toHaveLength(1)
  })
```

**Key differences for Phase 3:**
- Test IDs follow same format: `'stu-03-create'`, `'stu-03-idor'`, `'stu-04-create'`, etc.
- IDOR test: POST to `/students/A/academics`, then attempt PATCH with `/students/B/academics/:id` — expect 404
- CareerGoal tests verify no PATCH/DELETE endpoint (404 or 405)
- StaffNote tests verify no PATCH/DELETE endpoint
- `createTestStudent` helper is reused — copy from `students.test.ts`; must call `GET /api/auth/me` first to seed the staff user

---

### `server/src/__tests__/helpers/testDb.ts` (test utility — MODIFY)

**Analog:** itself (lines 1–12)

**Current clearDb pattern** (lines 4–8 — FK-safe delete order):
```typescript
export async function clearDb(): Promise<void> {
  await prisma.student.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
}
```

**Key differences for Phase 3:**
- Add all six new models BEFORE student/auditLog (child records before parent):
```typescript
export async function clearDb(): Promise<void> {
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
- The `onDelete: Cascade` in schema would handle this, but explicit ordering in clearDb avoids FK errors if cascade is ever changed

---

### `client/src/pages/StudentDetailPage.tsx` (page — MODIFY)

**Analog:** itself (lines 267–277 — the placeholder Card to replace)

**Placeholder to replace** (lines 267–277):
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-xl font-semibold leading-tight">Student records</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">
      Academic results, activities, awards, and other records will be available here in a
      future update.
    </p>
  </CardContent>
</Card>
```

**Card + header pattern** (lines 215–265 — Profile Card: flex-row header, content grid):
```tsx
<Card className="mb-6">
  <CardHeader className="flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-xl font-semibold leading-tight">Profile</CardTitle>
    <div className="flex gap-2">
      {/* action buttons */}
    </div>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**Key differences for Phase 3:**
- Replace the single placeholder Card with a `<div className="flex flex-col gap-8">` wrapping six section components
- Pass `studentId={student.id}` to each section component (not the full student object)
- Add `QueryClientProvider` wrap in `App.tsx` before this page renders
- The six section components are self-contained — they manage their own data fetching

---

### `client/src/components/records/RecordSectionCard.tsx` (component — NEW)

**Analog:** `client/src/pages/StudentDetailPage.tsx` (Profile Card block, lines 215–265)

**Card + header pattern with title + count + button** (lines 215–239):
```tsx
<Card className="mb-6">
  <CardHeader className="flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-xl font-semibold leading-tight">Profile</CardTitle>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleStartEdit}>Edit</Button>
    </div>
  </CardHeader>
  <CardContent>
    {/* skeleton or content */}
  </CardContent>
</Card>
```

**Skeleton loading pattern** (lines 166–172):
```tsx
{loading && (
  <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <Skeleton className="h-48 w-full" />
  </div>
)}
```

**Error Alert pattern** (lines 174–184):
```tsx
{!loading && notFound && (
  <Alert variant="destructive">
    <AlertTitle>Student not found</AlertTitle>
    <AlertDescription>
      This student may have been removed.
    </AlertDescription>
  </Alert>
)}
```

**Key differences for Phase 3:**
- `RecordSectionCard` is a shared wrapper — accepts `title`, `count`, `onAdd`, `isLoading`, `isError`, `onRetry`, `isEmpty`, `emptyHeading`, `emptyBody`, `children`, `hideAddButton` props
- Section title uses `text-xl font-semibold` + `text-sm text-muted-foreground` for `({count})` — two spans, not one
- Add button uses `Button variant="default"` with `<Plus className="h-4 w-4 mr-1" />` icon
- Skeleton shows 3 rows of `<Skeleton className="h-11 w-full" />` (denser than page-level skeleton)
- `aria-busy={isLoading}` on `<Card>` element (UI-SPEC accessibility requirement)

---

### `client/src/components/records/AcademicResultsSection.tsx` (component — NEW)

**Analog:** `client/src/pages/StudentDetailPage.tsx` + `client/src/components/students/StudentForm.tsx`

**useForm + zodResolver pattern** (StudentForm.tsx lines 71–74):
```tsx
const form = useForm<CreateStudentFormValues>({
  resolver: zodResolver(createStudentFormSchema),
  defaultValues: defaultValues ?? emptyDefaults,
})
```

**FormField/FormItem/FormLabel/FormControl/FormMessage pattern** (StudentForm.tsx lines 88–102):
```tsx
<FormField
  control={form.control}
  name="fullName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Full name <span className="text-destructive">*</span>
      </FormLabel>
      <FormControl>
        <Input placeholder="Student full name" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Select with numeric conversion** (StudentForm.tsx lines 131–159 — convert string Select value back to number):
```tsx
<Select
  onValueChange={(value) => field.onChange(Number(value))}
  value={String(field.value)}
>
  <FormControl>
    <SelectTrigger><SelectValue placeholder="Select graduation year" /></SelectTrigger>
  </FormControl>
  <SelectContent>
    {graduationYearOptions.map((year) => (
      <SelectItem key={year} value={String(year)}>Class of {year}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**apiGet + useState + toast error pattern** (StudentDetailPage.tsx lines 84–103):
```tsx
const loadStudent = useCallback(async () => {
  if (!id) return
  setLoading(true)
  try {
    const data = await apiGet<Student>(`/students/${id}`)
    setStudent(data)
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 404) { setNotFound(true) }
    else { toast.error('Could not load student. Please try again.') }
  } finally {
    setLoading(false)
  }
}, [id])
```

**Key differences for Phase 3:**
- Replace `useState/useEffect` fetch with `useQuery` from `@tanstack/react-query` — queryKey `['student', studentId, 'academics']`
- Mutations use `useMutation` + `queryClient.invalidateQueries({ queryKey })` on success
- Dialog state: `const [dialogOpen, setDialogOpen] = useState(false)` + `const [editTarget, setEditTarget] = useState<AcademicResult | null>(null)`
- Table inside section card body — columns from UI-SPEC: Subject, Grade, Year, Form, Notes, Actions
- Subject display: `result.subject === 'OTHER' ? result.subjectOther : result.subject`
- Actions column: ghost icon buttons (Pencil + Trash) — `Button variant="ghost" size="icon"`

---

### `client/src/components/records/RecordDeleteDialog.tsx` (component — NEW)

**Analog:** `client/src/components/students/ArchiveStudentDialog.tsx`

**AlertDialog pattern** (lines 60–94 — full dialog structure):
```tsx
import { AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle } from '@/components/ui/alert-dialog'

<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Archive student</AlertDialogTitle>
      <AlertDialogDescription>
        This student will be hidden from the student list.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isArchiving}>Keep student</AlertDialogCancel>
      <Button variant="destructive" disabled={!nameMatches || isArchiving} onClick={handleArchive}>
        {isArchiving ? 'Archiving…' : 'Archive student'}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**In-flight loading state pattern** (lines 33–57 — useState + try/catch + finally):
```tsx
const [isArchiving, setIsArchiving] = useState(false)

async function handleArchive() {
  setIsArchiving(true)
  try {
    await apiDelete(`/students/${studentId}`)
    toast.success('Student archived')
    navigate('/students')
  } catch {
    toast.error('Could not archive student. Please try again.')
  } finally {
    setIsArchiving(false)
  }
}
```

**Key differences for Phase 3:**
- `RecordDeleteDialog` is simpler — no name-typing confirmation (D-21)
- Props: `open`, `onOpenChange`, `onConfirm: () => Promise<void>`, `isDeleting: boolean`
- Title: `"Delete this entry?"`, description: `"This action cannot be undone."`
- Cancel: `"Keep entry"`, Confirm: `Button variant="destructive"` `"Delete"` / `"Deleting…"`
- The mutation + toast lives in the parent section component (not inside the dialog) — dialog just surfaces the confirmation; parent calls the delete mutation on confirm
- This matches the D-21 requirement (simple AlertDialog, not typed-name)

---

### `client/src/components/records/MonthYearPicker.tsx` (component — NEW)

**Analog:** `client/src/components/students/StudentForm.tsx` (Select + SelectContent pattern)

**Select pattern with string↔number conversion** (StudentForm.tsx lines 131–159):
```tsx
<Select
  onValueChange={(value) => field.onChange(Number(value))}
  value={String(field.value)}
>
  <FormControl>
    <SelectTrigger>
      <SelectValue placeholder="Select graduation year" />
    </SelectTrigger>
  </FormControl>
  <SelectContent>
    {graduationYearOptions.map((year) => (
      <SelectItem key={year} value={String(year)}>
        Class of {year}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Key differences for Phase 3:**
- `MonthYearPicker` is an uncontrolled helper component (not a `FormField` internally) — accepts `monthValue`, `yearValue`, `onMonthChange`, `onYearChange` props
- Use `<fieldset>` + `<legend>` for accessibility (UI-SPEC requirement)
- Two side-by-side Selects in `<div className="flex gap-2">` inside fieldset
- Month options: fixed `MONTHS` array (value: 1–12, label: 'Jan'–'Dec')
- Year options: rolling 10-year range from current year backward
- Month SelectTrigger: `className="w-24"`, Year SelectTrigger: `className="w-24"`
- `value={monthValue?.toString() ?? ''}` — empty string for undefined/null (no pre-selection)

---

### `client/src/components/records/CareerInterestsChecklist.tsx` (component — NEW)

**Analog:** `client/src/components/students/StudentForm.tsx` (FormField + controlled input pattern)

**Controlled checkbox group pattern** (based on StudentForm FormField render prop):
```tsx
<FormField
  control={form.control}
  name="interests"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Career interests <span className="text-destructive">*</span></FormLabel>
      <FormControl>
        <CareerInterestsChecklist
          value={field.value}
          onChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Key differences for Phase 3:**
- `CareerInterestsChecklist` renders a `<fieldset>` + `<legend>` wrapping a `grid grid-cols-2 gap-3` of 12 `Checkbox` + `Label` pairs (UI-SPEC accessibility)
- Checkbox interaction: toggle item in/out of array — `onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item])`
- Each checklist row min touch area `44px` (UI-SPEC D-14)
- Import `Checkbox` from `@/components/ui/checkbox` (new shadcn install)

---

## Shared Patterns

### TanStack Query Section Fetching
**Source:** RESEARCH.md Pattern 6 (no existing codebase analog — new dependency)
**Apply to:** All six section components (`AcademicResultsSection`, `ActivitiesSection`, `AwardsSection`, `WorkExperienceSection`, `CareerGoalsSection`, `NotesSection`)

```tsx
// Pattern to copy into every section component
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/api/apiClient'

function XSection({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['student', studentId, 'x-section-name'] as const

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<XType[]>(`/students/${studentId}/x`),
  })

  const createMutation = useMutation({
    mutationFn: (body: unknown) => apiPost<XType>(`/students/${studentId}/x`, body),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey }); toast.success('X added') },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  })

  // Pass to RecordSectionCard: isLoading, isError, refetch, data.length
  // Pass to Dialog: createMutation.mutate, updateMutation.mutate, createMutation.isPending
}
```

**QueryClientProvider setup** (install in `client/src/App.tsx` — one-time change):
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()
// Wrap the router with: <QueryClientProvider client={queryClient}>...</QueryClientProvider>
```

---

### Authentication Middleware
**Source:** `server/src/routes/students.ts` (line 23 — global middleware applied at app level in Phase 1)
**Apply to:** All new record route files — `validateJwt` and `resolveUser` are global Express middleware (mounted in `app.ts`); no per-router setup needed. The `req.user!.id` is already available in all route handlers.

---

### logAudit Call
**Source:** `server/src/services/audit.ts` (lines 1–23) + `server/src/services/student.ts` (lines 52–57, 157–162, 187–192, 213–221)
**Apply to:** All six service files — call after every write (create/update/delete)

```typescript
// From audit.ts — signature to follow exactly:
await logAudit(prisma, {
  userId,
  action: 'CREATE',   // 'CREATE' | 'UPDATE' | 'DELETE'
  model: 'ModelName', // exact Prisma model name (PascalCase)
  recordId: result.id,
  // details: { ... }  // optional JSON — only used for special cases like restore
})
```

---

### Zod .strict() on all schemas
**Source:** `server/src/schemas/student.ts` (line 25 — `.strict()` after `.object()`)
**Apply to:** All six new schema files (create schemas)

```typescript
export const createXSchema = z.object({ ... }).strict()
export const updateXSchema = createXSchema.partial()
// For append-only/versioned (careerGoal, staffNote): no updateXSchema
```

---

### Toast feedback
**Source:** `client/src/pages/StudentDetailPage.tsx` (lines 130–135) + `client/src/components/students/ArchiveStudentDialog.tsx` (lines 51–56)
**Apply to:** All section mutation handlers

```tsx
// Success:
toast.success('Academic result added')
toast.success('Activity updated')
toast.success('Entry deleted')
// Error:
toast.error("Couldn't save changes. Please try again.")
toast.error("Couldn't delete entry. Please try again.")
```

---

### apiDelete helper
**Source:** `client/src/api/apiClient.ts` (lines 93–98)
**Apply to:** CRUD section delete mutations

```typescript
export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    throw apiError(path, res.status)
  }
}
// Returns void — server responds 204 No Content for record deletes
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `client/src/lib/periodFormat.ts` | utility | transform | No date-formatting utilities exist in client yet — new pattern. Use `MONTH_NAMES` array + `formatPeriod()` function (RESEARCH.md Code Examples). |

---

## Metadata

**Analog search scope:** `server/src/routes/`, `server/src/services/`, `server/src/schemas/`, `server/src/__tests__/`, `server/prisma/`, `client/src/pages/`, `client/src/components/students/`, `client/src/api/`
**Files scanned:** 14 existing files read
**Pattern extraction date:** 2026-06-12

---

## PATTERN MAPPING COMPLETE

**Phase:** 3 — Student Records UI
**Files classified:** 36
**Analogs found:** 35 / 36

### Coverage
- Files with exact analog: 16
- Files with role-match analog: 19
- Files with no analog: 1 (`client/src/lib/periodFormat.ts`)

### Key Patterns Identified
- **All record routes** use `Router({ mergeParams: true })` + `parseStudentId` + Zod `safeParse` + per-route `try/catch` with typed error class — copy from `students.ts`
- **All CRUD services** follow: custom error class → `findUnique` IDOR check → Prisma write → `logAudit()` → return — copy from `student.ts`
- **CareerGoal + StaffNote services** export only `list` + `create` — the absence of update/delete is the enforcement mechanism
- **All Zod schemas** use `.strict()` — copy from `student.ts`; activity/award/workExperience add `monthSchema`/`yearSchema` helpers
- **All client sections** use `useQuery` + `useMutation` + `invalidateQueries` — new TanStack Query pattern (no existing analog); wrap app with `QueryClientProvider` in `App.tsx`
- **Dialog forms** use `useForm({ resolver: zodResolver(...) })` + `FormField/FormItem/FormLabel/FormControl/FormMessage` — copy from `StudentForm.tsx`
- **Delete dialogs** use `AlertDialog` + `useState` in-flight + `toast` — copy from `ArchiveStudentDialog.tsx` (simpler: no name-typing)

### File Created
`.planning/phases/03-student-records-ui/03-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference analog patterns in PLAN.md files — every new file has a concrete codebase source to copy from, with exact line numbers.
