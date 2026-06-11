# Stack Research

**Domain:** School records/transcript web app with on-premise infrastructure
**Researched:** 2026-06-11
**Confidence:** HIGH

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **Next.js** | 16.2.x | Full-stack framework (App Router) | Current stable (Oct 2025 release); Turbopack default; React 19.2 bundled; `proxy.ts` replaces middleware; Server Actions for mutations; self-hostable with `output: 'standalone'` |
| **TypeScript** | 6.x | Type safety | Current stable; required for reliability in school data systems |
| **Node.js** | 22 LTS | Server runtime | Current LTS; required by Next.js 16 (dropped Node 18 support) |
| **React** | 19.2.x | UI library | Bundled with Next.js 16; Server/Client Components; React Compiler stable |
| **PostgreSQL** | 17.x | Primary database | Open-source, no licensing cost vs SQL Server; superior JSON/JSONB for unstructured student data; runs on any Linux/Windows on-premise host |

> **SQL Server note:** If the school's IT already runs SQL Server, Prisma supports it via `@prisma/adapter-mssql`. See Alternatives section. PostgreSQL is recommended for greenfield builds.

---

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **Better Auth** | 1.6.x | Auth library | Auth.js (NextAuth) is now maintained by Better Auth team and has been in beta since 2023; Better Auth is the recommended path for new projects; built-in Microsoft social provider handles Entra ID OAuth 2.0 OIDC |
| **@better-auth/sso** | 1.6.x | Enterprise SSO plugin | Optional: use if school requires SAML or full OIDC discovery (enterprise SSO flows); for simple single-tenant Entra ID the built-in Microsoft provider is sufficient |

**Auth flow:** Better Auth with the Microsoft Entra ID social provider — OAuth 2.0 authorization code flow with PKCE, single-tenant (`https://login.microsoftonline.com/<tenant-id>/v2.0`). Staff are redirected to Microsoft login, consent, and return with a session cookie. Better Auth stores sessions in the database (same PostgreSQL instance).

**Azure App Registration settings required:**
- Platform: Web (not SPA)
- Redirect URI: `https://<your-domain>/api/auth/callback/microsoft`
- Account types: "Accounts in this organizational directory only" (single-tenant)
- Required scopes: `openid`, `profile`, `email`

---

### Database & ORM

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **Prisma ORM** | 7.8.x | Database access layer | Current stable; Rust-free TypeScript runtime (3× faster queries vs v6); 90% smaller bundle; full PostgreSQL support |
| **@prisma/adapter-pg** | 7.8.x | Prisma PostgreSQL driver adapter | Required in Prisma 7+ for all direct database connections |
| **pg** | 8.21.x | PostgreSQL Node.js driver | Underlying driver for adapter-pg; battle-tested, wide adoption |

**Prisma 7 setup note:** Prisma 7 mandates driver adapters for all connections. The `prisma.config.ts` file replaces the old datasource-only pattern. ESM (`"type": "module"` in package.json) is required.

---

### PDF Generation (Transcript Export)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **@react-pdf/renderer** | 4.5.x | Server-side transcript PDF generation | No Chromium/browser dependency; sub-500ms generation; ~3MB bundle; React-like API with `<Document>`, `<Page>`, `<View>`, `<Text>`; paginated by design; runs on plain Node.js server |

**Why not Puppeteer/Playwright for generation:** 100MB+ Chromium bundle, 2–5 second generation per document, browser process lifecycle management complexity. This is avoidable — transcripts are structured paginated documents, not HTML pages needing pixel-perfect browser rendering.

**Template approach:** Define the transcript layout as a `@react-pdf/renderer` component. Staff-authored narrative sections are passed as props. The server action renders to a `Buffer` and streams as `application/pdf`.

**CSS limitation:** `@react-pdf/renderer` supports Flexbox layout (Yoga engine) but not CSS Grid, `@media`, or pseudo-selectors. Design the transcript template using Flex — this is not a constraint in practice for document layouts.

---

