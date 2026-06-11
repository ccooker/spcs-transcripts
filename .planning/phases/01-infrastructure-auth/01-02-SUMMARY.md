---
phase: 01-infrastructure-auth
plan: 02
slug: client-scaffold
subsystem: client
tags: [vite, react, msal, shadcn, tailwindcss, typescript]
dependency_graph:
  requires: [01-01]
  provides: [client-scaffold, msal-config, login-page, home-page, unauthorized-page, protected-route]
  affects: [01-03, 01-04]
tech_stack:
  added:
    - Vite 8 + React 18 TypeScript (client/)
    - "@azure/msal-browser@5.13.0 + @azure/msal-react@5.4.4"
    - "Tailwind CSS v3 + shadcn/ui components (manual setup with zinc base)"
    - react-router-dom v7
    - "@fontsource-variable/inter"
    - "class-variance-authority, clsx, tailwind-merge, lucide-react"
    - "Radix UI primitives: slot, dropdown-menu, avatar, separator"
  patterns:
    - "MSAL PublicClientApplication instantiated outside component tree (RESEARCH.md anti-pattern)"
    - "sessionStorage cache for MSAL tokens (D-06 decision)"
    - "BrowserRouter + MsalProvider wrapping App in main.tsx"
    - "AuthenticatedTemplate/UnauthenticatedTemplate for route-level auth branching"
key_files:
  created:
    - client/package.json
    - client/tsconfig.json
    - client/vite.config.ts
    - client/index.html
    - client/tailwind.config.js
    - client/postcss.config.js
    - client/components.json
    - client/.env.example
    - client/src/vite-env.d.ts
    - client/src/index.css
    - client/src/main.tsx
    - client/src/auth/msalConfig.ts
    - client/src/lib/utils.ts
    - client/src/components/ui/button.tsx
    - client/src/components/ui/card.tsx
    - client/src/components/ui/badge.tsx
    - client/src/components/ui/alert.tsx
    - client/src/components/ui/avatar.tsx
    - client/src/components/ui/dropdown-menu.tsx
    - client/src/components/ui/separator.tsx
    - client/src/App.tsx
    - client/src/components/ProtectedRoute.tsx
    - client/src/pages/LoginPage.tsx
    - client/src/pages/HomePage.tsx
    - client/src/pages/UnauthorizedPage.tsx
  modified: []
decisions:
  - "shadcn v4 CLI interactive prompts required manual setup — components.json, tailwind.config.js, and CSS variables created directly to match plan spec (style: default, baseColor: zinc)"
  - "MSAL v5.13.0 removed storeAuthStateInCookie from CacheOptions — omitted per type definition"
  - "TypeScript 6.x deprecates baseUrl — ignoreDeprecations: 6.0 added to tsconfig"
  - "fontsource-variable/inter has no TypeScript declarations — module declaration added in vite-env.d.ts"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 25
  files_modified: 0
---

# Phase 01 Plan 02: Client Scaffold Summary

**One-liner:** Vite 8 + React + MSAL PKCE client with shadcn/ui zinc theme, Inter font, and all 3 Phase 1 UI-SPEC screens.

## What Was Built

A complete React SPA client at `client/` implementing the authentication shell for SPCS Student Transcript System. The user can navigate to `http://localhost:5173`, see the login page, and click "Sign in with Microsoft" to trigger the MSAL PKCE redirect flow. The authenticated home page renders with role-gated navigation (ADMIN sees Settings, both roles see Students). An unauthorized page handles role enforcement failures.

### Task 1: Scaffold + MSAL Config

- Scaffolded Vite 8 React TypeScript project via `npx create-vite@latest client --template react-ts`
- Installed MSAL packages: `@azure/msal-browser@5.13.0`, `@azure/msal-react@5.4.4`
- Configured Tailwind CSS v3 with shadcn zinc/default theme using manual setup (see Deviations)
- Created `components.json` confirming shadcn init with `style: "default"`, `baseColor: "zinc"`, `cssVariables: true`
- Implemented `client/src/auth/msalConfig.ts` — MSAL singleton outside component tree, sessionStorage cache (D-06), `access_as_user` API scope
- Configured `vite.config.ts` with `/api` proxy to `http://localhost:3001`
- Applied Inter Variable font via `@fontsource-variable/inter`
- Created 7 shadcn UI components: Button, Card, Badge, Alert, Avatar, DropdownMenu, Separator

### Task 2: Login, Home, and Unauthorized Pages

