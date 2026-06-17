---
phase: 05
slug: transcript-assembly-export
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-14
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| JWT / Entra ID | All `/api/*` routes require valid Bearer token via `validateJwt` + `resolveUser` | User identity, role (STAFF/ADMIN) |
| Per-student transcript | Transcript routes nested under `/api/students/:studentId/transcript` | Student PII, academic narrative HTML |
| Admin settings | `/api/settings/*` gated by `requireRole(Role.ADMIN)` | School branding, letterhead HTML, logo binary |
| PDF generation | Server-side Puppeteer renders self-contained HTML; no browser DOM exposure | Transcript HTML, admin letterhead, base64 logo |
| Client export | `apiFetch` attaches MSAL Bearer token; no public download URLs | PDF blob via authenticated POST |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-SC | Tampering | npm packages (puppeteer, @tiptap/*) | mitigate | Package legitimacy audit in `05-RESEARCH.md` §Package Legitimacy Audit — all three approved | closed |
| T-05-01 | Information Disclosure | Transcript per-student data | mitigate | `assertStudentExists` on GET/PUT/POST export; `getOrBuild`/`upsert` scoped by route `studentId`; RED tests `trn-idor-get`/`trn-idor-put` | closed |
| T-05-02 | Elevation of Privilege | `settings.ts` upsertSettings | mitigate | `router.use(requireRole(Role.ADMIN))` on all settings routes; test `set-01-staff-forbidden` | closed |
| T-05-03 | Tampering | `buildPdfHtml` letterheadHtml injection | accept | Admin-only write path; HTML injected into Puppeteer PDF only, not browser DOM | closed |
| T-05-04 | Information Disclosure | `pdf.ts` Chromium subprocess | accept | `page.setContent(html)` with self-contained HTML; logo as base64 data URI; no external URLs | closed |
| T-05-03-01 | Elevation of Privilege | `transcript.ts` routes | mitigate | `assertStudentExists` before GET/PUT/POST export (`server/src/routes/transcript.ts:72,92,113`) | closed |
| T-05-03-02 | Elevation of Privilege | `settings.ts` routes | mitigate | `router.use(requireRole(Role.ADMIN))` (`server/src/routes/settings.ts:17`) | closed |
| T-05-03-03 | Tampering | Settings logo upload | mitigate | Multer `fileFilter` rejects non-`image/*`; `logoPath` server-controlled as `branding/logo.{ext}` (`settings.ts:25-31`, `services/settings.ts:19-22`) | closed |
| T-05-03-04 | Information Disclosure | GET `/settings/logo` | mitigate | Admin-only via router-level `requireRole`; `path.join(UPLOAD_ROOT, settings.logoPath)` — no user-supplied path segments (`settings.ts:82-90`) | closed |
| T-05-03-SC | Tampering | No new npm (Plan 03) | accept | Plan 03 adds routes only; packages installed in Plan 01 | closed |
| T-05-04-01 | Tampering | TipTap HTML stored client-side | accept | HTML rendered in PDF server-side; no `dangerouslySetInnerHTML` in client codebase | closed |
| T-05-04-02 | Spoofing | Export PDF fetch | mitigate | `apiFetch` attaches `Authorization: Bearer` token (`apiClient.ts:48-49`); export uses `apiFetch` POST (`TranscriptPage.tsx:256-258`) | closed |
| T-05-04-SC | Tampering | TipTap packages (Plan 01) | accept | Installed in Plan 01 with legitimacy audit (T-05-SC) | closed |
| T-05-05-01 | Elevation of Privilege | `/settings` route | mitigate | Server `requireRole(ADMIN)`; client 403 → `/unauthorized` (`SettingsPage.tsx:149-152`); nav hidden for Staff (`AppShell.tsx:59-71`) | closed |
| T-05-05-02 | Tampering | letterheadHtml textarea | accept | Admin-only write; injected into Puppeteer PDF only (`services/transcript.ts:348`) | closed |
| T-05-05-SC | Tampering | No new npm (Plan 05) | accept | Reuses existing shadcn form primitives; no new packages | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-03, T-05-05-02 | `letterheadHtml` is writable only by ADMIN via `requireRole`; content is rendered exclusively in server-side Puppeteer PDF (`buildPdfHtml`), never in browser DOM via `dangerouslySetInnerHTML`. Trusted admin boundary per D-14. | gsd-security-auditor | 2026-06-14 |
| AR-05-02 | T-05-04 | Chromium subprocess receives self-contained HTML via `page.setContent(html, { waitUntil: 'domcontentloaded' })`; logo embedded as base64 data URI; no external URL fetches. On-premise offline constraint limits SSRF/exfiltration surface. | gsd-security-auditor | 2026-06-14 |
| AR-05-03 | T-05-04-01 | TipTap stores HTML in transcript section columns; client uses `TipTapEditor` component only on transcript edit page, not in list views. Grep confirms zero `dangerouslySetInnerHTML` usages in `client/`. PDF rendering is server-side. | gsd-security-auditor | 2026-06-14 |
| AR-05-04 | T-05-03-SC, T-05-04-SC, T-05-05-SC | Plans 03, 04, 05 explicitly add no new npm dependencies; supply-chain risk covered by Plan 01 audit (T-05-SC). | gsd-security-auditor | 2026-06-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

No `## Threat Flags` sections found in phase SUMMARY files. No unregistered attack surface flagged during implementation.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-14 | 16 | 16 | 0 | gsd-security-auditor |

### Evidence Summary

| Threat ID | Evidence |
|-----------|----------|
| T-05-SC | `.planning/phases/05-transcript-assembly-export/05-RESEARCH.md` lines 138–144 (Approved with checkpoint); `server/package.json` puppeteer@^25.1.0 |
| T-05-01 | `server/src/routes/transcript.ts:37-44,72,92,113`; `server/src/__tests__/transcript.test.ts:162-185` |
| T-05-02 | `server/src/routes/settings.ts:17`; `server/src/__tests__/settings.test.ts:27-38` |
| T-05-03 | `server/src/services/transcript.ts:348` (letterhead injection point); admin gate T-05-02 |
| T-05-04 | `server/src/services/pdf.ts:17` (`setContent` only); `server/src/services/transcript.ts:277-290` (base64 logo) |
| T-05-03-01 | `server/src/routes/transcript.ts:37-44,72,92,113` |
| T-05-03-02 | `server/src/routes/settings.ts:17` |
| T-05-03-03 | `server/src/routes/settings.ts:25-31`; `server/src/services/settings.ts:19-22` |
| T-05-03-04 | `server/src/routes/settings.ts:17,82-90` |
| T-05-04-01 | `client/` grep: no `dangerouslySetInnerHTML` |
| T-05-04-02 | `client/src/api/apiClient.ts:48-49`; `client/src/pages/TranscriptPage.tsx:256-258`; `server/src/app.ts:26-27` (JWT on all `/api`) |
| T-05-05-01 | `server/src/routes/settings.ts:17`; `client/src/pages/SettingsPage.tsx:149-152`; `client/src/components/layout/AppShell.tsx:59-71` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-14