### PDF Parsing (Document Upload & Data Extraction)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| **unpdf** | 1.6.x | Extract text from uploaded PDFs | Modern actively-maintained wrapper around PDF.js; works in Node.js without browser globals; supercedes deprecated `pdf-parse`; extract text, links, and metadata |
| **@napi-rs/canvas** | 1.0.x | Node.js canvas polyfill for PDF.js | Required when using pdfjs-dist's font rendering on Node; install alongside unpdf for complete compatibility |

**Extraction reality:** None of these libraries do AI-powered structured extraction. They extract raw text from PDF pages. For varied document layouts (report cards with different formats from different schools, award letters, etc.), the application will need:
1. Text extraction via `unpdf`
2. Pattern matching / heuristic parsing to find grades, dates, names
3. Staff review and correction UI — do not assume 100% accurate auto-extraction

**Why not pdf-parse:** Internally wraps `pdfjs-dist` but hides it, causing `window is not defined` errors in production Node.js environments. Known footgun. Unmaintained. `unpdf` is its modern replacement.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Tailwind CSS** | 4.3.x | Utility-first CSS | Default with `create-next-app` for Next.js 16; CSS-first config (no `tailwind.config.ts`; theme in `globals.css` `@theme` block) |
| **shadcn/ui** | latest | Accessible UI components | Component primitives (forms, tables, dialogs, badges, cards); installed per-component, code lives in `components/ui/`; updated for Tailwind v4 + React 19 |
| **Radix UI** | (via shadcn) | Accessible primitives | Underlying shadcn/ui layer; handles a11y, keyboard nav, ARIA automatically |
| **React Hook Form** | 7.78.x | Form state management | Student profile forms, transcript template forms; integrates with Zod via `@hookform/resolvers` |
| **Zod** | 4.4.x | Schema validation | Validate all form inputs and API payloads; v4 is the current major; faster than v3 |
| **@tanstack/react-table** | 8.21.x | Headless data table | Student list with search/filter/sort/pagination; pairs with shadcn `<Table>` components |
| **sonner** | 2.0.x | Toast notifications | Success/error feedback for uploads, saves, exports; shadcn recommends sonner over deprecated `<Toast>` |
| **lucide-react** | 1.17.x | Icon library | Default icon set for shadcn/ui components |
| **@hookform/resolvers** | latest | React Hook Form + Zod bridge | Required to connect Zod schemas to react-hook-form `validate` |

---

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **pnpm** | 9.x | Package manager | Faster, disk-efficient vs npm; use `pnpm create next-app` |
| **ESLint** | 9.x | Linting | Bundled with Next.js 16; flat config format |
| **Prettier** | 3.x | Code formatting | Standard setup |
| **Prisma Studio** | (via prisma 7) | Database GUI | New Studio in Prisma 7 supports PostgreSQL; run `prisma studio` for local data inspection |
| **Docker** | 27.x | PostgreSQL local dev container | `docker compose up` for local Postgres during development; not required in production (school runs Postgres on-premise) |

---

## Installation

```bash
# 1. Scaffold the project
pnpm create next-app@latest spcs-transcripts --typescript --tailwind --app --src-dir
cd spcs-transcripts

# 2. shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input form dialog table badge card dropdown-menu sonner skeleton separator sheet

# 3. Authentication — Better Auth
pnpm add better-auth
pnpm add @better-auth/sso          # only if SAML/full OIDC discovery needed

# 4. Database — Prisma 7 + PostgreSQL
pnpm add prisma @prisma/client @prisma/adapter-pg pg
pnpm add -D prisma
pnpm dlx prisma init --datasource-provider postgresql

# 5. Form validation
pnpm add zod react-hook-form @hookform/resolvers

# 6. Data table
pnpm add @tanstack/react-table

# 7. PDF generation (transcript export)
pnpm add @react-pdf/renderer

# 8. PDF parsing (document upload extraction)
pnpm add unpdf @napi-rs/canvas

# 9. Icons and utilities
pnpm add lucide-react sonner clsx tailwind-merge

# 10. Dev tools
pnpm add -D @types/pg prettier eslint-config-prettier
```

