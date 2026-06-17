# Pitfalls Research

**Domain:** Adding SMB network-share document discovery and linking to an existing Node.js school records web app (v2.0 milestone)
**Researched:** 2026-06-16
**Confidence:** HIGH (Windows SMB service identity, browser UNC restrictions, path traversal) / MEDIUM (SPCS share layout unknown — matching pitfalls validated against school DMS patterns, not this specific share)

---

## Critical Pitfalls

### Pitfall 1: Discovery Before Share Layout Is Documented

**What goes wrong:**
The team runs an auto-discovery scan against `\\spcs-fs\Private\Administration\Office\Student` before anyone has walked the folder tree with careers staff. Matching rules are guessed (e.g. "folder name = student name") but the share uses student IDs, year-level groupings, or inconsistent legacy naming. Hundreds of files link to wrong students or land in `ORPHAN` status. Staff lose trust in the feature and revert to File Explorer.

**Why it happens:**
Developers treat the share as a clean API with a predictable schema. School shares accumulate years of manual filing — mixed conventions, duplicate names, archived cohort folders, and non-student administrative files in the same tree. PROJECT.md explicitly gates discovery on documented layout; teams skip reconnaissance because "we'll figure it out from the scan output."

**How to avoid:**
- Phase 6 must produce a written layout spec: folder depth, naming patterns, file types, edge cases (twins, hyphenated names, preferred names vs legal names).
- Derive matching rules from real samples — not assumptions. Primary key should be `Student.schoolStudentId` if the share uses IDs; name-based rules are secondary and low-confidence only.
- Run a **read-only recon script** that outputs statistics (folder count, naming pattern frequency, unmatched samples) before any production linking.
- Get careers staff sign-off on matching rules before the first auto-link commit.

**Warning signs:**
- Matching logic hardcoded before anyone has opened the share on a staff PC; no `shareLayout` config file; first scan links >10% of files to the same student; staff say "that's not how our folders work."

**Phase to address:**
Phase 6 — Share Reconnaissance & Matching Rules

---

### Pitfall 2: PM2 / LocalSystem Cannot See the Network Share

**What goes wrong:**
Discovery works when a developer runs Node from an interactive terminal (logged-in user has share access) but fails in production under PM2 with `ENOENT`, `EACCES`, or `UNKNOWN` on `\\spcs-fs\...`. The app ships; document lists are empty; logs show intermittent access denied.

**Why it happens:**
Windows services and PM2 processes often run as `LocalSystem` or a user without share ACLs. Mapped drive letters (`S:\Student`) exist only in the interactive desktop session — invisible to background services. Node.js uses the **process identity's** credentials for UNC access; there is no built-in API to pass username/password per `fs.readFile` call.

**How to avoid:**
- Create a dedicated AD service account (e.g. `svc-spcs-transcripts`) with **read-only** share + NTFS permissions on the target path.
- Configure PM2 / Windows Service to run as that account — not `LocalSystem`, not the developer's personal account.
- Use full UNC paths (`\\spcs-fs\Private\...`) — never mapped drive letters in code or config.
- Smoke test from the **same account PM2 uses**: `fs.readdirSync(process.env.SHARE_ROOT)` in a startup health check.
- Document credential setup in the deployment runbook; school IT provisions the account before go-live.

**Warning signs:**
- "Works on my machine" but fails after IIS/PM2 deploy; code references `Z:` or `S:` drive; PM2 logon shows `Local System`; share access tested only from RDP as admin.

**Phase to address:**
Phase 7 — SMB Service Identity & Share Access

---

### Pitfall 3: Exposing UNC Paths or Open Redirects in the Document Proxy

**What goes wrong:**
API responses include `\\spcs-fs\Private\...` paths; staff bookmark or share them; attackers enumerate server topology. Worse: the download endpoint accepts a `path` query parameter and streams any file the service account can read — classic path traversal (`..\..\..\Windows\...`) or lateral movement across the share.

**Why it happens:**
Teams conflate "staff already have share access in Explorer" with "it's fine to leak paths in the API." Browsers cannot reliably open `file://` or UNC links from HTTPS pages anyway, so raw paths fail UX while still leaking infrastructure. Proxy endpoints built quickly often take client-supplied paths instead of opaque document IDs.

