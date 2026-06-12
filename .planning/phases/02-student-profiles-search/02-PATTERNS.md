# Phase 2: Student Profiles & Search - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 22
**Analogs found:** 16 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/prisma/schema.prisma` | model | CRUD | `server/prisma/schema.prisma` (User/AuditLog) | exact |
| `server/prisma/migrations/*` | migration | batch | `server/prisma/migrations/20260611045200_init/migration.sql` | exact |
| `server/src/routes/students.ts` | route | request-response | `server/src/routes/auth.ts` + `server/src/app.ts` admin route | role-match |
| `server/src/schemas/student.ts` | utility | transform | — (no Zod in codebase yet) | none |
| `server/src/services/student.ts` | service | CRUD | `server/src/services/audit.ts` | role-match |
| `server/src/app.ts` | config | request-response | `server/src/app.ts` (existing) | exact |
| `server/src/__tests__/students.test.ts` | test | request-response | `server/src/__tests__/auth.test.ts` | exact |
| `server/src/__tests__/helpers/testDb.ts` | utility | batch | `server/src/__tests__/helpers/testDb.ts` | exact |
| `client/src/api/apiClient.ts` | utility | request-response | `client/src/api/apiClient.ts` | exact |
| `client/src/components/layout/AppShell.tsx` | component | — | `client/src/pages/HomePage.tsx` (header/nav) | exact |
| `client/src/pages/HomePage.tsx` | page | — | `client/src/pages/HomePage.tsx` | exact |
| `client/src/App.tsx` | config | — | `client/src/App.tsx` | exact |
| `client/src/lib/formLevels.ts` | utility | transform | `server/src/generated/prisma/enums.ts` (Role enum pattern) | partial |
| `client/src/pages/StudentsListPage.tsx` | page | request-response | `client/src/pages/HomePage.tsx` + `client/src/App.tsx` data-fetch | role-match |
| `client/src/pages/StudentNewPage.tsx` | page | CRUD | `client/src/pages/LoginPage.tsx` (Card layout) | partial |
| `client/src/pages/StudentDetailPage.tsx` | page | CRUD | `client/src/pages/HomePage.tsx` + `client/src/App.tsx` | role-match |
| `client/src/components/students/StudentForm.tsx` | component | CRUD | `client/src/pages/LoginPage.tsx` (Button/Card/Alert) | partial |
| `client/src/components/students/StudentsDataTable.tsx` | component | request-response | `client/src/components/ui/skeleton.tsx` + `badge.tsx` | partial |
| `client/src/components/students/StudentColumns.tsx` | component | transform | `client/src/components/ui/badge.tsx` | partial |
| `client/src/components/students/CohortGroupHeader.tsx` | component | transform | `client/src/components/ui/badge.tsx` | partial |
| `client/src/components/students/ArchiveStudentDialog.tsx` | component | request-response | `client/src/pages/LoginPage.tsx` (controlled state + Alert) | partial |
| `client/src/components/ui/*` (table, input, select, dialog, form, label, alert-dialog) | component | — | `client/src/components/ui/button.tsx` (shadcn convention) | role-match |

---

## Pattern Assignments

### `server/prisma/schema.prisma` (model, CRUD)

**Analog:** `server/prisma/schema.prisma` (User + AuditLog)

**Enum + model pattern** (lines 10-44):
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

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  displayName String
  role        Role       @default(STAFF)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  auditLogs   AuditLog[] @relation("ActingUser")
}

model AuditLog {
  id           String      @id @default(uuid())
  actingUserId String
  actingUser   User        @relation("ActingUser", fields: [actingUserId], references: [id])
  action       AuditAction
  model        String
  recordId     String
  details      String?
  timestamp    DateTime    @default(now())

  @@index([actingUserId])
  @@index([model, recordId])
  @@index([timestamp])
}
```

**Apply to Student:** Add `FormLevel` and `TranscriptStatus` enums; `Student` model with `@id @default(uuid())`, `@unique` on `schoolStudentId`, `@@index` on search/filter columns. Follow same timestamp and optional-field conventions as User.

---

### `server/prisma/migrations/*` (migration, batch)

**Analog:** `server/prisma/migrations/20260611045200_init/migration.sql`

**Migration structure** (lines 1-48):
```sql
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    ...
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "AuditLog_model_recordId_idx" ON "AuditLog"("model", "recordId");
```

**Apply:** Generate via `npx prisma migrate dev --name add_student`; do not hand-write SQL unless migration fails.

---

### `server/src/routes/students.ts` (route, request-response)

**Analog:** `server/src/routes/auth.ts` (Router structure) + `server/src/app.ts` (admin role gate)

**Router imports + export** (`routes/auth.ts` lines 1-14):
```typescript
import { Router } from 'express'

const router = Router()

router.get('/me', (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    displayName: req.user!.displayName,
    role: req.user!.role,
  })
})

export default router
```

**Role gate pattern** (`app.ts` lines 23-24):
```typescript
// Admin-only test route used by auth-02-admin-route integration test
app.get('/api/admin/test', requireRole(Role.ADMIN), (_req, res) => res.json({ ok: true }))
```

**Route registration** (`app.ts` lines 18-21):
```typescript
app.use('/api', validateJwt)
app.use('/api', resolveUser)

app.use('/api/auth', authRouter)
```

**Core CRUD pattern to implement** (compose from project conventions):
```typescript
import { Router } from 'express'
import { requireRole } from '../middleware/requireRole.js'
import { Role } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { logAudit } from '../services/audit.js'
import { listStudents, createStudent, ... } from '../services/student.js'
import { createStudentSchema, listStudentsQuerySchema } from '../schemas/student.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const parsed = listStudentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters' })
      return
    }
    const result = await listStudents(prisma, parsed.data, req.user!)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => { /* Zod safeParse → service → logAudit(CREATE) → 201 */ })
