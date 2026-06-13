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

const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

const adminToken = () => {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@school.edu'
  return makeTestToken({ preferred_username: adminEmail, name: 'Admin User' })
}

async function createTestStudent(overrides: Partial<typeof validPayload> = {}) {
  const token = staffToken()
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)

  const res = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validPayload, ...overrides })

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

describe('GET /api/students/:id', () => {
  it('stu-02-get: returns 200 with student fields for existing active student', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .get(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: student.id,
      fullName: validPayload.fullName,
      formLevel: validPayload.formLevel,
      graduationYear: validPayload.graduationYear,
      schoolStudentId: validPayload.schoolStudentId,
      transcriptStatus: 'NONE',
    })
    expect(res.body.archivedAt).toBeNull()
  })

  it('stu-02-get: GET unknown UUID returns 404', async () => {
    const token = staffToken()
    const unknownId = '00000000-0000-4000-8000-000000000001'

    const res = await request(app)
      .get(`/api/students/${unknownId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })
})

describe('PATCH /api/students/:id', () => {
  it('stu-02-patch: updates fullName and writes audit UPDATE', async () => {
    const student = await createTestStudent()
    const token = staffToken()
    const updatedName = 'Lee Siu Ming'

    const res = await request(app)
      .patch(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: updatedName })

    expect(res.status).toBe(200)
    expect(res.body.fullName).toBe(updatedName)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'UPDATE', recordId: student.id },
    })
    expect(logs).toHaveLength(1)
  })

  it('auth-03-update: PATCH creates audit log entry', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .patch(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ studentEmail: 'student@school.edu' })

    expect(res.status).toBe(200)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'UPDATE', recordId: student.id },
    })
    expect(logs.length).toBeGreaterThanOrEqual(1)
  })
})

describe('DELETE /api/students/:id (archive)', () => {
  it('stu-02-archive: sets archivedAt non-null on the student row', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const row = await prisma.student.findUnique({ where: { id: student.id } })
    expect(row?.archivedAt).not.toBeNull()
  })

  it('stu-02-archive: subsequent GET /api/students/:id returns archivedAt populated', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .get(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.archivedAt).not.toBeNull()
  })

  it('stu-02-archive: DELETE writes audit action DELETE', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'DELETE', recordId: student.id },
    })
    expect(logs).toHaveLength(1)
  })

  it('auth-03-update: DELETE creates audit log entry', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'DELETE', recordId: student.id },
    })
    expect(logs).toHaveLength(1)
  })
})

describe('POST /api/students/:id/restore', () => {
  it('stu-02-restore: admin clears archivedAt and writes audit UPDATE with restored detail', async () => {
    const student = await createTestStudent()
    const staff = staffToken()
    const admin = adminToken()

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin}`)

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${staff}`)

    const res = await request(app)
      .post(`/api/students/${student.id}/restore`)
      .set('Authorization', `Bearer ${admin}`)

    expect(res.status).toBe(200)
    expect(res.body.archivedAt).toBeNull()

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Student', action: 'UPDATE', recordId: student.id },
      orderBy: { timestamp: 'desc' },
    })
    const restoreLog = logs.find((log) => {
      if (!log.details) return false
      const details = JSON.parse(log.details) as { restored?: boolean }
      return details.restored === true
    })
    expect(restoreLog).toBeDefined()
  })

  it('auth-02-restore: staff token POST restore returns 403', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .post(`/api/students/${student.id}/restore`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })
})

async function seedListStudents() {
  const token = staffToken()
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)

  const chan = await createTestStudent({
    fullName: 'Chan Tai Man',
    formLevel: 'FORM_4',
    schoolStudentId: 'S2024101',
  })
  const wong = await createTestStudent({
    fullName: 'Wong Mei Ling',
    formLevel: 'FORM_1',
    graduationYear: 2029,
    schoolStudentId: 'S2024102',
  })
  const chanLower = await createTestStudent({
    fullName: 'chan siu wai',
    formLevel: 'FORM_4',
    schoolStudentId: 'S2024103',
  })
  const lee = await createTestStudent({
    fullName: 'Lee Siu Ming',
    formLevel: 'FORM_1',
    graduationYear: 2029,
    schoolStudentId: 'S2024104',
  })

  await request(app)
    .delete(`/api/students/${wong.id}`)
    .set('Authorization', `Bearer ${token}`)

  // @ts-expect-error — transcript model not in generated client until Plan 02
  await (prisma as any).transcript.create({ data: { studentId: lee.id, status: 'DRAFT' } })

  return { chan, wong, chanLower, lee }
}

describe('GET /api/students', () => {
  it('nav-01: q=Chan returns only students whose fullName contains Chan case-insensitive', async () => {
    await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students?q=Chan')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    for (const row of res.body.data) {
      expect(row.fullName.toLowerCase()).toContain('chan')
    }
  })

  it('nav-02-form: formLevel=FORM_4 returns only FORM_4 students', async () => {
    await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students?formLevel=FORM_4')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    for (const row of res.body.data) {
      expect(row.formLevel).toBe('FORM_4')
    }
  })

  it('nav-02-status: transcriptStatus=NONE returns only NONE status students', async () => {
    await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students?transcriptStatus=NONE')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    for (const row of res.body.data) {
      expect(row.transcriptStatus).toBe('NONE')
    }
  })

  it('list-default: excludes archived students by default', async () => {
    const { wong } = await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const ids = res.body.data.map((row: { id: string }) => row.id)
    expect(ids).not.toContain(wong.id)
  })

  it('list-admin-archived: includeArchived=true includes archived for admin; staff gets 403', async () => {
    const { wong } = await seedListStudents()
    const admin = adminToken()
    const staff = staffToken()

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin}`)

    const adminRes = await request(app)
      .get('/api/students?includeArchived=true')
      .set('Authorization', `Bearer ${admin}`)

    expect(adminRes.status).toBe(200)
    const adminIds = adminRes.body.data.map((row: { id: string }) => row.id)
    expect(adminIds).toContain(wong.id)

    const staffRes = await request(app)
      .get('/api/students?includeArchived=true')
      .set('Authorization', `Bearer ${staff}`)

    expect(staffRes.status).toBe(403)
  })

  it('list-pagination: page=1&pageSize=2 returns meta and at most 2 data rows', async () => {
    await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students?page=1&pageSize=2')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 2,
    })
    expect(res.body.meta.total).toBeGreaterThan(2)
    expect(res.body.meta.totalPages).toBeGreaterThan(1)
  })

  it('list-sort: sort=fullName&order=asc returns ascending fullName order', async () => {
    await seedListStudents()
    const token = staffToken()

    const res = await request(app)
      .get('/api/students?sort=fullName&order=asc')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const names = res.body.data.map((row: { fullName: string }) => row.fullName)
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(names).toEqual(sorted)
  })
})
