# Architecture Research

**Domain:** School records web app with on-premise data and Microsoft SSO
**Researched:** 2026-06-11
**Confidence:** HIGH (standard patterns, well-documented)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        School Network                           │
│                                                                 │
│  ┌──────────────┐     ┌─────────────────────────────────────┐  │
│  │   Browser    │────▶│           IIS (Reverse Proxy)       │  │
│  │  (Staff PC)  │     │         SSL termination, port 443   │  │
│  └──────────────┘     └───────────────┬─────────────────────┘  │
│                                       │ http://localhost:3000   │
│                           ┌───────────▼─────────────┐          │
│                           │   Next.js Application   │          │
│                           │   (PM2 process manager) │          │
│                           │                         │          │
│                           │  ┌─────────────────┐    │          │
│                           │  │  App Router /   │    │          │
│                           │  │  Pages + API    │    │          │
│                           │  │  Routes         │    │          │
│                           │  └────────┬────────┘    │          │
│                           │           │              │          │
│                           │  ┌────────▼────────┐    │          │
│                           │  │  Business Logic  │   │          │
│                           │  │  Services Layer  │   │          │
│                           │  └────────┬────────┘    │          │
│                           └───────────┼─────────────┘          │
│                                       │                         │
│             ┌─────────────────────────┼──────────────┐         │
│             │                         │              │          │
│   ┌─────────▼──────┐    ┌─────────────▼───┐  ┌──────▼──────┐  │
│   │  PostgreSQL /  │    │  File System     │  │  Job Queue  │  │
│   │  SQL Server    │    │  /uploads/       │  │  (in-proc   │  │
│   │  (port 5432    │    │  PDF storage     │  │  or Redis)  │  │
│   │   /1433)       │    │                  │  └─────────────┘  │
│   └────────────────┘    └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │ OAuth 2.0 (HTTPS)
          ▼
