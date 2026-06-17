# Phase 4: Document Management — Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 10 (7 new, 3 modified)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/prisma/schema.prisma` | model/migration | CRUD | `server/prisma/schema.prisma` (StaffNote, Award models) | exact |
| `server/src/services/documents.ts` | service | CRUD + file-I/O | `server/src/services/award.ts` | role-match + soft-delete from StaffNote |
| `server/src/routes/documents.ts` | route | request-response + file-I/O | `server/src/routes/academicResults.ts` | exact (mergeParams + IDOR) |
| `server/src/routes/students.ts` | route | request-response | `server/src/routes/students.ts` (self — lines 155–167) | exact |
| `server/src/app.ts` | config | startup-init | `server/src/app.ts` (self — lines 1–35) | exact |
| `docker-compose.yml` | config | infrastructure | `docker-compose.yml` (self — postgres volumes block) | exact |
| `client/src/components/records/DocumentsSection.tsx` | component | request-response + file-I/O | `client/src/components/records/WorkExperienceSection.tsx` | exact |
| `client/src/pages/StudentDetailPage.tsx` | component | request-response | `client/src/pages/StudentDetailPage.tsx` (self — line 279) | exact |
| `server/src/__tests__/documents.test.ts` | test | integration | `server/src/__tests__/records.test.ts` | exact |
| `server/src/__tests__/helpers/testDb.ts` | test helper | CRUD | `server/src/__tests__/helpers/testDb.ts` (self) | exact |

---

## Pattern Assignments

### `server/prisma/schema.prisma` (model/migration, CRUD)

**Analog:** `server/prisma/schema.prisma` — `StaffNote` model (lines 195–205) for the `authorId`/`User` FK + named relation pattern; `Award` model (lines 148–163) for enum field on a student-owned model; `AuditLog` model (lines 71–84) for index patterns.

**Existing enum pattern** (lines 10–13, 44–57 — `Role`, `CareerInterest`):
```prisma
enum Role {
  ADMIN
  STAFF
}
// → copy for DocumentType with 6 values
```

**Existing named User relation pattern** (lines 182–193 — `CareerGoal`):
```prisma
model CareerGoal {
  authorId    String
  author      User             @relation("CareerGoalAuthor", fields: [authorId], references: [id])
  // ...
}
// User model has back-relation:
//   careerGoalsAuthored  CareerGoal[] @relation("CareerGoalAuthor")
```

**Existing Student FK + Cascade pattern** (lines 114–129 — `AcademicResult`):
```prisma
model AcademicResult {
  id           String    @id @default(uuid())
  studentId    String
  student      Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ...
  @@index([studentId])
  @@index([studentId, calendarYear(sort: Desc)])
}
```

**Soft-delete field pattern** (none in existing models — `deletedAt DateTime?` is new to this codebase; use RESEARCH.md Pattern 5 as the authoritative reference).

**What to add to schema.prisma:**
1. `enum DocumentType { REPORT_CARD CERTIFICATE AWARD_LETTER WORK_EXPERIENCE_LETTER REFERENCE_LETTER OTHER }` — after existing enums (line ~57)
2. `model Document { ... }` with `studentId`/`uploaderId` FKs + named relation `"DocumentUploader"` on User
3. Back-relation on `User`: `documentsUploaded Document[] @relation("DocumentUploader")`
4. Back-relation on `Student`: `documents Document[]`

---

### `server/src/services/documents.ts` (service, CRUD + file-I/O)

**Analog:** `server/src/services/award.ts` (lines 1–111) for the overall service module structure; IDOR guard pattern from `server/src/services/academicResult.ts` (lines 64–66).

**Imports pattern** (`award.ts` lines 1–4):
```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createAwardSchema, updateAwardSchema } from '../schemas/award.js'
```
For `documents.ts` — replace schema imports with document schema; add fs/promises + crypto + path imports.

**Custom error class pattern** (`award.ts` lines 9–14):
```typescript
export class AwardNotFoundError extends Error {
  constructor() {
    super('Award not found')
    this.name = 'AwardNotFoundError'
  }
}
// → copy as DocumentNotFoundError
```

