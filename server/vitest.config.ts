import 'dotenv/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 15000,
    include: ['src/__tests__/**/*.test.ts'],
    env: {
      AZURE_TENANT_ID: 'test-tenant-id',
      AZURE_CLIENT_ID: 'test-client-id',
      BOOTSTRAP_ADMIN_EMAIL: 'admin@school.edu',
      TEST_JWT_SECRET: 'test-secret',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://spcs:password@127.0.0.1:5432/spcs_transcripts',
    },
  },
})