**Next.js config for PDF uploads** (`next.config.ts`):
```typescript
const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: '50mb',  // Next.js 16 standalone proxy layer
  },
  serverActions: {
    bodySizeLimit: '35mb',           // individual action body limit
  },
};
export default nextConfig;
```

**Prisma 7 `prisma.config.ts`** (new required file):
```typescript
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env.DATABASE_URL });
    },
  },
});
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Better Auth 1.6.x | Auth.js v5 (next-auth@beta) | Auth.js v5 has been in beta since Oct 2023 and never reached stable; Better Auth team now maintains Auth.js; new projects should use Better Auth directly |
| Auth | Better Auth 1.6.x | `@chemmangat/msal-next` (thin MSAL wrapper) | Community package, ~100 GitHub stars; no session database; Better Auth is more complete for a school system needing audit-grade session management |
| Auth | Better Auth 1.6.x | Raw MSAL.js (`@azure/msal-browser`) | Not designed for App Router SSR; causes hydration mismatches; requires 50+ lines of boilerplate before a login button renders |
| Database | PostgreSQL 17 | SQL Server (MSSQL) | SQL Server requires licensing; Prisma supports it via `@prisma/adapter-mssql` + `mssql` 12.x if the school already runs SQL Server infrastructure |
| ORM | Prisma 7.8 | Drizzle ORM | Drizzle is valid but requires writing SQL-like query builder syntax; Prisma's auto-generated client is faster to iterate on for this domain size |
| PDF gen | @react-pdf/renderer | Puppeteer / Playwright | 100MB+ Chromium, 2–5s/doc, browser lifecycle management — unjustified complexity for structured transcript documents |
| PDF gen | @react-pdf/renderer | pdfmake | JSON document definition (not JSX); different mental model; weaker community; harder to design pixel-precise layouts |
| PDF parsing | unpdf | pdf-parse | `pdf-parse` wraps `pdfjs-dist` with hidden browser globals; causes `window is not defined` in Next.js standalone production; unmaintained |
| UI | shadcn/ui | MUI (Material UI) | MUI requires installing and updating a full component package; shadcn components are owned code, editable, no version lock-in |
| Styling | Tailwind CSS 4 | Tailwind CSS 3 | Tailwind 4 is the new default with `create-next-app` for Next.js 16; 5–10× faster builds via Rust engine; no `tailwind.config.ts` needed |

---

## What NOT to Use

| Library / Approach | Why Avoid |
|-------------------|-----------|
| **Vercel cloud hosting** | Project constraint: on-premise only. Deploy with `output: 'standalone'` on the school's own server (Linux VM, Windows IIS, or Docker container) |
| **Supabase / PlanetScale / Neon** | Cloud-hosted databases. Project constraint: on-premise data only. All database connections must point to school infrastructure |
| **NextAuth v4 (`next-auth@^4`)** | Last stable v4 release is 4.24.14 (no longer actively developed); the project is now Better Auth; fine for existing apps but don't start new projects on it |
| **Auth.js v5 beta** | 5.0.0-beta.31 — still beta as of June 2026; no stable release has shipped; use Better Auth instead |
| **Lucia Auth** | Deprecated on npm; project abandoned |
| **pdf-parse** | Wraps `pdfjs-dist` with hidden browser globals; breaks in Next.js standalone production builds; use `unpdf` instead |
| **jsPDF** | Imperative canvas API (`doc.text("...", x, y)`); not maintainable for a document with dynamic student data; no page-break support |
| **react-to-print** | Screenshot-based; clipped to single page; text becomes rasterized image (not searchable in PDF); not suitable for professional transcripts |
| **SaaS auth (Clerk, Auth0, WorkOS)** | Data residency constraint: student identity and session data must stay on-premise; these services process data in their cloud |
| **MongoDB** | Prisma 7 does not yet support MongoDB (delayed); also a poor fit for relational student records with structured schemas |
| **Next.js Pages Router** | Replaced by App Router; new projects should use App Router only |

---

## Stack Patterns by Variant

### PostgreSQL (recommended greenfield)

```
Next.js 16 App Router
  └── Better Auth (Microsoft Entra ID social provider)
        └── PostgreSQL 17 on-premise (Better Auth sessions + app data)
              └── Prisma 7.8 via @prisma/adapter-pg
