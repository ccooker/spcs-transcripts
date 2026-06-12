# Phase 2: Student Profiles & Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 2-Student Profiles & Search
**Areas discussed:** Profile fields, Year levels, List & navigation, Delete behavior

---

## Profile Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Single full name | One "Full name" field | ✓ |
| First + Last | Separate name fields | |
| First + Last + Preferred | Legal vs preferred name | |
| You decide | Claude picks | |

**User's choice:** Single full name field

| Contact fields | Selected |
|----------------|----------|
| Student email | ✓ |
| Student phone | ✓ |
| Parent email | ✓ |
| Parent phone | ✓ |
| School student ID | ✓ |

**Required on create:** Full name + Form level + School student ID (contacts optional)

| Detail page scope | Selected |
|-------------------|----------|
| Profile only + Phase 3 placeholder | ✓ |
| Empty section tabs | |
| Inline edit | |

---

## Year Levels

| Option | Description | Selected |
|--------|-------------|----------|
| Year 7–12 | Australian/UK style | |
| Form 1–6 | Hong Kong secondary | ✓ |
| Custom list | User specifies | |
| You decide | Claude picks | |

| Configurable? | Selected |
|---------------|----------|
| Fixed in code | ✓ |
| Admin-configurable table | |
| Environment/config file | |

**Graduation year:** Both Form level and Graduation year on profile

**Transcript status in Phase 2:** Schema field with default None; filter UI active (all show None until Phase 5)

---

## List & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Data table | Sortable rows for 200–600 students | ✓ |
| Card grid | Visual, less dense | |
| Compact table | Minimal columns | |

**Cohort overview:** Grouped-by-form view on same table with status summary per form

**Search:** Search box + button (explicit action)

**Create flow:** Dedicated page at `/students/new`

---

## Delete Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete | Hidden from list, retained in DB | ✓ |
| Permanent delete | Removed entirely | |
| Admin soft / Staff none | | |

**Permissions:** Staff can archive; Admin can view archived and restore

**Confirmation:** Type student name to confirm

**Restore:** Admin restore UI included in Phase 2

---

## Claude's Discretion

- Table columns, default sort, graduation year input widget, pagination approach, empty/loading states

## Deferred Ideas

None — all discussion stayed within Phase 2 scope.
