# Phase 4: Document Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 4-Document Management
**Areas discussed:** File storage, Upload UI placement, Download flow, Upload UX

---

## File Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Bind-mount host path | `./data/uploads` on host → `/app/uploads` in container; survives restarts, readable by ops | ✓ |
| Docker named volume | Managed by Docker; not directly readable on host | |
| Env var UPLOAD_DIR | Flexible but adds config surface | |

**Subdirectory organisation:**
| Option | Description | Selected |
|--------|-------------|----------|
| Per-student subfolder | `uploads/students/{studentId}/` | ✓ |
| Flat UUID filenames | No visual organisation | |
| Date-bucketed | `uploads/{yyyy-mm}/...` | |

**DB vs disk:**
| Option | Selected |
|--------|----------|
| Disk: UUID.pdf; DB: metadata only | ✓ |
| Base64 in DB | |

**File renaming:** UUID.pdf on disk ✓  
**Soft-delete on disk:** Stay on disk unchanged ✓  
**PDF enforcement:** Server-side MIME + magic bytes ✓  
**Max file size:** 25 MB ✓ (chose over 10 MB for headroom)  
**Directory creation:** Server creates on startup ✓  
**Multi-file:** One file per request ✓

---

## Upload UI Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Section card on profile page | Same pattern as Phase 3 record sections | ✓ |
| Separate /documents route | Own page with back navigation | |
| Modal/drawer only | No persistent section | |

**Position on page:** After Notes (bottom) ✓  
**Table columns:** File name \| Type tag \| Uploaded \| Uploader \| Actions ✓  
**Upload trigger:** Dialog (button opens Dialog with picker + type tag) ✓

---

## Download Flow

| Option | Description | Selected |
|--------|-------------|----------|
| API streaming | GET /api/…/download; JWT validated, IDOR checked, file piped | ✓ |
| Static nginx serve | Bypasses auth | |

**Content-Disposition:** attachment (force download) ✓  
**Saved filename:** Original filename from DB ✓

---

## Upload UX

| Option | Description | Selected |
|--------|-------------|----------|
| Button-only file picker | Native browser file picker | ✓ |
| Drag-and-drop + button | Better UX, needs library | |

**Type tag timing:** Required during upload (not editable after) ✓  
**Progress:** Progress bar using XHR progress events ✓ (not just spinner)

---

## Claude's Discretion

- Multer vs. busboy vs. custom multipart parser
- Exact Prisma model field names and migration filename
- Temp directory vs. direct-to-destination write strategy for multer
- Table pagination behaviour for document-heavy students

## Deferred Ideas

- Drag-and-drop upload zone — future UX improvement
- Multi-file batch upload — DOC-01 says "one or more" but kept simple for v1
- Type tag editable after upload — would need PATCH endpoint; deferred
- Inline PDF preview — download-only is sufficient for v1
- PDF data extraction (EXT-01 through EXT-03) — v2 requirements
- Linking documents to record entries (EV-01/EV-02) — v2 requirements
