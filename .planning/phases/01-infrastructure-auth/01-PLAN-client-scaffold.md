---
phase: 01-infrastructure-auth
plan: 02
slug: client-scaffold
type: execute
wave: 1
depends_on: []
files_modified:
  - client/package.json
  - client/tsconfig.json
  - client/tsconfig.node.json
  - client/vite.config.ts
  - client/index.html
  - client/components.json
  - client/.env.example
  - client/src/main.tsx
  - client/src/App.tsx
  - client/src/index.css
  - client/src/auth/msalConfig.ts
  - client/src/pages/LoginPage.tsx
  - client/src/pages/HomePage.tsx
  - client/src/pages/UnauthorizedPage.tsx
  - client/src/components/ProtectedRoute.tsx
autonomous: true
requirements: [AUTH-01, AUTH-02]

must_haves:
  truths:
    - "client/ is a Vite + React TypeScript project scaffolded via npm create vite"
    - "shadcn/ui is initialized with style: default, base color: zinc, CSS variables: yes"
    - "client/components.json exists confirming shadcn initialization"
    - "client/src/auth/msalConfig.ts exports msalInstance using VITE_CLIENT_ID and VITE_TENANT_ID env vars with cacheLocation: sessionStorage (per D-06)"
    - "client/src/main.tsx wraps <App /> in <MsalProvider instance={msalInstance}> (per Pattern 1 in RESEARCH.md)"
    - "LoginPage renders: app title, subtitle, Sign in with Microsoft button (blue, 44px min-height) per UI-SPEC Screen 1"
    - "HomePage renders: top nav bar with SPCS Transcripts, welcome heading, role badge, user dropdown with Sign out (per UI-SPEC Screen 2)"
    - "UnauthorizedPage renders: permission denied message and Go to home button (per UI-SPEC Screen 3)"
    - "ProtectedRoute redirects unauthenticated users to login using useIsAuthenticated from @azure/msal-react"
  artifacts:
    - path: "client/components.json"
      provides: "shadcn/ui configuration confirming init completed"
      contains: "\"style\": \"default\""
    - path: "client/src/auth/msalConfig.ts"
      provides: "MSAL PublicClientApplication singleton"
      exports: ["msalInstance"]
    - path: "client/src/pages/LoginPage.tsx"
      provides: "Unauthenticated landing page with MSAL sign-in trigger"
      min_lines: 40
    - path: "client/src/pages/HomePage.tsx"
      provides: "Authenticated home page with role-gated nav placeholder"
      min_lines: 50
    - path: "client/src/components/ProtectedRoute.tsx"
      provides: "Auth gate component using useIsAuthenticated"
      min_lines: 15
  key_links:
    - from: "client/src/main.tsx"
      to: "client/src/auth/msalConfig.ts"
      via: "import { msalInstance } from './auth/msalConfig'"
      pattern: "MsalProvider.*msalInstance"
    - from: "client/src/auth/msalConfig.ts"
      to: "@azure/msal-browser"
      via: "new PublicClientApplication(msalConfig)"
      pattern: "new PublicClientApplication"
    - from: "client/src/App.tsx"
      to: "client/src/components/ProtectedRoute.tsx"
      via: "wraps authenticated routes"
      pattern: "ProtectedRoute"
---

## Phase Goal

**As a** careers staff member, **I want to** sign in with my school Microsoft account and reach the SPCS Student Transcript System, **so that** I can manage student records with my role-based permissions enforced and every data operation logged.

<objective>
Scaffold the React + Vite client with shadcn/ui design system, MSAL authentication configuration, and all three Phase 1 screens (Login, Home, Unauthorized) implemented per UI-SPEC.

Purpose: After this plan, a user can navigate to http://localhost:5173, see the login page, and click "Sign in with Microsoft" to trigger the MSAL PKCE redirect. The home page will show a loading state (the /api/auth/me call will fail until Plan 03 builds the backend). The visual shell is complete.

Output: client/ Vite project; shadcn initialized with zinc/blue; MSAL config; 3 pages matching UI-SPEC; ProtectedRoute using MSAL auth state.
</objective>