**IDOR guard pattern — findUnique + studentId check** (`award.ts` lines 64–66, `academicResult.ts` lines 64–66):
```typescript
const existing = await prisma.award.findUnique({ where: { id } })
if (!existing || existing.studentId !== studentId) {
  throw new AwardNotFoundError()
}
```
For soft-delete: additionally check `existing.deletedAt !== null`.

**logAudit call pattern** (`award.ts` lines 46–53):
```typescript
await logAudit(prisma, {
  userId,
  action: 'CREATE',
  model: 'Award',
  recordId: award.id,
})
// → replace model: 'Document'; for soft-delete use action: 'DELETE'
// → for upload, add details: { originalFilename, typeTag }
```

**List with include pattern** (not in award.ts — closest is RESEARCH.md Pattern code):
```typescript
// documents.ts must include uploader displayName:
return prisma.document.findMany({
  where: { studentId, deletedAt: null },
  include: { uploader: { select: { displayName: true } } },
  orderBy: { createdAt: 'desc' },
})
```

**UPLOAD_ROOT constant** — export from this module (RESEARCH.md Pattern 2):
```typescript
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
```

---

### `server/src/routes/documents.ts` (route, request-response + file-I/O)

**Analog:** `server/src/routes/academicResults.ts` (lines 1–103) — exact structural match (mergeParams router, parseStudentId helper, GET/POST/DELETE handlers, IDOR via service error, next(err) error propagation).

**Full router structure pattern** (`academicResults.ts` lines 1–33):
```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
// ... other imports ...

const router = Router({ mergeParams: true })

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

**mergeParams param access pattern** (`academicResults.ts` lines 36, 47, 63):
```typescript
// CRITICAL — TypeScript workaround for Express 5 mergeParams strict typing
const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
if (!studentId) return
```

**GET list handler pattern** (`academicResults.ts` lines 35–44):
```typescript
router.get('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    const results = await listAcademicResults(prisma, studentId)
    res.json(results)
  } catch (err) {
    next(err)
  }
})
```

**POST handler with Zod validation pattern** (`academicResults.ts` lines 46–60):
```typescript
router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
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
// → for upload: insert multer middleware before async handler; validate typeTag from req.body (multipart field); magic bytes check inline
```

**DELETE handler + NotFoundError pattern** (`academicResults.ts` lines 88–101):
```typescript
router.delete('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    await deleteAcademicResult(prisma, req.params['resultId'], studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})
// → for soft-delete: return 200 + body (not 204) since body contains updatedAt/deletedAt;
//   catch DocumentNotFoundError → 404
```

**Download route** — no existing analog for file streaming; use RESEARCH.md Pattern 3 (streaming download with `fs.createReadStream`, `res.headersSent` guard, `Content-Disposition: attachment`).

**MulterError handling** — no existing analog; add inline after multer middleware (RESEARCH.md Pattern 8):
```typescript
// Error handler at bottom of router (before export):
router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File exceeds the 25 MB limit.' })
      return
    }
    res.status(400).json({ error: 'Upload error.' })
    return
  }
  next(err)
})
```

---

### `server/src/routes/students.ts` (route, request-response — modify only)

**Analog:** `server/src/routes/students.ts` lines 155–167 (self — existing nested router mounts).

**Existing mount pattern** (lines 155–167):
```typescript
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

**What to add** — append after line 167, following exact same pattern:
```typescript
import documentsRouter from './documents.js'
router.use('/:studentId/documents', documentsRouter)
```

---

### `server/src/app.ts` (config, startup-init — modify only)

**Analog:** `server/src/app.ts` lines 1–35 (self — module-level initialization).

**Existing startup pattern** (lines 1–16):
```typescript
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
// ... CJS default imports with esModuleInterop ...

export const app = express()

app.use(helmet())
app.use(express.json())

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
}
```

**What to add** — module-level directory creation (RESEARCH.md Pattern 7), inserted after imports, before `export const app`:
```typescript
import fs from 'node:fs'
import path from 'node:path'

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
```

**CJS default import pattern** (lines 1–3) — `multer` follows same pattern as `express`, `helmet`, `cors`:
```typescript
import express from 'express'   // CJS default via esModuleInterop: true
// → import multer from 'multer' works identically
```

