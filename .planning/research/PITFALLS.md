# Pitfalls Research

**Domain:** School careers transcript web app
**Researched:** 2026-06-11
**Confidence:** HIGH (Azure AD, file security, PDF generation) / MEDIUM (PDF extraction, on-premise ops)

---

## Critical Pitfalls

### Pitfall 1: PDF Extraction Over-Promise

**What goes wrong:** The system is built with an assumption that automated data extraction from uploaded school documents (report cards, award letters, certificates) will reliably produce structured, usable data. In practice, school documents vary enormously: report cards use different grid layouts per school year, certificates have varied typography, award letters are free-text. Naive extractors produce garbled or empty output. Staff lose trust in the feature and stop using it.

**Why it happens:** PDF is a visual presentation format, not a data format. There is no semantic layer — text rendering order may bear no relationship to reading order. Tables without visible borders become invisible to rule-based parsers. Scanned documents (common for older certificates) have no selectable text at all. Developers test against one or two sample documents, which happen to work, and ship confident the feature is solid.

**How to avoid:**
- Explicitly distinguish between digital-native PDFs and scanned images in the extraction pipeline; scanned documents require OCR before any extraction attempt.
- Use magic-byte detection (`%PDF` header) plus heuristics to classify documents before attempting extraction.
- Treat all extraction results as **suggestions requiring staff review**, never as authoritative data. Build a "review and accept" UI, not a silent auto-fill.
- Set staff expectations clearly in the UI: "We've found what looks like grades — please check before saving."
- Design the feature so that extraction failure gracefully falls back to manual entry, without losing the uploaded document.

**Warning signs:** "It works on the samples we tested"; extraction UI auto-saves without a review step; no handling for scanned PDFs; extraction triggered synchronously on the HTTP request thread.

**Phase to address:** PDF Upload & Extraction phase. Must be designed with the review/fallback workflow from day one — it cannot be bolted on after.

---

### Pitfall 2: Azure AD Tenant Consent Block

**What goes wrong:** Development and testing work fine against the developer's Azure tenant, but when the app is deployed to the school's M365 tenant, staff cannot log in. The error is `AADSTS65001` (consent required) or `AADSTS650056` (misconfigured application). School IT administrators must explicitly grant tenant-wide admin consent for the application's permissions — this step is frequently missed, causing a go-live failure.

**Why it happens:** Education tenants (M365 EDU licensing) commonly have user consent disabled at the tenant level, meaning no individual user can consent to an app's permissions on their own behalf — only a Global Administrator can. This is intentional school policy to prevent staff installing unapproved apps. The app registration and code may be correct; the deployment simply requires an admin consent step that is undocumented.

**How to avoid:**
- Document the **admin consent URL** as a required deployment step: `https://login.microsoftonline.com/{tenant-id}/adminconsent?client_id={app-id}`. This must be opened by a Global Administrator of the school's Azure tenant.
- Request only the minimal permissions needed (`openid`, `profile`, `email`, `User.Read`) — the fewer permissions, the easier consent approval.
- Include tenant-specific configuration (Tenant ID, Client ID) in environment variables, not hardcoded.
- Test against a trial M365 EDU tenant, not a personal developer tenant — they have different consent policies.

**Warning signs:** Tested only against a personal Azure subscription; redirect URIs registered only for `localhost`; no deployment runbook for school IT.

**Phase to address:** Auth phase — admin consent workflow must be documented and tested as a deployment prerequisite.

---

### Pitfall 3: MSAL Token Lifecycle Mishandled

**What goes wrong:** Staff are logged in but after ~1 hour of inactivity they start receiving errors when saving data or generating transcripts. The app fails silently, or worse, loses unsaved form data when it redirects to a login screen mid-session. In some configurations (particularly Safari or browsers with third-party cookie restrictions), SSO silent refresh fails entirely.

**Why it happens:** Access tokens expire (typically 60–75 minutes). Applications that skip the silent-first acquisition pattern (`acquireTokenSilent` → fallback to interactive) call interactive flows immediately on every API request, causing disruptive redirect flows. Multiple `PublicClientApplication` instances cause cache corruption and race conditions. Concurrent interactive requests fail with `interaction_in_progress` errors that surface as cryptic UI errors.