router.get('/:id', async (req, res, next) => { /* 404 if not found */ })
router.patch('/:id', async (req, res, next) => { /* logAudit(UPDATE) */ })
router.delete('/:id', async (req, res, next) => { /* soft archive → logAudit(DELETE) */ })
router.post('/:id/restore', requireRole(Role.ADMIN), async (req, res, next) => { /* logAudit(UPDATE, { restored: true }) */ })

export default router
```

**Error handling:** Use `next(err)` in catch blocks; JWT errors handled globally in `app.ts` (lines 26-33). Return `{ error: string }` for 400/404/409 — match auth middleware style (`res.status(401).json({ error: '...' })`).

**P2002 duplicate handling:** Catch Prisma unique constraint on `schoolStudentId`; return 409 with `{ error: 'School student ID already exists' }`.

---

### `server/src/schemas/student.ts` (utility, transform)

**Analog:** None in codebase — first Zod usage.

**Reference from RESEARCH.md** (use as implementation template):
```typescript
import { z } from 'zod'

export const FORM_LEVELS = ['FORM_1','FORM_2','FORM_3','FORM_4','FORM_5','FORM_6'] as const

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  formLevel: z.enum(FORM_LEVELS),
  graduationYear: z.number().int().min(2020).max(2040),
  schoolStudentId: z.string().trim().min(1).max(50),
  studentEmail: z.email().optional().or(z.literal('')),
  studentPhone: z.string().max(30).optional(),
  parentEmail: z.email().optional().or(z.literal('')),
  parentPhone: z.string().max(30).optional(),
})
```

**Convention to match:** Use `.js` extension on imports; export schemas consumed by both routes and (mirrored on) client form.

---

### `server/src/services/student.ts` (service, CRUD)

**Analog:** `server/src/services/audit.ts`

**Service function pattern** (lines 1-23):
```typescript
import { PrismaClient, type AuditAction } from '../generated/prisma/client.js'

