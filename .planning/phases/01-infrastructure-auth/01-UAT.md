---
status: partial
phase: 01-infrastructure-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md]
started: 2026-06-12T10:00:00.000Z
updated: 2026-06-12T10:40:00.000Z
---

## Current Test

[testing paused — 1 item outstanding]

## Tests

### 1. Login Page
expected: Full-height centered login card with Microsoft logo and "Sign in with Microsoft" button; unauthenticated users cannot see home content
result: pass

### 2. Microsoft Sign-In Flow
expected: Clicking "Sign in with Microsoft" opens the Microsoft login redirect; after authenticating with a school account, you land on /home without errors
result: pass

### 3. Home Page Identity
expected: Home page shows "Welcome, {displayName}" heading, your name in the avatar dropdown, and a role badge ("Admin" or "Staff") loaded from the live API — not placeholder "Loading…" text
result: pass

### 4. Admin Role Gating
expected: Signed in as bootstrap admin — Settings nav link is visible. Signed in as a non-admin staff account — Settings link is hidden; Staff badge shown instead of Admin
result: pass

### 5. Sign Out
expected: Avatar dropdown → "Sign out" returns you to the login page; navigating to /home while signed out redirects back to login
result: pass

### 6. Unauthorized Page
expected: Navigating to /unauthorized shows "You don't have permission to access this page." with a "← Go to home" button that returns you to the home page
result: pass

### 7. Cold Start Smoke Test
expected: Kill any running server/client. Start PostgreSQL, run `cd server && npx prisma migrate deploy`, start the API (`npm run dev` or PM2), start the client (`npm run dev`). Server boots without errors, client loads login page, and signing in still works end-to-end
result: pass

### 8. Production HTTPS Deployment
expected: Following DEPLOYMENT-RUNBOOK.md on Windows Server — app accessible via HTTPS, PM2 survives reboot, bootstrap admin gets Admin badge, staff account gets Staff badge (Plan 05 checkpoint steps 1–9)
result: blocked
blocked_by: release-build
reason: "I did not implement certificate"

## Summary

total: 8
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none yet]
