# Phase 5: Transcript Assembly & Export — Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 19 new/modified files
**Analogs found:** 16 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/prisma/schema.prisma` | schema | CRUD | itself (modify) | self-modify |
| `server/src/services/transcript.ts` | service | CRUD + batch | `server/src/services/document.ts` | role-match |
| `server/src/services/pdf.ts` | service | file-I/O | `server/src/services/document.ts` (writeFile) | partial |
| `server/src/services/settings.ts` | service | CRUD | `server/src/services/academicResult.ts` | role-match |
| `server/src/routes/transcript.ts` | router | request-response | `server/src/routes/documents.ts` | exact |
| `server/src/routes/settings.ts` | router | request-response + file-I/O | `server/src/routes/documents.ts` | role-match |
| `server/src/routes/students.ts` | router | request-response | itself (modify) | self-modify |
| `server/src/app.ts` | config | request-response | itself (modify) | self-modify |
| `client/src/pages/TranscriptPage.tsx` | React page | request-response | `client/src/pages/StudentDetailPage.tsx` | exact |
| `client/src/pages/SettingsPage.tsx` | React page | request-response + file-I/O | `client/src/pages/StudentDetailPage.tsx` | role-match |
| `client/src/components/transcript/TranscriptSectionCard.tsx` | React component | request-response | `client/src/components/records/RecordSectionCard.tsx` | exact |
| `client/src/components/transcript/TipTapEditor.tsx` | React component | event-driven | none (new pattern) | no-analog |
| `client/src/components/transcript/RecordsUpdatedBanner.tsx` | React component | request-response | `client/src/components/ui/alert` (shadcn) | partial |
| `client/src/hooks/useDebouncedCallback.ts` | hook | event-driven | none (new utility) | no-analog |
| `client/src/App.tsx` | React config | request-response | itself (modify) | self-modify |
| `client/src/pages/StudentDetailPage.tsx` | React page | request-response | itself (modify) | self-modify |
| `server/src/__tests__/transcript.test.ts` | test | CRUD | `server/src/__tests__/documents.test.ts` | exact |
| `server/src/__tests__/settings.test.ts` | test | CRUD | `server/src/__tests__/documents.test.ts` | exact |
| `server/src/__tests__/helpers/testDb.ts` | test helper | CRUD | itself (modify) | self-modify |

---

## Pattern Assignments

### `server/prisma/schema.prisma` (schema, CRUD) — modify

**Operation:** Add `Transcript` model, add `SchoolSettings` model, remove `Student.transcriptStatus` field, add `transcript Transcript?` relation to Student, remove `@@index([transcriptStatus])` from Student.

**Existing Student model pattern** (lines 96–123 of schema.prisma):
```prisma
model Student {
  id              String           @id @default(uuid())
  fullName        String
  formLevel       FormLevel
  // ... fields ...
  transcriptStatus TranscriptStatus @default(NONE)   // ← REMOVE this field
  archivedAt      DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  academicResults  AcademicResult[]
  // ... other relations ...
  documents        Document[]
  // ADD: transcript  Transcript?

  @@index([fullName])
  @@index([formLevel, archivedAt])
  @@index([transcriptStatus])    // ← REMOVE this index
  @@index([archivedAt])
}
```

**New models to add** (based on existing FK + UUID pattern from Document model):
```prisma
model Transcript {
  id        String           @id @default(uuid())
  studentId String           @unique
  student   Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  status    TranscriptStatus @default(DRAFT)

  academicsContent        String? @db.Text
  activitiesContent       String? @db.Text
  awardsContent           String? @db.Text
  workExperienceContent   String? @db.Text
  careerGoalsContent      String? @db.Text
  staffEndorsementContent String? @db.Text

  academicsVisible        Boolean @default(true)
  activitiesVisible       Boolean @default(true)
  awardsVisible           Boolean @default(true)
  workExperienceVisible   Boolean @default(true)
  careerGoalsVisible      Boolean @default(true)
  staffEndorsementVisible Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([studentId])
  @@index([status])
}

