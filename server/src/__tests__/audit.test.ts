import { describe, it, expect, beforeEach } from 'vitest'
import { logAudit } from '../services/audit.js'
import { clearDb, prisma } from './helpers/testDb.js'

beforeEach(clearDb)

describe('logAudit', () => {
  it('auth-03-audit: logAudit writes exactly one AuditLog record with matching fields', async () => {
    // AuditLog.actingUserId is a FK to User.id — create the user first
    await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'audit-test@school.edu',
        displayName: 'Audit Test User',
      },
    })

    await logAudit(prisma, {
      userId: 'test-user-id',
      action: 'CREATE',
      model: 'Student',
      recordId: 'test-record-id',
    })

    const logs = await prisma.auditLog.findMany()
    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('CREATE')
    expect(logs[0].model).toBe('Student')
    expect(logs[0].actingUserId).toBe('test-user-id')
  })
})