---

### `docker-compose.yml` (config, infrastructure — modify only)

**Analog:** `docker-compose.yml` lines 8–9 (self — existing `postgres_data` named volume).

**Existing named volume pattern** (lines 8–9, 46–48):
```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
# ...
volumes:
  postgres_data:
```

**What to add** — bind-mount (not named volume) for uploads on `api` service:
```yaml
services:
  api:
    environment:
      # ... existing vars ...
      UPLOAD_ROOT: /app/uploads
    volumes:
      - ./data/uploads:/app/uploads
```
No entry under top-level `volumes:` needed — bind-mounts are defined inline only.

---

### `client/src/components/records/DocumentsSection.tsx` (component, request-response + file-I/O)

**Analog:** `client/src/components/records/WorkExperienceSection.tsx` (lines 1–396) — exact structural match: RecordSectionCard wrapper, useQuery + useMutation, Table + Dialog + RecordDeleteDialog, Lucide icons, Sonner toasts, React Hook Form NOT used (upload form is simple enough for controlled state).

**Imports pattern** (`WorkExperienceSection.tsx` lines 1–41):
```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiDelete } from '@/api/apiClient';
// + XHR upload helper (standalone — not from apiClient)
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';   // shadcn progress — new for Phase 4
import { RecordDeleteDialog } from './RecordDeleteDialog';
import { RecordSectionCard } from './RecordSectionCard';
// Lucide icons: Download, Trash2 (no Edit — type tag not editable after upload)
```

**useQuery pattern** (`WorkExperienceSection.tsx` lines 93–96):
```typescript
const queryKey = ['student', studentId, 'work-experience'] as const;
const { data = [], isLoading, isError, refetch } = useQuery({
  queryKey,
  queryFn: () => apiGet<WorkExperience[]>(`/students/${studentId}/work-experience`),
});
// → replace with ['student', studentId, 'documents'] and Document[] type
```

**useMutation + invalidateQueries + toast pattern** (`WorkExperienceSection.tsx` lines 121–129):
```typescript
const deleteMutation = useMutation({
  mutationFn: (id: string) => apiDelete(`/students/${studentId}/work-experience/${id}`),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey });
    toast.success('Entry deleted');
    setDeleteTarget(null);
  },
  onError: () => toast.error("Couldn't delete entry. Please try again."),
});
// → for soft-delete of document: same pattern; onSuccess: toast.success('Document deleted')
```

**RecordSectionCard usage pattern** (`WorkExperienceSection.tsx` lines 199–210):
```typescript
<RecordSectionCard
  title="Work experience"
  count={data.length}
  addLabel="Add work experience"
  onAdd={openAddDialog}
  isLoading={isLoading}
  isError={isError}
  onRetry={() => void refetch()}
  isEmpty={data.length === 0}
  emptyHeading="No work experience yet."
  emptyBody="Add work experience entries to document this student's employment history."
>
// → title="Documents", addLabel="Upload document", emptyHeading="No documents yet."
```

**Table + action buttons pattern** (`WorkExperienceSection.tsx` lines 211–256):
```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Employer</TableHead>
      {/* ... */}
      <TableHead className="w-[80px]">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((entry) => (
      <TableRow key={entry.id}>
        {/* ... cells ... */}
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={...}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={...}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
// → columns: File name | Type tag | Uploaded | Uploader | Actions
// → actions: Download (apiGet stream — window.open or anchor href) + Delete (soft)
// → NO edit button (type tag not editable — D-18)
```

**Dialog + footer buttons pattern** (`WorkExperienceSection.tsx` lines 259–383):
```typescript
<Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Upload document</DialogTitle>
      <DialogDescription className="sr-only">...</DialogDescription>
    </DialogHeader>
    {/* file picker + type tag Select + progress bar */}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={...} disabled={uploading}>
        Discard
      </Button>
      <Button type="submit" disabled={uploading || !selectedFile || !selectedType}>
        {uploading ? 'Uploading…' : 'Upload'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**RecordDeleteDialog usage pattern** (`WorkExperienceSection.tsx` lines 386–393):
```typescript
<RecordDeleteDialog
  open={Boolean(deleteTarget)}
  onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
  onConfirm={async () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }}
  isDeleting={deleteMutation.isPending}