┌─────────────────────┐
│  Microsoft Entra ID │
│  (Azure AD, cloud)  │
│  Auth only — no     │
│  data stored there  │
└─────────────────────┘
```

**Key topology notes:**
- Single Windows Server hosts everything (IIS + Node.js + DB + file storage)
- Azure AD is used for **authentication only** — no student data leaves the school network
- IIS acts as reverse proxy (URL Rewrite + ARR modules), handles SSL termination
- PM2 (or NSSM Windows Service) manages the Node.js process lifecycle and auto-restart
- File system stores PDF binaries; database stores all structured data + file metadata

---

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|---------------|------------------------|
| IIS (Reverse Proxy) | SSL termination, port 80/443 → localhost:3000, request forwarding | Windows Server IIS + URL Rewrite + ARR modules |
| Next.js App (SSR) | Serve pages server-side, API routes, session-aware rendering | Next.js 14+ App Router with server components |
| Auth Middleware | Validate session on every request, redirect unauthenticated users | `@azure/msal-node` ConfidentialClientApplication + HTTP-only cookie |
| Student Module | CRUD for student profiles, search, filtering | API routes + Prisma ORM service layer |
| Records Module | Academic results, extracurriculars, awards, work experience | Sub-services per domain, linked to student FK |
| PDF Upload Service | Receive upload, validate, persist binary, enqueue extraction | Multer/formidable middleware → filesystem write → queue job |
| PDF Extraction Pipeline | Extract structured text from uploaded documents | Background worker: pdf-parse (digital) + Tesseract.js (scanned) |
| Transcript Assembler | Aggregate all student data + template → rendered HTML | Server-side React renderToStaticMarkup with template |
| PDF Export Service | Convert assembled HTML to downloadable PDF | Puppeteer (headless Chromium) with reused browser instance |
| Database (PostgreSQL/MSSQL) | All structured data: students, records, file metadata, users | Prisma ORM; schema described in ARCHITECTURE §Data Flow |
| File System Store | PDF binary storage, organised by student ID | `/uploads/{studentId}/{uuid}-{filename}.pdf` |
| Job Queue | Async PDF extraction jobs, decoupled from HTTP request cycle | BullMQ + Redis (preferred) or pg-boss (PostgreSQL-backed, no Redis) |

---

## Recommended Project Structure

```
spcs-transcripts/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/                # Azure AD redirect initiation
│   ├── (app)/                    # Protected routes (middleware-gated)
│   │   ├── students/
│   │   │   ├── page.tsx          # Student list + search
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Student overview
│   │   │       ├── records/      # Academic, extra-curricular tabs
│   │   │       ├── documents/    # PDF upload + document list
│   │   │       └── transcript/   # Template assembly + export
│   │   └── layout.tsx            # App shell with nav
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts    # Initiate MSAL auth code flow
│       │   ├── callback/route.ts # Exchange code for tokens
│       │   └── logout/route.ts
│       ├── students/
│       │   └── [...]/route.ts
│       ├── documents/
│       │   ├── upload/route.ts   # POST: receive PDF, store, enqueue
│       │   └── [id]/route.ts     # GET: stream file, DELETE
│       └── transcripts/
│           └── export/route.ts   # GET: assemble + return PDF stream
│
├── lib/
│   ├── auth/
│   │   ├── msal.ts               # ConfidentialClientApplication init
│   │   ├── session.ts            # HTTP-only cookie session helpers
│   │   └── middleware.ts         # Route protection middleware
│   ├── db/
│   │   ├── client.ts             # Prisma client singleton
│   │   └── schema.prisma         # Database schema
│   ├── services/
│   │   ├── students.ts
│   │   ├── records.ts
│   │   ├── documents.ts
│   │   ├── pdf-extraction.ts     # Extraction orchestration
│   │   └── transcript.ts         # Assembly + PDF export
│   ├── workers/
│   │   ├── queue.ts              # BullMQ/pg-boss init
│   │   └── extraction-worker.ts  # PDF extraction job handler
│   └── pdf/
│       ├── extractor.ts          # pdf-parse + tesseract pipeline
│       ├── renderer.ts           # Puppeteer browser pool + page.pdf()
│       └── templates/
│           └── transcript.tsx    # React component for transcript layout
│
├── components/                   # UI components
│   ├── students/
│   ├── records/
│   └── transcript/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── uploads/                      # PDF binary storage (gitignored)
│   └── {studentId}/
│       └── {uuid}.pdf
│
├── .env.local                    # AZURE_CLIENT_ID, TENANT_ID, DB_URL, etc.
├── next.config.ts
└── package.json
```

---

## Architectural Patterns

### Pattern 1: Confidential Client MSAL Flow (Server-Side SSO)

**What:** Azure AD SSO using the Authorization Code flow with a server-side secret. The browser never handles tokens; only the server does.

**When:** Any web app with server-side rendering where you can protect a client secret.

**Flow:**
```
Browser             Next.js Server          Azure AD
   │                     │                     │
   │─ GET /login ───────▶│                     │
   │                     │─ getAuthCodeUrl() ──▶│
   │                     │◀── auth URL ─────────│
   │◀─ redirect ─────────│                      │
   │─ GET login.microsoft.com ──────────────────▶│
   │◀─────────── redirect + ?code=... ───────────│
   │─ GET /api/auth/callback?code=... ──────────▶│ (Next.js)
   │                     │─ acquireTokenByCode() ▶│
   │                     │◀─── id_token ──────────│
   │                     │ (store in HTTP-only     │
   │                     │  encrypted cookie)      │
   │◀─ redirect /app ────│                        │
```

**Implementation (lib/auth/msal.ts):**
```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';

