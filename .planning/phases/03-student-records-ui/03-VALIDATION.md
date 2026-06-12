---
phase: 3
slug: student-records-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (server: node test runner with tsx) |
| **Config file** | `server/vitest.config.ts` (existing from Phase 1) |
| **Quick run command** | `npm test --workspace=server -- --run --reporter=verbose` |
| **Full suite command** | `npm test --workspace=server -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=server -- --run --reporter=verbose`
- **After every plan wave:** Run `npm test --workspace=server -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | STU-03 | T-03-01 | AcademicResult only readable for owning student (IDOR → 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-01 Task 1 | ⬜ pending |
| 03-01-02 | 01 | 1 | STU-04 | T-03-01 | Activity only readable for owning student (IDOR → 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-01 Task 1 | ⬜ pending |
| 03-02-01 | 02 | 2 | STU-05 | T-03-06 | Award only readable for owning student (IDOR → 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-02 Task 1 | ⬜ pending |
| 03-02-02 | 02 | 2 | STU-06 | T-03-06 | WorkExperience only readable for owning student (IDOR → 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-02 Task 1 | ⬜ pending |
| 03-03-01 | 03 | 3 | STU-07 | T-03-11 | CareerGoal POST-only (no PATCH/DELETE returns 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-03 Task 1 | ⬜ pending |
| 03-03-02 | 03 | 3 | STU-08 | T-03-12 | StaffNote POST-only (no PATCH/DELETE returns 404) | integration | `npm test --workspace=server -- --run` | ✅ W0 in 03-03 Task 1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Status

Wave 0 is embedded in the first task of each plan (RED test stubs written before implementation, per TDD discipline):

- [x] `server/src/__tests__/records.test.ts` — created in Plan 03-01 Task 1 with stu-03 + stu-04 RED stubs
- [x] `server/src/__tests__/helpers/testDb.ts` — extended in Plan 03-01 Task 2 with academicResult + activity deletes
- [x] stu-05 + stu-06 RED stubs — added in Plan 03-02 Task 1 (award + workExperience deletes in clearDb)
- [x] stu-07 + stu-08 RED stubs — added in Plan 03-03 Task 1 (careerGoal + staffNote deletes in clearDb)

*Note: Existing test infrastructure (vitest, testDb, JWT helpers) from Phase 1–2 covers the framework layer. All helpers live at `server/src/__tests__/helpers/`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Subject dropdown shows "Other" + free-text reveal | STU-03 | UI interaction, not testable in vitest | 1. Open /students/:id 2. Click Add academic result 3. Select "Other" from Subject dropdown 4. Verify free-text field appears |
| Month+year pickers render correctly | STU-04/05/06 | UI date picker interaction | 1. Open Add activity dialog 2. Verify month and year selectors appear (no day field) |
| Career goals version history list | STU-07 | Visual list rendering | 1. Add 2+ career goal versions 2. Verify both appear in version history newest-first |
| Notes append-only (no edit/delete buttons) | STU-08 | UI button presence | 1. Add a note 2. Verify no Edit/Delete buttons appear on the note |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: every plan has automated verify in each task
- [x] Wave 0 covers all RED test stubs (embedded in first task of each plan)
- [x] No watch-mode flags in any verify command
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
