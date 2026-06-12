# Phase 02: Student Profiles & Search - Research

**Researched:** 2026-06-12
**Domain:** Prisma/Express CRUD API + React/shadcn data table with search, filter, cohort grouping
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Profile Fields
- **D-01:** Single **Full name** field (not split into first/last)
- **D-02:** Contact fields on profile: student email, student phone, parent/guardian email, parent/guardian phone, school student ID number
- **D-03:** Required on create: **Full name + Form level + School student ID**; all contact fields optional at creation
- **D-04:** Student detail page in Phase 2 shows **profile fields only** — placeholder message indicating record sections (academics, activities, etc.) arrive in Phase 3

#### Year Levels & Status
- **D-05:** Form labels: **Form 1–6** (Hong Kong secondary school convention — matches SPCS context)
- **D-06:** Form levels are a **fixed list in code** (not admin-configurable reference table)
- **D-07:** Profile stores **both Form level and Graduation year** (e.g. Form 4 + Class of 2027)
- **D-08:** Add `transcriptStatus` field to Student schema with enum `DRAFT | FINALISED | NONE`, default **NONE**; status filter UI works in Phase 2 (all students show None until Phase 5 enables setting status)

#### List & Navigation
- **D-09:** Student list displayed as a **data table** with sortable columns (suited to 200–600 students)
- **D-10:** Cohort overview (NAV-03) is a **grouped-by-form view on the same table** — status summary row per form, not a separate page or tab
- **D-11:** Name search uses a **search box + button** (explicit search action, not instant filter-as-you-type)
- **D-12:** Create student via dedicated route **`/students/new`** (full-page form, not modal)

#### Delete & Archive
- **D-13:** **Soft delete only** — archived students hidden from default list, retained in database with audit trail
- **D-14:** **Staff can archive** profiles; **Admin can view archived students and restore** them
- **D-15:** Archive/delete confirmation requires **typing the student's name** (not simple Yes/No)
- **D-16:** Admin restore UI included in Phase 2 (not deferred)

### Claude's Discretion
- Exact table columns and default sort order
- Graduation year input format (year picker vs dropdown of next N years)
- Empty states and loading skeletons for student list
- API pagination strategy for 600-student scale (server-side vs client-side — researcher/planner to recommend)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STU-01 | Staff can create a student profile (name, year level, contact details) | Prisma `Student` model + `POST /api/students` + Zod validation + `logAudit(CREATE)` + `/students/new` React Hook Form page |
| STU-02 | Staff can view, edit, and delete student profiles | `GET/PATCH/DELETE /api/students/:id` + `/students/:id` detail/edit page + soft-archive via `archivedAt` + name-typing confirmation dialog |
| NAV-01 | Staff can search the student list by name | Server-side `q` query param with PostgreSQL `ILIKE` on `fullName`; search box + Search button triggers refetch (not debounced client filter) |
| NAV-02 | Staff can filter by year level and transcript status | Server-side `formLevel` and `transcriptStatus` query params; shadcn `Select` filters bound to API refetch |
| NAV-03 | Staff can view a cohort overview with per-student status indicators | Same table sorted by `formLevel`; inject per-form summary header rows with Draft/Finalised/None counts; `Badge` per student for `transcriptStatus` |
</phase_requirements>

---

## Summary

Phase 2 introduces the first domain entity (`Student`) and the primary navigation surface staff will use daily. The implementation extends the Phase 1 Express + Prisma + MSAL stack — no new frameworks. The backend adds a Prisma `Student` model with UUID primary key, soft-archive via `archivedAt`, and a queryable `/api/students` router. Every mutation calls the existing `logAudit()` service (Pitfall 5). The frontend adds three routes (`/students`, `/students/new`, `/students/:id`), activates the disabled nav link in `HomePage`, and implements the list as a shadcn Data Table powered by TanStack Table.

The dominant technical decision is **server-side list operations** (search, filter, sort, pagination). CONTEXT locks an explicit search button (D-11), the cohort is 200–600 students, and project pitfalls explicitly warn against loading all students on page load. TanStack Table's `manualPagination`, `manualSorting`, and `manualFiltering` modes pair with query-param-driven API fetches. Client-side table models are viable for <100 rows but are the wrong default here.