model SchoolSettings {
  id             String   @id @default("singleton")
  schoolName     String
  schoolAddress  String?  @db.Text
  letterheadHtml String?  @db.Text
  logoPath       String?
  updatedAt      DateTime @updatedAt
}
```

**Deviation:** `SchoolSettings` uses `id @default("singleton")` not `@default(uuid())` — fixed-string singleton. `Transcript.studentId` uses `@unique` (one-per-student). Both differ from Document which has no `@unique` on studentId.

---

### `server/src/services/transcript.ts` (service, CRUD + batch)

**Analog:** `server/src/services/document.ts`

**Imports pattern** (lines 1–6 of document.ts):
```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import type { DocumentType } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
```

**Apply to transcript.ts:**
```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import type { TranscriptStatus } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
```

**Custom error class pattern** (lines 10–15 of document.ts):
```typescript
export class DocumentNotFoundError extends Error {
  constructor() {
    super('Document not found')
    this.name = 'DocumentNotFoundError'
  }
}
```

**Apply to transcript.ts:** `export class TranscriptNotFoundError extends Error` — same structure.

**IDOR guard pattern** (lines 64–66 of document.ts — used in softDeleteDocument):
```typescript
const existing = await prisma.document.findUnique({ where: { id: docId } })
if (!existing || existing.studentId !== studentId || existing.deletedAt !== null) {
  throw new DocumentNotFoundError()
}
```

**Apply to transcript.ts for upsert / get:**
```typescript
// For getByStudentId: IDOR = check transcript.studentId === studentId param from route
const existing = await prisma.transcript.findUnique({ where: { studentId } })
// No deletedAt check (no soft-delete on Transcript)
```

**Prisma upsert pattern** (for auto-create-or-update on PUT):
```typescript
// Follow academicResult.ts update pattern but use upsert for transcript (no prior create step)
return prisma.transcript.upsert({
  where: { studentId },
  update: { ...data, updatedAt: new Date() },
  create: { studentId, ...data },
})
```

**logAudit pattern** (lines 36–42 of document.ts):
```typescript
await logAudit(prisma, {
  userId: uploaderId,
  action: 'CREATE',
  model: 'Document',
  recordId: doc.id,
  details: { originalFilename, typeTag },
})
```

**Apply to transcript.ts:** Use `action: 'UPDATE'`, `model: 'Transcript'`, `details: { status }` for save/finalise actions; `model: 'TranscriptPdf'` for export audit entry.

**Auto-population batch query pattern** (no direct analog — use Promise.all approach from RESEARCH.md):
```typescript
const [academics, activities, awards, workExps, careerGoals] = await Promise.all([
  prisma.academicResult.findMany({ where: { studentId }, orderBy: { calendarYear: 'desc' } }),
  prisma.activity.findMany({ where: { studentId }, orderBy: { startYear: 'desc' } }),
  prisma.award.findMany({ where: { studentId }, orderBy: { awardYear: 'desc' } }),
  prisma.workExperience.findMany({ where: { studentId }, orderBy: { startYear: 'desc' } }),
  prisma.careerGoal.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 }),
])
```

---

### `server/src/services/pdf.ts` (service, file-I/O)

**Analog:** `server/src/services/document.ts` (partial — writeFile/mkdir structure only)

**Relevant analog pattern** (lines 4–5, 25–29 of document.ts):
```typescript
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// file I/O pattern: async fs operations in try block
const dir = path.join(UPLOAD_ROOT, 'students', studentId)
await mkdir(dir, { recursive: true })
await writeFile(path.join(UPLOAD_ROOT, storedPath), buffer)
```

**Deviation — pdf.ts has no codebase analog:** Uses Puppeteer (new to codebase). Follow RESEARCH.md Pattern 1 exactly:
```typescript
import puppeteer from 'puppeteer'

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await page.emulateMediaType('print')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
```

---

### `server/src/services/settings.ts` (service, CRUD)

**Analog:** `server/src/services/academicResult.ts`

**Imports pattern** (lines 1–7 of academicResult.ts):
```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type {
  createAcademicResultSchema,
  updateAcademicResultSchema,
} from '../schemas/academicResult.js'
```

**Singleton upsert pattern** (no direct analog — follows RESEARCH.md Pattern 5):
```typescript
export async function upsertSettings(
  prisma: InstanceType<typeof PrismaClient>,
  data: { schoolName: string; schoolAddress?: string; letterheadHtml?: string; logoPath?: string },
) {
  return prisma.schoolSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })
}