**How to avoid:**
- Store only **normalized relative paths** server-side; never return absolute UNC to the client.
- Document open flow: `GET /api/documents/:id/content` resolves `LinkedDocument.id` → validated relative path → stream.
- Implement `resolveSafePath(relativePath)`: reject `..`, absolute paths, alternate separators; verify resolved path stays under `SHARE_ROOT`.
- Log document views/downloads in `AuditLog` with acting user and document ID — not full path in client-visible errors.
- Set `Content-Disposition: attachment` or `inline` with sanitized filename; no redirect to `file://` URLs.

**Warning signs:**
- JSON includes `sharePath` or `uncPath` fields; download route accepts `?path=` parameter; error messages echo full filesystem paths; no audit entries for document access.

**Phase to address:**
Phase 9 — Auth Proxy & Document UI

---

### Pitfall 4: Aggressive Fuzzy Name Matching Without Disambiguation

**What goes wrong:**
Auto-matcher links `Smith_John_Report.pdf` to the wrong John Smith (two students share a common surname and first name). Staff attach evidence to incorrect records; transcript errors reach universities. Low-confidence matches look identical to high-confidence matches in the UI.

**Why it happens:**
Folder-per-student layouts are not guaranteed. Filename token matching feels like a quick win. Fuzzy libraries (`token_set_ratio`, Levenshtein) score "Jon Smith" and "John Smith" highly but cannot distinguish homonyms without a secondary key (student ID, year level, date of birth).

**How to avoid:**
- Match priority order: (1) exact `schoolStudentId` in folder name or filename, (2) exact normalized full name in dedicated folder, (3) fuzzy name — **never auto-link**, flag for manual review only.
- Persist `matchRule` and `matchConfidence` on every `LinkedDocument`; surface "Needs review" vs "Auto-linked (ID match)" in UI.
- Block auto-link when multiple students score above threshold — force orphan queue resolution.
- Normalize names consistently: lowercase, collapse whitespace, strip punctuation except hyphen/apostrophe, handle "Surname, Firstname" vs "Firstname Surname" folder patterns.

**Warning signs:**
- Single fuzzy threshold auto-assigns without human gate; no duplicate-name test cases; twins or same-surname cohort not discussed with staff; match confidence not stored.

**Phase to address:**
Phase 6 (rules design) and Phase 8 (matching engine)

---

### Pitfall 5: Synchronous Full-Share Scan Inside HTTP Request

**What goes wrong:**
Admin clicks "Scan now"; IIS/Express walks the entire share tree synchronously; request times out at 120 seconds; partial DB state; other staff requests hang; PM2 marks process unhealthy.

**Why it happens:**
Simplest implementation: `POST /scan` → `fs.readdir` recursive → return 200. Works on a dev folder with 50 files; fails on a school share with thousands of files and high SMB latency (each directory listing is a network round-trip).

**How to avoid:**
- Separate **worker process** (second PM2 entry) for discovery — same service account, not the HTTP thread pool.
- `POST /api/admin/scans` enqueues job, returns `202 { scanRunId }`; UI polls status.
- Use streaming enumeration (`fs.readdir` with `{ withFileTypes: true }`, async iteration) — never load entire tree into memory.
- Schedule scans off-peak (nightly cron); admin trigger for urgent rescan.
- Record `ShareScanRun` with counts, duration, errors — operational visibility.

**Warning signs:**
- Scan endpoint blocks until complete; no `ShareScanRun` model; scan triggered on every page load; Express event loop lag during scan.

**Phase to address:**
Phase 8 — Discovery Engine & Link Persistence

---

### Pitfall 6: Copying Share Files into App Upload Storage

**What goes wrong:**
Discovery downloads each file to `/uploads/` "for reliability." Storage doubles; staff edit the share copy but the app serves stale local copies; v2.0 goal (authoritative share, path references only) is undermined. Backup scope expands unexpectedly.

**Why it happens:**
v1 Phase 4 designed around local upload storage. Developers extend the existing `documents` table and upload pipeline rather than introducing `LinkedDocument` with path references. Offline-access anxiety pushes toward local copies.

**How to avoid:**
- DB stores metadata + normalized relative path only — no binary column, no local copy.
- Proxy reads live from share at open time; handle missing file gracefully (`410 Gone` + "file removed from share" UI).
- Explicitly deprecate v1 upload endpoints for v2 milestone — migration plan for any existing uploaded docs, separate from share links.
- Mark stale links when rescan finds path absent — do not retain ghost binaries locally.