<execution_context>
@C:/@code/spcs-transcripts/.cursor/gsd-core/workflows/execute-plan.md
@C:/@code/spcs-transcripts/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
@.planning/phases/01-infrastructure-auth/01-UI-SPEC.md
@.planning/phases/01-infrastructure-auth/01-SKELETON.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Vite + React project, initialize shadcn/ui, configure MSAL</name>
  <read_first>
    - .planning/phases/01-infrastructure-auth/01-UI-SPEC.md — read: Design System table (shadcn style/preset), Spacing Scale, Typography table, Color table, shadcn Initialization block (exact CLI commands and prompts), Font Application section
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 1 (MSAL React Initialization — exact msalConfig structure, cacheLocation: 'sessionStorage'), Standard Stack (MSAL package versions: @azure/msal-browser@5.13.0, @azure/msal-react@5.4.4), Anti-Patterns (MSAL init must be outside component tree), Pitfall 3 (SPA redirect URI type)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md — read: D-05 (SPA PKCE pattern), D-06 (sessionStorage), D-02 (Vite + React)
  </read_first>
  <files>
    client/package.json,
    client/tsconfig.json,
    client/tsconfig.node.json,
    client/vite.config.ts,
    client/index.html,
    client/components.json,
    client/.env.example,
    client/src/main.tsx,
    client/src/index.css,
    client/src/auth/msalConfig.ts
  </files>
  <action>
    1. **Scaffold Vite project** — run from the workspace root (parent of `server/`): `npm create vite@latest client -- --template react-ts`. Then `cd client && npm install`.

    2. **Install MSAL and shadcn dependencies** — from `client/`:
       - `npm install @azure/msal-browser@5.13.0 @azure/msal-react@5.4.4 react-router-dom`
       - `npm install @fontsource-variable/inter`
       - Run shadcn init: `npx shadcn@latest init` and answer prompts: Style → **Default**, Base color → **Zinc**, CSS variables → **Yes**
       - Install shadcn components: `npx shadcn@latest add button card badge separator avatar dropdown-menu alert`
       - Verify `client/components.json` exists after init

    3. **client/vite.config.ts** — configure the `server.proxy` to forward `/api` requests to `http://localhost:3001` during development (so the frontend dev server proxies API calls to Express without CORS issues): `proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }`. Keep the existing `@vitejs/plugin-react` plugin.

    4. **client/.env.example** — add: `VITE_CLIENT_ID=your-azure-client-id`, `VITE_TENANT_ID=your-azure-tenant-id`. Note: Vite exposes only `VITE_` prefixed vars to the browser bundle. Also create `client/.gitignore` containing `.env`, `.env.local`, `dist/`, `node_modules/`.

    5. **client/src/auth/msalConfig.ts** — implement exactly as Pattern 1 in RESEARCH.md. Import `PublicClientApplication` and `Configuration` from `@azure/msal-browser`. The `msalConfig` object must have: `auth.clientId: import.meta.env.VITE_CLIENT_ID`, `auth.authority: \`https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}\``, `auth.redirectUri: window.location.origin`. The `cache` block must have: `cacheLocation: 'sessionStorage'` (per D-06 — lower XSS exposure than localStorage), `storeAuthStateInCookie: false`. Export `msalInstance` as a named export: `export const msalInstance = new PublicClientApplication(msalConfig)`. Also export `loginRequest` object with `scopes: [\`api://${import.meta.env.VITE_CLIENT_ID}/access_as_user\`]` for use by apiClient in Plan 04. DO NOT instantiate `PublicClientApplication` inside any React component — per RESEARCH.md anti-pattern (causes redirect loop bugs).

    6. **client/src/main.tsx** — import `@fontsource-variable/inter` at the top (font loading). Import `MsalProvider` from `@azure/msal-react` and `msalInstance` from `./auth/msalConfig`. Wrap `<App />` inside `<MsalProvider instance={msalInstance}>`. Import `BrowserRouter` from `react-router-dom` and wrap the whole tree.

    7. **client/src/index.css** — after the shadcn-generated CSS variable blocks, add inside `@layer base`: `:root { --font-sans: 'Inter Variable', system-ui, sans-serif; }` and `body { font-family: var(--font-sans); }`. This applies Inter as the global font per UI-SPEC Font Application section.
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit && test -f components.json && echo "client scaffold valid"</automated>
  </verify>
  <acceptance_criteria>
    - client/package.json contains `"@azure/msal-browser":` and `"@azure/msal-react":` and `"react-router-dom":`
    - client/components.json exists and contains `"style": "default"` and `"baseColor": "zinc"`
    - client/.env.example contains `VITE_CLIENT_ID=` and `VITE_TENANT_ID=`
    - client/.gitignore contains `.env`
    - client/src/auth/msalConfig.ts contains `cacheLocation: 'sessionStorage'` and `new PublicClientApplication` and `export const msalInstance`
    - client/src/auth/msalConfig.ts contains `access_as_user` in the loginRequest scopes (ensures API scope not Graph scope — Pitfall 2)
    - client/src/main.tsx contains `MsalProvider` wrapping `App`
    - client/src/main.tsx contains `import '@fontsource-variable/inter'`
    - client/src/index.css contains `--font-sans` and `Inter Variable`
    - client/vite.config.ts contains `proxy:` configuration targeting `http://localhost:3001`
    - `cd client && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Vite + React project scaffolded; shadcn initialized with zinc base + blue accent; MSAL PublicClientApplication created outside component tree with sessionStorage cache; Inter font applied; dev proxy configured.</done>
</task>

<task type="auto">
  <name>Task 2: Build Login, Home, and Unauthorized pages per UI-SPEC</name>
  <read_first>
    - .planning/phases/01-infrastructure-auth/01-UI-SPEC.md — read: Screen Inventory (all 3 screens — layout diagrams, states, button specs), Copywriting Contract (exact string values for every label), Component Inventory, Accessibility Baseline (touch target 44px, focus ring, aria-hidden on MS icon), Color table (CSS variable names for button, badge)
    - client/src/auth/msalConfig.ts — read the exported `msalInstance` and `loginRequest` (needed for loginRedirect call in LoginPage)
    - client/src/index.css — read the CSS variable names generated by shadcn init (needed to verify color references are correct)
  </read_first>
  <files>
    client/src/App.tsx,
    client/src/components/ProtectedRoute.tsx,
    client/src/pages/LoginPage.tsx,
    client/src/pages/HomePage.tsx,
    client/src/pages/UnauthorizedPage.tsx
  </files>
  <action>
    1. **client/src/components/ProtectedRoute.tsx** — import `useIsAuthenticated` from `@azure/msal-react` and `Navigate` from `react-router-dom`. Export `ProtectedRoute({ children }: { children: React.ReactNode })`. If `!useIsAuthenticated()`, render `<Navigate to="/" replace />`. Otherwise render `children`. This component uses only MSAL auth state — the /api/auth/me call for role data is added in Plan 04 (Wire).

    2. **client/src/App.tsx** — import `Routes` and `Route` from `react-router-dom`. Import `AuthenticatedTemplate` and `UnauthenticatedTemplate` from `@azure/msal-react`. Import all three page components. Route structure: `/` renders `LoginPage` for unauthenticated users (use `UnauthenticatedTemplate` + `AuthenticatedTemplate` pattern, or use `ProtectedRoute`), `/home` renders `HomePage` wrapped in `ProtectedRoute`, `/unauthorized` renders `UnauthorizedPage`. After successful MSAL redirect, redirect authenticated users from `/` to `/home` using `AuthenticatedTemplate` rendering `<Navigate to="/home" />`.

    3. **client/src/pages/LoginPage.tsx** — implement per UI-SPEC Screen 1. Layout: full-height centered flex column (`min-h-screen flex flex-col items-center justify-center bg-background`). Top: school logo placeholder (a `<div>` with text "SPCS" or an `<img>` with alt="School Logo"). Below: shadcn `<Card>` with `max-w-sm w-full`. Inside card: `<CardHeader>` with app title "SPCS Student Transcript System" (`text-2xl font-semibold`) and subtitle "Sign in with your school Microsoft account to continue." (`text-sm text-muted-foreground`). `<CardContent>`: shadcn `<Button>` with exact copy "Sign in with Microsoft", full width (`w-full`), minimum height 44px (`min-h-[44px]`), background `bg-primary text-primary-foreground`. Button contains inline Microsoft SVG logo (4-path Windows logo SVG) with `aria-hidden="true"` and the button text. Use `useMsal()` hook to get `instance`. On click: set loading state, call `instance.loginRedirect(loginRequest)` (import `loginRequest` from `../auth/msalConfig`). Disabled state while loading; button text changes to "Signing in…" while loading. Error state: if MSAL throws, render shadcn `<Alert variant="destructive">` below the card with heading "Sign-in failed" and body "Sign-in failed. Please try again." (exact copy from UI-SPEC Copywriting Contract).

    4. **client/src/pages/HomePage.tsx** — implement per UI-SPEC Screen 2. Layout: full viewport with sticky top nav and content area. Top nav (`sticky top-0 z-10 border-b bg-background/95`): left side has "SPCS Transcripts" heading; right side has user avatar dropdown. Use shadcn `<DropdownMenu>` with `<DropdownMenuTrigger>` wrapping shadcn `<Avatar>` (show initials from display name). `<DropdownMenuContent>` contains: display name (non-clickable), `<DropdownMenuSeparator>`, role `<Badge>` (variant="default" for Admin, variant="secondary" for Staff), `<DropdownMenuSeparator>`, "Sign out" `<DropdownMenuItem>` that calls `instance.logoutRedirect()`. Content area: welcome heading "Welcome, {displayName}" (`text-2xl font-semibold`) with role badge inline. Add nav items in the top bar: "Students" link (visible to both roles, `href="/students"`, disabled/grayed as placeholder for Phase 2), "Settings" link (visible only when role === 'ADMIN', placeholder for Phase 5). For Phase 1, `displayName` and `role` come from props or a local state set to `{ displayName: 'Loading…', role: null }` — Plan 04 will wire in the actual /api/auth/me data. Accept optional props `userInfo?: { displayName: string; role: string }`.

    5. **client/src/pages/UnauthorizedPage.tsx** — implement per UI-SPEC Screen 3. Centered layout: `min-h-screen flex flex-col items-center justify-center`. Heading: "You don't have permission to access this page." (`text-xl font-semibold`). Below: shadcn `<Button variant="outline">` with text "← Go to home" that uses `<Link to="/">` from react-router-dom.
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit && echo "client pages type-check passed"</automated>
  </verify>
  <acceptance_criteria>
    - client/src/components/ProtectedRoute.tsx contains `useIsAuthenticated` and `Navigate to="/"` redirect
    - client/src/pages/LoginPage.tsx contains `loginRedirect` and `min-h-[44px]` and `aria-hidden="true"` on MS icon
    - client/src/pages/LoginPage.tsx contains exact copy strings: `"SPCS Student Transcript System"`, `"Sign in with Microsoft"`, `"Signing in…"`, `"Sign-in failed"`
    - client/src/pages/LoginPage.tsx contains `<Alert variant="destructive">` for error state
    - client/src/pages/HomePage.tsx contains `logoutRedirect` and `"Sign out"` and `"SPCS Transcripts"`
    - client/src/pages/HomePage.tsx contains `role === 'ADMIN'` guard for Settings nav item
    - client/src/pages/HomePage.tsx contains `variant="default"` for Admin badge and `variant="secondary"` for Staff badge (per UI-SPEC Copywriting Contract)
    - client/src/pages/UnauthorizedPage.tsx contains `"You don't have permission"` and `"Go to home"`
    - client/src/App.tsx contains routes for `/`, `/home`, `/unauthorized`
    - `cd client && npx tsc --noEmit` exits 0
    - `cd client && npm run build` exits 0 (Vite production build succeeds)
  </acceptance_criteria>
  <done>All three Phase 1 screens implemented per UI-SPEC. User can navigate to localhost:5173, see the login page, and click "Sign in with Microsoft" to trigger MSAL redirect. Home page shows loading state until Plan 04 wires the /api/auth/me call.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Entra ID | PKCE redirect; authorization code returned to redirectUri |
| Browser → sessionStorage | MSAL token cache; tab-scoped |
| npm registry → client/ | shadcn, MSAL packages installed from registry |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Spoofing | Token storage (sessionStorage) | mitigate | sessionStorage is tab-scoped and cleared on tab close; lower XSS exposure than localStorage; per D-06 locked decision |
| T-02-02 | Spoofing | MSAL redirectUri | mitigate | `auth.redirectUri: window.location.origin` — dynamically matches current origin; Entra ID app registration must list exact origin as SPA redirect URI (Pitfall 3 — must be type "SPA" not "Web") |
| T-02-03 | Tampering | Token scope (wrong audience) | mitigate | `loginRequest.scopes` uses `api://${VITE_CLIENT_ID}/access_as_user` (API scope, not Graph scope) — Pitfall 2 prevention; Express validates aud claim against this value |
| T-02-04 | Elevation of Privilege | Client-side role check | accept | `role === 'ADMIN'` in HomePage only hides nav links; it is NOT a security gate — role enforcement happens in Express `requireRole` middleware (server-side). Client-side check is UX only. |
| T-02-SC | Tampering | npm install (client) | mitigate | All packages pre-audited in RESEARCH.md Package Legitimacy Audit; @azure/msal-browser and @azure/msal-react confirmed as official Microsoft packages; no [SLOP] verdicts |
</threat_model>