export async function getSettings(prisma: InstanceType<typeof PrismaClient>) {
  return prisma.schoolSettings.findUnique({ where: { id: 'singleton' } })
}
```

**logAudit pattern** (same as document.ts lines 36–42):
```typescript
await logAudit(prisma, {
  userId,
  action: 'UPDATE',
  model: 'SchoolSettings',
  recordId: 'singleton',
  details: { updatedFields: Object.keys(data) },
})
```

---

### `server/src/routes/transcript.ts` (router, request-response)

**Analog:** `server/src/routes/documents.ts` — exact match (nested router, mergeParams, parseStudentId helper, try/catch/next, typed error handling)

**Router setup pattern** (line 19 of documents.ts):
```typescript
const router = Router({ mergeParams: true })
```

**parseStudentId helper** (lines 38–53 of documents.ts):
```typescript
function parseStudentId(
  id: string | string[] | undefined,
  res: express.Response,
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

**Route handler pattern** (lines 55–64 of documents.ts):
```typescript
router.get('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    const docs = await listDocuments(prisma, studentId)
    res.json(docs)
  } catch (err) {
    next(err)
  }
})
```

**Typed error dispatch pattern** (lines 143–148 of documents.ts):
```typescript
  } catch (err) {
    if (err instanceof DocumentNotFoundError) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    next(err)
  }
```

**File streaming / binary response pattern** (lines 108–148 of documents.ts — for PDF export):
```typescript
res.setHeader(
  'Content-Disposition',
  `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalFilename)}`,
)
res.setHeader('Content-Type', 'application/pdf')
// For PDF export: use res.send(pdfBuffer) not createReadStream
// (Buffer is already in memory from Puppeteer)
res.setHeader('Content-Length', pdfBuffer.length)
res.send(pdfBuffer)
```

**Deviation:** transcript.ts uses `PUT` (upsert) not `POST` + `DELETE`. Export is `POST /export` returning binary buffer via `res.send(pdfBuffer)` (not `createReadStream` — Puppeteer returns a Buffer). No multer needed.

---

### `server/src/routes/settings.ts` (router, request-response + file-I/O)

**Analog:** `server/src/routes/documents.ts` (multer upload pattern) + `server/src/routes/students.ts` (requireRole usage)

**requireRole import and usage** (lines 4, 124 of students.ts):
```typescript
import { requireRole } from '../middleware/requireRole.js'
// ...
router.post('/:id/restore', requireRole(Role.ADMIN), async (req, res, next) => {
```

**Apply to settings.ts — Admin guard on all routes:**
```typescript
import { requireRole } from '../middleware/requireRole.js'
import { Role } from '../generated/prisma/client.js'

const router = Router()
router.use(requireRole(Role.ADMIN))  // entire settings router is Admin-only
```

**multer logo upload pattern** (lines 22–36 of documents.ts):
```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(null, false)
    } else {
      cb(null, true)
    }
  },
})
```

