---
phase: 02
slug: student-profiles-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.3 + Supertest 7.2.2 |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `cd server && npm test -- src/__tests__/students.test.ts -x` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npm test -- src/__tests__/students.test.ts -x`
- **After every plan wave:** Run `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | STU-01 | T-02-01 | Zod-validated create; UUID id | integration | `npm test -- src/__tests__/students.test.ts -t stu-01` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | STU-02 | T-02-02 | GET by UUID; no IDOR | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-get` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | STU-02 | T-02-03 | Zod whitelist on PATCH | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-patch` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | STU-02 | T-02-04 | Soft archive via archivedAt | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-archive` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | STU-02 | T-02-05 | requireRole(ADMIN) on restore | integration | `npm test -- src/__tests__/students.test.ts -t stu-02-restore` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | NAV-01 | T-02-06 | Prisma parameterized search | integration | `npm test -- src/__tests__/students.test.ts -t nav-01` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | NAV-02 | — | Filter by formLevel enum | integration | `npm test -- src/__tests__/students.test.ts -t nav-02-form` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | NAV-02 | — | Filter by transcriptStatus | integration | `npm test -- src/__tests__/students.test.ts -t nav-02-status` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-03 | T-02-07 | logAudit on create/update/archive | integration | `npm test -- src/__tests__/students.test.ts -t auth-03` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | AUTH-02 | T-02-05 | Staff 403 on restore | integration | `npm test -- src/__tests__/students.test.ts -t auth-02-restore` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/__tests__/students.test.ts` — covers STU-01, STU-02, NAV-01, NAV-02, AUTH-02, AUTH-03
- [ ] `server/src/__tests__/helpers/testDb.ts` — add `prisma.student.deleteMany()` before auditLog/user cleanup
- [ ] `server/src/routes/students.ts` — router under test
- [ ] `server/src/schemas/student.ts` — Zod schemas
- [ ] PostgreSQL running (Docker Compose) — prerequisite for any test execution

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cohort overview grouped-by-form UI | NAV-03 | Client component tests not planned (Phase 1 precedent) | Open `/students`, verify form header rows and status badges |
| Archive name-typing confirmation | STU-02 / D-15 | Dialog UX | Archive student; confirm must type exact full name |
| Create student form UX | STU-01 | Client form validation | Navigate `/students/new`, submit required fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