**Warning signs:**
- Discovery job includes `fs.copyFile`; `stored_path` points to `/uploads/`; disk usage grows with share size; mtime on app copy diverges from share.

**Phase to address:**
Phase 8 (discovery) and Phase 10 (v1 migration)

---

### Pitfall 7: Matching Before Student Directory Is Populated

**What goes wrong:**
First production scan runs when only 20 test students exist in the DB but the share holds files for 400 students. Everything unmatched goes to orphan queue at once; staff overwhelmed; they conclude discovery is broken.

**Why it happens:**
Discovery is built and tested before Phase 2 student import completes. Demo environment has sparse data; production share is full.

**How to avoid:**
- Gate first full auto-match on student directory completeness check (count threshold or staff confirmation).
- Support **re-match only** job: re-run matching rules against existing `LinkedDocument` rows when students are bulk-imported — no full tree walk required.
- Show scan stats: "412 files seen, 380 unmatched — 350 students not in system" to set expectations.

**Warning signs:**
- Orphan count ≈ file count after first scan; no re-match command; student import scheduled after discovery go-live.

**Phase to address:**
Phase 8 — Discovery Engine (depends on Phase 2 student data)

---

### Pitfall 8: No Stale / Missing File Handling on Rescan

**What goes wrong:**
Staff delete or rename files on the share; app still lists old documents; open/download fails with opaque 500 errors; staff cannot tell whether the app or the share is wrong.

**Why it happens:**
Discovery only inserts new rows — never marks removed paths. Open handler throws raw `ENOENT` without updating link status.

**How to avoid:**
- Each scan assigns `lastSeenScanId`; paths not seen in latest scan → status `STALE`.
- Open handler: if file missing, update status, return structured error, log audit event.
- UI badge: "Removed from share" / "Path changed — rescan pending."
- Optional: detect mtime/size change for "Updated on share" indicator without re-upload.

**Warning signs:**
- Deleted share files still appear as linkable; no `STALE` status; rescan is insert-only; open errors are generic 500.

**Phase to address:**
Phase 8 — Discovery Engine & Link Persistence

---

### Pitfall 9: IDOR on Document Endpoints

**What goes wrong:**
Any authenticated staff member accesses any document by guessing `LinkedDocument` UUID, even for students they should not see (or in a future role model, restricted records). Document proxy becomes a read gateway to the entire share tree if IDs are enumerable.

**Why it happens:**
Authorization stops at "valid JWT" without verifying the document belongs to a student the user may access. UUIDs are not secret — they're opaque identifiers, not access controls.

**How to avoid:**
- Every document route: load `LinkedDocument` → verify `studentId` → apply same authorization as `GET /api/students/:id`.
- Reject documents with null `studentId` (orphans) for non-admin roles.
- Admin orphan queue uses separate `/api/admin/orphans` routes with `requireRole('Admin')`.
- Never use sequential IDs for documents.

**Warning signs:**
- Document route only checks JWT; no `studentId` join in authorization middleware; orphan files downloadable by any staff.

**Phase to address:**
Phase 9 — Auth Proxy & Document UI

---

### Pitfall 10: Write Access to the Share "For Convenience"

**What goes wrong:**
A "replace document" or "rename on share" feature is added to fix staff mistakes. A bug or bad deploy deletes or overwrites authoritative school files. Recovery requires backup restore and careers team downtime.

**Why it happens:**
Staff ask to fix filenames from the app; developers add SMB write operations to reduce support burden. v2.0 read-only constraint is treated as temporary.

**How to avoid:**
- Service account: read-only ACL at share and NTFS level — physically cannot write even if code tries.
- No write SMB APIs in codebase; code review gate for `fs.writeFile`, `fs.unlink`, `fs.rename` on share paths.
- Staff workflow: fix files in Explorer → trigger rescan. Document this in staff training.

**Warning signs:**
- Service account in `Domain Admins`; write methods in `shareAccess` service; "upload to share" feature request accepted into v2 scope.

**Phase to address:**
Phase 7 — SMB Service Identity (ACL design)

---

## Technical Debt Patterns