export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
});
```

**Middleware pattern (middleware.ts):**
```typescript
// Runs on every request to (app)/* routes
// Reads HTTP-only session cookie, validates token, redirects if missing
export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  if (!session) return NextResponse.redirect('/login');
  // Optionally verify token expiry and refresh here
}
```

**Key decisions:**
- Store session in a signed, HTTP-only, Secure cookie (not localStorage — no XSS exposure)
- Use `jose` or `iron-session` library to encrypt the session cookie server-side
- Scope: `openid profile email` is sufficient; no Microsoft Graph calls needed
- Token refresh: check expiry on each request; use `acquireTokenSilent()` before expiry

---

### Pattern 2: Database-as-Truth, Filesystem-as-Storage (PDF Files)

**What:** PDF binary files live on the server filesystem at a structured path. The database holds only metadata and the file path reference — never the binary.

**When:** On-premise apps with binary document uploads where cloud object storage (S3, Azure Blob) is unavailable.

**Why filesystem over database-as-blob:**
- Database stays lean — no bytea bloat degrading query performance
- Backups can be taken separately (DB dump + filesystem backup)
- Streaming a file directly from disk is simpler than streaming from a BYTEA column
- PostgreSQL's BYTEA has a 1GB practical limit before performance degrades significantly

**Storage layout:**
```
/uploads/
└── students/
    └── {student-db-id}/           # e.g. 42/
        └── {uuid}-{safe-name}.pdf # e.g. a3f1c..-report-card.pdf
```

**Database record (documents table):**
```
documents
  id            UUID PK
  student_id    FK → students.id
  filename      VARCHAR  -- original uploaded name (for display)
  stored_path   VARCHAR  -- absolute or relative path to binary
  file_size     INT
  mime_type     VARCHAR
  uploaded_by   FK → users.id
  uploaded_at   TIMESTAMPTZ
  extraction_status  ENUM('pending', 'processing', 'done', 'failed')
  extracted_data     JSONB  -- structured fields from extraction pipeline
```

**Atomicity note:** Create the DB row first (status=`uploading`), then write the file, then update status to `pending`. If the file write fails, mark the row `failed`. This prevents orphaned rows with no file.

---

### Pattern 3: Async PDF Extraction Pipeline (Queue-Based)

**What:** PDF upload is fast (HTTP response returns immediately). Extraction is moved to a background worker via a job queue.

**When:** Any processing task that takes >500ms and should not block the HTTP response.

**Why queue-based, not synchronous:**
- Scanned PDFs with Tesseract OCR can take 5–30 seconds per page
- Queuing prevents HTTP timeouts and improves perceived UX
- Failed jobs can be retried without user re-uploading

**Pipeline stages:**
```
HTTP Upload
    │
    ▼
1. RECEIVE & VALIDATE
   - Check MIME type (application/pdf only)
   - Check file size limit (e.g. 50MB)
   - Generate UUID filename
    │
    ▼
2. PERSIST ORIGINAL
   - Write binary to /uploads/{studentId}/{uuid}.pdf
   - Insert DB row (status=pending)
    │
    ▼
3. ENQUEUE JOB
   - Push { documentId, storedPath } to extraction queue
   - Return 201 to browser immediately
    │
    ▼ (background worker)
4. DETECT TYPE
   - Try pdf-parse text extraction
   - If char count < threshold → treat as scanned, use Tesseract
    │
    ▼
5. EXTRACT TEXT
   - Digital PDF: pdf-parse → raw text string
   - Scanned PDF: pdf-to-image (pdf2pic) → Tesseract.js → raw text
    │
    ▼
6. STRUCTURE DATA
   - Apply regex heuristics for grades, dates, names
   - Build extracted_data JSONB object
   - Update document row: status=done, extracted_data={...}
    │
    ▼
7. SURFACE TO STAFF
   - Staff reviews extracted fields in the UI
   - Confirms / corrects extracted values before saving to student record
