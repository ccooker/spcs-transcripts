---
phase: 02
slug: student-profiles-search
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-12
verified: 2026-06-12
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → API | Untrusted form/query input on student CRUD and list endpoints | PII: fullName, emails, phones, schoolStudentId |
| API → PostgreSQL | Prisma parameterized queries; UUID primary keys | Student records, audit log entries |
| Staff → Staff data | All authenticated staff can list/view active students | Full student directory (accepted by design) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | POST /api/students | mitigate | `createStudentSchema.safeParse` + `.strict()`; 400 on invalid body | closed |
| T-02-02 | Information Disclosure | Error handlers (P01) | mitigate | No server logging of `fullName` in student routes; errors return generic JSON only | closed |
| T-02-02 | Information Disclosure | GET /api/students/:id (P02) | mitigate | Malformed UUID → 404; missing record → 404 (`StudentNotFoundError`) | closed |
| T-02-03 | Elevation of Privilege | Student.id (P01) | mitigate | `@id @default(uuid())` in `schema.prisma` | closed |
| T-02-03 | Tampering | PATCH /api/students/:id (P02) | mitigate | `updateStudentSchema` field whitelist; unknown keys stripped | closed |
| T-02-04 | Repudiation | createStudent (P01) | mitigate | `logAudit` CREATE in `createStudent()` | closed |
| T-02-04 | Elevation of Privilege | POST /:id/restore (P02) | mitigate | `requireRole(Role.ADMIN)` on restore route | closed |
| T-02-05 | Spoofing | POST /api/students (P01) | mitigate | Global `validateJwt` + `resolveUser` on `/api` prefix | closed |
| T-02-05 | Repudiation | archive/restore (P02) | mitigate | `logAudit` DELETE on archive; UPDATE with `{ restored: true }` on restore | closed |
| T-02-06 | Spoofing | All /:id routes (P02) | mitigate | Global JWT middleware covers all student routes | closed |
| T-02-06 | Tampering | GET /api/students?q (P03) | mitigate | Prisma `contains` with `escapeLikePattern`; no raw SQL | closed |
| T-02-07 | Tampering | sort query param | mitigate | `LIST_SORT_COLUMNS` Zod enum whitelist | closed |
| T-02-08 | Elevation of Privilege | includeArchived | mitigate | 403 unless `req.user.role === ADMIN` | closed |
| T-02-09 | Information Disclosure | List response | accept | All staff see all active students by design (RESEARCH V4) | closed |
| T-02-10 | Denial of Service | pageSize | mitigate | `pageSize` capped at 100 in `listStudentsQuerySchema` | closed |
| T-02-SC | Tampering | npm install zod | mitigate | `zod@^4.4.3` from npm registry; no flagged supply-chain issues at plan time | closed |

*Note: Threat IDs T-02-02 through T-02-06 appear in multiple plan files with different scopes; each row above is verified independently.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-09 | All authenticated staff may view the full active student directory — required for careers workflow; no row-level ACL in v1 | Phase 02 plan (02-03-PLAN) | 2026-06-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-12 | 16 | 16 | 0 | gsd-security-auditor (orchestrator) |

### Evidence Summary (2026-06-12)

| Threat ID | Evidence |
|-----------|----------|
| T-02-01 | `server/src/routes/students.ts:138-141`, `server/src/schemas/student.ts:14-25` |
| T-02-02 (errors) | No `console.error`/`log` of student PII in `server/src/routes/` or `server/src/services/student.ts` |
| T-02-02 (GET :id) | `server/src/routes/students.ts:25-39`, `42-45` |
| T-02-03 (UUID) | `server/prisma/schema.prisma:62` |
| T-02-03 (PATCH) | `server/src/schemas/student.ts:27`, `server/src/routes/students.ts:95-98` |
| T-02-04 (create audit) | `server/src/services/student.ts:52-57` |
| T-02-04 (restore admin) | `server/src/routes/students.ts:124` |
| T-02-05 (JWT) | `server/src/app.ts:19-20` |
| T-02-05 (archive audit) | `server/src/services/student.ts:187-192`, `215-221` |
| T-02-06 (JWT :id) | `server/src/app.ts:19-23` |
| T-02-06 (search) | `server/src/services/student.ts:62-64`, `82-83` |
| T-02-07 | `server/src/schemas/student.ts:31-36`, `44` |
| T-02-08 | `server/src/routes/students.ts:66-68` |
| T-02-09 | Accepted risk AR-02-01 |
| T-02-10 | `server/src/schemas/student.ts:43` |
| T-02-SC | `server/package.json` — zod dependency |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-12
