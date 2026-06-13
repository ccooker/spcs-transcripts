---
phase: 5
slug: transcript-assembly-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.3 |
| **Config file** | `server/vitest.config.ts` (existing) |
| **Quick run command** | `cd server && npx vitest run --reporter=verbose transcript.test.ts` |
| **Full suite command** | `cd server && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npx vitest run --reporter=verbose transcript.test.ts`
- **After every plan wave:** Run `cd server && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TRN-01/02 | T-05-01 | IDOR: GET/PUT transcript for wrong studentId returns 404 | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-01-02 | 01 | 1 | TRN-02 | T-05-02 | Staff-only sets DRAFT/FINALISED; IDOR guard prevents cross-student status update | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-01-03 | 01 | 1 | TRN-03 | T-05-03 | Privilege escalation: STAFF role returns 403 on PUT /api/settings | Integration | `vitest run settings.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-02-01 | 02 | 2 | TRN-01 | — | GET /transcript auto-populates sections when no saved narrative | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-02-02 | 02 | 2 | TRN-01 | — | PUT /transcript persists content; subsequent GET returns saved content | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-02-03 | 02 | 2 | TRN-01 | — | showRecordsBanner=true when records updated after transcript.updatedAt | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 3 | TRN-03 | T-05-04 | POST /transcript/export returns 200, Content-Type: application/pdf, body starts with %PDF (mocked pdfService) | Integration | `vitest run transcript.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-03-02 | 03 | 3 | TRN-03 | — | GET /api/settings returns 200 with settings fields (or 200 with null if not set) | Integration | `vitest run settings.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-03-03 | 03 | 3 | TRN-03 | — | PUT /api/settings upserts correctly; second PUT does not duplicate row | Integration | `vitest run settings.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 4 | NAV-02 | — | GET /api/students returns transcriptStatus from Transcript.status join (NONE/DRAFT/FINALISED) | Integration | `vitest run students.test.ts` | ❌ needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/__tests__/transcript.test.ts` — stubs for TRN-01, TRN-02, TRN-03 route tests; mock `pdfService.generatePdf` with `vi.mock`
- [ ] `server/src/__tests__/settings.test.ts` — stubs for GET/PUT /api/settings, Admin-only guard (403 for STAFF), logo upload
- [ ] `server/src/__tests__/helpers/testDb.ts` — add `prisma.transcript.deleteMany()` and `prisma.schoolSettings.deleteMany()` to `clearDb()`
- [ ] Update `server/src/__tests__/students.test.ts` — rewrite 7 `transcriptStatus` references (lines 40, 61, 131, 335, 372, 377, 383) to use Transcript JOIN; nav-02-status test must seed `Transcript` records

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visually renders with school logo and letterhead | TRN-03 | Binary visual output; Puppeteer needs real Chromium in dev environment | Open `/students/:id/transcript`, click Export PDF, verify PDF opens with correct logo/letterhead/sections |
| TipTap editor bold/italic/lists toolbar works in browser | TRN-01 | DOM interaction; React component rendering not covered by integration tests | Open transcript editor, select text, click Bold button, verify `<strong>` in saved content |
| School logo upload + display in branding settings | TRN-03 | File upload + image display requires browser | Go to /settings, upload a PNG logo, save, reload page — verify logo appears in settings preview |
| "Records updated" banner appears after record change | TRN-01 (D-10) | Requires two-step UI interaction | Open transcript, note content; add academic result from StudentDetailPage; return to transcript — banner should appear |
| Finalised transcript shows lock indicator | TRN-02 | Visual state change in UI | Set status to Finalised; verify editor shows locked state or indicator |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