```

**Queue library recommendation:** `pg-boss` — uses PostgreSQL as the queue store. No extra Redis infrastructure needed. For a school with 3–8 staff, throughput requirements are trivially satisfied.

---

### Pattern 4: Template Assembly → PDF Export

**What:** Collect all structured student data, pass it to a React component, render to HTML server-side, then drive Puppeteer to produce a styled PDF.

**When:** Complex document layouts (multi-section, page-break control, header/footer, school branding) that need full CSS support.

**Why Puppeteer over @react-pdf/renderer:**
- Full CSS support: grid, flexbox, custom fonts, `@media print` — needed for professional transcript layout
- Design can be done in normal CSS/Tailwind — no need to learn the @react-pdf subset
- On a single on-premise server, Chromium can be bundled or installed once

**Reused browser pool pattern (lib/pdf/renderer.ts):**
```typescript
import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function renderTranscriptToPDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await page.close(); // always release the page, even on error
  }
}
```

**Transcript assembly service:**
```typescript
// lib/services/transcript.ts
async function assembleTranscript(studentId: string): Promise<Buffer> {
  const data = await gatherAllStudentData(studentId); // DB query
  const html = renderToStaticMarkup(<TranscriptTemplate data={data} />);
  return renderTranscriptToPDF(`<!DOCTYPE html><html>...${html}...</html>`);
}
```

---

## Data Flow

### Request Flow (Protected Page — e.g. Student Profile)

```
1. Browser → GET /students/42
2. middleware.ts: read session cookie → valid? continue : redirect /login
3. Next.js server component: calls lib/services/students.ts
4. students.ts: Prisma query → SELECT * FROM students WHERE id=42
5. DB returns student row + joined records
6. Server component renders HTML with data
7. HTML streamed to browser
```

### Upload + Extraction Flow

```
1. Browser → POST /api/documents/upload (multipart, PDF binary)
2. API route: validate file type + size
3. Write binary → /uploads/42/uuid.pdf
4. INSERT INTO documents (student_id, stored_path, status='pending')
5. Enqueue job { documentId } to pg-boss queue
6. Return HTTP 201 { documentId } to browser immediately

