import { describe, it, expect, beforeEach } from 'vitest'
import { logAudit } from '../services/audit.js'
import { clearDb, prisma } from './helpers/testDb.js'

beforeEach(clearDb)

describe('logAudit', () => {
  it('auth-03-audit: logAudit writes exactly one AuditLog record with matching fields', async () => {
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
