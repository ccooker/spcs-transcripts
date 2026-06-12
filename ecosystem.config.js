// IMPORTANT: Replace all CHANGE_ME values with real credentials before running in production.
// Do NOT commit this file with real credentials — use a secrets manager or set values
// directly as machine-level environment variables on the Windows Server instead.
//
// After filling in values, start with:
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//
// See DEPLOYMENT-RUNBOOK.md for full setup instructions.

module.exports = {
  apps: [
    {
      name: 'spcs-api',
      script: './server/dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Use 127.0.0.1 (not localhost) — avoids IPv6 resolution issues on Windows (Pitfall 6)
        DATABASE_URL: 'postgresql://spcs:CHANGE_ME@127.0.0.1:5432/spcs_transcripts',
        AZURE_TENANT_ID: 'ef6ae8ee-9884-4ff6-9ebc-86f882c072c7',
        AZURE_CLIENT_ID: 'a9692133-25c0-434d-9afe-436905139548',
        BOOTSTRAP_ADMIN_EMAIL: 'spcscky@spcs.edu.hk',
      },

      // System-level log path — readable only by Administrators (T-05-05)
      // PM2_HOME must be set as a machine-level env var to C:\ProgramData\pm2
      // before this path is valid (see DEPLOYMENT-RUNBOOK.md — PM2 Setup section)
      error_file: 'C:/ProgramData/pm2/logs/spcs-api-error.log',
      out_file: 'C:/ProgramData/pm2/logs/spcs-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