[Background worker, seconds later:]
7. Worker picks up job { documentId }
8. Read file from /uploads/42/uuid.pdf
9. Run pdf-parse → if empty → run Tesseract on page images
10. Structure extracted text into JSONB
11. UPDATE documents SET status='done', extracted_data={...} WHERE id=...
12. Browser polls GET /api/documents/{id}/status → UI updates
```

### Transcript Export Flow

```
1. Browser → GET /api/transcripts/42/export
2. Auth middleware: validate session cookie
3. Query all student data (student, results, activities, awards, etc.)
4. React renderToStaticMarkup(<TranscriptTemplate data={...} />)
5. getBrowser() → reuse Puppeteer instance
6. page.setContent(html) → page.pdf({ format: 'A4' })
7. Return Buffer as response with Content-Type: application/pdf
8. Browser downloads file
```

---

## Scaling Considerations

| Concern | At current scale (3–8 staff, 200–600 students) | If load increases |
|---------|------------------------------------------------|-------------------|
| Concurrent users | Single Node.js process is sufficient | Add PM2 cluster mode (multi-core) |
| PDF extraction throughput | pg-boss queue on same DB instance is fine | Move to Redis + BullMQ; separate worker process |
| File storage | Local filesystem, ~1–2 GB total for 600 students (50MB PDFs) | Network share (NAS) or self-hosted MinIO (S3-compatible) |
| Database size | Small — structured records only, no blobs | Standard PostgreSQL maintenance (vacuum, indexes) |
| Puppeteer concurrency | Single browser instance, sequential page generation | Browser pool with `generic-pool`; unlikely needed at this scale |
| Session handling | HTTP-only cookie, stateless JWT-style | No change needed |

**Realistic storage estimate:**
- 600 students × 5 PDFs avg × 2MB avg = ~6 GB total uploaded files
- This fits comfortably on any school server with standard disk space

---

## Anti-Patterns

### Anti-Pattern 1: Storing PDF Binaries in the Database

**What:** Saving the PDF file content as a `BYTEA` or `BLOB` column in the database.

**Why bad:**
- Database size balloons rapidly; backups become multi-GB operations
- Every SELECT scan over the documents table loads binary data into memory
- PostgreSQL buffer pool is polluted with binary data instead of index/row data
- Streaming a large file requires loading the full BYTEA into application memory first

**Instead:** Filesystem path in DB row; serve file via `fs.createReadStream()` piped to the HTTP response.

---

### Anti-Pattern 2: Synchronous PDF Extraction on Upload

**What:** Running OCR/extraction inline in the upload HTTP handler, returning only after extraction completes.

**Why bad:**
- Tesseract on a multi-page scanned document can take 30–60+ seconds
- HTTP request times out; browser gets an error even though the file was saved
- Blocks the Node.js event loop during heavy CPU/IO work

**Instead:** Queue-based async extraction (Pattern 3). Return 201 immediately; poll for extraction status.

---

### Anti-Pattern 3: Launching a New Puppeteer Browser per Export Request

**What:** Calling `puppeteer.launch()` inside the transcript export API route handler.

**Why bad:**
- Puppeteer launch takes 1–3 seconds; adds latency to every export
- Each launch spawns a new Chromium process; 5 concurrent exports = 5 Chromium instances
- Memory exhaustion on a school server with limited RAM

**Instead:** Module-level singleton browser instance (Pattern 4). Launch once on server start; reuse across requests; open/close only the `Page` object per request.

---

### Anti-Pattern 4: Exposing Uploaded Files via Static File Serving

**What:** Placing `/uploads/` as a publicly accessible static directory in Next.js config.

**Why bad:**
- Student documents are sensitive — any authenticated request (or misconfigured unauthenticated access) could enumerate files by path
- Bypasses the application's access control layer

**Instead:** Serve files through an authenticated API route (`/api/documents/[id]`) that validates the user's session before piping the file stream.

---

### Anti-Pattern 5: Client-Side Token Storage (localStorage / sessionStorage)

**What:** Storing the Azure AD access token in the browser's localStorage after login.

**Why bad:**
- XSS vulnerability: any injected script can read localStorage and exfiltrate tokens
- Student records are sensitive data — a token leak = full access to all student records

**Instead:** HTTP-only, Secure, SameSite=Strict cookie managed entirely server-side. Browser never has direct access to the token.

---

## Integration Points

### External Services

#### Microsoft Entra ID (Azure AD)

| Concern | Detail |
|---------|--------|
| Protocol | OAuth 2.0 Authorization Code Flow |
| Library | `@azure/msal-node` (ConfidentialClientApplication) |
| Direction | Outbound only — browser redirects to Microsoft, token exchanged server-to-server |
| Data leaving school network | Only user identity claims (UPN, display name, email) come back via id_token |
| No student data sent | Azure AD is used for auth only; no student records are transmitted |
| App registration required | Register in Azure Portal → Entra ID → App Registrations; get client ID + secret |
| Redirect URI | Must be registered: `https://{school-domain}/api/auth/callback` |
| Tenant scope | Set authority to `https://login.microsoftonline.com/{tenantId}` to restrict to school accounts only |

**Environment variables needed:**
```
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
NEXTAUTH_SECRET=...       # for cookie signing
NEXT_PUBLIC_BASE_URL=https://transcripts.school.edu.au
```

---

### Internal On-Premise Services

#### PostgreSQL / SQL Server

| Concern | Detail |
|---------|--------|
| Connection | Prisma ORM; connection string in `.env.local` |
| Location | Same server (localhost) or school's database server |
| Recommended | PostgreSQL 15+ (pg-boss queue support, JSONB for extracted data, free license) |
| Fallback | SQL Server Express (free tier, school may already have it) |

#### File System (PDF Storage)

