# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-14
**Phases:** 5 | **Plans:** 22

### What Was Built

- Microsoft Entra ID SSO with role-based access, audit logging, and Windows Server deployment runbook
- Student directory with search, filters, cohort overview, and soft-archive/restore
- Six record types on a single student profile page (academics through notes)
- Secure PDF document upload, download, and soft-delete with type tagging
- TipTap transcript editor with auto-population, auto-save, Draft/Finalised status, and Puppeteer PDF export
- Admin branding settings (school logo and letterhead)

### What Worked

- RED-first integration tests (85 passing) gave high confidence across all phases
- Vertical-slice plans (server then client per feature) kept each phase independently shippable
- Shared UI patterns (RecordSectionCard, XHR upload, fetch+blob download) accelerated Phases 3–5
- Wave-based parallelization in Phase 3 (server + client tracks) reduced wall-clock time

### What Was Inefficient

- REQUIREMENTS.md traceability table not updated after Phases 3–5 — caused milestone-close confusion
- Phase 3 UAT never completed despite code being fully tested programmatically
- v1.0 milestone audit ran mid-build (2026-06-12) and was never refreshed before close
- shadcn CLI interactive prompts required manual component installs in several phases

### Patterns Established

- TanStack Query with `['student', studentId, resource]` query keys and mutation invalidation
- IDOR guards in every nested resource service (`studentId` match before read/write)
- Authenticated file operations via fetch+blob+anchor (never raw img src or window.open)
- POST-only routes for immutable record types (career goals versioned, notes append-only)

### Key Lessons

1. Update REQUIREMENTS.md checkboxes at phase completion — stale traceability blocks milestone close
2. Run browser UAT (`/gsd-verify-work`) before declaring phase complete, not after milestone close
3. Refresh milestone audit after final phase ships — mid-build audits create false gap reports
4. Defer production deployment checkpoints explicitly in UAT rather than leaving status `partial`

### Cost Observations

- Timeline: 4 days (2026-06-11 → 2026-06-14)
- Commits: 150
- Notable: Phase 5 (transcript + PDF) completed in ~1 day after Phases 1–4 foundation

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Days | Phases | Key Change |
|-----------|------|--------|------------|
| v1.0 | 4 | 5 | Greenfield build; GSD phase/plan workflow established |

### Cumulative Quality

| Milestone | Integration Tests | Notes |
|-----------|-------------------|-------|
| v1.0 | 85 passing | Vitest + supertest; no E2E browser automation |