**How to avoid:**
- Always follow the MSAL pattern: `acquireTokenSilent` first; only fall back to `loginRedirect`/`loginPopup` on `InteractionRequiredAuthError`.
- Create exactly **one** `PublicClientApplication` instance across the entire app lifecycle.
- Do not store tokens in `localStorage` (XSS risk) — use MSAL's built-in session storage cache.
- Handle `interaction_in_progress` errors gracefully — check for an in-flight interaction before starting a new one.
- Test explicitly against Safari; iframe-based silent refresh fails when third-party cookies are blocked. Use `ssoSilent` with `login_hint` as the fallback.
- Attach the access token to every API request via an HTTP interceptor/middleware layer, not ad-hoc per endpoint.

**Warning signs:** Token acquisition in each component separately; no error boundary around `InteractionRequiredAuthError`; tokens stored in `localStorage`; no testing on Safari.

**Phase to address:** Auth phase. Token handling must be centralised before any protected API endpoints are built.

---

### Pitfall 4: Insecure Direct Object Reference on Student Records

**What goes wrong:** Staff can access any student's record by guessing or incrementing the ID in the URL (`/students/123`, `/students/124`). Since all staff share the same role ("careers staff"), this may not be caught during testing — everyone who can log in should see all students. But if a guest account, a substitute teacher, or an erroneously provisioned account gains access, they can enumerate every student record.

**Why it happens:** Sequential integer primary keys exposed in URLs are the default in most frameworks. Authorization is checked at login but not per-resource. The small user base (3–8 staff) creates false confidence that there's no exposure.

**How to avoid:**
- Use UUIDs (not sequential integers) as public-facing student identifiers in URLs and APIs.
- Enforce server-side authorization on every data endpoint — not just at the route level but in the data access layer: every query should scope to records the current user is permitted to see.
- Treat the student list as the authorisation boundary: if a user can see the student list, they can see individual records. This is correct for this app, but it must be enforced consistently.
- Never expose internal database PKs in URLs, API responses, or browser history.

**Warning signs:** URLs like `/api/students/1`, `/api/students/2`; authorization only checked on the login route; no middleware that validates resource ownership per request.

**Phase to address:** Student record management phase. Apply from the first API endpoint, never retrofit.

---

### Pitfall 5: No Immutable Audit Trail

**What goes wrong:** A student disputes the contents of their transcript. A parent asks who added a particular note. A staff member leaves and their changes cannot be traced. There is no record of who changed what, or when.

**Why it happens:** Audit logging feels like a "we'll add it later" feature. It requires thought about what constitutes a loggable event, who the actor is, and how to store logs in a tamper-evident way. Development teams ship the happy path first and never return.

**How to avoid:**
- Log every create/update/delete of student data records with: timestamp, actor (user ID + display name from Azure AD), record type, record ID, and a before/after snapshot (for updates).
- Store audit logs in a separate table that application code **cannot update or delete** — only append.
- Log document uploads and PDF exports: who uploaded what, and who generated which transcript for which student.
- Expose a read-only audit log view in the admin section.
- This is a legal/governance requirement for student records in most jurisdictions, not a nice-to-have.

**Warning signs:** No `created_by`/`updated_by` columns; no audit log table in the schema; audit log added as a TODO comment.

**Phase to address:** Student record management phase — must be in the schema from day one. Retrofitting audit trails requires re-examining every write path.

---

### Pitfall 6: PDF Upload Security Failures

**What goes wrong:** An uploaded "PDF" is actually a PHP script, an HTML file with embedded JavaScript, or a ZIP bomb. Files are stored with their original filename, enabling path traversal. Uploaded files are served directly from the web root, making them executable by the server.