**Apply to settings.ts — logo upload (image/* MIME):**
```typescript
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(null, false)
    } else {
      cb(null, true)
    }
  },
})
```

**File serving pattern** (lines 121–141 of documents.ts — for GET /api/settings/logo):
```typescript
const stream = fs.createReadStream(fullPath)
stream.on('error', (streamErr) => {
  if (!res.headersSent) {
    res.status(500).json({ error: 'File read error' })
  } else {
    res.destroy(streamErr)
  }
})
stream.pipe(res)
```

**app.ts startup dir creation analog** (line 13 of app.ts):
```typescript
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
// Apply: add branding dir alongside students dir
fs.mkdirSync(path.join(UPLOAD_ROOT, 'branding'), { recursive: true })
```

---

### `server/src/routes/students.ts` — modify

**Operation:** Add `transcriptRouter` mount after existing nested routers (lines 155–169).

**Existing mount pattern** (lines 155–169 of students.ts):
```typescript
import academicResultsRouter from './academicResults.js'
// ... other imports ...
import documentsRouter from './documents.js'

router.use('/:studentId/academics', academicResultsRouter)
// ... other mounts ...
router.use('/:studentId/documents', documentsRouter)
```

**Add:**
```typescript
import transcriptRouter from './transcript.js'
router.use('/:studentId/transcript', transcriptRouter)
```

**listStudents service update** (`server/src/services/student.ts` lines 73–109): The `transcriptStatus` where clause and response field must switch from `Student.transcriptStatus` to a LEFT JOIN on `Transcript`. Key change:
```typescript
// BEFORE (lines 84–85 of student.ts):
...(transcriptStatus ? { transcriptStatus } : {}),

// AFTER — filter via Transcript relation:
...(transcriptStatus && transcriptStatus !== 'NONE'
  ? { transcript: { status: transcriptStatus } }
  : transcriptStatus === 'NONE'
    ? { transcript: { is: null } }   // no Transcript row = NONE
    : {}),
```

And in the `findMany` call, add `include: { transcript: { select: { status: true } } }` and map `transcript?.status ?? 'NONE'` to `transcriptStatus` in the response.

---

### `server/src/app.ts` — modify

**Operation:** Add `branding` dir creation on startup + mount `settingsRouter`.

**Existing startup pattern** (lines 12–13 of app.ts):
```typescript
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
```

**Add after existing mkdirSync:**
```typescript
fs.mkdirSync(path.join(UPLOAD_ROOT, 'branding'), { recursive: true })
```

**Existing router mount pattern** (lines 27–28 of app.ts):
```typescript
app.use('/api/auth', authRouter)
app.use('/api/students', studentsRouter)
```

**Add:**
```typescript
import settingsRouter from './routes/settings.js'
app.use('/api/settings', settingsRouter)
```

---

### `client/src/pages/TranscriptPage.tsx` (React page, request-response)

**Analog:** `client/src/pages/StudentDetailPage.tsx`

**Imports pattern** (lines 1–26 of StudentDetailPage.tsx):
```typescript
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiGet, apiPatch, apiFetch } from '@/api/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
```

**Page structure pattern** (lines 80–100 of StudentDetailPage.tsx):
```typescript
export function TranscriptPage({ userInfo }: TranscriptPageProps) {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadTranscript = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await apiGet<TranscriptResponse>(`/students/${id}/transcript`);
      // ...
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        setNotFound(true);
      } else {
        toast.error('Could not load transcript. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);
```

**AppShell wrapper** (lines 163–165 of StudentDetailPage.tsx):
```typescript
return (
  <AppShell userInfo={userInfo} activeNav="students">
    <Link to={`/students/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" />
      Back to student
    </Link>
```

**Loading skeleton pattern** (lines 172–178 of StudentDetailPage.tsx):
```typescript
{loading && (
  <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <Skeleton className="h-48 w-full" />
  </div>
)}
```

**PDF export pattern** (apiFetch + blob + anchor — from apiClient.ts line 20, RESEARCH.md Pattern):
```typescript
const handleExport = async () => {
  setExporting(true);
  try {
    const response = await apiFetch(`/students/${id}/transcript/export`, { method: 'POST' });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${studentName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Export failed. Please try again.');
  } finally {
    setExporting(false);
  }
};
```

**Deviation:** TranscriptPage has no edit/archive actions — instead: section TipTap editors, show/hide toggles, status select, export button. Uses `apiFetch` (raw) for PDF blob download instead of `apiGet`.

---

### `client/src/pages/SettingsPage.tsx` (React page, request-response + file-I/O)

**Analog:** `client/src/pages/StudentDetailPage.tsx` (save/load pattern)

**Form save pattern** (lines 128–143 of StudentDetailPage.tsx):
```typescript
async function handleSave(values: CreateStudentFormValues) {
  if (!student) return;
  setIsSaving(true);
  try {
    const updated = await apiPatch<Student>(`/students/${student.id}`, patchBody);
    setStudent(updated);
    toast.success('Changes saved');
  } catch {
    toast.error('Could not save changes. Please try again.');
  } finally {
    setIsSaving(false);
  }
}
```

**Deviation:** SettingsPage uses `PUT` (upsert) not PATCH. Logo upload requires `FormData` + `apiFetch` (not `apiPost` which sets `Content-Type: application/json`). Admin role gate is enforced server-side — no client-side role check needed beyond what `ProtectedRoute` provides.

---

### `client/src/components/transcript/TranscriptSectionCard.tsx` (React component, request-response)

**Analog:** `client/src/components/records/RecordSectionCard.tsx` — exact structural match

**Full component interface pattern** (lines 8–21 of RecordSectionCard.tsx):
```typescript
interface RecordSectionCardProps {
  title: string;
  count?: number;
  addLabel: string;
  onAdd: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyHeading?: string;
  emptyBody?: string;
  children?: ReactNode;
  hideAddButton?: boolean;
}
```

**Card structure pattern** (lines 37–87 of RecordSectionCard.tsx):
```typescript
return (
  <Card aria-busy={isLoading}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <h2 className="text-xl font-semibold leading-tight">{title}</h2>
      {/* action buttons */}
    </CardHeader>
    <CardContent>
      {isLoading && <Skeleton className="h-11 w-full" />}
      {!isLoading && isError && <Alert variant="destructive">...</Alert>}
      {!isLoading && !isError && children}
    </CardContent>
  </Card>
);
```

**Deviation:** TranscriptSectionCard replaces the Add button with a show/hide Switch toggle (shadcn Switch component). Props: `title`, `visible`, `onToggleVisible`, `isLoading`, `children` (the TipTapEditor). No `count`, `addLabel`, `onAdd`, `isEmpty`.

---

### `client/src/components/transcript/TipTapEditor.tsx` (React component, event-driven)

**No codebase analog** — TipTap is new to the project. Follow RESEARCH.md Pattern 3 exactly.

**Key v3 patterns to copy from RESEARCH.md:**
```typescript
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'

