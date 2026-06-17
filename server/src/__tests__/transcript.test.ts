import { vi } from 'vitest'

vi.mock('../services/pdf.js', () => ({
  generatePdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
}))

import os from 'node:os'
process.env.UPLOAD_ROOT = os.tmpdir()

import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

const validStudentPayload = {
  fullName: 'Chan Tai Man',
  formLevel: 'FORM_4',
  graduationYear: 2027,
  schoolStudentId: 'S2024999',
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
  return res.body as { id: string }
}

beforeEach(clearDb)

describe('Transcript', () => {
  it('trn-01-auto-populate: GET transcript with no saved narrative returns autoPopulated academicsContent', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        subject: 'Mathematics (Compulsory)',
        grade: 'A',
        calendarYear: 2025,
        formLevel: 'FORM_4',
      })

    const res = await request(app)
      .get(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.autoPopulated).toBe(true)
    expect(res.body.academicsContent).toBeTruthy()
  })

  it('trn-01-put-save: PUT transcript saves academicsContent; subsequent GET returns saved value', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const putRes = await request(app)
      .put(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)
      .send({ academicsContent: '<p>Test</p>', status: 'DRAFT' })

    expect(putRes.status).toBe(200)

    const getRes = await request(app)
      .get(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.academicsContent).toBe('<p>Test</p>')
  })

  it('trn-01-visibility: PUT academicsVisible false; GET returns academicsVisible false', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const putRes = await request(app)
      .put(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)
      .send({ academicsVisible: false })

    expect(putRes.status).toBe(200)

    const getRes = await request(app)
      .get(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.academicsVisible).toBe(false)
  })

  it('trn-01-records-banner: GET transcript shows showRecordsBanner after academic result update', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const pastDate = new Date('2020-01-01T00:00:00.000Z')
    await prisma.transcript.create({
      data: {
        studentId: student.id,
        status: 'DRAFT',
        updatedAt: pastDate,
      },
    })

    await request(app)
      .post(`/api/students/${student.id}/academics`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        subject: 'English Language',
        grade: 'B',
        calendarYear: 2025,
        formLevel: 'FORM_4',
      })

    const res = await request(app)
      .get(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.showRecordsBanner).toBe(true)
  })

  it('trn-02-status: PUT status FINALISED returns status FINALISED', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .put(`/api/students/${student.id}/transcript`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'FINALISED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('FINALISED')
  })

  it('trn-03-export: POST export returns application/pdf body starting with %PDF', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/transcript/export`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.body.toString('utf8').startsWith('%PDF')).toBe(true)
  })

  it('trn-idor-get: GET transcript for non-existent student returns 404', async () => {
    await createTestStudent()
    const token = staffToken()
    const fakeStudentId = '00000000-0000-0000-0000-000000000000'

    const res = await request(app)
      .get(`/api/students/${fakeStudentId}/transcript`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('trn-idor-put: PUT transcript for non-existent student returns 404', async () => {
    await createTestStudent()
    const token = staffToken()
    const fakeStudentId = '00000000-0000-0000-0000-000000000000'

    const res = await request(app)
      .put(`/api/students/${fakeStudentId}/transcript`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DRAFT' })

    expect(res.status).toBe(404)
  })
})