export async function logAudit(
  prisma: InstanceType<typeof PrismaClient>,
  opts: {
    userId: string
    action: AuditAction
    model: string
    recordId: string
    details?: Record<string, unknown>
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actingUserId: opts.userId,
      action: opts.action,
      model: opts.model,
      recordId: opts.recordId,
      details: opts.details ? JSON.stringify(opts.details) : null,
      timestamp: new Date(),
    },
  })
}
```

**List query pattern** (from RESEARCH.md, centralize here — never raw `findMany` in routes):
```typescript
const where = {
  archivedAt: includeArchived ? undefined : null,
  ...(q ? { fullName: { contains: q, mode: 'insensitive' as const } } : {}),
  ...(formLevel ? { formLevel } : {}),
  ...(transcriptStatus ? { transcriptStatus } : {}),
}

const [data, total] = await prisma.$transaction([
  prisma.student.findMany({ where, orderBy: { [sort]: order }, skip, take }),
  prisma.student.count({ where }),
])
```

**Audit on mutations:** Call `logAudit()` from routes or service after every create/update/archive/restore — same contract as `audit.test.ts` expects for model `'Student'`.

---

### `server/src/app.ts` (config, request-response)

**Analog:** `server/src/app.ts` (modify in place)

**Registration to add** (after line 21):
```typescript
import studentsRouter from './routes/students.js'
// ...
app.use('/api/students', studentsRouter)
```

**Existing global middleware** (lines 18-19) already covers all `/api/students/*` — no per-router auth needed.

---

### `server/src/__tests__/students.test.ts` (test, request-response)

**Analog:** `server/src/__tests__/auth.test.ts`

**Test file structure** (lines 1-55):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

beforeEach(clearDb)

describe('GET /api/auth/me', () => {
  it('auth-01-401: returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('auth-01-200: returns 200 with user identity for valid token (preferred_username: staff@school.edu)', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('email', 'staff@school.edu')
  })
})
```

**Audit assertion pattern** (`audit.test.ts` lines 7-30):
```typescript
await logAudit(prisma, {
  userId: 'test-user-id',
  action: 'CREATE',
  model: 'Student',
  recordId: 'test-record-id',
})

const logs = await prisma.auditLog.findMany()
expect(logs.length).toBe(1)
expect(logs[0].action).toBe('CREATE')
expect(logs[0].model).toBe('Student')
```

**Admin vs staff** (`auth.test.ts` lines 48-54):
```typescript
it('auth-02-admin-route: Staff role token gets 403 on admin-only route', async () => {
  const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Staff User' })
  const res = await request(app)
    .get('/api/admin/test')
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(403)
})
```

**Test naming:** Use requirement IDs as prefixes (`stu-01-create`, `nav-01`, `auth-02-restore`) per RESEARCH.md test map.

---

### `server/src/__tests__/helpers/testDb.ts` (utility, batch)

**Analog:** `server/src/__tests__/helpers/testDb.ts`

**Clear order pattern** (lines 4-7):
```typescript
export async function clearDb(): Promise<void> {
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
}
```

**Extend:** Add `await prisma.student.deleteMany()` **before** `auditLog` (FK-safe order: Student has no FK to AuditLog; delete students first, then audit logs, then users).

---

### `client/src/api/apiClient.ts` (utility, request-response)

**Analog:** `client/src/api/apiClient.ts`

**Existing fetch wrapper** (lines 20-55):
```typescript
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const account = getAccount();
  // ... acquireTokenSilent ...
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${tokenResponse.accessToken}`);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`/api${path}`, { ...options, headers });
}
```

**Existing GET helper** (lines 57-67):
```typescript
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = new Error(`API ${res.status}: ${path}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}
```

**Extend with same error pattern:**
```typescript
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) { /* same err.status pattern */ }
  return res.json() as Promise<T>;
}
// apiPatch, apiDelete similarly
```

---

### `client/src/components/layout/AppShell.tsx` (component, layout)

**Analog:** `client/src/pages/HomePage.tsx` (lines 29-100)

**Header/nav shell to extract** (lines 37-100):
```tsx
return (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <span className="text-base font-semibold">SPCS Transcripts</span>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              to="/students"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-disabled="true"
              tabIndex={-1}
              onClick={(e) => e.preventDefault()}
            >
              Students
            </Link>
            {userInfo?.role === 'ADMIN' && (
              <Link to="/settings" ...>Settings</Link>
            )}
          </nav>
        </div>
        <DropdownMenu>...</DropdownMenu>
      </div>
    </header>
    <main className="px-6 py-8">{children}</main>
  </div>
);
```

**Changes for Phase 2:** Accept `{ userInfo, children, activeNav?: 'students' | 'home' }`; remove `aria-disabled`/`preventDefault` on Students link; apply active nav styling per 02-UI-SPEC.md; move `getInitials` helper into AppShell or shared util.

---

### `client/src/pages/HomePage.tsx` (page, modify)

**Analog:** Self — refactor to use AppShell

**Before:** Full page with embedded header (lines 29-125).
**After:** Wrap welcome content in `<AppShell userInfo={userInfo} activeNav="home">`.

---

### `client/src/App.tsx` (config, routing)

**Analog:** `client/src/App.tsx`

**Route + ProtectedRoute pattern** (lines 78-85):
```tsx
<Route
  path="/home"
  element={
    <ProtectedRoute>
      <HomePage userInfo={userInfo} />
    </ProtectedRoute>
  }
