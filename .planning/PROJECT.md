# SPCS Student Transcript System

## What This Is

A web application for a school's Careers Team to centralise student records and produce professional transcript documents. Staff log in via Microsoft account, manage each student's academic results, extracurriculars, awards, work experience, career goals, and supporting PDF documents, then assemble a polished transcript using a template that exports as a PDF for universities, employers, or the student's own portfolio.

## Core Value

A careers staff member can open any student's record and produce a completed, professional transcript PDF in a single session — no hunting through spreadsheets, emails, or paper.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Staff can log in using their Microsoft (Azure AD) account
- [ ] Staff can create and manage student profiles (name, year, contact details)
- [ ] Staff can enter academic results against a student record
- [ ] Staff can record extracurricular activities, sports, leadership roles, and volunteering
- [ ] Staff can capture career interests and goals for each student
- [ ] Staff can log awards, achievements, certifications, and competition results
- [ ] Staff can record work experience entries (placements, part-time, internships)
- [ ] Staff can add free-text observations and notes to a student record
- [ ] Staff can upload PDF documents (report cards, certificates, etc.) per student
- [ ] Uploaded PDFs are stored and attached as evidence to the student record
- [ ] System extracts key data from uploaded PDFs into the student record automatically
- [ ] Staff can fill out a structured template to compose the written transcript narrative
- [ ] System assembles all data and narrative template into a formatted transcript document
- [ ] Staff can export a completed transcript as a PDF
- [ ] Staff can search and filter the student list (name, year level, status)

### Out of Scope

- Cloud hosting — school requires data to remain on-premise; no SaaS database
- AI-generated narrative — narratives are template-driven, staff-authored; no LLM writing
- Student self-service portal — students do not log in; documents are delivered by staff
- Multi-school / multi-campus support — scoped to a single school for v1
- Integration with external SIS (SIMON, Compass, etc.) — data is entered manually or via PDF upload in v1

## Context

- **School environment:** Medium-sized school (200–600 students), 3–8 careers staff users
- **Auth requirement:** Microsoft Entra ID (Azure AD) SSO — school already has M365 licensing
- **Database:** Must be self-hosted/on-premise (SQL Server or PostgreSQL on school infrastructure); no cloud database services
- **Current state:** No existing system — student data is scattered across spreadsheets, emails, and paper; this is a greenfield build
- **PDF upload + extraction:** Staff upload documents in various formats (report cards, award letters, certificates); system must store originals and extract structured data (grades, dates, descriptions) from them
- **Transcript recipients:** Universities / scholarship programs, employers, and the students themselves — all require a professional formatted PDF

## Constraints

- **Auth:** Microsoft Entra ID (Azure AD) SSO — must use MSAL/OAuth 2.0 PKCE or similar; no custom username/password auth
- **Data residency:** On-premise database only — no data may be stored in third-party cloud services
- **Platform:** Web app accessible from any school computer browser — no desktop install required
- **PDF extraction:** Must handle varied document layouts without requiring a fixed template from the source document

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Template-based narrative (not AI-generated) | Staff control tone and content; avoids AI reliability concerns for formal documents | — Pending |
| On-premise database | School data governance / privacy policy; student records cannot leave the school network | — Pending |
| Microsoft SSO only | School already on M365; reduces password management overhead for staff | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-11 after initialization*
