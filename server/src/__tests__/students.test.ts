import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

const validPayload = {
  fullName: 'Chan Tai Man',
  formLevel: 'FORM_4',
  graduationYear: 2027,
  schoolStudentId: 'S2024001',
}

beforeEach(clearDb)

describe('POST /api/students', () => {
  it('stu-01-create: POST /api/students with valid body returns 201 with student fields', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      fullName: validPayload.fullName,
      formLevel: validPayload.formLevel,
      graduationYear: validPayload.graduationYear,
      schoolStudentId: validPayload.schoolStudentId,
      transcriptStatus: 'NONE',
    })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stu-01-create: POST without Authorization returns 401', async () => {
    const res = await request(app).post('/api/students').send(validPayload)
    expect(res.status).toBe(401)
  })

  it('stu-01-create: POST missing required fullName returns 400', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, fullName: '' })

    expect(res.status).toBe(400)
  })

  it('stu-01-create: duplicate schoolStudentId returns 409 with already exists message', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, fullName: 'Another Student' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/i)
  })

  it('auth-03-create: successful create writes exactly one AuditLog with CREATE action', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)

    expect(res.status).toBe(201)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'CREATE', recordId: res.body.id },
    })
    expect(logs).toHaveLength(1)
  })
})