/>
```

**UserInfo fetch pattern** (lines 30-41):
```tsx
useEffect(() => {
  if (!isAuthenticated) return;
  apiGet<UserInfo>('/auth/me')
    .then(setUserInfo)
    .catch((err: unknown) => {
      if (err instanceof AuthRedirectInProgressError) return;
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setAuthError('session-expired');
      }
    });
}, [isAuthenticated]);
```

**Add routes:**
```tsx
<Route path="/students" element={<ProtectedRoute><StudentsListPage userInfo={userInfo} /></ProtectedRoute>} />
<Route path="/students/new" element={<ProtectedRoute><StudentNewPage userInfo={userInfo} /></ProtectedRoute>} />
<Route path="/students/:id" element={<ProtectedRoute><StudentDetailPage userInfo={userInfo} /></ProtectedRoute>} />
```

Pass `userInfo` prop to all authenticated pages — same as HomePage.

---

### `client/src/lib/formLevels.ts` (utility, transform)

**Analog:** Prisma enum in schema (server-side source of truth); client mirrors for labels.

**Pattern:** Export `FORM_LEVELS` const array + `formLevelLabel(level: FormLevel): string` mapping `FORM_1` → `"Form 1"`. Keep in sync with Prisma `FormLevel` enum — duplicate the RESEARCH.md `FORM_LEVELS` array, do not fetch enums from API.

---

### `client/src/pages/StudentsListPage.tsx` (page, request-response)

**Analog:** `client/src/App.tsx` (data fetch) + `client/src/pages/HomePage.tsx` (loading skeleton)

**Loading skeleton pattern** (`HomePage.tsx` lines 103-107):
```tsx
{userInfo === null ? (
  <div className="flex items-center gap-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-6 w-14 rounded-full" />
  </div>
) : ( ... )}
```

**Page structure:**
```tsx
<AppShell userInfo={userInfo} activeNav="students">
  <div className="flex items-center justify-between mb-8">
    <h1 className="text-2xl font-semibold">Students</h1>
    <Button asChild><Link to="/students/new">Add student</Link></Button>
  </div>
  {/* search input + Search button (separate appliedQuery state) */}
  {/* form/status Select filters */}
  {/* StudentsDataTable */}
</AppShell>
```

**Data fetch:** `useEffect`/`useCallback` calling `apiGet('/students?...')` when pagination, sorting, filters, or applied search query change — not on every keystroke (D-11).

---

### `client/src/pages/StudentNewPage.tsx` (page, CRUD)

**Analog:** `client/src/pages/LoginPage.tsx` (Card layout + primary action)

**Card page layout** (lines 42-67):
```tsx
<div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
  <Card className="max-w-sm w-full">
    <CardHeader>
      <CardTitle className="text-2xl font-semibold">...</CardTitle>
      <CardDescription className="text-sm text-muted-foreground">...</CardDescription>
    </CardHeader>
    <CardContent>
      <Button className="w-full min-h-[44px] bg-primary text-primary-foreground gap-2">
        ...
      </Button>
    </CardContent>
  </Card>
