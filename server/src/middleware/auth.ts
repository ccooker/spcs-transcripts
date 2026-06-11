import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { Role } from '../generated/prisma/client.js'

const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!

const issuers = [
  `https://sts.windows.net/${TENANT_ID}/`,
  `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
]

function createValidateJwt() {
  if (process.env.NODE_ENV === 'test') {
    return expressjwt({
      secret: process.env.TEST_JWT_SECRET ?? 'test-secret',
      algorithms: ['HS256'],
      issuer: issuers,
      audience: [`api://${CLIENT_ID}`],
    })
  }
  return expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
    }) as jwksRsa.GetVerificationKey,
    issuer: issuers,
    audience: [`api://${CLIENT_ID}`],
    algorithms: ['RS256'],
  })
}

export const validateJwt = createValidateJwt()

export async function resolveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth as { preferred_username?: string; upn?: string; email?: string; name?: string } | undefined
    const email = auth?.preferred_username || auth?.upn || auth?.email

    if (!email) {
      res.status(401).json({ error: 'No email claim in token' })
      return
    }

    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()
    const isBootstrapAdmin = Boolean(bootstrapEmail && email.toLowerCase() === bootstrapEmail)

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        displayName: auth?.name ?? email,
        role: isBootstrapAdmin ? Role.ADMIN : Role.STAFF,
      },
      update: {
        displayName: auth?.name ?? email,
        ...(isBootstrapAdmin ? { role: Role.ADMIN } : {}),
      },
    })

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}
