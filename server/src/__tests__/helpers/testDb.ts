import { beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma.js'

export async function clearDb(): Promise<void> {
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(clearDb)

export { prisma }