/>
```

**XHR upload helper** — no existing analog; standalone function in `DocumentsSection.tsx` (not in apiClient.ts — RESEARCH.md Pattern 4). Acquires token via `msalInstance.acquireTokenSilent` (same pattern as `apiClient.ts` lines 35–38).

**Progress bar** — use shadcn `Progress` component (new install). Controlled by `uploadPercent` state (0–100). Show only when `uploading === true`.

---

### `client/src/pages/StudentDetailPage.tsx` (component, request-response — modify only)

**Analog:** `client/src/pages/StudentDetailPage.tsx` line 7 (import) and line 279 (usage — self).

**Existing section import + usage pattern** (lines 7, 279):
```typescript
import { NotesSection } from '@/components/records/NotesSection';
// line 279:
<NotesSection studentId={student.id} />
```

**What to add** — append after `NotesSection` import and usage:
```typescript
import { DocumentsSection } from '@/components/records/DocumentsSection';
// After <NotesSection studentId={student.id} />:
<DocumentsSection studentId={student.id} />
```

---

### `server/src/__tests__/documents.test.ts` (test, integration)

**Analog:** `server/src/__tests__/records.test.ts` (lines 1–642) — exact structural match: `describe` + `it` with test IDs in name, `createTestStudent()` helper, `staffToken()`, supertest `request(app)`, `beforeEach(clearDb)`.

**Test file structure pattern** (`records.test.ts` lines 1–40):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

async function createTestStudent(overrides: Partial<typeof validStudentPayload> = {}) {
  const token = staffToken()
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validStudentPayload, ...overrides })
  expect(res.status).toBe(201)
  return res.body as { id: string; /* ... */ }
}

beforeEach(clearDb)
```

**IDOR test pattern** (`records.test.ts` lines 126–143):
```typescript
it('stu-03-idor: PATCH with resultId belonging to different studentId returns 404', async () => {
  const studentA = await createTestStudent({ schoolStudentId: 'S2024101' })
  const studentB = await createTestStudent({ schoolStudentId: 'S2024102', fullName: 'Lee Siu Ming' })
  // create doc under studentA, attempt to download/delete via studentB URL → 404
})
```

**Audit log assertion pattern** (`records.test.ts` lines 145–160):
```typescript
it('stu-03-audit: POST /academics creates AuditLog row', async () => {
  // ...
  const logs = await prisma.auditLog.findMany({
    where: { model: 'AcademicResult', action: 'CREATE', recordId: res.body.id },
  })
  expect(logs).toHaveLength(1)
})
// → for documents: model: 'Document'
```

**Multipart upload (supertest)** — no existing analog; use RESEARCH.md Pattern 9:
```typescript
const validPdfBuffer = Buffer.from('%PDF-1.4 1 0 obj<</Type /Catalog>>endobj', 'utf-8')

const res = await request(app)
  .post(`/api/students/${student.id}/documents`)
  .set('Authorization', `Bearer ${token}`)
  .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
  .field('typeTag', 'REPORT_CARD')
```

**UPLOAD_ROOT in tests** — set `process.env.UPLOAD_ROOT = os.tmpdir()` at test file top (before `app` import or in vitest setup).

---

### `server/src/__tests__/helpers/testDb.ts` (test helper, CRUD — modify only)

**Analog:** `server/src/__tests__/helpers/testDb.ts` lines 1–18 (self).

**Existing clearDb pattern** (lines 4–14):
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

**What to add** — insert `prisma.document.deleteMany()` BEFORE `prisma.student.deleteMany()` (FK dependency order — RESEARCH.md Pitfall 6):
```typescript
export async function clearDb(): Promise<void> {
  await prisma.staffNote.deleteMany()
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.document.deleteMany()        // ← ADD HERE before student/user
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}
```

---

## Shared Patterns

### Authentication (JWT + resolveUser)
**Source:** `server/src/app.ts` lines 19–20
**Apply to:** All route handlers in `documents.ts`
```typescript
app.use('/api', validateJwt)
app.use('/api', resolveUser)
// → already applied globally; documents router is mounted under /api/students
// → all handlers access req.user!.id (never null post-resolveUser)
```

