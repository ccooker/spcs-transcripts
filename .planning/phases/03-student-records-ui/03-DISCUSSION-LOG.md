# Phase 3: Student Records UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 03-student-records-ui
**Areas discussed:** Record sections layout, Academic results format, List entry UX, Career interests taxonomy, Staff notes behaviour, Delete confirmation pattern

---

## Record Sections Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical stacked cards | One Card per record type, scroll page; matches Phase 2 pattern | ✓ |
| Horizontal tabs | One tab per type; only one visible at a time | |
| Accordion | Collapsible sections | |
| Sticky section nav | Cards + jump-to sidebar | |

**User's choice:** Vertical stacked cards
**Notes:** Transcript narrative order (Academics → Activities → Awards → Work Experience → Career Goals → Notes). Empty state + Add CTA. Headers: title + count + Add. Profile card stays separate at top.

---

## Academic Results Format

| Option | Description | Selected |
|--------|-------------|----------|
| Free text grades | Any grade format (A, 85%, Pass) | ✓ |
| Letter grades only | Enum/dropdown | |
| Letter OR percentage | Two-field structured entry | |

| Option | Description | Selected |
|--------|-------------|----------|
| Both calendar year + form level | Two year fields per result | ✓ |
| Calendar year only | e.g. 2024, 2025 | |
| Form level only | Form 4, Form 5 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Preset subjects + Other | Dropdown with custom Other field | ✓ |
| Free text subject | Type any subject | |
| Preset list only | Dropdown, no custom | |

| Option | Description | Selected |
|--------|-------------|----------|
| Short optional notes (~200 chars) | Brief per-result annotation | ✓ |
| No notes in v1 | Skip field | |
| Long textarea | Multi-paragraph | |

**User's choice:** Free-text grades; both calendar year and form level; preset subjects + Other; short optional notes

---

## List Entry UX

| Option | Description | Selected |
|--------|-------------|----------|
| Table + dialog forms | List in section; Add/Edit in Dialog | ✓ |
| Inline expandable rows | Edit in place | |
| Card list | Each entry as small Card | |

| Option | Description | Selected |
|--------|-------------|----------|
| Most recent first | Sort by end/start date descending | ✓ |
| Oldest first | Chronological | |
| Manual drag reorder | Staff reorder entries | |

| Option | Description | Selected |
|--------|-------------|----------|
| Month + year pickers | Sep 2023 – Jun 2024 | ✓ |
| Full calendar date | Day precision | |
| Year only | Start/end year | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed enum dropdown | School, Regional, State, National | ✓ |
| Free text level | Type level | |
| Dropdown + Other | Fixed + custom | |

**User's choice:** Table + dialog; newest first; month+year dates; fixed award level enum

---

## Career Interests Taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-select fixed checklist | Pick all that apply from predefined areas | ✓ |
| Single primary interest | One dropdown | |
| Free tags | Custom tags | |

| Option | Description | Selected |
|--------|-------------|----------|
| Broad ~12 areas | Medicine, Law, Engineering, Business, Education, Arts, Science, IT, Hospitality, Social Services, Sports, Undecided | ✓ |
| HK-focused ~15 | Above + Accounting, Architecture, etc. | |
| Minimal ~8 | STEM, Business, Arts, etc. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Narrative paragraph (~500 chars) | Goals/university targets summary | ✓ |
| Short sentence | ~100 chars | |
| Long essay | 1000+ chars | |

| Option | Description | Selected |
|--------|-------------|----------|
| Version history | Each save creates new version; full history visible | ✓ |
| Singleton | One updatable block per student | |

**User's choice:** Multi-select from broad 12 areas; ~500 char narrative; version history (no delete on versions)

---

## Staff Notes Behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Append-only | Add only; no edit/delete | ✓ |
| Edit own notes | Staff can edit their notes | |
| Append-only + Admin delete | Admin soft-delete | |

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first | Latest note at top | ✓ |
| Oldest first | Chronological timeline | |
| Newest + pin | Pin important notes | |

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea + Add note button | Input at top of section | ✓ |
| Dialog form | Consistent with other sections | |
| Quick-add single line | Chat-style | |

| Option | Description | Selected |
|--------|-------------|----------|
| Medium ~500 chars | Meeting summary length | ✓ |
| Short ~200 chars | Bullet notes | |
| Long/unlimited | Full minutes | |

**User's choice:** Append-only; newest first; textarea at top; ~500 chars

---

## Delete Confirmation Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Simple AlertDialog | "Delete this entry?" + Cancel/Delete | ✓ |
| Typed confirmation | Type entry title to confirm | |
| Delete + toast undo | Immediate with undo window | |

| Option | Description | Selected |
|--------|-------------|----------|
| No delete on career versions | History read-only; supersede by adding | ✓ |
| Delete latest only | Remove most recent version | |
| Admin delete any version | Admin cleanup | |

| Option | Description | Selected |
|--------|-------------|----------|
| No bulk delete in v1 | One at a time | ✓ |
| Bulk academics only | Multi-select delete | |
| Bulk all sections | Checkboxes everywhere | |

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + list refresh | Sonner + immediate update | ✓ |
| Silent refresh | No toast | |

**User's choice:** Simple dialog; no delete on career versions; no bulk; toast + refresh

---

## Claude's Discretion

- Exact HK secondary subject preset list (must include Other)
- Award enum may add International
- API route naming and table columns per section
- Career-goals version history presentation

## Deferred Ideas

None — discussion stayed within phase scope.
