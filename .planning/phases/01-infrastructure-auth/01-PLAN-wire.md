---
phase: 01-infrastructure-auth
plan: 04
slug: wire
type: execute
wave: 3
depends_on: [01-client-scaffold, 01-auth]
files_modified:
  - client/src/api/apiClient.ts
  - client/src/App.tsx
  - client/src/pages/HomePage.tsx
autonomous: true
requirements: [AUTH-01, AUTH-02]

must_haves:
  truths:
    - "apiFetch('/auth/me', {}) sends a Bearer token obtained via acquireTokenSilent with the API scope (not Graph scope)"
    - "After MSAL login completes, App.tsx calls GET /api/auth/me and stores { id, email, displayName, role } in React state"
    - "HomePage renders 'Welcome, {displayName}' using the actual display name from the API response"
    - "HomePage shows 'Admin' badge (variant=default) for ADMIN role users and 'Staff' badge (variant=secondary) for STAFF role users"
    - "Settings nav link is visible only when role === 'ADMIN'"
    - "On 401 response from API, user sees 'Session expired' alert and is redirected to login"
    - "On acquireTokenSilent InteractionRequiredAuthError, apiFetch calls acquireTokenRedirect to re-trigger login"
  artifacts:
    - path: "client/src/api/apiClient.ts"
      provides: "Authenticated API fetch wrapper"
      exports: ["apiFetch"]
    - path: "client/src/App.tsx"
      provides: "Root component with /api/auth/me call and user state"
      min_lines: 50
  key_links:
    - from: "client/src/api/apiClient.ts"
      to: "client/src/auth/msalConfig.ts"
      via: "msalInstance.acquireTokenSilent({ scopes: [API_SCOPE], account })"
      pattern: "acquireTokenSilent"
    - from: "client/src/App.tsx"
      to: "client/src/api/apiClient.ts"
      via: "apiGet('/auth/me') in useEffect"
      pattern: "apiGet.*auth/me"
---

## Phase Goal

**As a** careers staff member, **I want to** sign in with my school Microsoft account and reach the SPCS Student Transcript System, **so that** I can manage student records with my role-based permissions enforced and every data operation logged.

<objective>
Wire the React frontend to the Express backend: implement the authenticated API client, connect the home page to GET /api/auth/me, and render role-gated navigation using the real API response. After this plan, the full Walking Skeleton end-to-end flow is complete in development.

Purpose: This is the final assembly step — user clicks "Sign in with Microsoft", MSAL completes the PKCE flow, App.tsx calls /api/auth/me with a Bearer token, and the home page renders the user's actual name and role. The Walking Skeleton capability is proven.

Output: apiFetch wrapper using acquireTokenSilent; App.tsx with /api/auth/me integration; HomePage showing live user identity and role-gated navigation.
</objective>