Shortcuts that seem reasonable when adding share linking but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode matching rules in TypeScript | Faster first scan | Every layout change requires deploy | Never — use config derived from Phase 6 recon |
| Store absolute UNC in DB | Simpler open handler | Breaks if share moves or server renamed | Never — normalized relative path + env `SHARE_ROOT` |
| `net use` with password in startup script | Quick credential fix | Password rotation pain; secrets in config; unreliable in services | Never in production — AD service account logon |
| Reuse v1 `documents` table for share links | Less schema work | Mixes upload metadata with share paths; confuses soft-delete semantics | Never — separate `LinkedDocument` model |
| Skip orphan queue — show all files on admin page | One less UI | Unmatched files invisible; staff can't fix misfiled docs | Never at 200–600 students |
| Full tree scan on every student profile open | "Always fresh" list | Share latency kills page load | Never — scan on schedule + manual trigger |
| Client-side PDF fetch without auth header | Simpler `<a href>` | Token not sent; 401 or open redirect hacks | Never — `apiFetch` → blob → object URL |
| Fuzzy auto-link for all unmatched files | Higher link rate | Wrong-student evidence on formal transcripts | Never for production — manual review only |

---

## Integration Gotchas

Common mistakes when connecting the existing Express + MSAL app to the SMB share.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Windows SMB / UNC | Use mapped drive letter `S:\Student` in config | Full UNC `\\spcs-fs\Private\Administration\Office\Student`; env var `SHARE_ROOT` |
| Windows SMB / UNC | Run PM2 as LocalSystem; assume share "just works" | Dedicated AD service account with read-only ACL; PM2 runs as that account |
| Windows SMB / UNC | Call `net use \\share /user:... /pass:...` per HTTP request | Process-level identity only; optional `@cityssm/windows-unc-path-connect` at startup if domain requires explicit connect |
| Node.js `fs` on SMB | `fs.readFile` entire 20 MB PDF into memory for proxy | `fs.createReadStream` piped to response; set `Content-Length` when known |
| Node.js `fs` on SMB | Synchronous `readdirSync` walk on API thread | Async worker; streaming directory iteration |
| Microsoft Entra ID (existing) | Assume share respects per-user AD permissions via impersonation | App uses service account; **all staff see same share slice** the account can read — scope is app authorization, not SMB impersonation |
| Microsoft Entra ID (existing) | Pass staff token to SMB layer | JWT validates app access only; SMB uses service account — two separate auth domains |
| PostgreSQL / Prisma (existing) | Store file binary in BYTEA "for backup" | Path metadata only; share is authoritative store |
| IIS / PM2 (existing) | Long-running scan in same process as API | Second PM2 worker entry in `ecosystem.config.js` |
| v1 Phase 4 upload model | Keep upload and share link side-by-side indefinitely | Migration plan: new students share-only; legacy uploads read-only until migrated |
| AuditLog (existing) | Log only link create/delete | Also log document view/download and scan run completion |

---

## Performance Traps

Patterns that work in dev or small folders but fail on a school SMB share.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|------------------|
| Serial directory walk on high-latency SMB | Scan takes 30+ minutes; blocks worker | Async iteration; optional bounded concurrency for `readdir`; off-peak schedule | >2,000 folders or deep trees |
| Stat every file on every scan | Scan time scales with file count even when unchanged | First scan: full stat; subsequent: mtime/size comparison; skip unchanged | >5,000 files |
| Load full document list for all students on dashboard | Slow home page | Per-student fetch on profile mount only | Never needed at this scale — still avoid global prefetch |
| Proxy stream without timeout | Hung requests if share offline | Stream timeout; circuit breaker; friendly "share unavailable" | Share maintenance windows |
| N+1 queries listing documents + evidence counts | Profile page lag | Single query with `_count` or JOIN | >20 docs per student with evidence badges |
| Antivirus scan on every read through proxy | Double latency (server AV + share AV) | Coordinate with IT on AV exclusions for service account read pattern | Large PDFs (>5 MB) |

---

## Security Mistakes