**Why it happens:** "It's a school, who's going to attack it?" — the threat model ignores student-facing systems (even though students don't use this app directly, staff may accidentally open a malicious file they received via email and re-upload it). MIME type validation trusts the browser's `Content-Type` header, which is trivially spoofed.

**How to avoid:**
- Validate files by **magic bytes** (`%PDF` header = `25 50 44 46`) on the server, not by file extension or `Content-Type`.
- Rename every uploaded file to a UUID on storage — never preserve the original filename on disk.
- Store uploaded files **outside the web root** in a directory the web server cannot serve directly. Serve files via a dedicated controller endpoint that streams the file with appropriate headers (`Content-Disposition: attachment`).
- Enforce a maximum file size (e.g., 20 MB) to prevent denial-of-service via large uploads.
- Set a strict `Content-Security-Policy` header so that even if a malicious HTML file is somehow served, it cannot run scripts.
- Consider scanning uploads with ClamAV (installable on-premise, free) for known malware signatures.

**Warning signs:** Files stored in `public/uploads/`; original filenames preserved on disk; file size limit not enforced; no magic-byte validation.

**Phase to address:** PDF Upload & Extraction phase.

---

### Pitfall 7: Transcript PDF Page Break Failures

**What goes wrong:** Generated transcripts look correct in browser preview but the PDF has student names split across pages, sections bisected mid-sentence, tables that span pages incorrectly, or blank pages in the middle. Staff discover this after sending the transcript to a university.

**Why it happens:** HTML-to-PDF rendering (Puppeteer/headless Chromium, or wkhtmltopdf) does not handle CSS page breaks reliably. `page-break-inside: avoid` is deprecated and inconsistently supported. `overflow: auto` on parent elements silently disables `break-inside: avoid` on children. wkhtmltopdf uses a stale WebKit engine that does not support modern CSS Flexbox/Grid layouts correctly.

**How to avoid:**
- Use Puppeteer (headless Chromium) over wkhtmltopdf — wkhtmltopdf is effectively end-of-life and does not support modern CSS.
- Use `break-inside: avoid` (not the deprecated `page-break-inside`) on every logical section of the transcript.
- Avoid `overflow: auto` or `overflow: hidden` on any container that wraps content you want to keep on one page.
- Embed fonts as base64 data URIs in the HTML template — do not reference external font URLs that may not be reachable at render time.
- Use `waitUntil: 'load'` when rendering with Puppeteer, not `networkidle` (which hangs if any asset fails to load).
- Test PDF output explicitly: generate with real data including very long extracurricular lists, many awards, and long narrative text.
- Reuse a single Chromium instance (singleton) across renders; don't spawn a new browser per request.

**Warning signs:** Using wkhtmltopdf; page breaks not explicitly tested; template only tested with short sample data; fonts loaded from external CDN URLs.

**Phase to address:** Transcript Assembly & Export phase.

---

### Pitfall 8: On-Premise Deployment "Works on My Machine" Failure

**What goes wrong:** The application runs fine in development and on a cloud VM, but fails when deployed to the school's Windows Server because: the school uses IIS as a reverse proxy (causing 500.52 errors from compressed responses); the server has no internet access so npm/pip dependencies cannot be fetched at runtime; the SSL certificate is self-signed and the browser rejects it; file paths are hardcoded to the developer's machine structure; the Node.js / Python runtime is not installed on the server.

**Why it happens:** Development environments are developer laptops with internet access. On-premise school servers are hardened, managed by IT, may have Group Policy restrictions, and may be air-gapped from the internet. The deployment process is not designed for this environment.

**How to avoid:**
- Bundle all runtime dependencies into the deployment package — no `npm install` at deploy time. Use a build step that produces a self-contained artifact.
- All file paths (upload storage directory, database connection strings, PDF output path) must be **environment variables**, not hardcoded.
- Document IIS ARR configuration explicitly: disable `Accept-Encoding` forwarding from IIS to the backend to prevent 500.52 compression errors; configure `preserveHostHeader`.
- Plan for an internal TLS certificate issued by the school's AD Certificate Services (not Let's Encrypt, which requires internet validation). Document this in the deployment guide.
- Provide a Docker-based deployment option as an alternative to IIS if the school IT team prefers it.
- Create a deployment checklist that the school IT admin can follow without developer involvement.

**Warning signs:** No deployment runbook; connection strings in code; no environment variable documentation; tested only on developer machine.

**Phase to address:** Infrastructure/Deployment phase — must be designed before any feature phases begin.

---

### Pitfall 9: Data Sent to Cloud Services Without Consent

**What goes wrong:** The PDF extraction library or an analytics/error tracking tool sends student document content or identifiable student data (names, grades) to a third-party cloud service. This violates the school's data residency requirement ("no data may be stored in third-party cloud services") and potentially breaches local privacy legislation.