const editor = useEditor({
  extensions: [StarterKit],
  content: initialContent || '',
  immediatelyRender: true,   // CSR (Vite) app — always true
  onUpdate: ({ editor }) => { onChange(editor.getHTML()) },
})

// TipTap v3: setContent requires options object, NOT boolean 2nd arg
editor.commands.setContent(initialContent || '', { emitUpdate: false })

// TipTap v3: useEditorState for toolbar active states
const editorState = useEditorState({
  editor,
  selector: ({ editor }) => ({
    isBold: editor?.isActive('bold') ?? false,
    isItalic: editor?.isActive('italic') ?? false,
    isBulletList: editor?.isActive('bulletList') ?? false,
    isOrderedList: editor?.isActive('orderedList') ?? false,
  }),
})
```

---

### `client/src/components/transcript/RecordsUpdatedBanner.tsx` (React component, request-response)

**Analog:** shadcn `Alert` component (already installed)

**Alert pattern** (from StudentDetailPage.tsx lines 182–190):
```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

{!loading && notFound && (
  <Alert variant="destructive">
    <AlertTitle>Student not found</AlertTitle>
    <AlertDescription>...</AlertDescription>
  </Alert>
)}
```

**Apply to RecordsUpdatedBanner** (non-destructive info alert with action buttons):
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function RecordsUpdatedBanner({ onRegenerate, onDismiss }: Props) {
  return (
    <Alert className="mb-4">
      <AlertDescription className="flex items-center justify-between">
        <span>Records have been updated since you last edited — regenerate draft?</span>
        <div className="flex gap-2 ml-4">
          <Button size="sm" variant="outline" onClick={onDismiss}>Dismiss</Button>
          <Button size="sm" onClick={onRegenerate}>Regenerate</Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

### `client/src/hooks/useDebouncedCallback.ts` (hook, event-driven)

**No codebase analog** — follow RESEARCH.md Code Examples pattern exactly:
```typescript
import { useCallback, useRef } from 'react'

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}
```

---

### `client/src/App.tsx` — modify

**Operation:** Add two new routes following existing `<Route>` pattern.

**Existing route pattern** (lines 109–116 of App.tsx):
```typescript
<Route
  path="/students/:id"
  element={
    <ProtectedRoute>
      <StudentDetailPage userInfo={userInfo} />
    </ProtectedRoute>
  }