Domain-specific security issues when bridging a web app to an internal file share.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client-supplied path in download API | Read any file service account can access; path traversal | Opaque document ID only; server-side path resolution with `..` rejection |
| Returning full UNC in API/errors | Infrastructure disclosure; aids lateral movement planning | Relative path internally; generic errors to client |
| Service account with write or excessive read ACL | Bug becomes data destruction or exposure of non-student admin folders | Read-only on `...\Student` subtree only — not entire `Private` share |
| Credentials in `.env` committed to repo | Share compromise | AD gMSA or managed service account; secrets in school vault; never commit |
| Document proxy without audit trail | Cannot answer "who accessed this student's certificate?" | `logAudit` on every content stream |
| Embedding share paths in client-side React state/logs | Browser extensions, crash reports leak paths | Send display filename only |
| Assuming HTTPS intranet = no TLS for share hop | Misconfiguration exposes metadata on network | SMB3 signing enabled; document content stays on internal network — acceptable; still protect app layer |
| Orphan documents downloadable by all staff | Pre-match files may belong to wrong context or contain other students' data in misfiled folders | Orphans admin-only until manually assigned |

---

## UX Pitfalls

Common user experience mistakes when staff move from File Explorer to in-app document linking.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visibility into scan progress | "Is it working?" — staff refresh repeatedly | Scan status panel: running / complete / last run time / counts |
| Auto-linked files look authoritative | Staff attach wrong evidence to transcript | Confidence badge + review queue for low-confidence matches |
| Open button opens new tab with 401 | Token not attached to navigation | In-app open via authenticated fetch → blob URL |
| Ghost documents still listed | Click → error; trust erodes | `STALE` badge; hide from default list or show greyed with explanation |
| No orphan resolution workflow | Unmatched files never appear in student profiles | Cohort-wide orphan inbox; assign-to-student picker |
| Expecting instant update after saving to share | "I just filed it — where is it?" | Set expectation: next scan cycle; offer "Refresh documents" (scoped rescan) |
| Showing raw server error on open failure | Technical errno scares non-technical staff | "This file is no longer on the school share. It may have been moved or renamed." |
| Replacing v1 upload without migration messaging | Staff try to upload PDFs; feature gone | Clear banner: "Documents are linked from the school file share"; link to staff guide |
| Evidence linking buried in settings | Feature unused | Prominent "Attach document" on award/activity rows using linked doc picker |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces for production share linking.

- [ ] **Discovery runs:** But only from developer's interactive login — not verified under PM2 service account on Windows Server.
- [ ] **Documents list on profile:** But opens fail because `SHARE_ROOT` differs between dev and prod env.
- [ ] **Download works for admin:** But orphan files accessible to all staff — IDOR on unassigned links.
- [ ] **Auto-match implemented:** But no duplicate-name test — two "Emma Wilson" students exist.
- [ ] **Scan completes:** But no `STALE` handling — deleted share files still listed.
- [ ] **Proxy streams PDF:** But entire file loaded into memory — large report cards OOM the Node process.
- [ ] **Read-only enforced in UI:** But service account has write ACL — UI is not the security boundary.
- [ ] **Audit log for links:** But document **views** not logged — access trail incomplete for governance.
- [ ] **Share layout documented:** But rules not updated when staff reorganise folders — silent match drift.
- [ ] **v2 document feature shipped:** But v1 upload code still primary in UI — staff create duplicates on share and in `/uploads/`.
- [ ] **HTTPS app works:** But staff expect clicking a path opens Explorer — UNC links deliberately not supported; training missing.
- [ ] **First scan succeeded:** But student import incomplete — 90% orphan rate treated as bug instead of data readiness.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mass wrong auto-links | MEDIUM | Halt matching job; set affected rows to `ORPHAN`; staff bulk-review queue; tighten rules; re-match with ID-only auto-link |
| Service account cannot access share | LOW (if caught pre-go-live) | School IT fixes ACL; verify with PM2 smoke test; no code change if UNC correct |
| Path traversal vulnerability found | HIGH | Emergency patch: ID-only resolution; rotate service account password; audit access logs for anomalous paths |
| Ghost documents after share cleanup | LOW | Run rescan; `STALE` sweep; UI already handles if status model exists |
| Full share copied to `/uploads/` | MEDIUM | Stop copy job; delete local duplicates; switch to path-reference model; rescan metadata |
| Staff rejected feature ("just use Explorer") | MEDIUM | Fix orphan queue UX; add confidence indicators; careers champion session; scoped rescan after they file correctly |
| Discovery timeouts in production | LOW–MEDIUM | Move scan to worker; increase schedule interval; scope scan to known subtrees after Phase 6 recon |

---

## Pitfall-to-Phase Mapping

