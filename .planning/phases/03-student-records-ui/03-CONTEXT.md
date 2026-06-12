# Phase 3: Student Records UI - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver all six student record types on the existing student profile page (`/students/:id`): academic results, extracurricular activities, awards, work experience, career interests/goals, and staff notes. Staff can add, edit, and delete list-style records (academics, activities, awards, work experience) and add career-goal versions and append-only notes — all without leaving the profile page. This phase adds Prisma models, CRUD APIs, audit logging on mutations, and UI sections replacing the Phase 2 "Student records" placeholder. Does **not** include document upload (Phase 4), transcript template/PDF export (Phase 5), or student directory changes (Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Record Sections Layout
- **D-01:** Six record types displayed as **vertical stacked Cards** below the existing Profile card — scroll the page, no tabs or route changes
- **D-02:** Section order (top to bottom): **Academics → Activities → Awards → Work Experience → Career Goals → Notes** — mirrors Phase 5 transcript narrative order
- **D-03:** **Profile card stays separate at top** — profile edit remains distinct from record entry (Phase 2 layout preserved)
- **D-04:** Empty sections show **empty-state message + prominent Add button** in the section header (e.g. "No academic results yet")
- **D-05:** Each section card header: **title + entry count + Add button** (e.g. "Academic results (3)")

### Academic Results (STU-03)
- **D-06:** **Grade** — free-text field (staff enter A, B+, 85%, Pass, Distinction, etc.)
- **D-07:** **Year** — store **both calendar year and form level** on each result (e.g. 2024 + Form 4)
- **D-08:** **Subject** — preset dropdown of common HK secondary subjects with **"Other"** revealing a free-text field
- **D-09:** **Optional notes** — short text field (~200 chars max) per result

### Activities, Awards & Work Experience (STU-04, STU-05, STU-06)
- **D-10:** All three list sections share **table/list + Dialog form** pattern for Add and Edit — consistent with Phase 2 `ArchiveStudentDialog` interaction model
- **D-11:** Entries sorted **most recent first** (by end date, or start date if no end date)
- **D-12:** **Start and end dates** use **month + year** pickers (no day precision)
- **D-13:** Award **level** — fixed enum dropdown: **School, Regional, State, National** (per STU-05)

### Career Interests & Goals (STU-07)
- **D-14:** Structured interests — **multi-select from fixed checklist** (~12 broad areas): Medicine/Health, Law, Engineering, Business/Finance, Education, Arts/Design, Science/Research, IT/Technology, Hospitality, Social Services, Sports, Undecided/Exploring
- **D-15:** Free-text description — **narrative paragraph** (~500 chars) for stated goals, university targets, or advisor summary
- **D-16:** **Version history** — each save creates a **new version** with timestamp; full history visible; **versions are read-only** (no delete on versions; staff supersede by adding a new version)

### Staff Notes (STU-08)
- **D-17:** Notes are **append-only** — staff cannot edit or delete past notes
- **D-18:** Display order **newest first**
- **D-19:** Input pattern — **textarea at top of Notes section** + "Add note" button; each note shows timestamp and entering staff member name
- **D-20:** Note length ~**500 chars** max

### Delete Confirmation
- **D-21:** Record deletes (academics, activities, awards, work experience) use **simple AlertDialog** ("Delete this entry?" + Cancel / Delete) — not typed-name confirmation
- **D-22:** **No bulk delete** in v1 — one entry at a time
- **D-23:** After delete: **sonner toast + list refresh**

### Claude's Discretion
- Exact preset HK secondary subject list for academics dropdown (planner/researcher to propose; must include Other)
- Whether award enum adds International as a fifth level
- Table column choices per list section
- Dialog form field layout and validation messages
- API route structure (`/api/students/:id/academics` vs nested resource naming)
- Career-goals version UI (timeline vs compact list of versions)
- Loading skeletons and optimistic vs refetch-after-mutation patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — STU-03 through STU-08 (Phase 3 scope); field definitions for all six record types
- `.planning/ROADMAP.md` — Phase 3 goal and 5 success criteria (all six types on single profile page)
- `.planning/PROJECT.md` — School context (SPCS, 200–600 students, 3–8 careers staff, on-premise)

### Prior Phase Context
- `.planning/phases/02-student-profiles-search/02-CONTEXT.md` — Student entity, soft-delete on profiles, Form 1–6, AppShell, table+dialog patterns
- `.planning/phases/02-student-profiles-search/02-UI-SPEC.md` — shadcn/zinc/blue tokens, Card/Table/Dialog patterns, typography (canonical UI contract)
- `.planning/phases/02-student-profiles-search/02-PATTERNS.md` — Route/service/schema/test analogs for extending student features
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Auth, audit logging (AUTH-03), UUID IDs

### Research
- `.planning/research/PITFALLS.md` — Pitfall: segment record types into separate tables (not single wide student table); audit on all writes
- `.planning/research/FEATURES.md` — Record type field models (Common App activities pattern, award levels, staff notes attribution)

### Existing Code
- `client/src/pages/StudentDetailPage.tsx` — Profile card + "Student records" placeholder to replace with six sections
- `server/prisma/schema.prisma` — Current Student model; six new related models added in this phase
- `server/src/routes/students.ts` — Existing student CRUD; extend or add nested record routes
- `server/src/services/audit.ts` — `logAudit()` on all record mutations
- `client/src/components/students/ArchiveStudentDialog.tsx` — Dialog + destructive action pattern reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StudentDetailPage` — extend in place; Profile card and archive flow unchanged
- `AppShell`, `Card`, `Badge`, `Button`, `Table`, `Dialog`, `AlertDialog`, `Form` (RHF+Zod) — Phase 2 shadcn stack
- `apiGet` / `apiPost` / `apiPatch` / `apiDelete` — extend for record endpoints
- `logAudit()` — call on create/update/delete for each record model
- `ArchiveStudentDialog` — reference for Dialog-based forms and destructive confirms (record delete uses simpler confirm)

### Established Patterns
- UUID primary keys on all entities
- Express routes under `/api/*` with JWT + `resolveUser`; Zod validation in routes
- Prisma service layer (not raw queries in routes)
- Sonner toasts for success/error feedback
- Audit log: acting user, model name, record ID, action, optional details JSON

### Integration Points
- Replace placeholder Card in `StudentDetailPage` (lines ~267–277) with six record section components
- New Prisma models with `studentId` FK to `Student`
- New API routes nested under student or per-record-type routers
- `User` relation on `StaffNote` for attribution (author displayName)
- Career goal versions linked to student + timestamp + authoring user

</code_context>

<specifics>
## Specific Ideas

- SPCS Hong Kong context — Form 1–6 labelling already on student profile; academic results also store form level per result
- Transcript section order drove layout order — staff building toward Phase 5 narrative flow
- Career goals version history treats goals as evolving over time (not a single editable block)
- Notes append-only preserves advisor paper-notebook discipline in digital form

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Student Records UI*
*Context gathered: 2026-06-12*