<verification>
After completing both tasks:
1. `cd client && npx tsc --noEmit` → exits 0
2. `cd client && npm run build` → exits 0 (Vite build succeeds)
3. `cat client/components.json | grep -c '"style"'` → returns 1
4. `cat client/src/auth/msalConfig.ts | grep cacheLocation` → contains `'sessionStorage'`
5. `cat client/src/pages/LoginPage.tsx | grep min-h` → contains `min-h-[44px]`
6. Manual: `cd client && npm run dev` → visit localhost:5173, verify login page renders with "Sign in with Microsoft" button
</verification>

<success_criteria>
- client/ is a valid Vite + React TypeScript project with all dependencies installed
- shadcn initialized with zinc base, blue accent, CSS variables
- MSAL config uses sessionStorage, API scope, window.location.origin redirect
- All 3 pages match UI-SPEC layout, typography, copy, and color tokens
- Client TypeScript compiles and production build succeeds
</success_criteria>

## Artifacts This Plan Produces

| Artifact | Type | Path | Description |
|----------|------|------|-------------|
| `msalInstance` | `PublicClientApplication` | `client/src/auth/msalConfig.ts` | Singleton MSAL client; initialized outside component tree to prevent redirect loops |
| `loginRequest` | `{ scopes: string[] }` | `client/src/auth/msalConfig.ts` | Token request config with API scope `api://${VITE_CLIENT_ID}/access_as_user`; used by apiClient in Plan 04 |
| `ProtectedRoute` | React component | `client/src/components/ProtectedRoute.tsx` | Redirects unauthenticated users to `/`; wraps authenticated routes |
| `LoginPage` | React component | `client/src/pages/LoginPage.tsx` | Login page with MSAL redirect trigger, loading state, error Alert |
| `HomePage` | React component | `client/src/pages/HomePage.tsx` | Authenticated home with top nav, role badge, user dropdown, role-gated nav; accepts optional `userInfo` prop |
| `UnauthorizedPage` | React component | `client/src/pages/UnauthorizedPage.tsx` | 403 page with "Go to home" button |
| `VITE_CLIENT_ID` | env var | `client/.env.example` | Azure AD application client ID (browser-exposed via Vite) |
| `VITE_TENANT_ID` | env var | `client/.env.example` | Azure AD tenant ID (browser-exposed via Vite) |

<output>
Create `.planning/phases/01-infrastructure-auth/01-client-scaffold-SUMMARY.md` when done
</output>