/>
```

**Add after existing student routes:**
```typescript
<Route
  path="/students/:id/transcript"
  element={
    <ProtectedRoute>
      <TranscriptPage userInfo={userInfo} />
    </ProtectedRoute>
  }
/>
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <SettingsPage userInfo={userInfo} />
    </ProtectedRoute>
  }
/>
```

---

### `client/src/pages/StudentDetailPage.tsx` — modify

**Operation:** Add "View Transcript" button in the action row, update `transcriptStatus` to be sourced from `transcript?.status ?? 'NONE'` once the API changes.

**Existing action row** (lines 208–219 of StudentDetailPage.tsx):
```typescript
<div className="flex flex-wrap gap-2">
  {isAdmin && isArchived && (
    <Button variant="outline" onClick={handleRestore} disabled={isRestoring}>
      {isRestoring ? 'Restoring…' : 'Restore student'}
    </Button>
  )}
  {!isArchived && (
    <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
      Archive
    </Button>
  )}
</div>
```

**Add "View Transcript" button:**
```typescript
import { Link } from 'react-router-dom';

// Add inside the flex gap-2 div, before Archive:
{!isArchived && (
  <Button variant="outline" asChild>
    <Link to={`/students/${student.id}/transcript`}>View Transcript</Link>
  </Button>
)}
```

---

### `server/src/__tests__/transcript.test.ts` (test, CRUD)

**Analog:** `server/src/__tests__/documents.test.ts` — exact match for structure

**Test file header pattern** (lines 1–16 of documents.test.ts):
```typescript
import os from 'node:os'
process.env.UPLOAD_ROOT = os.tmpdir()

import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'
```

**Helper functions pattern** (lines 17–33 of documents.test.ts):
```typescript
const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

async function createTestStudent(overrides: Partial<typeof validStudentPayload> = {}) {
  const token = staffToken()
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validStudentPayload, ...overrides })
  expect(res.status).toBe(201)
  return res.body as { id: string }
}

beforeEach(clearDb)
```

**Test structure pattern** (lines 42–55 of documents.test.ts):
```typescript
describe('Documents', () => {
  it('doc-01: POST valid PDF + REPORT_CARD returns 201 with document metadata', async () => {
    const student = await createTestStudent()
    const token = staffToken()
    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      // ...
    expect(res.status).toBe(201)
    expect(res.body.originalFilename).toBe('test.pdf')
  })
})
```

**PDF mock pattern** (from RESEARCH.md Validation Architecture):
```typescript
// At top of transcript.test.ts, before imports:
import { vi } from 'vitest'
vi.mock('../services/pdf.js', () => ({
  generatePdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
}))
```

**Audit log assertion pattern** (lines 199–222 of documents.test.ts):
```typescript
const auditLogs = await prisma.auditLog.findMany({
  where: { model: 'Document', action: 'DELETE', recordId: docId },
})
expect(auditLogs).toHaveLength(1)
```

---

### `server/src/__tests__/settings.test.ts` (test, CRUD)

**Analog:** `server/src/__tests__/documents.test.ts`

**Admin token pattern** — add alongside staff token:
```typescript
const adminToken = () =>
  makeTestToken({
    preferred_username: 'admin@school.edu',
    name: 'Test Admin',
    roles: ['ADMIN'],    // makeTestToken supports role override via claims
  })
```

Note: Check `makeTestToken.ts` — if it doesn't support `role` claim, use the `preferred_username` approach and pre-create the user with ADMIN role via `prisma.user.update` after the first `/api/auth/me` call.

---

### `server/src/__tests__/helpers/testDb.ts` — modify

**Operation:** Add two `deleteMany` calls for the new models.

**Existing clearDb pattern** (lines 4–15 of testDb.ts):
```typescript
export async function clearDb(): Promise<void> {
  await prisma.staffNote.deleteMany()
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.document.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}
```

**Add at the start of clearDb** (before auditLog and student deletions — Transcript has a FK to Student so must be deleted first):
```typescript
await prisma.transcript.deleteMany()
await prisma.schoolSettings.deleteMany()
```

---

### `server/src/__tests__/students.test.ts` — modify (7 transcriptStatus references)

**Locations confirmed in RESEARCH.md:**
- Line 40 — type assertion: `transcriptStatus: string` → change to `transcriptStatus: string` (keep — it's the response field name for backward compat)
- Line 61 — `transcriptStatus: 'NONE'` response assertion → keep (API response still uses this field name)
- Line 131 — same pattern as line 61
- Line 335 — `prisma.student.update({ data: { transcriptStatus: 'DRAFT' } })` → **change** to seed a Transcript record instead
- Lines 372–383 — nav-02-status test filters and assertions

**seedListStudents fix pattern** — replace direct `Student.transcriptStatus` update:
```typescript
// BEFORE (line 333–336):
await prisma.student.update({
  where: { id: lee.id },
  data: { transcriptStatus: 'DRAFT' },
})