**Why it happens:** Developers reach for the most capable extraction tool (e.g., a cloud OCR API, a SaaS PDF parser, a hosted error tracking service like Sentry with full payload logging) without realising that student data is passing through it. Application error logs that capture request payloads may also contain student names.

**How to avoid:**
- Audit every dependency and service: does it transmit data off the school network? Cloud OCR APIs, analytics SDKs, crash reporting tools, CDN font loading — all are potential leakage points.
- PDF extraction must use only libraries that run on-premise: Apache Tika, pdfplumber, pdf-parse, or equivalent self-hosted tools.
- If error tracking is used, configure it to scrub PII from payloads before transmission, or use a self-hosted instance.
- Application logs must not include student names, IDs, or document content — use opaque record IDs in log statements.
- Include a data flow diagram in the design documentation that shows every network boundary data crosses.

**Warning signs:** PDF extraction sending files to a cloud API; Sentry/Datadog with full request logging; Google Fonts CDN (technically off-premises); no data flow audit.

**Phase to address:** Architecture/Infrastructure design phase. Review again before each feature that touches student data.

---

## Technical Debt Patterns

### Monolithic Student Record Table
Putting all student data in a single wide table makes it impossible to apply granular access controls, retention policies, or encryption at column level. When a new category is needed (e.g. counsellor notes requiring stricter access than general career goals), there is nowhere clean to put it. **Prevention:** Segment by category from the start: separate tables for academic results, extracurriculars, awards, work experience, documents, notes.

### Hard-Coded Curriculum Assumptions
Building in assumptions about specific subject names, year-level labels ("Year 10", "VCE", "HSC"), or grade formats (A–E, percentage, %) makes the system fragile when the school changes curriculum or the system is used by another school. **Prevention:** Store subject names, grade scales, and year levels as configurable reference data, not enum values in code.

### Template Versioning Ignored
If the transcript template is modified after transcripts have been generated, previously generated transcripts cannot be reproduced exactly. Staff expect that regenerating a transcript for an old student produces the same document. **Prevention:** Store a version identifier with each generated transcript and archive template versions. Consider storing the rendered HTML alongside the PDF.

### Extraction "Best Effort" Accepted as Ground Truth
Automatically saving extraction results without human confirmation creates a data quality debt that compounds over time. By the time staff notice inaccuracies, dozens of records are wrong. **Prevention:** All extracted data must go through a review-and-confirm step before being committed to the student record.

### Missing Soft Delete
Hard-deleting student records, uploaded documents, or transcript drafts removes data that may be needed for compliance, audit, or dispute resolution. **Prevention:** Implement soft delete (`deleted_at` timestamp) from day one. Expose a separate "archive" action in the UI.

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|---------------|-----------------|
| Azure AD / MSAL | Creating multiple `PublicClientApplication` instances | Create exactly one instance, share it across the app via a singleton/context |
| Azure AD / MSAL | Calling `loginRedirect` directly without trying `acquireTokenSilent` first | Always: `acquireTokenSilent` → catch `InteractionRequiredAuthError` → then interactive |
| Azure AD / MSAL | Redirect URI registered only for `localhost` | Register all deployment URIs (dev, staging, prod internal hostname) in the app registration |
| Azure AD tenant | Deploying without admin consent | Document and run the admin consent URL with a Global Administrator before go-live |
| Azure AD tenant | Testing against a personal/developer Azure tenant | Test against a trial M365 EDU tenant — consent policies differ |
| PDF parsing library | Using a cloud PDF API (AWS Textract, Azure Form Recognizer) | Use only on-premise libraries (pdfplumber, Apache Tika, pdf-parse) |
| PDF parsing | Treating extraction output as accurate | All extraction results are suggestions; require staff review before saving |
| PDF parsing | Assuming all uploads are digital-native PDFs | Detect scanned documents; route them through OCR before text extraction |
| On-premise file storage | Hardcoding the upload directory path | Configure via environment variable; default to a path outside the web root |
| On-premise file storage | Forgetting backup integration | Upload directory must be included in school's backup schedule — document this explicitly |
| IIS reverse proxy | Backend returns compressed responses | Disable `Accept-Encoding` forwarding in ARR, or disable compression on the Node backend |
| IIS reverse proxy | `preserveHostHeader` not set | Enable in ARR settings; many auth flows depend on the original Host header |
| Puppeteer / PDF generation | Spawning a new Chromium instance per render request | Maintain a singleton Chromium browser; open/close pages per request |
| Puppeteer / PDF generation | Loading fonts from a CDN URL | Embed fonts as base64 data URIs in the HTML template |
| Puppeteer / PDF generation | Using `waitUntil: 'networkidle'` | Use `waitUntil: 'load'`; `networkidle` hangs if any asset 404s slowly |
| wkhtmltopdf | Using it for new projects | It is effectively end-of-life; use Puppeteer with headless Chromium instead |