</div>
```

**Adapt for create form:** Use AppShell wrapper instead of centered login layout; Card with `max-w-lg`; embed `<StudentForm onSubmit={...} />`; on success `navigate('/students/:id')` + sonner toast.

---

### `client/src/pages/StudentDetailPage.tsx` (page, CRUD)

**Analog:** `client/src/pages/HomePage.tsx` (display + Badge) + `client/src/App.tsx` (fetch by route param)

**Display pattern** (HomePage lines 109-118):
```tsx
<h1 className="text-2xl font-semibold">Welcome, {userInfo.displayName}</h1>
<Badge variant={userInfo.role === 'ADMIN' ? 'default' : 'secondary'}>
  {userInfo.role === 'ADMIN' ? 'Admin' : 'Staff'}
</Badge>
```

**Apply:** Show `fullName` as Display title; Badge for `transcriptStatus`; profile fields in read/edit mode; Phase 3 placeholder section; Archive button opens `ArchiveStudentDialog`; admin restore toggle when `includeArchived`.

---

### `client/src/components/students/StudentForm.tsx` (component, CRUD)

**Analog:** `client/src/pages/LoginPage.tsx` (Button, Alert error display)

**Error display pattern** (LoginPage lines 69-76):
```tsx
{error && (
  <div className="mt-4 max-w-sm w-full">
    <Alert variant="destructive">
      <AlertTitle>Sign-in failed</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
)}
```

**Form library:** React Hook Form + `zodResolver(createStudentSchema)` — no existing RHF in codebase; follow shadcn Form component pattern from `npx shadcn add form`. Mirror server Zod schema fields.

---

### `client/src/components/students/StudentsDataTable.tsx` (component, request-response)

**Analog:** `client/src/components/ui/skeleton.tsx` + `badge.tsx` (loading/status rendering)

**Loading rows:** Use `Skeleton` with `h-12` per 02-UI-SPEC table row height.

**TanStack setup** (from RESEARCH.md — no codebase analog):
```tsx
const table = useReactTable({
  data: students,
  columns,
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  pageCount: meta.totalPages,
  rowCount: meta.total,
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  state: { pagination, sorting },
})
```

Install shadcn `table` component; render with `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`.

---

### `client/src/components/students/StudentColumns.tsx` (component, transform)

**Analog:** `client/src/components/ui/badge.tsx`

**Badge usage for status** (badge.tsx lines 5-28):
```tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ...',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground ...',
        secondary: 'border-transparent bg-secondary text-secondary-foreground ...',
        destructive: 'border-transparent bg-destructive text-destructive-foreground ...',
        outline: 'text-foreground',
      },
    },
  }
);
```

**Map transcriptStatus:** FINALISED → `default`, DRAFT → `secondary`, NONE → `outline` (per 02-UI-SPEC.md).

---

### `client/src/components/students/CohortGroupHeader.tsx` (component, transform)

**Analog:** Partial — Badge + table row styling from UI-SPEC

**Rendering pattern** (RESEARCH.md):
```tsx
<TableRow className="bg-muted/50 hover:bg-muted/50">
  <TableCell colSpan={columns.length}>
    <span className="font-semibold">Form 4</span>
    <span className="ml-4 text-sm text-muted-foreground">
      Draft: 0 · Finalised: 0 · None: 12
    </span>
  </TableCell>
