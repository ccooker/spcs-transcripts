# SPCS Transcript System — Deployment Runbook

**Target platform:** Windows Server 2019+ with IIS
**Stack:** Node.js + Express (PM2) + PostgreSQL + IIS (ARR reverse proxy)
**Auth:** Microsoft Entra ID (Azure AD) — MSAL PKCE flow

> **Important:** This runbook covers a production deployment.
> Never run `prisma migrate dev` in production — always use `prisma migrate deploy`.
> Never use iisnode — use IIS Application Request Routing (ARR) to proxy localhost:3001.

---

## Prerequisites Checklist

Complete all items before proceeding. Items marked *(IT Admin)* require Global Admin or IT Admin access.

- [ ] Windows Server 2019 or later with IIS role installed
- [ ] [IIS URL Rewrite Module 2.0](https://www.iis.net/downloads/microsoft/url-rewrite) installed on the server
- [ ] [IIS Application Request Routing (ARR) 3.0](https://www.iis.net/downloads/microsoft/application-request-routing) installed on the server
- [ ] Node.js LTS v22 or later installed on the server (https://nodejs.org)
- [ ] PostgreSQL 16 installed and the Windows service is running
- [ ] SSL/TLS certificate bound to the IIS site (school-issued certificate or Let's Encrypt)
- [ ] Azure AD (Entra ID) app registration completed — see **Entra ID App Registration** section below *(IT Admin)*
- [ ] Deployment path created (e.g., `C:\inetpub\spcs-transcripts\`)
- [ ] Repository cloned or copied to the deployment path

---

## Entra ID App Registration *(IT Admin)*

These steps must be completed in the Azure portal before the application can authenticate users.

1. Sign in to [portal.azure.com](https://portal.azure.com) as a Global Administrator.
2. Navigate to **Microsoft Entra ID → App registrations → New registration**.
   - Name: `SPCS Transcript System`
   - Supported account types: *Accounts in this organizational directory only*
   - Do NOT set a redirect URI here — configure it in the next step.
3. After the app is created, go to **Authentication → Add a platform → Single-page application** (not "Web").
   - Add redirect URI: `http://localhost:5173` (for local development)
   - Add redirect URI: `https://<school-domain>` (for production)
4. Navigate to **Expose an API → Add a scope**.
   - Application ID URI: accept the default (`api://<client-id>`)
   - Scope name: `access_as_user`
   - Who can consent: Admins and users
   - Admin consent display name: `Access SPCS Transcript System`
5. Navigate to **API permissions → Add a permission → My APIs → SPCS Transcript System → Delegated → access_as_user**.
   - Click **Grant admin consent for `<tenant>`**.
6. Record the following values — you will need them for `ecosystem.config.js`:
   - **Tenant ID**: Entra ID → Overview → Tenant ID
   - **Client ID (Application ID)**: App registration → Overview → Application (client) ID

---

## PostgreSQL Setup

Run the following commands using `psql` as the PostgreSQL superuser (typically `postgres`):

```sql
-- Create the application database user
CREATE USER spcs WITH PASSWORD 'replace-with-strong-password';

-- Create the application database
CREATE DATABASE spcs_transcripts OWNER spcs;
```

Edit `pg_hba.conf` (located at `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`):

Add the following line so the `spcs` user can connect via password from localhost:

```
host    all    spcs    127.0.0.1/32    md5
```

> **Pitfall 6:** Use `127.0.0.1` (explicit IP), not `localhost`. PostgreSQL on Windows may
> resolve `localhost` to `::1` (IPv6) instead of `127.0.0.1`, causing connection failures.
> The `DATABASE_URL` in `ecosystem.config.js` also uses `127.0.0.1` for the same reason.

Restart the PostgreSQL Windows service after editing `pg_hba.conf`:

```powershell
Restart-Service postgresql-x64-16
```

---

## IIS Configuration

### Step 1: Enable ARR Proxy

Open **IIS Manager** → select the server node → **Application Request Routing Cache** → **Server Proxy Settings** → check **Enable proxy** → Apply.

### Step 2: Create IIS Site

1. In IIS Manager, right-click **Sites → Add Website**.
   - Site name: `SPCS Transcript System`
   - Physical path: path to the IIS site root (where `web.config` and the client `dist/` output will be, e.g. `C:\inetpub\spcs-transcripts\public\`)
   - Binding type: `https`
   - Port: `443`
   - Host name: `<school-domain>` (e.g. `transcripts.school.edu`)

2. Select the SSL certificate from the drop-down. If the certificate is not listed, import it first via **Server Certificates** in IIS Manager.

### Step 3: Verify URL Rewrite Module

In IIS Manager, select the site → double-click **URL Rewrite**. If the module is missing, download and install it from the link in the Prerequisites section.

### Step 4: Bind HTTPS Certificate

Confirm the HTTPS binding shows the correct certificate. Browsers on the school network must trust the certificate issuer.

### Step 5: Add Windows Firewall Rule (Security — T-05-03)

Block direct external access to Express port 3001. Run as Administrator:

```powershell
New-NetFirewallRule -DisplayName "Block external SPCS API port" `
  -Direction Inbound -Protocol TCP -LocalPort 3001 `
  -RemoteAddress 0.0.0.0/0 -Action Block
```

This ensures Express is only reachable via IIS on the loopback interface, never directly from the network.

---

## Application Build

All commands below are run from the deployment path (e.g. `C:\inetpub\spcs-transcripts\`).

### Build the Server

```powershell
cd server
npm ci
npm run build
```

This compiles TypeScript to `server/dist/`. Verify `server/dist/index.js` exists before continuing.

### Run Database Migrations

```powershell
# Still in server/ directory
npx prisma migrate deploy
```

> **Important:** Use `prisma migrate deploy` — NOT `prisma migrate dev`.
> `migrate dev` requires a shadow database and is for development only.
> `migrate deploy` applies pending migrations safely in production.

Set `DATABASE_URL` in your environment before running this, or it will fail:

```powershell
$env:DATABASE_URL = "postgresql://spcs:<password>@127.0.0.1:5432/spcs_transcripts"
npx prisma migrate deploy
```

### Build the Client

```powershell
cd ..\client
npm ci
npm run build
```

This produces `client/dist/` with the compiled React SPA.

### Copy Client Build to IIS Site Root

Copy the contents of `client/dist/` to the IIS site physical path configured in Step 2:

```powershell
Copy-Item -Path ".\client\dist\*" -Destination "C:\inetpub\spcs-transcripts\public\" -Recurse -Force
```

Confirm that `web.config` is also present in the IIS site root (it should already be there from the repository).

---

## Environment Variables

Open `ecosystem.config.js` and replace every `CHANGE_ME` value with the real value before starting PM2.

| Variable | Where to Find |
|---|---|
| `DATABASE_URL` | Use `postgresql://spcs:<password>@127.0.0.1:5432/spcs_transcripts` with the PostgreSQL password you set above |
| `AZURE_TENANT_ID` | Entra ID → Overview → Tenant ID |
| `AZURE_CLIENT_ID` | App registration → Overview → Application (client) ID |
| `BOOTSTRAP_ADMIN_EMAIL` | School email address of the first Admin user |
| `PORT` | Leave as `3001` — must match the `web.config` proxy target |

> **Security (T-05-01):** After filling in real values, consider restricting file permissions on
> `ecosystem.config.js` to Administrators only, or storing secrets in Windows credential
> storage and loading them via environment variables set at the machine level.

---

## PM2 Setup

All commands below must be run in a PowerShell window opened **as Administrator**.

### Step 1: Set PM2_HOME as a Machine-Level Environment Variable

```powershell
# Run as Administrator
[System.Environment]::SetEnvironmentVariable('PM2_HOME', 'C:\ProgramData\pm2', 'Machine')
```

> **Pitfall 4 — Critical:** `PM2_HOME` must be set as a **machine-level** (system) environment
> variable, not user-level. If PM2 is installed as a Windows service running under
> `Local Service`, it will not have access to user-profile paths (`%APPDATA%\pm2`).
> Using `C:\ProgramData\pm2` ensures the service can read and write the PM2 state file.

**Restart your PowerShell window** after setting this so the new value takes effect.

### Step 2: Install PM2 Globally

```powershell
npm install -g pm2
```

### Step 3: Install pm2-installer for Windows Service

```powershell
npm install -g @jessety/pm2-installer
```

pm2-installer uses WinSW under the hood to create a Windows service that runs `pm2 resurrect` at boot.

### Step 4: Edit ecosystem.config.js

Replace all `CHANGE_ME` values in `ecosystem.config.js` with real credentials (see Environment Variables section above).

### Step 5: Start the Application

```powershell
pm2 start ecosystem.config.js --env production
```

Verify the process is running:

```powershell
pm2 list
```

Expected output: `spcs-api` with status `online`.

### Step 6: Save PM2 State

```powershell
pm2 save
```

This writes `C:\ProgramData\pm2\dump.pm2` — the state file that pm2-installer will restore on reboot.

### Step 7: Register as Windows Service

Follow the [pm2-installer instructions](https://github.com/jessety/pm2-installer) to register the service. Typically:

```powershell
pm2-installer install
```

This creates a Windows service that starts automatically at boot and runs `pm2 resurrect` to restore the saved state.

### Step 8: Verify Service Registration

```powershell
Get-Service | Where-Object { $_.Name -like "*pm2*" }
```

The service should appear with status `Running`.

---

## Verification Steps

Run these checks after completing the full setup:

1. **PM2 process running:**

   ```powershell
   pm2 list
   ```

   Expected: `spcs-api` shows status `online`.

2. **Express responding locally:**

   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3001/api/auth/me" -UseBasicParsing
   ```

   Expected: HTTP 401 response (server is running; JWT is required to access the route).

3. **HTTPS site accessible:**

   Open `https://<school-domain>` in a school-network browser.
   Expected: Login page renders with "Sign in with Microsoft" button.

4. **Sign in as Bootstrap Admin:**

   Sign in with the account whose email matches `BOOTSTRAP_ADMIN_EMAIL`.
   Expected: Home page loads showing the user's display name and **Admin** role badge.

5. **Sign in as regular staff:**

   Sign out, sign in with a different school account.
   Expected: Home page loads with **Staff** role badge.

6. **PM2 reboot persistence:**

   Reboot the Windows Server.
   After reboot:
   - Run `pm2 list` → `spcs-api` shows `online` (no manual start needed)
   - Open `https://<school-domain>` within 60 seconds of boot → site is accessible

---

## Local Development (Full Stack)

Run these commands in two separate terminal windows:

**Terminal 1 — Express API server:**

```powershell
cd server
npm run dev
```

Starts `tsx watch src/index.ts` — hot-reloads on file changes. API available at `http://localhost:3001`.

**Terminal 2 — Vite dev server:**

```powershell
cd client
npm run dev
```

Starts Vite at `http://localhost:5173`. Vite's dev proxy forwards `/api/*` requests to `http://localhost:3001`, matching the production IIS rewrite rules.

Open: **http://localhost:5173**

---

## Troubleshooting

### `P1001: Can't reach database server`

- Check `DATABASE_URL` uses `127.0.0.1` (not `localhost`) — see Pitfall 6
- Verify PostgreSQL service is running: `Get-Service postgresql-x64-16`
- Verify `pg_hba.conf` has: `host all spcs 127.0.0.1/32 md5`
- Restart PostgreSQL after editing `pg_hba.conf`

### `401 Invalid or missing token` from Express

- Check `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` in `ecosystem.config.js` match the app registration values exactly
- Verify the Entra ID app registration has the correct SPA redirect URI (not "Web" type)
- Check the Express auth middleware supports both v1 and v2 token issuers (both `sts.windows.net` and `login.microsoftonline.com`)
- Decode the token at [jwt.ms](https://jwt.ms) and verify `aud` is `api://<client-id>` and `iss` matches either issuer format

### `AADSTS9002325` or PKCE error

- The redirect URI in Entra ID is registered as type **Web** instead of **Single-page application**.
- Fix: App registration → Authentication → delete the Web redirect URI → Add a platform → **Single-page application** → re-add the URI.

### PM2 not starting after reboot

- `PM2_HOME` is set as a user environment variable instead of a machine (system) variable.
- Fix: Re-run the PowerShell command with `'Machine'` as the third argument, then re-run `pm2 save` and reinstall the service.
- Verify: `[System.Environment]::GetEnvironmentVariable('PM2_HOME', 'Machine')` → should return `C:\ProgramData\pm2`

### IIS 502 Bad Gateway

- PM2 process is not running. Check `pm2 list`.
- If `spcs-api` shows `stopped` or `errored`, check logs: `pm2 logs spcs-api --lines 50`
- Verify PORT in `ecosystem.config.js` is `3001` and matches the `web.config` proxy target.
- Verify ARR proxy is enabled in IIS Manager (see IIS Configuration — Step 1).

### IIS 404 on React Router routes (e.g. `/students/123`)

- The SPA Fallback rewrite rule in `web.config` is not working.
- Verify URL Rewrite Module 2.0 is installed and the `web.config` is in the IIS site root.
- Check IIS Manager → URL Rewrite for the site — both rules (API Proxy, SPA Fallback) should appear.

### `npm ci` fails — `ENOENT: package-lock.json`

- Run `npm install` first to generate `package-lock.json`, then `npm ci` on subsequent deploys.
- Or commit `package-lock.json` to the repository.
