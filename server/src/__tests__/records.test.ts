import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

const validStudentPayload = {
  fullName: 'Chan Tai Man',
  formLevel: 'FORM_4',
  graduationYear: 2027,
  schoolStudentId: 'S2024001',
}

const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

async function createTestStudent(overrides: Partial<typeof validStudentPayload> = {}) {
  const token = staffToken()
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)

  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validStudentPayload, ...overrides })

  expect(res.status).toBe(201)
  return res.body as {
    id: string
    fullName: string
    formLevel: string
    graduationYear: number
    schoolStudentId: string
    transcriptStatus: string
    archivedAt: string | null
  }
}

beforeEach(clearDb)

const validAcademicPayload = {
  subject: 'Chinese Language',
  grade: 'A',
  calendarYear: 2024,
  formLevel: 'FORM_4',
}

const validActivityPayload = {
  organisation: 'SPCS Drama Society',
  role: 'President',
  startMonth: 9,
  startYear: 2022,
}

describe('stu-03: Academic Results', () => {
  it('stu-03-list: GET /api/students/:id/academics returns 200 with array', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .get(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('stu-03-create: POST /academics with valid body returns 201; body contains expected fields', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAcademicPayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      subject: validAcademicPayload.subject,
      grade: validAcademicPayload.grade,
      calendarYear: validAcademicPayload.calendarYear,
      formLevel: validAcademicPayload.formLevel,
    })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stu-03-update: PATCH /academics/:resultId with grade change returns 200', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAcademicPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${student.id}/academics/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ grade: 'A+' })

    expect(res.status).toBe(200)
    expect(res.body.grade).toBe('A+')
  })

  it('stu-03-delete: DELETE /academics/:resultId returns 204', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAcademicPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .delete(`/api/students/${student.id}/academics/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })

  it('stu-03-idor: PATCH with resultId belonging to different studentId returns 404', async () => {
    const studentA = await createTestStudent({ schoolStudentId: 'S2024101' })
    const studentB = await createTestStudent({ schoolStudentId: 'S2024102', fullName: 'Lee Siu Ming' })
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${studentA.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAcademicPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${studentB.id}/academics/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ grade: 'B' })

    expect(res.status).toBe(404)
  })

  it('stu-03-audit: POST /academics creates AuditLog row with model:AcademicResult action:CREATE', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAcademicPayload)

    expect(res.status).toBe(201)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'AcademicResult', action: 'CREATE', recordId: res.body.id },
    })
    expect(logs).toHaveLength(1)
  })
})

describe('stu-04: Activities', () => {
  it('stu-04-list: GET /api/students/:id/activities returns 200 with array', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .get(`/api/students/${student.id}/activities`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('stu-04-create: POST /activities with valid body returns 201', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .send(validActivityPayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      organisation: validActivityPayload.organisation,
      role: validActivityPayload.role,
      startMonth: validActivityPayload.startMonth,
      startYear: validActivityPayload.startYear,
    })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stu-04-ongoing-sort: activities with null endYear sort before activities with dated endYear', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validActivityPayload, organisation: 'Past Club', endMonth: 6, endYear: 2023 })

    await request(app)
      .post(`/api/students/${student.id}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validActivityPayload, organisation: 'Ongoing Club', schoolStudentId: 'S2024103' })

    const res = await request(app)
      .get(`/api/students/${student.id}/activities`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].endYear).toBeNull()
    expect(res.body[1].endYear).not.toBeNull()
  })

  it('stu-04-idor: PATCH activity with wrong studentId returns 404', async () => {
    const studentA = await createTestStudent({ schoolStudentId: 'S2024201' })
    const studentB = await createTestStudent({ schoolStudentId: 'S2024202', fullName: 'Wong Mei Ling' })
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${studentA.id}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .send(validActivityPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${studentB.id}/activities/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'Vice President' })

    expect(res.status).toBe(404)
  })
})
