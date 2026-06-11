---
phase: 01-infrastructure-auth
plan: 04
slug: wire
subsystem: client
tags: [msal, api-client, auth, role-gating, walking-skeleton]
requires: [01-client-scaffold-SUMMARY.md, 01-auth-SUMMARY.md]
provides: [apiFetch, apiGet, UserInfo, role-gated-homepage]
affects: [client/src/api, client/src/App.tsx, client/src/pages/HomePage.tsx]
tech_stack:
  added: [shadcn/skeleton]
  patterns: [acquireTokenSilent, InteractionRequiredAuthError, apiGet-typed-helper]
key_files:
  created:
    - client/src/api/apiClient.ts
    - client/src/components/ui/skeleton.tsx
  modified:
    - client/src/App.tsx
    - client/src/pages/HomePage.tsx
decisions:
  - "API_SCOPE derived from VITE_CLIENT_ID env var (not hardcoded) — matches Entra ID app registration 'Expose an API' scope exactly; prevents Pitfall 2 (wrong audience)"
  - "UserInfo type exported from App.tsx so HomePage imports it without circular dependency issues"
  - "Session-expired alert shown for 3 seconds then loginRedirect called — gives user visual feedback before redirect"
  - "Loading skeleton shown in both header dropdown and main heading while userInfo is null"
metrics:
  duration_minutes: 8
  completed: "2026-06-11"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 2
---

# Phase 01 Plan 04: Wire Summary

**One-liner:** MSAL acquireTokenSilent + Express /api/auth/me wired end-to-end; role-gated HomePage with loading skeleton and session-expired redirect completes the walking skeleton.

## What Was Built

### client/src/api/apiClient.ts (new)
Authenticated API fetch wrapper:
- `apiFetch(path, options?)` — acquires Bearer token via `acquireTokenSilent` with `api://${VITE_CLIENT_ID}/access_as_user` scope; falls back to `acquireTokenRedirect` on `InteractionRequiredAuthError`
- `apiGet<T>(path)` — typed GET helper; checks `res.ok` and returns parsed JSON
- `API_SCOPE` constant prevents Pitfall 2 (Graph scope tokens rejected by Express `aud` validation)

### client/src/App.tsx (updated)
- Imports `useIsAuthenticated` + `useMsal` for auth state
- `useEffect` on `isAuthenticated` calls `apiGet<UserInfo>('/auth/me')` and stores result
- `authError === 'session-expired'` branch shows destructive Alert then redirects via `loginRedirect` after 3 s
- Passes `userInfo` prop to `<HomePage>`

### client/src/pages/HomePage.tsx (updated)
- Prop type changed to `{ userInfo: UserInfo | null }` using `UserInfo` from `@/App`
- Loading skeleton (shadcn `<Skeleton>`) shown in heading and avatar dropdown while `userInfo === null`
- `Welcome, {userInfo.displayName}` heading and `<Badge variant={role === 'ADMIN' ? 'default' : 'secondary'}>` rendered from live API data
- Settings nav link gated on `userInfo?.role === 'ADMIN'`

### client/src/components/ui/skeleton.tsx (new)
Installed from shadcn registry via `npx shadcn@latest add skeleton`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `userInfo` is wired from the live API response; no placeholder data.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes beyond what the plan's threat model covers.

## Self-Check: PASSED

- [x] `client/src/api/apiClient.ts` — exists and exports `apiFetch`, `apiGet`
- [x] `client/src/components/ui/skeleton.tsx` — exists (installed from shadcn registry)
- [x] `client/src/App.tsx` — contains `apiGet<UserInfo>('/auth/me')` and `session-expired` handling
- [x] `client/src/pages/HomePage.tsx` — contains `userInfo.role === 'ADMIN'` guard and loading skeleton
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0
- [x] Commit d602c0d verified in git log
- [x] `access_as_user` scope present in apiClient.ts
- [x] No `User.Read` or `graph.microsoft.com` in apiClient.ts scopes