---

## Performance Traps

### Synchronous PDF Extraction on Upload
Running PDF parsing synchronously inside the HTTP request handler blocks the server thread for the duration of extraction (which can be 5–30 seconds for a large report card). For a small school this will appear to work, but any concurrent upload will time out. **Fix:** Queue extraction as a background job; return an immediate acknowledgment to the UI and poll for completion.

### PDF Generation on Every Preview
If staff can preview the transcript before final export, generating a full PDF on every preview click is wasteful and slow. **Fix:** Serve an HTML preview for the in-app view; only generate the PDF on explicit export. Cache the last-generated PDF and invalidate only when the underlying data changes.

### No Pagination on Student List
Loading all 600 students on page load works fine at 50 students during development; at 600 it becomes noticeably slow and wastes bandwidth. **Fix:** Server-side pagination from the first implementation, not as a retrofit.

### File Serving Through App Server
Streaming uploaded PDFs through the application server (reading file → sending bytes in Node.js) puts avoidable load on the app process. **Fix:** Serve uploaded files via a static file server or a streaming endpoint that bypasses the application business logic layer. On IIS, configure a separate static site pointing at the upload directory (still protected by auth middleware).

### N+1 Queries on Transcript Assembly
Fetching a student's full record for transcript generation by making separate database queries for each data category (results, extracurriculars, awards, work experience, documents) produces N+1 queries. **Fix:** Fetch the complete student record in a single query with JOINs or a single batch of parallel queries at assembly time.

---

## Security Mistakes

### No HTTPS on the Internal Network
Teams assume that because the app is internal ("only school staff can access it"), HTTP is acceptable. But staff may access the app over school Wi-Fi, and student records transmitted over HTTP are visible to anyone on the network. **Fix:** Always use HTTPS, even internally. Use the school's AD Certificate Services to issue an internal TLS certificate for the application hostname.

### Uploaded PDFs Served from Web Root
Files in `public/uploads/` are served directly by the web server, bypassing authentication. Any URL-guessable filename is publicly accessible. **Fix:** Store files outside the web root. Serve them only through an authenticated endpoint that verifies the requesting user has access to that student's record before streaming the file.

### Tokens in localStorage
Storing the MSAL access token in `localStorage` exposes it to any JavaScript running on the page (XSS risk). **Fix:** Use MSAL's session storage cache (the library default); do not manually extract and store tokens.

### Student Names in Error Logs / Stack Traces
Application error logs that capture request bodies or URL parameters may include student names, year levels, or grades. These logs may be shipped to a cloud logging service, violating data residency. **Fix:** Log only opaque record IDs in application logs. Configure error tracking to scrub request bodies. Test logging output explicitly with real data.

### Sequential Student IDs in URLs (IDOR)
See Critical Pitfall 4. Additionally: never include student identifiers in URL query strings (they appear in server access logs and browser history).

### No File Size or Rate Limits on Upload
Without limits, a staff member can accidentally (or a malicious actor intentionally) upload thousands of large files, exhausting disk space. **Fix:** Enforce a maximum file size per upload (20 MB is reasonable for school documents) and a maximum storage quota per student record.