### Prisma Instance Singleton
**Source:** `server/src/routes/academicResults.ts` line 3
**Apply to:** `server/src/routes/documents.ts`
```typescript
import { prisma } from '../lib/prisma.js'
// Never instantiate new PrismaClient() in route files
```

### Audit Logging
**Source:** `server/src/services/award.ts` lines 46–53 (`award.ts`), `server/src/services/academicResult.ts` lines 47–52
**Apply to:** `server/src/services/documents.ts` — upload (`CREATE`) and soft-delete (`DELETE`)
```typescript
await logAudit(prisma, {
  userId,
  action: 'CREATE',   // or 'DELETE'
  model: 'Document',
  recordId: doc.id,
  // For upload, add: details: JSON.stringify({ originalFilename, typeTag })
})
```

### Error Propagation (next(err))
**Source:** `server/src/routes/academicResults.ts` lines 41–43, 57–59
**Apply to:** All async handlers in `documents.ts`
```typescript
try {
  // ...
} catch (err) {
  if (err instanceof DocumentNotFoundError) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  next(err)   // ← unhandled errors to global error handler
}
```

### TanStack Query Data-Fetching (React)
**Source:** `client/src/components/records/WorkExperienceSection.tsx` lines 85–129
**Apply to:** `client/src/components/records/DocumentsSection.tsx`
```typescript
const queryClient = useQueryClient();
const queryKey = ['student', studentId, 'documents'] as const;
const { data = [], isLoading, isError, refetch } = useQuery({
  queryKey,
  queryFn: () => apiGet<Document[]>(`/students/${studentId}/documents`),
});
// useMutation for delete only (upload uses XHR — not mutation)
```

### Sonner Toast Feedback
**Source:** `client/src/components/records/WorkExperienceSection.tsx` lines 103–106, 127–128
**Apply to:** `client/src/components/records/DocumentsSection.tsx`
```typescript
toast.success('Document uploaded')
toast.error('Upload failed. Please try again.')
toast.success('Document deleted')
toast.error("Couldn't delete document. Please try again.")
```

### Zod Schema Module
**Source:** `server/src/schemas/award.ts` (lines 1–26)
**Apply to:** `server/src/schemas/document.ts` (new file — schema only, no route-level concern)
```typescript
import { z } from 'zod'
import { DocumentType } from '../generated/prisma/client.js'

export const documentTypeTagSchema = z.nativeEnum(DocumentType)
export const documentParamSchema = z.object({ docId: z.string().uuid() })
```

---

## No Analog Found

All files have codebase analogs. The following patterns within otherwise-analog files have no codebase precedent — use RESEARCH.md as authoritative source:

| Pattern | Applies To | RESEARCH.md Reference |
|---|---|---|
| multer memoryStorage middleware | `server/src/routes/documents.ts` | Pattern 1 |
| Magic bytes PDF validation | `server/src/routes/documents.ts` | Pattern 1 |
| `fs.writeFile` to UUID path | `server/src/services/documents.ts` | Pattern 2 |
| `fs.createReadStream` download | `server/src/routes/documents.ts` | Pattern 3 |
| XHR upload with `onprogress` | `client/src/components/records/DocumentsSection.tsx` | Pattern 4 |
| `shadcn Progress` component | `client/src/components/records/DocumentsSection.tsx` | UI-SPEC.md |
| `soft-delete` (`deletedAt`) | `server/src/services/documents.ts` | Pattern 6 |
| Directory auto-creation on startup | `server/src/app.ts` | Pattern 7 |
| `import multer from 'multer'` (CJS) | `server/src/routes/documents.ts` | Pattern 8 |
| supertest `.attach()` multipart | `server/src/__tests__/documents.test.ts` | Pattern 9 |

---

## Metadata

**Analog search scope:** `server/src/services/`, `server/src/routes/`, `server/src/__tests__/`, `server/prisma/`, `client/src/components/records/`, `client/src/pages/`, `client/src/api/`
**Files scanned:** 15
**Pattern extraction date:** 2026-06-13
