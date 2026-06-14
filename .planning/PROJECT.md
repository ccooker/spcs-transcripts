# SPCS Student Transcript System

## What This Is

A web application for a school's Careers Team to centralise student records and produce professional transcript documents. Staff log in via Microsoft Entra ID, manage each student's academic results, extracurriculars, awards, work experience, career goals, and supporting PDF documents, then compose a narrative transcript in a TipTap editor and export a school-branded PDF for universities, employers, or the student's portfolio.

## Core Value

A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session — no hunting through spreadsheets, emails, or paper.

## Current State (v1.0 — shipped 2026-06-14)

- **Stack:** Express 5 + Prisma 7 + PostgreSQL (server); Vite 8 + React + MSAL + shadcn/ui + TanStack Query (client)
- **Auth:** Microsoft Entra ID SSO (MSAL PKCE + Express JWT); Admin/Staff roles; audit logging on all mutations
- **Features:** Student directory (CRUD, search, filter, cohort view); six record types on student profile; PDF document upload/download/soft-delete; TipTap transcript editor with auto-save; Draft/Finalised status; Puppeteer PDF export; Admin branding settings (logo + letterhead)
- **Tests:** 85 server integration tests passing
- **Deployment:** DEPLOYMENT-RUNBOOK.md for Windows Server + IIS + PM2; production HTTPS verification deferred

## Next Milestone Goals

- Complete deferred UAT (Phase 3 browser tests; Phase 1 production HTTPS)
- Production deployment on school infrastructure
- v2 planning: PDF data extraction (EXT-*), evidence linking (EV-*), batch export (TRN-05), reporting (RPT-01)

## Requirements

### Validated

- ✓ Microsoft Entra ID SSO (AUTH-01) — v1.0 (dev verified; production HTTPS deferred)
- ✓ Admin/Staff role enforcement (AUTH-02) — v1.0
- ✓ Audit logging on mutations (AUTH-03) — v1.0
- ✓ Student profile CRUD (STU-01, STU-02) — v1.0
- ✓ Six record types on student profile (STU-03 through STU-08) — v1.0
- ✓ PDF document management (DOC-01 through DOC-04) — v1.0
- ✓ Transcript template, status, and PDF export (TRN-01 through TRN-03) — v1.0
- ✓ Student search, filter, and cohort overview (NAV-01 through NAV-03) — v1.0

### Active

- [ ] Production HTTPS deployment verified on Windows Server + IIS + PM2 (Plan 01-05 Task 3)
- [ ] Phase 3 student records UAT completed (`/gsd-verify-work 3`)
- [ ] PDF data extraction from uploaded documents (v2 — EXT-01)
- [ ] Link uploaded PDFs to specific record entries as evidence (v2 — EV-01)
- [ ] Batch cohort transcript export (v2 — TRN-05)

### Out of Scope

- Cloud hosting — school requires data to remain on-premise; no SaaS database
- AI-generated narrative — narratives are template-driven, staff-authored; no LLM writing
- Student self-service portal — students do not log in; documents are delivered by staff
- Multi-school / multi-campus support — scoped to a single school for v1
- Integration with external SIS (SIMON, Compass, etc.) — manual entry + PDF upload in v1; defer until pain validated
- PDF auto-extraction in v1 — deferred to v2 (EXT-*); v1 stores originals only

## Context

- **School environment:** Medium-sized school (200–600 students), 3–8 careers staff users
- **Auth:** Microsoft Entra ID (Azure AD) SSO via MSAL v5 + Express JWT (RS256 JWKS prod / HS256 test)
- **Database:** PostgreSQL on-premise via Prisma 7 with `@prisma/adapter-pg`
- **Shipped:** v1.0 MVP in 4 days (2026-06-11 → 2026-06-14), 5 phases, 22 plans, 85 integration tests
- **Deferred at close:** Production HTTPS deploy; Phase 3 browser UAT (see STATE.md Deferred Items)

## Constraints

- **Auth:** Microsoft Entra ID SSO only — no custom username/password auth
- **Data residency:** On-premise database only — no third-party cloud data storage
- **Platform:** Web app accessible from any school browser — no desktop install
- **PDF extraction (v2):** Must handle varied document layouts without fixed source templates

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Template-based narrative (not AI-generated) | Staff control tone; avoids AI liability for formal documents | ✓ Good — TipTap editor shipped v1.0 |
| On-premise PostgreSQL | School data governance; records cannot leave school network | ✓ Good — Docker + Windows Server runbook v1.0 |
| Microsoft SSO only | School on M365; no password management for staff | ✓ Good — MSAL + JWT end-to-end v1.0 |
| POST-only career goals (D-16) / append-only notes (D-17) | Version history and audit trail for sensitive staff data | ✓ Good — route omission enforcement v1.0 |
| PDF extraction deferred to v2 | v1 scope: store originals + manual entry; extraction is v2 EXT-* | ✓ Good — confirmed at roadmap |
| Transcript status on Transcript model | Separates draft/finalised from Student entity | ✓ Good — JOIN in listStudents v1.0 |
| fetch+blob+anchor for authenticated downloads | JWT required on all /api routes; window.open cannot attach Bearer | ✓ Good — documents + PDF export v1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-06-14 after v1.0 milestone*