```

### SQL Server (if school already has MSSQL infrastructure)

```
Next.js 16 App Router
  └── Better Auth (Microsoft Entra ID social provider)
        └── SQL Server on-premise (Better Auth sessions + app data)
              └── Prisma 7.8 via @prisma/adapter-mssql + mssql 12.x
```

Only change from the PostgreSQL variant: swap `@prisma/adapter-pg` + `pg` for `@prisma/adapter-mssql` + `mssql`. Better Auth and Next.js configuration are identical.

### File storage pattern

```
Client browser
  └── [form submit with PDF attachment]
        └── Next.js Server Action
              └── fs.writeFile → /var/spcs-uploads/<student-id>/<uuid>.pdf
                    └── Prisma → INSERT document record (path, filename, student_id)
```

Files are stored on the application server's local filesystem. A dedicated upload directory outside `public/` is recommended (files are served via a protected API route, not directly). For large PDFs (>10MB): consider increasing `bodySizeLimit` further or implementing chunked upload.

---

## Version Compatibility Matrix

| Package | Version | Node.js min | React min | Notes |
|---------|---------|-------------|-----------|-------|
| Next.js | 16.2.x | 20.x (rec 22 LTS) | 19.x | Dropped Node 18; proxy.ts replaces middleware.ts |
| Better Auth | 1.6.x | 18.x | any | Works with Next.js 16 proxy pattern |
| Prisma | 7.8.x | 18.18+ (rec 22) | N/A | Requires ESM (`"type": "module"`) |
| @react-pdf/renderer | 4.5.x | 16+ | 19.x | Server-side only; no browser globals |
| unpdf | 1.6.x | 22+ preferred | N/A | PDF.js v5 uses `Promise.withResolvers` (Node 22 native) |
| Tailwind CSS | 4.3.x | N/A | N/A | Safari 16.4+, Chrome 111+, Firefox 128+ minimum |
| Zod | 4.4.x | 18+ | any | Breaking changes from v3: `z.string().email()` etc. still work |
| React Hook Form | 7.78.x | N/A | 18+ | Works with React 19 |
| @tanstack/react-table | 8.21.x | N/A | 18+ | Works with React 19 |

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| npm registry (direct version queries) | HIGH | Queried 2026-06-11 |
| Next.js 16 official blog (nextjs.org/blog/next-16) | HIGH | Primary source |
| Next.js 16.2 changelog (nandann.com, makerkit.dev) | HIGH | Cross-verified |
| Better Auth docs (better-auth.com/docs) | HIGH | Primary source |
| Auth.js migration notice (github.com/nextauthjs/next-auth/discussions/13252) | HIGH | Official announcement |
| Prisma 7.0.0 release (prisma.io/docs, gitclear.com) | HIGH | Primary source |
| PkgPulse: unpdf vs pdf-parse vs pdfjs-dist 2026 (pkgpulse.com) | MEDIUM | Community analysis, cross-checked with npm |
| Puppeteer vs @react-pdf/renderer (iurii.rogulia.fi, dev.to) | MEDIUM | Production comparison articles |
| shadcn/ui Tailwind v4 docs (ui.shadcn.com/docs/tailwind-v4) | HIGH | Primary source |
| Auth.js Microsoft Entra ID docs (authjs.dev) | HIGH | Primary source (still valid for Better Auth migration) |
| Next.js file upload patterns (oneuptime.com/blog, cadence.withremote.ai) | MEDIUM | Community articles, patterns verified against Next.js docs |