// AFTER:
await prisma.transcript.create({
  data: { studentId: lee.id, status: 'DRAFT' },
})
```

**nav-02-status test fix** — the filter query and response assertion field name stay the same (`transcriptStatus`) but the server must return it from the JOIN; test assertions don't change, only seed data does.

---

## Shared Patterns

### Authentication (JWT Bearer — all routes)
**Source:** `server/src/middleware/auth.ts`
**Apply to:** All new routes (inherited automatically via `app.use('/api', validateJwt)` and `app.use('/api', resolveUser)` in app.ts)
- No per-route auth setup needed; `req.user` is always populated on `/api` routes.

### Admin Role Guard
**Source:** `server/src/middleware/requireRole.ts` (lines 1–15)
**Apply to:** `server/src/routes/settings.ts` (entire router)
```typescript
export const requireRole = (role: Role) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Unauthenticated' }); return }
    if (req.user.role !== role) { res.status(403).json({ error: 'Forbidden' }); return }
    next()
  }
```

### Error Handling (Express routes)
**Source:** `server/src/routes/documents.ts` (lines 143–148, 173–183)
**Apply to:** All new routes (`transcript.ts`, `settings.ts`)
```typescript
// Per-route catch block:
} catch (err) {
  if (err instanceof TranscriptNotFoundError) {
    res.status(404).json({ error: 'Transcript not found' })
    return
  }
  next(err)  // delegates to global error handler in app.ts
}
```

### Audit Logging
**Source:** `server/src/services/audit.ts` (via `logAudit` in document.ts lines 36–42)
**Apply to:** `transcript.ts` service (save, finalise, export), `settings.ts` service (upsert)
```typescript
await logAudit(prisma, {
  userId: req.user!.id,
  action: 'UPDATE',      // or 'CREATE' for PDF export audit entry
  model: 'Transcript',   // or 'SchoolSettings', 'TranscriptPdf'
  recordId: transcript.id,
  details: { status },
})
```

### Toast Feedback (client)
**Source:** `client/src/pages/StudentDetailPage.tsx` (lines 137–138, 105)
**Apply to:** `TranscriptPage.tsx`, `SettingsPage.tsx`
```typescript
import { toast } from 'sonner';
toast.success('Changes saved');
toast.error('Could not save changes. Please try again.');
```

### TanStack Query (client)
**Source:** `client/src/components/records/AcademicResultsSection.tsx` (lines 1–3)
**Apply to:** `TranscriptPage.tsx` for status mutations (though TranscriptPage may use direct `useState` + `useEffect` like `StudentDetailPage.tsx` for the main load — use TanStack `useMutation` for the save/export actions)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/services/pdf.ts` | service | file-I/O | No Puppeteer / headless browser usage exists in codebase — follow RESEARCH.md Pattern 1 |
| `client/src/components/transcript/TipTapEditor.tsx` | React component | event-driven | No rich text editor in codebase — follow RESEARCH.md Pattern 3; critical v3 API differences documented there |
| `client/src/hooks/useDebouncedCallback.ts` | hook | event-driven | No debounce hook exists — implement inline per RESEARCH.md Code Examples |

---

## Metadata

**Analog search scope:** `server/src/services/`, `server/src/routes/`, `server/src/__tests__/`, `server/prisma/`, `client/src/pages/`, `client/src/components/`, `client/src/api/`
**Files scanned:** 15
**Pattern extraction date:** 2026-06-14
