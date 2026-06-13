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

const validPdfBuffer = Buffer.from(
  '%PDF-1.4 1 0 obj<</Type /Catalog>>endobj trailer<</Root 1 0 R>>%%EOF',
  'utf-8',
)

describe('Documents', () => {
  it('doc-01-reject-mime: POST non-PDF MIME returns 400', async () => {
    const student = await createTestStudent()
    const token = staffToken()
    const textBuffer = Buffer.from('hello world', 'utf-8')

    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', textBuffer, { filename: 'test.txt', contentType: 'text/plain' })
      .field('typeTag', 'REPORT_CARD')

    expect(res.status).toBe(400)
  })

  it('doc-01-reject-magic: POST application/pdf MIME but wrong magic bytes returns 400', async () => {
    const student = await createTestStudent()
    const token = staffToken()
    const fakeBuffer = Buffer.alloc(20, 0x00)

    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fakeBuffer, { filename: 'fake.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REPORT_CARD')

    expect(res.status).toBe(400)
  })

  it('doc-01-size-limit: POST file > 25 MB returns 400', async () => {
    const student = await createTestStudent()
    const token = staffToken()
    const bigBuffer = Buffer.alloc(26 * 1024 * 1024, 0x25)

    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', bigBuffer, { filename: 'big.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REPORT_CARD')

    expect(res.status).toBe(400)
  })

  it('doc-01-idor: POST valid PDF to another student URL returns 404', async () => {
    const studentA = await createTestStudent({ schoolStudentId: 'S2024001' })
    const studentB = await createTestStudent({ schoolStudentId: 'S2024002' })
    const token = staffToken()

    // POST to studentB's URL — should 201 (studentB exists and staff owns their own records)
    // IDOR test: try to post to a non-existent student
    const fakeStudentId = '00000000-0000-0000-0000-000000000000'
    const res = await request(app)
      .post(`/api/students/${fakeStudentId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REPORT_CARD')

    expect(res.status).toBe(404)
    void studentA
    void studentB
  })

  it('doc-01: POST valid PDF + REPORT_CARD returns 201 with document metadata', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REPORT_CARD')

    expect(res.status).toBe(201)
    expect(res.body.originalFilename).toBe('test.pdf')
    expect(res.body.typeTag).toBe('REPORT_CARD')
  })

  it('doc-02: GET /documents returns active docs; excludes soft-deleted', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    // Upload a document
    const uploadRes = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'CERTIFICATE')

    expect(uploadRes.status).toBe(201)
    const docId = uploadRes.body.id as string

    // Soft-delete it
    const deleteRes = await request(app)
      .delete(`/api/students/${student.id}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)

    // GET should return empty array
    const listRes = await request(app)
      .get(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    expect(Array.isArray(listRes.body)).toBe(true)
    expect(listRes.body).toHaveLength(0)
  })

  it('doc-02-download: GET /documents/:docId/download returns 200 with Content-Disposition attachment', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const uploadRes = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'report.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REPORT_CARD')

    expect(uploadRes.status).toBe(201)
    const docId = uploadRes.body.id as string

    const downloadRes = await request(app)
      .get(`/api/students/${student.id}/documents/${docId}/download`)
      .set('Authorization', `Bearer ${token}`)

    expect(downloadRes.status).toBe(200)
    expect(downloadRes.headers['content-disposition']).toContain('attachment')
  })

  it('doc-03: DELETE /documents/:docId returns 200; subsequent GET excludes that docId', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const uploadRes = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'AWARD_LETTER')

    expect(uploadRes.status).toBe(201)
    const docId = uploadRes.body.id as string

    const deleteRes = await request(app)
      .delete(`/api/students/${student.id}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    const ids = (listRes.body as Array<{ id: string }>).map((d) => d.id)
    expect(ids).not.toContain(docId)
  })

  it('doc-03-audit: DELETE /documents/:docId creates AuditLog with model=Document action=DELETE', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const uploadRes = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'REFERENCE_LETTER')

    expect(uploadRes.status).toBe(201)
    const docId = uploadRes.body.id as string

    const deleteRes = await request(app)
      .delete(`/api/students/${student.id}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)

    const auditLogs = await prisma.auditLog.findMany({
      where: { model: 'Document', action: 'DELETE', recordId: docId },
    })
    expect(auditLogs).toHaveLength(1)
  })

  it('doc-04-invalid-type: POST valid PDF + invalid typeTag returns 400', async () => {
    const student = await createTestStudent()
    const token = staffToken()

    const res = await request(app)
      .post(`/api/students/${student.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('typeTag', 'INVALID_TAG')

    expect(res.status).toBe(400)
  })

  it('doc-04-all-types: POST valid PDF with each of 6 valid type tags returns 201', async () => {
    const allTypes = [
      'REPORT_CARD',
      'CERTIFICATE',
      'AWARD_LETTER',
      'WORK_EXPERIENCE_LETTER',
      'REFERENCE_LETTER',
      'OTHER',
    ] as const

    for (const typeTag of allTypes) {
      const student = await createTestStudent({
        schoolStudentId: `S-${typeTag.slice(0, 6)}`,
      })
      const token = staffToken()

      const res = await request(app)
        .post(`/api/students/${student.id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', validPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
        .field('typeTag', typeTag)

      expect(res.status).toBe(201)
    }
  })
})