Cohort overview (NAV-03) is a **presentation pattern on the same dataset**, not a separate API: sort results by `formLevel`, render injected group-header rows showing per-form status counts, then student rows with status badges. Admin restore is a toggle (`includeArchived=true`) plus restore action on archived rows, gated by `requireRole(Role.ADMIN)`.

**Primary recommendation:** Server-side paginated `GET /api/students` with Zod-validated query params; TanStack Table + shadcn Data Table on the client; `archivedAt` soft-archive with explicit `archivedAt: null` filter in list queries; extract shared `AppShell` layout from `HomePage` for all authenticated pages.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Student CRUD business logic | API / Backend | Database / Storage | Express route handlers + Prisma; no client-side authority |
| Input validation (create/update) | API / Backend | Browser / Client | Zod schemas on server are authoritative; client mirrors for UX |
| Name search | API / Backend | Browser / Client | PostgreSQL `ILIKE` with indexes; button triggers API call per D-11 |
| Form/status filtering | API / Backend | Browser / Client | Filter state in UI; enforcement in Prisma `where` clause |
| Column sorting | API / Backend | Browser / Client | `orderBy` in Prisma; TanStack `manualSorting` reflects server order |
| Pagination | API / Backend | Browser / Client | Offset/limit or cursor in API; TanStack `manualPagination` |
| Cohort group headers + status badges | Browser / Client | — | Pure presentation over flat API response sorted by form |
| Archive confirmation (type name) | Browser / Client | — | Dialog UX; server validates student exists and user is authenticated |
| Soft archive / restore | API / Backend | Database / Storage | `archivedAt` timestamp; restore clears field |
| Audit logging on mutations | API / Backend | Database / Storage | Existing `logAudit()` — append-only `AuditLog` table |
| Admin-only archived list + restore | API / Backend | Browser / Client | `requireRole(ADMIN)` on restore + `includeArchived` query param |
| Auth token on API calls | Browser / Client | — | Existing `apiFetch` / `acquireTokenSilent` pattern |
| Route protection | Browser / Client | — | Existing `ProtectedRoute` wrapper |

---

## Project Constraints (from .cursor/rules/)