How v2.0 roadmap phases (starting at Phase 6) should prevent these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Discovery before layout documented | Phase 6 | Written layout spec + staff sign-off; matching rules in config file |
| PM2/LocalSystem share access failure | Phase 7 | Health check `readdir(SHARE_ROOT)` passes under PM2 service account on prod server |
| UNC exposure / path traversal | Phase 9 | Pen test: `../` rejected; API never returns `\\spcs-fs`; IDOR test on document UUID |
| Fuzzy match wrong student | Phase 6 + 8 | Test suite with duplicate names; low-confidence never auto-links |
| Synchronous scan in HTTP | Phase 8 | Scan returns 202; worker process handles walk; IIS no timeout during scan |
| Copying files to app storage | Phase 8 + 10 | No files in `/uploads/` from discovery; DB rows have `relativePath` only |
| Matching before students exist | Phase 8 | Re-match job documented; first production match gated on student count |
| No stale file handling | Phase 8 | Delete file on share → rescan → `STALE` status → UI message |
| Document IDOR | Phase 9 | Request doc for student A using staff session — must fail if not authorized |
| Write access to share | Phase 7 | Service account ACL audit: read-only; grep codebase for share write ops |
| No scan visibility (UX) | Phase 9 | Admin scan history with counts and duration |
| Orphan queue missing (UX) | Phase 9 | Unmatched files visible and assignable |
| v1 upload confusion | Phase 10 | Upload UI removed or deprecated; migration path documented |
| Evidence link without doc picker | Phase 10 | Award row → attach linked document → appears in both views |
| Document view audit gap | Phase 9 | AuditLog entry on every content stream |
| Memory exhaustion on large PDF | Phase 9 | Stream proxy; no `readFile` for document content endpoint |

### Suggested phase order (dependency-aware)

1. **Phase 6 — Share Reconnaissance & Matching Rules** — Prevents Pitfalls 1, 4 (rules); outputs config before any code walks production share.
2. **Phase 7 — SMB Service Identity & Share Access** — Prevents Pitfalls 2, 10; unblocks all filesystem operations.
3. **Phase 8 — Discovery Engine & Link Persistence** — Prevents Pitfalls 5, 6, 7, 8; worker scan + match pipeline.
4. **Phase 9 — Auth Proxy & Student Document UI** — Prevents Pitfalls 3, 9; staff-facing list, open, download, orphan UX.
5. **Phase 10 — Evidence Linking & v1 Migration** — Prevents Pitfall 6 (continued); evidence joins; deprecate upload model safely.

---

## Sources

- Node.js UNC/network share access limitations: [nodejs/help#4390](https://github.com/nodejs/help/issues/4390) (MEDIUM — community; confirms process-identity model)
- PM2 / Windows service mapped drive invisibility: [node-windows#326](https://github.com/coreybutler/node-windows/discussions/326) (MEDIUM)
- Task Scheduler / service account SMB access: [Microsoft Q&A — SMB share service account](https://learn.microsoft.com/en-us/answers/questions/5830388/how-to-get-a-task-scheduler-task-to-access-an-smb) (HIGH — Microsoft)
- Browsers cannot open UNC from web apps: [Microsoft Q&A — UNC from ASPX](https://learn.microsoft.com/en-gb/answers/questions/1233970/how-to-open-unc-directory-which-residing-into-netw) (HIGH — Microsoft)
- Secure file proxy pattern: [Stack Overflow — intranet file download via backend](https://stackoverflow.com/questions/57868614/how-to-download-intranet-files-with-users-permissions-from-browser) (MEDIUM)
- SMB directory scan latency: [Microsoft Q&A — Directory.GetFiles on shared drive](https://learn.microsoft.com/en-my/answers/questions/5624740/accessing-shared-drive-using-directory-getfiles()) (HIGH — Microsoft)
- Concurrent directory traversal on network mounts: [dscanpy README](https://github.com/hanso-dev/dscanpy) (MEDIUM — pattern applicable to Node worker design)
- School records fuzzy matching practices: [heat-helper — student matching](https://github.com/hammezii/heat-helper) (MEDIUM — domain pattern)
- Project context: `.planning/PROJECT.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md` (HIGH — project-specific)
- Deployment patterns: `.planning/STATE.md` PM2 service account decisions from Phase 1 (HIGH)

---
*Pitfalls research for: v2.0 Network Document Linking — SMB share discovery and auth proxy integration*
*Researched: 2026-06-16*