| Concern | Detail |
|---------|--------|
| Location | Absolute path on server, outside the Next.js app directory |
| Path | `D:\transcripts-uploads\students\{id}\` or configurable via `UPLOAD_DIR` env var |
| Permissions | Node.js process user must have read/write; IIS user needs no access |
| Backup | Include in school's regular file system backup alongside the database dump |

---

### On-Premise Deployment Topology

```
Windows Server (single machine)
│
├── IIS (port 443, SSL cert from school CA)
│   └── URL Rewrite + ARR → localhost:3000
│
├── Node.js 20 LTS
│   └── PM2 process manager
│       └── next start (port 3000)
│           └── Background workers (pg-boss polling)
│
├── PostgreSQL 15 (port 5432, localhost only)
│
└── File System
    └── D:\transcripts-uploads\   (PDF binaries)
```

**Deployment steps (high-level):**
1. Install Node.js 20 LTS on Windows Server
2. Install IIS with URL Rewrite + ARR modules
3. Install PostgreSQL 15 (or connect to existing school SQL Server)
4. Clone/copy application to `C:\inetpub\transcripts\`
5. Set environment variables (system-level or `.env.local`)
6. `npm install && npm run build`
7. Install PM2 globally: `npm install -g pm2`
8. Start app: `pm2 start npm --name transcripts -- start`
9. Configure PM2 Windows startup: `pm2 startup` + `pm2 save`
10. Configure IIS site with reverse proxy to `localhost:3000`
11. Register app in Azure Portal → Entra ID → App Registrations
12. Point DNS: `transcripts.school.edu.au` → server IP

---

## Suggested Build Order

The architecture naturally decomposes into layers. Build bottom-up so each layer is testable before adding the next:

| Phase | Layer | Why this order |
|-------|-------|---------------|
| 1 | Auth foundation (MSAL + session + middleware) | Everything else requires authenticated context; unblock all other work |
| 2 | Database schema + Prisma + student CRUD | Core data model must exist before any feature is built on top |
| 3 | Student profile + records UI (no PDF yet) | Validates the data model and UI patterns; staff can start entering data |
| 4 | PDF upload + filesystem storage | Adds the document management layer; extraction pipeline builds on top |
| 5 | PDF extraction pipeline (queue + worker) | Async processing; staff can review extracted data before trusting it |
| 6 | Transcript template + Puppeteer export | Depends on all student data being present; the capstone feature |
| 7 | Polish: search, filters, error handling, audit log | Hardening pass before school use |

---

## Sources

- Microsoft Learn — MSAL Node overview and migration guide: https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview
- Microsoft Learn — Common web application architectures (.NET/Clean Architecture): https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
- DEV Community — PDF Generation: Puppeteer vs @react-pdf/renderer (production comparison): https://dev.to/iurii_rogulia/pdf-generation-on-the-server-puppeteer-vs-react-pdfrenderer-a-production-comparison-44cg
- DEV Community — Keep source of truth in database, not files (document-heavy apps pattern): https://dev.to/mehartung/keep-your-source-of-truth-in-the-database-not-in-files-a-pattern-for-document-heavy-apps-546g
- PostgreSQL Wiki — BinaryFilesInDB (filesystem vs BYTEA tradeoffs): https://wiki.postgresql.org/wiki/BinaryFilesInDB
- Engineering at Scale — Database vs Blob Storage: https://engineeringatscale.substack.com/p/when-to-use-blob-storage-vs-database
- Medium — Deploying Node.js in IIS with PM2 reverse proxy: https://medium.com/@harshamw/deploying-a-node-js-application-in-iis-using-a-reverse-proxy-process-management-using-pm2-3d59b83d7f76
- Travis Horn — Reverse-proxying Node.js apps on Windows with IIS: https://travishorn.com/reverse-proxying-node-js-apps-on-windows-with-iis/
- DocuWare System Architecture White Paper (N-tier document management reference): https://cdn2.hubspot.net/hubfs/388534/DocuWare%20System%20Architecture%20White%20Paper.pdf