- **LoginPage** (Screen 1): Full-height centered layout, shadcn Card, Microsoft 4-color SVG logo with `aria-hidden="true"`, "Sign in with Microsoft" button at `min-h-[44px]`, loading state ("Signing in…"), error Alert with `variant="destructive"`
- **HomePage** (Screen 2): Sticky nav with "SPCS Transcripts", role-gated Students/Settings nav links, Avatar dropdown with display name + role Badge + "Sign out" calling `logoutRedirect()`
- **UnauthorizedPage** (Screen 3): "You don't have permission to access this page." with "← Go to home" outline Button
- **ProtectedRoute**: `useIsAuthenticated()` gate redirecting unauthenticated users to `/`
- **App.tsx**: React Router v7 routes for `/`, `/home`, `/unauthorized` using MSAL `AuthenticatedTemplate`/`UnauthenticatedTemplate`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✓ Exit 0 |
| `npm run build` | ✓ Exit 0 (1986 modules, 582kB JS) |
| `components.json` has `"style": "default"` | ✓ |
| `components.json` has `"baseColor": "zinc"` | ✓ |
| `msalConfig.ts` has `cacheLocation: 'sessionStorage'` | ✓ |
| `msalConfig.ts` has `access_as_user` scope | ✓ |
| LoginPage has `min-h-[44px]` and `aria-hidden` | ✓ |
| All UI-SPEC copy strings present | ✓ |
| HomePage has `role === 'ADMIN'` guard | ✓ |
| `variant="default"` Admin / `variant="secondary"` Staff | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn v4 CLI interactive prompts prevented automation**
- **Found during:** Task 1 (shadcn init)
- **Issue:** `npx shadcn@latest init` in v4 uses preset/template selection prompts that don't respond to `--yes` flag; the `--template vite` option still prompts for a preset (Nova/Vega/etc.)
- **Fix:** Manual setup — installed tailwindcss v3, created `components.json` with exact v3-format fields (`style: "default"`, `baseColor: "zinc"`, `cssVariables: true`), created `tailwind.config.js` and `postcss.config.js` directly. shadcn UI components implemented from shadcn v3 source patterns.
- **Files modified:** `components.json`, `tailwind.config.js`, `postcss.config.js`, all `src/components/ui/*.tsx`
- **Impact:** Functionally equivalent result; plan acceptance criteria satisfied

**2. [Rule 1 - Bug] MSAL v5.13.0 removed `storeAuthStateInCookie` from `CacheOptions`**
- **Found during:** Task 1 (TypeScript type check)
- **Issue:** `storeAuthStateInCookie` is not in `CacheOptions` in MSAL v5; TypeScript error TS2353
- **Fix:** Removed the property — MSAL v5 manages auth state storage internally; sessionStorage cache still applies via `cacheLocation: 'sessionStorage'`
- **Files modified:** `client/src/auth/msalConfig.ts`

**3. [Rule 3 - Blocking] TypeScript 6.x `baseUrl` deprecation**
- **Found during:** Task 1 (TypeScript type check)
- **Issue:** TS5101 error — `baseUrl` deprecated in TypeScript 7.0, breaking type check
- **Fix:** Added `"ignoreDeprecations": "6.0"` to tsconfig.json
- **Files modified:** `client/tsconfig.json`

**4. [Rule 3 - Blocking] `@fontsource-variable/inter` has no TypeScript declarations**
- **Found during:** Task 1 (TypeScript type check)
- **Issue:** TS2882 error on side-effect import
- **Fix:** Created `client/src/vite-env.d.ts` with `declare module '@fontsource-variable/inter'`
- **Files modified:** `client/src/vite-env.d.ts`

**5. [Rule 3 - Blocking] First `npm create vite` used wrong template**
- **Found during:** Task 1 (scaffold verification)
- **Issue:** `npm create vite@latest client -- --template react-ts` created a vanilla TypeScript project (not React) — the `--` separator caused `react-ts` to be passed as a positional argument, not `--template`
- **Fix:** Used `npx create-vite@latest client --template react-ts` which correctly applied the React TypeScript template
- **Files modified:** Entire `client/` directory re-scaffolded

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `client/src/pages/HomePage.tsx` | `userInfo` prop defaults to `displayName: 'Loading…', role: null` | `/api/auth/me` call wired in Plan 04 |

These stubs are intentional per the plan objective: "the /api/auth/me call will fail until Plan 03 builds the backend. The visual shell is complete."

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced beyond those in the threat model (T-02-01 through T-02-SC all addressed by implementation).

## Self-Check: PASSED

- `client/components.json` — FOUND ✓
- `client/src/auth/msalConfig.ts` — FOUND ✓
- `client/src/pages/LoginPage.tsx` — FOUND ✓
- `client/src/pages/HomePage.tsx` — FOUND ✓
- `client/src/pages/UnauthorizedPage.tsx` — FOUND ✓
- `client/src/components/ProtectedRoute.tsx` — FOUND ✓
- Commit `da4c788` (Task 1) — FOUND ✓
- Commit `9f84d26` (Task 2) — FOUND ✓