</TableRow>
```

Inject between student rows when `formLevel` changes — not a TanStack data row.

---

### `client/src/components/students/ArchiveStudentDialog.tsx` (component, request-response)

**Analog:** `client/src/pages/LoginPage.tsx` (controlled state)

**Controlled state pattern** (LoginPage lines 27-39):
```tsx
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleSignIn() {
  setIsLoading(true);
  setError(null);
  try { ... } catch {
    setError('Sign-in failed. Please try again.');
    setIsLoading(false);
  }
}
```

**Apply:** shadcn AlertDialog + Input; confirm disabled until typed name matches `fullName` (trim + case-insensitive); call `apiDelete('/students/:id')` on confirm.

---

### `client/src/components/ui/*` (shadcn components)

**Analog:** `client/src/components/ui/button.tsx`

**shadcn conventions** (button.tsx lines 1-4, 38-52):
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';
```

**Install via CLI** (do not hand-roll):
```bash
cd client
npx shadcn@latest add table input select dialog form label alert-dialog
```

Use `@/` path aliases from `client/components.json`.

---

## Shared Patterns

### Authentication (JWT + User Resolution)
**Source:** `server/src/app.ts` + `server/src/middleware/auth.ts`
**Apply to:** All `/api/students/*` routes (via global middleware), all client API calls

```typescript
// app.ts — already applied to all /api routes
app.use('/api', validateJwt)
app.use('/api', resolveUser)
```

```typescript
// auth.ts — req.user available in all route handlers after resolveUser
req.user = user  // Prisma User with id, email, displayName, role
```

### Role-Based Access Control
**Source:** `server/src/middleware/requireRole.ts`
**Apply to:** `POST /api/students/:id/restore`, `includeArchived=true` on list (admin-only)

```typescript
export const requireRole = (role: Role) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
```

### Audit Logging on Mutations
**Source:** `server/src/services/audit.ts`
**Apply to:** create, update, archive (DELETE action), restore (UPDATE with details)

```typescript
await logAudit(prisma, {
  userId: req.user!.id,
  action: 'CREATE',  // or 'UPDATE' | 'DELETE'
  model: 'Student',
  recordId: student.id,
  details: { restored: true },  // optional
})
```

### Client API Authentication
**Source:** `client/src/api/apiClient.ts`
**Apply to:** All student API calls

```typescript
// MSAL silent-first; Bearer token on every request
headers.set('Authorization', `Bearer ${tokenResponse.accessToken}`);
return fetch(`/api${path}`, { ...options, headers });
```

### Route Protection (Client)
**Source:** `client/src/components/ProtectedRoute.tsx`
**Apply to:** All `/students/*` routes

```tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

### UUID Primary Keys
**Source:** `server/prisma/schema.prisma` User model
**Apply to:** Student.id — never sequential IDs in URLs or API

```prisma
id String @id @default(uuid())
```

### Prisma Client Singleton
**Source:** `server/src/lib/prisma.ts`
**Apply to:** All service functions

```typescript
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
```

### Test Token Helper
**Source:** `server/src/__tests__/helpers/makeTestToken.ts`
**Apply to:** All students integration tests

```typescript
const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
await request(app)
  .post('/api/students')
  .set('Authorization', `Bearer ${token}`)
  .send({ ... })
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/schemas/student.ts` | utility | transform | First Zod usage in project — use RESEARCH.md schema templates |
| `client/src/components/students/StudentsDataTable.tsx` | component | request-response | No data table in codebase — follow shadcn Data Table + TanStack manual modes (RESEARCH.md Pattern 4) |
| `client/src/components/students/StudentForm.tsx` | component | CRUD | No React Hook Form usage yet — follow shadcn Form + RESEARCH.md Zod resolver pattern |
| `client/src/components/students/ArchiveStudentDialog.tsx` | component | request-response | No Dialog/AlertDialog in codebase — install via shadcn CLI; typed-name confirm is new UX |
| `client/src/components/students/CohortGroupHeader.tsx` | component | transform | Novel presentation pattern — inject rows between table data rows per RESEARCH.md Pattern 5 |
| `client/src/components/ui/table`, `input`, `select`, `dialog`, `form`, `label`, `alert-dialog` | component | — | Generated by shadcn CLI — not hand-written; match existing `button.tsx` conventions |

---

## Metadata

**Analog search scope:** `server/src/`, `server/prisma/`, `client/src/`, `.planning/phases/01-infrastructure-auth/`
**Files scanned:** 47
**Pattern extraction date:** 2026-06-12
