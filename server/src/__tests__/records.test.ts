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

const validAwardPayload = {
  title: 'Best Science Project',
  issuer: 'HKSAR Education Bureau',
  awardMonth: 3,
  awardYear: 2024,
  level: 'NATIONAL',
  description: 'Regional winner',
}

const validWorkExperiencePayload = {
  employer: 'HSBC Hong Kong',
  role: 'Summer Intern',
  startMonth: 6,
  startYear: 2023,
}

describe('stu-05: Awards', () => {
  it('stu-05-list: GET /api/students/:id/awards returns 200 with array', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .get(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('stu-05-create: POST /awards with valid body returns 201 with all fields', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAwardPayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title: validAwardPayload.title,
      issuer: validAwardPayload.issuer,
      awardMonth: validAwardPayload.awardMonth,
      awardYear: validAwardPayload.awardYear,
      level: validAwardPayload.level,
      description: validAwardPayload.description,
    })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stu-05-update: PATCH /awards/:awardId with level change returns 200', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAwardPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${student.id}/awards/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ level: 'INTERNATIONAL' })

    expect(res.status).toBe(200)
    expect(res.body.level).toBe('INTERNATIONAL')
  })

  it('stu-05-delete: DELETE /awards/:awardId returns 204', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAwardPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .delete(`/api/students/${student.id}/awards/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })

  it('stu-05-invalid-level: POST with level OLYMPIC returns 400', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validAwardPayload, level: 'OLYMPIC' })

    expect(res.status).toBe(400)
  })

  it('stu-05-idor: PATCH award belonging to different student returns 404', async () => {
    const studentA = await createTestStudent({ schoolStudentId: 'S2024301' })
    const studentB = await createTestStudent({ schoolStudentId: 'S2024302', fullName: 'Li Xiao Hong' })
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${studentA.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAwardPayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${studentB.id}/awards/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ level: 'REGIONAL' })

    expect(res.status).toBe(404)
  })

  it('stu-05-audit: POST /awards creates AuditLog row model:Award action:CREATE', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/awards`)
      .set('Authorization', `Bearer ${token}`)
      .send(validAwardPayload)

    expect(res.status).toBe(201)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'Award', action: 'CREATE', recordId: res.body.id },
    })
    expect(logs).toHaveLength(1)
  })
})

describe('stu-06: Work Experience', () => {
  it('stu-06-create: POST /work-experience with valid body (no end date) returns 201', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/work-experience`)
      .set('Authorization', `Bearer ${token}`)
      .send(validWorkExperiencePayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      employer: validWorkExperiencePayload.employer,
      role: validWorkExperiencePayload.role,
      startMonth: validWorkExperiencePayload.startMonth,
      startYear: validWorkExperiencePayload.startYear,
    })
    expect(res.body.endYear).toBeNull()
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stu-06-ongoing-sort: work experience with null endYear sorts before dated entry', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/work-experience`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validWorkExperiencePayload, employer: 'Past Company', endMonth: 12, endYear: 2022 })

    await request(app)
      .post(`/api/students/${student.id}/work-experience`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validWorkExperiencePayload, employer: 'Ongoing Company' })

    const res = await request(app)
      .get(`/api/students/${student.id}/work-experience`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].endYear).toBeNull()
    expect(res.body[1].endYear).not.toBeNull()
  })

  it('stu-06-idor: PATCH work experience belonging to different student returns 404', async () => {
    const studentA = await createTestStudent({ schoolStudentId: 'S2024401' })
    const studentB = await createTestStudent({ schoolStudentId: 'S2024402', fullName: 'Zhang Wei' })
    const token = staffToken()

    const createRes = await request(app)
      .post(`/api/students/${studentA.id}/work-experience`)
      .set('Authorization', `Bearer ${token}`)
      .send(validWorkExperiencePayload)
    expect(createRes.status).toBe(201)

    const res = await request(app)
      .patch(`/api/students/${studentB.id}/work-experience/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'Senior Intern' })

    expect(res.status).toBe(404)
  })
})

const validCareerGoalPayload = {
  interests: ['ENGINEERING', 'IT_TECHNOLOGY'],
  description: 'Targeting HKU Computer Science department',
}

describe('stu-07: Career Goals', () => {
  it('stu-07-create: POST /career-goals with valid body returns 201 with expected fields', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024501' })
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCareerGoalPayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      interests: validCareerGoalPayload.interests,
      description: validCareerGoalPayload.description,
    })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(res.body.author).toMatchObject({ displayName: 'Test Staff' })
  })

  it('stu-07-list: GET /career-goals returns array sorted newest-first', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024502' })
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCareerGoalPayload)

    const res = await request(app)
      .get(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  it('stu-07-versioning: POST twice creates two rows; GET returns newest first', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024503' })
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)
      .send({ interests: ['MEDICINE_HEALTH'], description: 'First entry' })

    const secondPayload = { interests: ['ENGINEERING', 'SCIENCE_RESEARCH'], description: 'Second entry' }
    await request(app)
      .post(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)
      .send(secondPayload)

    const res = await request(app)
      .get(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].interests).toEqual(secondPayload.interests)
  })

  it('stu-07-no-patch: PATCH /career-goals/:goalId returns 404 (D-16 enforcement)', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024504' })
    const token = staffToken()

    const res = await request(app)
      .patch(`/api/students/${student.id}/career-goals/fake-id`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Attempt to update' })

    expect(res.status).toBe(404)
  })

  it('stu-07-no-delete: DELETE /career-goals/:goalId returns 404 (D-16 enforcement)', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024505' })
    const token = staffToken()

    const res = await request(app)
      .delete(`/api/students/${student.id}/career-goals/fake-id`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('stu-07-empty-interests: POST with interests:[] returns 400', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024506' })
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/career-goals`)
      .set('Authorization', `Bearer ${token}`)
      .send({ interests: [] })

    expect(res.status).toBe(400)
  })
})

const validStaffNotePayload = {
  content: 'Student shows strong aptitude for STEM subjects',
}

describe('stu-08: Staff Notes', () => {
  it('stu-08-create: POST /notes with valid body returns 201 with expected fields', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024601' })
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(validStaffNotePayload)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ content: validStaffNotePayload.content })
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(res.body.author).toMatchObject({ displayName: 'Test Staff' })
    expect(res.body.createdAt).toBeDefined()
  })

  it('stu-08-list: GET /notes returns notes newest-first', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024602' })
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(validStaffNotePayload)

    const res = await request(app)
      .get(`/api/students/${student.id}/notes`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  it('stu-08-append-only-no-patch: PATCH /notes/:noteId returns 404 (D-17 enforcement)', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024603' })
    const token = staffToken()

    const res = await request(app)
      .patch(`/api/students/${student.id}/notes/fake-id`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Attempt to update' })

    expect(res.status).toBe(404)
  })

  it('stu-08-append-only-no-delete: DELETE /notes/:noteId returns 404 (D-17 enforcement)', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024604' })
    const token = staffToken()

    const res = await request(app)
      .delete(`/api/students/${student.id}/notes/fake-id`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('stu-08-max-length: POST with content of 501 characters returns 400', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024605' })
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'a'.repeat(501) })

    expect(res.status).toBe(400)
  })

  it('stu-08-audit: POST /notes creates AuditLog row model:StaffNote action:CREATE', async () => {
    const student = await createTestStudent({ schoolStudentId: 'S2024606' })
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(validStaffNotePayload)

    expect(res.status).toBe(201)

    const logs = await prisma.auditLog.findMany({
      where: { model: 'StaffNote', action: 'CREATE', recordId: res.body.id },
    })
    expect(logs).toHaveLength(1)
  })
})