<execution_context>
@C:/@code/spcs-transcripts/.cursor/gsd-core/workflows/execute-plan.md
@C:/@code/spcs-transcripts/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
@.planning/phases/01-infrastructure-auth/01-UI-SPEC.md
@.planning/phases/01-infrastructure-auth/01-SKELETON.md
@.planning/phases/01-infrastructure-auth/01-client-scaffold-SUMMARY.md
@.planning/phases/01-infrastructure-auth/01-auth-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement apiFetch client and wire HomePage to GET /api/auth/me</name>
  <read_first>
    - client/src/auth/msalConfig.ts — read msalInstance export and loginRequest.scopes (the API scope needed for acquireTokenSilent)
    - client/src/pages/HomePage.tsx — read the current component (needs userInfo prop or local state update)
    - client/src/App.tsx — read the current routing structure (needs /api/auth/me call added after MSAL auth completes)
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md — read: Pattern 2 (Token Acquisition and API Call — acquireTokenSilent, InteractionRequiredAuthError fallback, exact API_SCOPE format), Anti-Patterns (mixing Graph scopes with API scopes causes Pitfall 2), Pitfall 2 (wrong audience — token for Graph rejected by Express)
    - .planning/phases/01-infrastructure-auth/01-UI-SPEC.md — read: Screen 2 (HomePage states — loading skeleton vs loaded; exact copy strings for welcome heading, role badge variants, sign out label)
  </read_first>
  <files>
    client/src/api/apiClient.ts,
    client/src/App.tsx,
    client/src/pages/HomePage.tsx
  </files>
  <action>
    1. **client/src/api/apiClient.ts** — implement `apiFetch` exactly as Pattern 2 in RESEARCH.md. Import `msalInstance` and `loginRequest` from `../auth/msalConfig`. Import `InteractionRequiredAuthError` from `@azure/msal-browser`. The `API_SCOPE` constant must be `\`api://${import.meta.env.VITE_CLIENT_ID}/access_as_user\`` — this MUST match the scope registered in the Entra ID app registration under "Expose an API". Logic: get `account = msalInstance.getActiveAccount()`; if no account, throw `new Error('No active account — user must sign in first')`. Try `acquireTokenSilent({ scopes: [API_SCOPE], account })`; on `InteractionRequiredAuthError`, call `msalInstance.acquireTokenRedirect({ scopes: [API_SCOPE] })` and return (page will reload after redirect). On other errors, rethrow. Construct fetch to `/api${path}` with `Authorization: Bearer ${tokenResponse.accessToken}` merged into headers. Return the `Response` object for the caller to parse. Export `apiFetch` as a named export.

       Also export a typed helper `apiGet<T>(path: string): Promise<T>` that calls `apiFetch(path)`, checks `res.ok`, and returns `res.json() as Promise<T>`. This simplifies call sites in components.

    2. **client/src/App.tsx** — add user state management. Import `useState` and `useEffect` from React. Import `useIsAuthenticated` and `useMsal` from `@azure/msal-react`. Import `apiGet` from `./api/apiClient`. Define type `UserInfo = { id: string; email: string; displayName: string; role: 'ADMIN' | 'STAFF' }`. Add state: `const [userInfo, setUserInfo] = useState<UserInfo | null>(null)`. Add state: `const [authError, setAuthError] = useState<string | null>(null)`. In a `useEffect` that runs when `isAuthenticated` becomes true: call `apiGet<UserInfo>('/auth/me')` and `setUserInfo(result)`. On 401 or network error, `setAuthError('session-expired')`. Pass `userInfo` as prop to `HomePage`. If `authError === 'session-expired'`, show the UI-SPEC "Session expired" Alert before redirect. Keep the existing route structure from Plan 02 — only add the data-fetching logic.

    3. **client/src/pages/HomePage.tsx** — update to consume the `userInfo` prop. Change prop type to `{ userInfo: UserInfo | null }`. When `userInfo === null`, show loading skeleton (shadcn `<Skeleton>` component — if not yet installed, run `npx shadcn@latest add skeleton` from `client/`). When loaded: render "Welcome, {userInfo.displayName}" using exact copy from UI-SPEC. Render role badge: `<Badge variant={userInfo.role === 'ADMIN' ? 'default' : 'secondary'}>{userInfo.role === 'ADMIN' ? 'Admin' : 'Staff'}</Badge>` — exact copy from UI-SPEC Copywriting Contract. Settings nav item: render only when `userInfo.role === 'ADMIN'`. User dropdown: show `userInfo.displayName` and the role badge inside the dropdown content.
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit && npm run build && echo "wire build passed"</automated>
  </verify>
  <acceptance_criteria>
    - client/src/api/apiClient.ts exports `apiFetch` and `apiGet`
    - client/src/api/apiClient.ts contains `acquireTokenSilent` and `InteractionRequiredAuthError` and `acquireTokenRedirect`
    - client/src/api/apiClient.ts contains `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user` (API scope — Pitfall 2 prevention)
    - client/src/api/apiClient.ts does NOT contain `User.Read` or `graph.microsoft.com` in scopes (wrong audience — Pitfall 2)
    - client/src/App.tsx contains `apiGet<UserInfo>('/auth/me')` and `setUserInfo`
    - client/src/App.tsx contains `session-expired` handling (authError state)
    - client/src/pages/HomePage.tsx contains `userInfo.role === 'ADMIN'` guard for Settings nav
    - client/src/pages/HomePage.tsx contains `variant={userInfo.role === 'ADMIN' ? 'default' : 'secondary'}` for role badge
    - client/src/pages/HomePage.tsx contains loading skeleton (null check on userInfo before rendering)
    - `cd client && npx tsc --noEmit` exits 0
    - `cd client && npm run build` exits 0
  </acceptance_criteria>
  <done>apiFetch wrapper acquires Bearer token via MSAL before every API call. HomePage fetches /api/auth/me after MSAL login and renders live user identity with role-gated navigation. Walking Skeleton end-to-end flow is complete.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser MSAL cache → apiFetch | Token extracted from sessionStorage by MSAL; used as Bearer in API requests |
