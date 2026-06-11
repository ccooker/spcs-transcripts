import { PrismaClient, type AuditAction } from '../generated/prisma/client.js'

export async function logAudit(
  prisma: InstanceType<typeof PrismaClient>,
  opts: {
    userId: string
    action: AuditAction
    model: string
    recordId: string
    details?: Record<string, unknown>
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actingUserId: opts.userId,
      action: opts.action,
      model: opts.model,
      recordId: opts.recordId,
      details: opts.details ? JSON.stringify(opts.details) : null,
      timestamp: new Date(),
    },
  })
}