### PDF Embedded JavaScript Execution
PDFs can contain embedded JavaScript, form actions, and hyperlinks to external URIs. A malicious PDF opened in an in-browser PDF viewer (e.g., Chrome's built-in viewer) can execute scripts. **Fix:** Validate PDF structure on upload. Consider using a CDR (Content Disarm and Reconstruction) step that re-renders the PDF to a clean copy, stripping active content. At minimum, serve PDFs with `Content-Disposition: attachment` to force download rather than browser rendering.

### Missing Role Boundary for Future Expansion
Currently all staff have identical access. But if a counsellor role is added later with access to sensitive notes, or read-only student teacher access is needed, there is no RBAC infrastructure to build on. **Fix:** Implement a simple role system from day one (even if only one role is active), so that adding a new role does not require architectural changes.

---

## UX Pitfalls

### No "Transcript Preview Before Export"
Staff generate a PDF, open it, discover a missing section or formatting problem, go back to edit, and regenerate. Without an accurate in-app preview, this cycle is repeated multiple times. The preview must accurately represent what the PDF will look like (especially page breaks and section ordering).

### Extraction Results Auto-Saved Without Review
Presenting extracted data as "done" without a clear review step erodes staff trust when they later discover incorrect grades or misread dates. Staff need a side-by-side view: the original document on one side, the extracted fields on the other, with explicit "Accept" / "Edit" actions per field.

### No Completeness Indicator
Staff approach transcript generation without knowing which data categories are missing for a student. The transcript is generated with empty sections, which looks unprofessional. **Fix:** Show a completeness status on the student profile (e.g., a checklist of required sections: Academic Results ✓, Work Experience ✗, Career Goals ✗).

### No Bulk / Year-End Workflow
At end of year, staff may need to generate transcripts for a full cohort. A one-by-one workflow does not scale. Even if bulk generation is out of scope for v1, the architecture should not make it hard to add (e.g., PDF generation must be callable without a user session, via a background job).

### Destructive Actions Without Confirmation
Deleting a student record, removing an uploaded document, or clearing extraction results should require an explicit confirmation. Accidental deletion of a student's certificate PDF cannot be undone without a backup.

### Transcript Template Locked in Code
If the transcript template is hard-coded in the application, every formatting change requires a developer, a deployment, and a restart. Staff expectations for control over "their" transcript layout will conflict with this model. **Fix:** Store at least the text/narrative portions of the template as editable data; consider a simple template editor for non-developer staff.

---

## "Looks Done But Isn't" Checklist

- [ ] **Login works, but session expiry is not handled** — Token expires after 1 hour; no graceful re-authentication; user loses unsaved form data.
- [ ] **PDF uploads work, but extraction is not reviewed** — Extraction runs and saves results silently; no review step; incorrect data accumulates.
- [ ] **Transcript generates, but page breaks are wrong** — Sample data is short; production data with long extracurricular lists or many awards breaks across pages incorrectly.
- [ ] **HTTPS is configured, but certificate is self-signed** — Browser warning deters staff; IT team has not provisioned an internal CA-signed cert.
- [ ] **Files upload successfully, but they're in the web root** — No authentication required to access the file if the URL is known.
- [ ] **Data saves, but there's no audit trail** — "Who changed this?" cannot be answered.
- [ ] **Student IDs are integers in URLs** — IDOR vulnerability; sequential enumeration possible.
- [ ] **App runs in dev, but deployment to school server fails** — IIS configuration, file paths, or missing runtime on school server not tested.
- [ ] **Admin consent not set up** — App registration works for the developer; school staff cannot log in on go-live day.
- [ ] **Uploaded PDFs back up with the application** — DB is backed up; the uploads directory is not included in the backup schedule.
- [ ] **Student data not in application error logs** — Error tracking configured but request bodies containing student names are logged to a cloud service.
- [ ] **Empty template sections look fine in HTML preview** — PDF output shows "Work Experience: (none entered)" rather than omitting the section gracefully.

---

## Recovery Strategies

### If Extraction Results Are Wrong in Production
Stop trusting extraction output immediately. Add a "mark as manually verified" flag to every extracted field. Provide staff a "re-review" workflow that shows the original document alongside current field values. Treat this as a data quality project, not a bug fix — systematic manual review of affected records.

### If Azure AD Consent Was Not Set Up Correctly
The school IT Global Administrator must visit the admin consent URL. No code change is needed. If the IT admin is unavailable, the workaround is to temporarily set `prompt=consent` in the login request so each individual user can consent (only works if per-user consent is permitted in the tenant — unlikely in EDU tenants).

### If the On-Premise Deployment Is Broken
Have a deployment runbook with a rollback step (previous deployment artifact + database migration down script). Do not deploy on a Friday. Test the deployment in a staging environment on equivalent school hardware before production.

### If Page Breaks Are Wrong in Production PDFs
If using Puppeteer, update CSS `break-inside: avoid` on all section containers and verify no `overflow: auto` parents exist. Test with the worst-case real data (student with most extracurricular entries). If urgent, provide a short-term workaround: export as HTML and let staff print to PDF from their browser as a stopgap.

### If Student Data Is Discovered in Cloud Logs
Rotate all credentials immediately. Purge the relevant log entries from the external service (request this from the vendor). Notify the school's privacy officer. Review all other integrations for similar leakage. Add automated log scrubbing to the build pipeline.

---

## Pitfall-to-Phase Mapping

| Phase | Pitfall to Watch | Pre-emptive Action |
|-------|-----------------|-------------------|
| Infrastructure / Deployment | On-premise deployment failure (Pitfall 8) | Write deployment runbook before any feature work; test on Windows Server |
| Infrastructure / Deployment | Data sent to cloud services (Pitfall 9) | Audit all dependencies for network calls; document data flow |
| Auth | Azure AD tenant consent block (Pitfall 2) | Document admin consent URL; test against M365 EDU trial tenant |
| Auth | MSAL token lifecycle mishandled (Pitfall 3) | Centralise token acquisition; test on Safari; handle `InteractionRequiredAuthError` |
| Student Record Management | IDOR on student records (Pitfall 4) | Use UUIDs for public IDs; server-side auth on every endpoint |
| Student Record Management | No immutable audit trail (Pitfall 5) | Audit log table in schema from day one |
| PDF Upload & Extraction | PDF extraction over-promise (Pitfall 1) | Build review/accept UI; handle scanned docs; fail gracefully |
| PDF Upload & Extraction | File upload security failures (Pitfall 6) | Magic-byte validation; UUID rename; store outside web root |
| Transcript Assembly & Export | Transcript PDF page break failures (Pitfall 7) | Use Puppeteer; break-inside CSS; embed fonts; test with real data |
| All phases | Student names in error logs | Configure log scrubbing; no PII in log statements |
| All phases | Sequential IDs in URLs (IDOR) | UUID from schema design; never expose integer PKs |

---

## Sources

- MSAL.js acquire token documentation and FAQ: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/FAQ.md (HIGH confidence — official Microsoft source)
- MSAL error handling — Microsoft Learn: https://learn.microsoft.com/en-us/entra/identity-platform/msal-error-handling-js (HIGH confidence)
- Azure AD redirect URI best practices: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url (HIGH confidence)
- AADSTS error codes reference: https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes (HIGH confidence)
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet (HIGH confidence)
- PortSwigger Web Security Academy — File Uploads: https://portswigger.net/web-security/file-upload (HIGH confidence)
- FPF EdTech Service Provider's Guide to Student Privacy (2025): https://fpf.org (HIGH confidence — authoritative privacy guidance)
- Building FERPA-Ready Applications: https://www.hireplicity.com/blog/building-ferpa-ready-applications-a-technical-checklist (MEDIUM confidence — practitioner guidance)
- FERPA compliance for LMS architecture: https://www.ofashandfire.com/blog/ferpa-compliant-lms-architecture-k12 (MEDIUM confidence)
- PDF generation best practices for production: https://pdf4.dev/blog/pdf-generation-best-practices (MEDIUM confidence — practitioner)
- Puppeteer vs wkhtmltopdf comparison: https://autype.com/blog/autype-vs-puppeteer-vs-wkhtmltopdf-which-tool-is-right-for-you (MEDIUM confidence)
- PDF data extraction developer guide: https://www.nutrient.io/blog/pdf-data-extraction-developer-guide/ (MEDIUM confidence)
- "I Tested 12 Best-in-Class PDF Table Extraction Tools": https://medium.com/@kramermark/i-tested-12-best-in-class-pdf-table-extraction-tools-and-the-results-were-appalling-f8a9991d972e (MEDIUM confidence — empirical test)
- IIS reverse proxy pitfalls: https://techcommunity.microsoft.com/t5/iis-support-blog/iis-acting-as-reverse-proxy-where-the-problems-start/ba-p/846259 (HIGH confidence — Microsoft official)
- SentinelOne IDOR explainer: https://www.sentinelone.com/cybersecurity-101/cybersecurity/insecure-direct-object-reference/ (MEDIUM confidence)