| React state → HomePage render | userInfo from API response rendered in DOM; not re-trusted for security decisions |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Tampering | Token scope (wrong audience) | mitigate | `API_SCOPE` uses `api://${VITE_CLIENT_ID}/access_as_user` — Express validates `aud` claim matches this value; Graph tokens will be rejected with 401 (Pitfall 2 prevention) |
| T-04-02 | Elevation of Privilege | Client-side role gate bypassed | accept | `userInfo.role === 'ADMIN'` in HomePage only hides nav links — this is UX, not security. Security enforcement is in `requireRole` middleware server-side. Frontend role check is defence-in-depth only. |
| T-04-03 | Spoofing | API response data not validated | accept | `/api/auth/me` response is trusted server output (not user input); `UserInfo` TypeScript type provides compile-time safety; runtime validation not required for internal API at this team size |
| T-04-04 | Information Disclosure | Token passed in Authorization header | accept | HTTPS in production (IIS terminates TLS); HTTP only on localhost where no network interception risk; Bearer token in Authorization header is standard OAuth 2.0 practice |
| T-04-SC | Tampering | npm install | mitigate | No new packages in this plan beyond what Plan 02 installed; shadcn Skeleton component added from official registry only |
</threat_model>

<verification>
After completing the task:
1. `cd client && npx tsc --noEmit` → exits 0
2. `cd client && npm run build` → exits 0
3. `cat client/src/api/apiClient.ts | grep access_as_user` → contains the API scope string
4. `cat client/src/api/apiClient.ts | grep -c "acquireTokenSilent"` → returns ≥ 1
5. Manual e2e test (requires Plans 01–03 complete + Entra ID app registration configured):
   - Run `cd server && npm run dev` + `cd client && npm run dev`
   - Navigate to http://localhost:5173
   - Click "Sign in with Microsoft" — MSAL PKCE redirect completes
   - Home page loads with user's actual display name and role badge
   - Settings nav visible for Admin, hidden for Staff
</verification>

<success_criteria>
- apiFetch always uses acquireTokenSilent with the API scope before making API calls
- InteractionRequiredAuthError triggers re-authentication via acquireTokenRedirect
- HomePage shows actual user displayName and role from /api/auth/me API response
- Role-gated nav (Settings visible only for Admin) works from live API data
- TypeScript compiles and Vite production build succeeds
</success_criteria>

## Artifacts This Plan Produces

| Artifact | Type | Path | Description |
|----------|------|------|-------------|
| `apiFetch(path, options?)` | `async function` | `client/src/api/apiClient.ts` | Acquires MSAL Bearer token (acquireTokenSilent) + calls fetch; handles InteractionRequiredAuthError |
| `apiGet<T>(path)` | `async function` | `client/src/api/apiClient.ts` | Typed GET wrapper using apiFetch; parses JSON response |
| `UserInfo` | TypeScript type | `client/src/App.tsx` | `{ id: string; email: string; displayName: string; role: 'ADMIN' \| 'STAFF' }` — shape of /api/auth/me response |

<output>
Create `.planning/phases/01-infrastructure-auth/01-wire-SUMMARY.md` when done
</output>