| Constraint | Impact on Phase 2 |
|------------|-------------------|
| **Auth:** Microsoft Entra ID SSO via MSAL/OAuth 2.0 PKCE — no custom passwords | Reuse Phase 1 `apiFetch` + Express `validateJwt`/`resolveUser`; no auth changes |
| **Data residency:** On-premise database only — no third-party cloud data storage | Student records stay in local PostgreSQL; no external search/analytics services |
| **Platform:** Web app in browser — no desktop install | Standard React SPA pages; table must be responsive enough for school desktops |
| **Implemented stack is Express 5 + Vite/React + Prisma 7** (not Next.js from STACK.md) | Follow `server/src/` + `client/src/` patterns from Phase 1; ignore Next.js/App Router guidance in STACK.md |
| **UUID public IDs** (Pitfall 4) | `Student.id` must be `@default(uuid())`; never expose sequential IDs |
| **Audit on all mutations** (Pitfall 5) | `logAudit()` on create, update, archive (DELETE action), restore (UPDATE action) |
| **Soft delete from day one** (Technical Debt Patterns) | `archivedAt DateTime?` field; never hard-delete student rows in Phase 2 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `prisma` / `@prisma/client` | 7.8.0 | Student schema + migrations + type-safe queries | Already in project; Phase 1 pattern [VERIFIED: codebase] |
| `express` | 5.2.1 | `/api/students` REST router | Phase 1 locked stack [VERIFIED: codebase] |
| `zod` | 4.4.3 | Server request/query validation + shared shape with client | Project stack standard for validation [CITED: npm registry — version verified 2026-06-12] |
| `@tanstack/react-table` | 8.21.3 | Headless sortable/paginated table | shadcn Data Table canonical pairing [CITED: ui.shadcn.com/docs/components/data-table] |
| `react-hook-form` | 7.78.0 | Create/edit student forms | Project stack standard; integrates with Zod [CITED: npm registry] |
| `@hookform/resolvers` | 5.4.0 | Zod ↔ React Hook Form bridge | Required resolver package [CITED: npm registry] |
| shadcn/ui primitives | existing | Table, Input, Select, Dialog, Form, Label, AlertDialog | Phase 1 UI-SPEC zinc/blue tokens carry forward [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | 2.0.7 | Toast notifications for save/archive success/error | After mutations on create/edit/archive/restore |
| `lucide-react` | 1.17.0 | Sort icons, action menu icons | Already installed; Data Table column headers |
| `supertest` + `vitest` | 7.2.2 / 3.2.3 | API integration tests | Extend Phase 1 test pattern for student routes |
| `jsonwebtoken` | 9.0.3 | Test token helper | Already used in `makeTestToken.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side pagination | Client-side TanStack pagination (`getPaginationRowModel`) | Simpler code but loads up to 600 rows; violates PITFALLS performance guidance; conflicts with button-triggered search |
| Prisma Client Extension for soft-delete | Explicit `archivedAt: null` in every list query | Extension auto-filters but adds magic; explicit filter is clearer for admin `includeArchived` escape hatch |
| Modal create form | Full-page `/students/new` (locked D-12) | Modal rejected by user decision |
| Split first/last name fields | Single `fullName` (locked D-01) | Split rejected — staff search by full name |

**Installation:**

```bash
# Client (table, forms, toasts)
cd client
npm install @tanstack/react-table react-hook-form zod @hookform/resolvers sonner
npx shadcn@latest add table input select dialog form label alert-dialog

# Server (request validation)
cd server
npm install zod
```

**Version verification (2026-06-12):**

```bash
npm view @tanstack/react-table version   # 8.21.3
npm view react-hook-form version         # 7.78.0
npm view zod version                     # 4.4.3
npm view @hookform/resolvers version     # 5.4.0
npm view sonner version                  # 2.0.7
```

---

## Package Legitimacy Audit

> Legitimacy seam (`gsd-tools query package-legitimacy`) was unavailable in this session. Verdicts based on `npm view` version confirmation + known source repositories.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@tanstack/react-table` | npm | ~5 yrs | ~5M/wk (est.) | github.com/TanStack/table | OK | Approved |
| `react-hook-form` | npm | ~6 yrs | ~10M/wk (est.) | github.com/react-hook-form/react-hook-form | OK | Approved |
| `zod` | npm | ~5 yrs | ~70M/wk (est.) | github.com/colinhacks/zod | OK | Approved |
| `@hookform/resolvers` | npm | ~4 yrs | ~8M/wk (est.) | github.com/react-hook-form/resolvers | OK | Approved |
| `sonner` | npm | ~2 yrs | ~3M/wk (est.) | github.com/emilkowalski/sonner | OK | Approved |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious [SUS]:** none

**Postinstall scripts checked:** `@tanstack/react-table` — none [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Browser (React SPA + MSAL)                                              │
│                                                                         │
│  /students ──────► StudentsListPage                                     │
│    │ search btn + filters + sort headers                                │
│    │ TanStack Table (manualPagination/Sorting/Filtering)                │
│    │ cohort group header rows (client presentation)                     │
│    ▼                                                                    │
│  apiFetch GET /api/students?q&formLevel&status&page&sort&includeArchived│
│                                                                         │
│  /students/new ──► StudentFormPage ──► POST /api/students               │
│  /students/:id ──► StudentDetailPage ──► GET/PATCH/DELETE /api/students/:id
│                                              │                          │
│  Archive dialog (type name) ─────────────────┘                          │
│  Admin restore toggle ──► POST /api/students/:id/restore                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Bearer JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Express API                                                             │
│  validateJwt → resolveUser → studentsRouter                           │
│    ├─ Zod parse query/body                                              │
│    ├─ Prisma Student queries (archivedAt: null default)                 │
│    └─ logAudit() on CREATE / UPDATE / DELETE                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                           PostgreSQL (on-prem)
                           Student + AuditLog tables
```

### Recommended Project Structure

```
server/
├── prisma/
│   ├── schema.prisma              # + Student model, FormLevel enum, TranscriptStatus enum
│   └── migrations/                # new migration for Student table
├── src/
│   ├── routes/
│   │   └── students.ts            # CRUD + list + archive + restore
│   ├── schemas/
│   │   └── student.ts             # Zod create/update/list query schemas
│   ├── services/
│   │   └── student.ts             # Prisma query helpers (list, archive, restore)
│   └── __tests__/
│       ├── students.test.ts       # STU/NAV requirement tests
│       └── helpers/
│           └── testDb.ts          # + prisma.student.deleteMany() in clearDb

client/
├── src/
│   ├── api/
│   │   └── apiClient.ts           # + apiPost, apiPatch, apiDelete helpers
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx       # Extracted header/nav from HomePage
│   │   ├── students/
│   │   │   ├── StudentsDataTable.tsx
│   │   │   ├── StudentColumns.tsx
│   │   │   ├── CohortGroupHeader.tsx
│   │   │   ├── ArchiveStudentDialog.tsx
│   │   │   └── StudentForm.tsx
│   │   └── ui/                    # + table, input, select, dialog, form, label, alert-dialog
│   ├── pages/
│   │   ├── StudentsListPage.tsx
│   │   ├── StudentNewPage.tsx
│   │   └── StudentDetailPage.tsx
│   └── lib/
│       └── formLevels.ts          # FORM_LEVELS constant + label helpers
```

### Pattern 1: Prisma Student Model

**What:** UUID-keyed student entity with soft-archive and transcript status placeholder.

**When to use:** Schema migration as first backend task.

**Example:**

```prisma
enum FormLevel {
  FORM_1
  FORM_2
  FORM_3
  FORM_4
  FORM_5
  FORM_6
}

enum TranscriptStatus {
  DRAFT
  FINALISED
  NONE
}

model Student {
  id               String           @id @default(uuid())
  fullName         String
  formLevel        FormLevel
  graduationYear   Int
  schoolStudentId  String           @unique
  studentEmail     String?
  studentPhone     String?
  parentEmail      String?
  parentPhone      String?
  transcriptStatus TranscriptStatus @default(NONE)
  archivedAt       DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([fullName])
  @@index([formLevel, archivedAt])
  @@index([transcriptStatus])
  @@index([archivedAt])
}
```

### Pattern 2: Server-Side List API

**What:** Query-param-driven list with pagination, search, filters, and sort.

**When to use:** `GET /api/students` — all list/search/filter/nav requirements.

**Recommended query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `q` | string | — | Partial name match (`fullName ILIKE %q%`); only applied when user clicks Search |
| `formLevel` | FormLevel enum | — | Omit = all forms |
| `transcriptStatus` | TranscriptStatus enum | — | Omit = all statuses |
| `page` | int | 1 | 1-based |
| `pageSize` | int | 50 | Max 100 |
| `sort` | `fullName` \| `formLevel` \| `graduationYear` \| `transcriptStatus` | `fullName` | Whitelist only |
| `order` | `asc` \| `desc` | `asc` | |
| `includeArchived` | boolean | false | Admin-only; returns archived students when true |

**Response shape:**

```typescript
{
  data: Student[],
  meta: { page: number, pageSize: number, total: number, totalPages: number }
}
```

**Pagination recommendation (discretion resolved):** **Server-side offset pagination** with `page` + `pageSize`. At 200–600 students this is simpler than cursor-based pagination and sufficient for staff browsing. TanStack `manualPagination: true` with `rowCount` from `meta.total`.

### Pattern 3: Soft Archive + Admin Restore

**What:** Archive sets `archivedAt`; default list excludes archived; admin can list and restore.

**When to use:** STU-02 delete + D-13–D-16.

**Example:**

```typescript
// Archive (Staff + Admin)
await prisma.student.update({
  where: { id, archivedAt: null },
  data: { archivedAt: new Date() },
})
await logAudit(prisma, { userId, action: 'DELETE', model: 'Student', recordId: id })

// Restore (Admin only)
await prisma.student.update({
  where: { id },
  data: { archivedAt: null },
})
await logAudit(prisma, { userId, action: 'UPDATE', model: 'Student', recordId: id, details: { restored: true } })
```

Do **not** use Prisma Client Extensions for auto-filtering in Phase 2 — the admin `includeArchived` escape hatch is cleaner with explicit `where` builders in `studentService.list()`.

### Pattern 4: shadcn Data Table with Server Operations

**What:** TanStack Table with manual server modes + shadcn `<Table>` rendering.

**When to use:** StudentsListPage (D-09, D-10, D-11).

**Example:**

```tsx
// Source: https://ui.shadcn.com/docs/components/data-table
// + https://tanstack.com/table/latest/docs/guide/pagination (manualPagination)
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

Search UX per D-11: local `searchInput` state updates on keystroke but `q` param only sent on Search button click (or Enter key).

### Pattern 5: Cohort Group Headers (NAV-03)

**What:** When sorted by `formLevel` (default for cohort view), inject summary rows before each form group.

**When to use:** Same table, not a separate page (D-10).

**Rendering approach:**
1. API returns flat `data` sorted by `formLevel`, then `fullName`
2. Client iterates rows; when `formLevel` changes, render `<CohortGroupHeader>` row showing: form label + counts of DRAFT / FINALISED / NONE within that form (computed from current page data, or optionally from API `formSummaries` if cross-page accuracy needed)
3. Each student row shows `<Badge>` for `transcriptStatus`

**Recommendation for v1:** Compute group summaries from **current result set** (the filtered/search results on screen). If the active filters narrow the list, summaries reflect the filtered cohort — this matches staff mental model ("of the students I'm looking at, how many per form are Finalised?"). Document in plan; upgrade to server-side `formSummaries` only if user testing shows confusion.

### Pattern 6: Archive Confirmation Dialog (D-15)

**What:** AlertDialog with text input; Confirm disabled until input exactly matches `student.fullName` (case-sensitive or trim-normalized — pick trim + case-insensitive for usability).

**When to use:** Archive action on detail page and optionally row action menu.

### Pattern 7: Shared App Shell

**What:** Extract `HomePage` header/nav into `AppShell` accepting `userInfo` and `children`.

**When to use:** All authenticated pages including `/students/*`; activate Students nav link (remove `aria-disabled`).

### Anti-Patterns to Avoid

- **Client-side-only search/filter on 600 rows:** Violates D-11 intent and PITFALLS performance trap; button-triggered search must hit the API.
- **Hard delete:** Compliance and audit requirements; use `archivedAt` only.
- **Sequential integer IDs in URLs:** Pitfall 4; UUIDs only.
- **Skipping audit on archive/restore:** Pitfall 5; both are mutations.
- **Instant search on every keystroke:** Locked decision D-11 says button-triggered.
- **Separate cohort overview page/tab:** Locked decision D-10 says same table.
- **Logging student names in server errors:** Security pitfall; log opaque `studentId` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable data table | Custom `<table>` sort state | `@tanstack/react-table` + shadcn Table | Column sorting, pagination state, header render props |
| Form validation | Manual if/else field checks | Zod schemas + React Hook Form | Shared server/client shapes; consistent error messages |
| Archive confirm modal | `window.confirm` | shadcn AlertDialog + controlled Input | D-15 requires typed name confirmation |
| Request body parsing | Ad-hoc `req.body` checks | Zod `safeParse` in route handlers | ASVS V5 input validation |
| Auth on API calls | Per-page fetch with token | Existing `apiFetch` wrapper | Phase 1 MSAL silent-first pattern |
| Soft-delete filtering | Delete records from DB | `archivedAt` timestamp + filtered queries | Audit trail + admin restore |
| Status badges | Custom colored spans | shadcn `Badge` variants | UI-SPEC consistency |

**Key insight:** The student list looks simple but combines search, multi-filter, server pagination, column sort, group headers, and role-gated archive/restore. TanStack Table + server-side query params prevent a rewrite at 600 students.

---

## Common Pitfalls

### Pitfall 1: Loading All Students on Mount

**What goes wrong:** `GET /api/students` returns 600 rows; list feels sluggish; wastes bandwidth.

**Why it happens:** Client-side TanStack defaults (`getPaginationRowModel`) tempt devs to fetch everything once.

**How to avoid:** `manualPagination: true`; default `pageSize: 50`; Prisma `skip`/`take`.

**Warning signs:** No `page`/`pageSize` query params; `findMany()` with no `take`.

### Pitfall 2: Search Fires on Every Keystroke

**What goes wrong:** Violates D-11; causes unnecessary API load while staff type multi-word names.

**Why it happens:** TanStack `getFilteredRowModel` or `useEffect` on input change.

**How to avoid:** Separate `searchInput` (controlled) from `appliedQuery` (sent to API); update `appliedQuery` only on button click or Enter.

**Warning signs:** API calls in `onChange` of search Input.

### Pitfall 3: Forgetting `archivedAt: null` in List Queries

**What goes wrong:** Archived students appear in default list; staff think delete failed.

**Why it happens:** Soft-delete filter omitted from `findMany` where clause.

**How to avoid:** Centralize in `studentService.list()`; never call `prisma.student.findMany` directly from routes.

**Warning signs:** Raw Prisma calls in route handlers.

### Pitfall 4: Staff Can Restore Archived Students

**What goes wrong:** Violates D-14 role boundary.

**Why it happens:** Restore endpoint missing `requireRole(Role.ADMIN)`.

**How to avoid:** `POST /api/students/:id/restore` behind `requireRole(Role.ADMIN)`; hide restore UI for Staff.

**Warning signs:** Restore button visible to all roles.

### Pitfall 5: Missing Audit on Archive

**What goes wrong:** AUTH-03 violation; no trace of who archived a student.

**Why it happens:** Archive treated as "soft" and skipped for audit.

**How to avoid:** `logAudit` with `action: 'DELETE'` on archive; `action: 'UPDATE'` with `{ restored: true }` on restore.

**Warning signs:** Archive route has no `logAudit` call.

### Pitfall 6: `schoolStudentId` Uniqueness Not Enforced

**What goes wrong:** Duplicate school IDs create operational confusion.

**Why it happens:** Missing `@unique` on schema or no 409 handling.

**How to avoid:** Prisma `@unique`; catch `P2002` and return 409 with clear message.

**Warning signs:** No unique constraint in migration.

### Pitfall 7: Cohort Headers Only Work on Page 1

**What goes wrong:** Group summaries split awkwardly across pages.

**Why it happens:** Pagination splits a form group across pages.

**How to avoid:** Default sort `formLevel asc, fullName asc`; consider larger `pageSize` (50) so most forms fit one page; acceptable at 600 students / 6 forms ≈ 100 per form max.

**Warning signs:** Random form groups appearing partial with no context.

---

## Code Examples

### Server List Query (Prisma)

```typescript
// Source: Prisma findMany docs pattern + project service-layer convention
const where = {
  archivedAt: includeArchived ? undefined : null,
  ...(q ? { fullName: { contains: q, mode: 'insensitive' as const } } : {}),
  ...(formLevel ? { formLevel } : {}),
  ...(transcriptStatus ? { transcriptStatus } : {}),
}

const [data, total] = await prisma.$transaction([
  prisma.student.findMany({
    where,
    orderBy: { [sort]: order },
    skip: (page - 1) * pageSize,
    take: pageSize,
  }),
  prisma.student.count({ where }),
])
```

### Zod Create Schema

```typescript
// Source: Zod v4 docs pattern [CITED: zod.dev]
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

### Route Registration

```typescript
// Source: Phase 1 app.ts pattern [VERIFIED: codebase]
import studentsRouter from './routes/students.js'
app.use('/api/students', studentsRouter)
```

### Test Pattern (extends Phase 1)

```typescript
// Source: server/src/__tests__/auth.test.ts [VERIFIED: codebase]
it('stu-01-create: POST /api/students creates student and audit log', async () => {
  const token = makeTestToken({ preferred_username: 'staff@school.edu' })
  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Chan Tai Man', formLevel: 'FORM_4', graduationYear: 2027, schoolStudentId: 'S2024001' })
  expect(res.status).toBe(201)
  const logs = await prisma.auditLog.findMany({ where: { model: 'Student' } })
  expect(logs).toHaveLength(1)
  expect(logs[0].action).toBe('CREATE')
})
```

### Cohort Group Header Row

```tsx
// Presentation-only — not a TanStack data row
<TableRow className="bg-muted/50 hover:bg-muted/50">
  <TableCell colSpan={columns.length}>
    <span className="font-semibold">Form 4</span>
    <span className="ml-4 text-sm text-muted-foreground">
      Draft: 0 · Finalised: 0 · None: 12
    </span>
  </TableCell>
</TableRow>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma middleware for soft delete | Client Extensions (middleware deprecated) | Prisma 4+ | Use explicit `where` filters or `$extends` — this project uses explicit filters for clarity |
| shadcn `<Toast>` | `sonner` | shadcn v2+ | Install sonner for mutation feedback |
| Client-side table filtering | `manualFiltering` + API query params | TanStack Table v8 | Required for 600-student scale with server search |

**Deprecated/outdated:**
- Prisma `$use` middleware: deprecated in favor of Client Extensions [ASSUMED — verify against Prisma 7 docs during implementation]
- Instant search-as-you-type for this app: rejected by D-11

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cohort group summaries computed from current filtered result set are acceptable | Pattern 5 | Staff may want whole-school counts regardless of filters — add server `formSummaries` |
| A2 | `schoolStudentId` is globally unique across the school | Prisma schema | Duplicates possible if IDs reuse across years — may need composite unique later |
| A3 | Archive name confirmation is case-insensitive + trim-normalized | Pattern 6 | Staff frustration if exact case required |
| A4 | Default `pageSize: 50` keeps most form groups intact on one page | Pitfall 7 | Large forms may split across pages |
| A5 | Offset pagination is sufficient (no cursor needed) | Pattern 2 | Rare edge case if list grows past ~2000 students |
| A6 | Graduation year as numeric input (2020–2040) is acceptable discretion choice | Standard Stack | Staff may prefer dropdown — easy to swap |

---

## Open Questions

1. **Should cohort summary counts reflect the full database or only the filtered/search results?**
   - What we know: D-10 requires grouped view on same table; filters and search are first-class
   - What's unclear: Whether staff expect global counts vs filtered counts in group headers
   - Recommendation: Start with filtered-set counts (A1); note in plan for UAT validation

2. **PostgreSQL availability during development/CI**
   - What we know: `docker-compose.yml` exists; tests require live DB per `vitest.config.ts`
   - What's unclear: Whether CI runs PostgreSQL
   - Recommendation: Document `docker compose up -d` prerequisite in plan Wave 0; tests fail without DB

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server + client build | ✓ | 22.16.0 | — |
| npm | Package install | ✓ | 10.9.2 | — |
| PostgreSQL | Prisma + integration tests | ✗ (not running) | — | `docker compose up -d` per `docker-compose.yml` |
| Docker | Local PostgreSQL | ✓ | 29.5.3 | Manual PostgreSQL install on Windows Server |
| Azure AD / MSAL | API auth | ✓ (Phase 1) | MSAL 5.13 | Test mode HS256 via `TEST_JWT_SECRET` |

**Missing dependencies with no fallback:**
- PostgreSQL (blocking for migration + tests) — must start via Docker or local install before implementation

**Missing dependencies with fallback:**
- None beyond PostgreSQL

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.3 + Supertest 7.2.2 |
| Config file | `server/vitest.config.ts` |
| Quick run command | `cd server && npm test -- src/__tests__/students.test.ts -x` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STU-01 | Create student profile | integration | `npm test -- src/__tests__/students.test.ts -t stu-01` | ❌ Wave 0 |
| STU-02 | View student by id | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-get` | ❌ Wave 0 |
| STU-02 | Update student profile | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-patch` | ❌ Wave 0 |
| STU-02 | Archive (soft delete) student | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-archive` | ❌ Wave 0 |
| STU-02 | Admin restore archived student | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-restore` | ❌ Wave 0 |
| NAV-01 | Search by partial name | integration | `npm test -- src/__tests__/students.test.ts -t nav-01` | ❌ Wave 0 |
| NAV-02 | Filter by form level | integration | `npm test -- src/__tests__/students.test.ts -t nav-02-form` | ❌ Wave 0 |
| NAV-02 | Filter by transcript status | integration | `npm test -- src/__tests__/students.test.ts -t nav-02-status` | ❌ Wave 0 |
| AUTH-03 | Audit log on create/update/archive | integration | `npm test -- src/__tests__/students.test.ts -t auth-03` | ❌ Wave 0 |
| AUTH-02 | Staff cannot restore; admin can | integration | `npm test -- src/__tests__/students.test.ts -t auth-02-restore` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd server && npm test -- src/__tests__/students.test.ts -x`
- **Per wave merge:** `cd server && npm test`
- **Phase gate:** Full server suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `server/src/__tests__/students.test.ts` — covers STU-01, STU-02, NAV-01, NAV-02, AUTH-02, AUTH-03
- [ ] `server/src/__tests__/helpers/testDb.ts` — add `prisma.student.deleteMany()` before `auditLog`/`user` cleanup
- [ ] `server/src/routes/students.ts` — router under test
- [ ] `server/src/schemas/student.ts` — Zod schemas
- [ ] PostgreSQL running (Docker Compose) — prerequisite for any test execution
- [ ] Client component tests — none planned (manual UAT for UI); acceptable per Phase 1 precedent

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Phase 1 JWT validation on all `/api/students/*` routes |
| V3 Session Management | no | Stateless JWT; no new session surface |
| V4 Access Control | yes | All staff access all students (by design); `requireRole(ADMIN)` on restore + `includeArchived` |
| V5 Input Validation | yes | Zod schemas on create/update/query; whitelist `sort` column names |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via sequential IDs | Elevation of Privilege | UUID `@default(uuid())` on Student.id (Pitfall 4) |
| Unauthenticated student data access | Information Disclosure | `validateJwt` + `resolveUser` on `/api` prefix (Phase 1) |
| Mass assignment on update | Tampering | Zod `createStudentSchema` / `updateStudentSchema` with explicit fields |
| SQL injection via search string | Tampering | Prisma parameterized queries; never interpolate `q` into raw SQL |
| Student PII in server logs | Information Disclosure | Log `studentId` only; never `fullName` in error handlers |
| Staff restoring when not permitted | Elevation of Privilege | `requireRole(Role.ADMIN)` on restore endpoint |

---

## Sources

### Primary (HIGH confidence)
- `server/prisma/schema.prisma` — existing User/AuditLog models, UUID pattern
- `server/src/services/audit.ts` — `logAudit()` contract
- `server/src/middleware/auth.ts` — JWT + user resolution
- `server/src/__tests__/auth.test.ts` — integration test pattern
- `.planning/phases/02-student-profiles-search/02-CONTEXT.md` — locked decisions
- `.planning/research/PITFALLS.md` — Pitfalls 4, 5; performance trap (no pagination)

### Secondary (MEDIUM confidence)
- [shadcn Data Table docs](https://ui.shadcn.com/docs/components/data-table) — TanStack Table + shadcn Table integration
- [TanStack Table Pagination Guide](https://tanstack.com/table/latest/docs/guide/pagination) — `manualPagination`, `rowCount`
- npm registry version queries (2026-06-12) — package versions

### Tertiary (LOW confidence)
- [Prisma soft delete with Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) — pattern referenced; explicit `where` chosen for this project [ASSUMED]
- Community soft-delete blog posts — informative but not authoritative; explicit filter approach preferred

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified on npm; patterns match Phase 1 codebase and shadcn docs
- Architecture: HIGH — locked CONTEXT decisions constrain design space tightly
- Pitfalls: HIGH — project PITFALLS.md directly addresses this phase

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (30 days — stable stack)
