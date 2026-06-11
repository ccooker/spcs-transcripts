import jwt from 'jsonwebtoken'

export function makeTestToken(overrides: Record<string, unknown> = {}): string {
  const secret = process.env.TEST_JWT_SECRET ?? 'test-secret'
  const clientId = process.env.AZURE_CLIENT_ID ?? 'test-client-id'
  const tenantId = process.env.AZURE_TENANT_ID ?? 'test-tenant-id'

  const payload = {
    preferred_username: 'staff@school.edu',
    name: 'Test Staff',
    aud: `api://${clientId}`,
    iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    ...overrides,
  }

  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' })
}
