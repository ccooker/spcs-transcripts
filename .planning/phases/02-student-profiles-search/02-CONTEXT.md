# Phase 2: Student Profiles & Search - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the student directory: staff can create, view, edit, and archive student profiles; search by name; filter by form level and transcript status; and view a cohort overview grouped by form with per-student status indicators. This phase establishes the `Student` entity, CRUD API, audit logging on mutations, and the `/students` UI — but does **not** include academic results, activities, awards, work experience, career goals, notes, documents, or transcript editing (Phases 3–5).

</domain>

<decisions>
## Implementation Decisions

### Profile Fields
- **D-01:** Single **Full name** field (not split into first/last)
- **D-02:** Contact fields on profile: student email, student phone, parent/guardian email, parent/guardian phone, school student ID number
- **D-03:** Required on create: **Full name + Form level + School student ID**; all contact fields optional at creation
- **D-04:** Student detail page in Phase 2 shows **profile fields only** — placeholder message indicating record sections (academics, activities, etc.) arrive in Phase 3

### Year Levels & Status
- **D-05:** Form labels: **Form 1–6** (Hong Kong secondary school convention — matches SPCS context)
- **D-06:** Form levels are a **fixed list in code** (not admin-configurable reference table)
- **D-07:** Profile stores **both Form level and Graduation year** (e.g. Form 4 + Class of 2027)
- **D-08:** Add `transcriptStatus` field to Student schema with enum `DRAFT | FINALISED | NONE`, default **NONE**; status filter UI works in Phase 2 (all students show None until Phase 5 enables setting status)

### List & Navigation
- **D-09:** Student list displayed as a **data table** with sortable columns (suited to 200–600 students)
- **D-10:** Cohort overview (NAV-03) is a **grouped-by-form view on the same table** — status summary row per form, not a separate page or tab
- **D-11:** Name search uses a **search box + button** (explicit search action, not instant filter-as-you-type)
- **D-12:** Create student via dedicated route **`/students/new`** (full-page form, not modal)

### Delete & Archive
- **D-13:** **Soft delete only** — archived students hidden from default list, retained in database with audit trail
- **D-14:** **Staff can archive** profiles; **Admin can view archived students and restore** them
- **D-15:** Archive/delete confirmation requires **typing the student's name** (not simple Yes/No)
- **D-16:** Admin restore UI included in Phase 2 (not deferred)

### Claude's Discretion
- Exact table columns and default sort order
- Graduation year input format (year picker vs dropdown of next N years)
- Empty states and loading skeletons for student list
- API pagination strategy for 600-student scale (server-side vs client-side — researcher/planner to recommend)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — STU-01, STU-02, NAV-01, NAV-02, NAV-03 (Phase 2 scope)
- `.planning/ROADMAP.md` — Phase 2 goal and 5 success criteria
- `.planning/PROJECT.md` — School context (200–600 students, 3–8 staff, on-premise, M365 SSO)

### Phase 1 Foundation
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Auth pattern (MSAL SPA + JWT), roles in DB, audit logging (AUTH-03), UUID IDs
- `.planning/phases/01-infrastructure-auth/01-UI-SPEC.md` — shadcn/zinc/blue design tokens, typography, spacing (canonical for all UI phases)

### Research & Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 4 (UUID not sequential IDs in URLs), Pitfall 5 (audit trail on all mutations), soft-delete guidance
- `.planning/research/FEATURES.md` — Student list search/filter and cohort overview feature definitions

### Existing Code
- `server/prisma/schema.prisma` — Current User + AuditLog models; Student model added in this phase
- `server/src/services/audit.ts` — `logAudit()` for AUTH-03 compliance on student CRUD
- `server/src/middleware/auth.ts` — JWT validation + `req.user` with role
- `client/src/pages/HomePage.tsx` — Disabled `/students` nav link to activate
- `client/src/api/apiClient.ts` — Authenticated API fetch pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `logAudit()` service — call on every student create/update/archive/restore
- `apiGet` / `apiFetch` — extend for student API calls
- shadcn components: `Button`, `Card`, `Badge`, `Alert`, `Skeleton`, `DropdownMenu` — add `Table`, `Input`, `Select`, `Dialog` for Phase 2
- `HomePage` header/nav shell — reuse for student pages
- `ProtectedRoute` — wrap new student routes

### Established Patterns
- UUID primary keys on all entities (Pitfall 4)
- Express routes under `/api/*` with `validateJwt` + `resolveUser` middleware
- Role checks via `requireRole(Role.ADMIN)` for admin-only restore/archive management
- MSAL Bearer token on all API requests
- Audit log: acting user, model name, record ID, action, optional details JSON

### Integration Points
- Activate `HomePage` → `/students` nav link (currently `aria-disabled`)
- New routes: `/students`, `/students/new`, `/students/:id`
- New Prisma `Student` model + migration
- New Express router: `/api/students` (list, search, filter, CRUD, archive, restore)

</code_context>

<specifics>
## Specific Ideas

- School is SPCS (spcs.edu.hk) — Form 1–6 year labelling, not Australian Year 7–12
- Staff think in terms of full names when searching — single name field preferred
- School student ID is operationally important (required on create alongside name and form)
- Cohort overview should feel like a natural grouping on the same list, not a separate reporting screen

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Student Profiles & Search*
*Context gathered: 2026-06-12*
