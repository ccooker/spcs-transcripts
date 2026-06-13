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
    expect(true).toBe(false)
  })

  it('doc-01-reject-magic: POST application/pdf MIME but wrong magic bytes returns 400', async () => {
    expect(true).toBe(false)
  })

  it('doc-01-size-limit: POST file > 25 MB returns 400', async () => {
    expect(true).toBe(false)
  })

  it('doc-01-idor: POST valid PDF to another student URL returns 404', async () => {
    expect(true).toBe(false)
  })

  it('doc-01: POST valid PDF + REPORT_CARD returns 201 with document metadata', async () => {
    expect(true).toBe(false)
  })

  it('doc-02: GET /documents returns active docs; excludes soft-deleted', async () => {
    expect(true).toBe(false)
  })

  it('doc-02-download: GET /documents/:docId/download returns 200 with Content-Disposition attachment', async () => {
    expect(true).toBe(false)
  })

  it('doc-03: DELETE /documents/:docId returns 200; subsequent GET excludes that docId', async () => {
    expect(true).toBe(false)
  })

  it('doc-03-audit: DELETE /documents/:docId creates AuditLog with model=Document action=DELETE', async () => {
    expect(true).toBe(false)
  })

  it('doc-04-invalid-type: POST valid PDF + invalid typeTag returns 400', async () => {
    expect(true).toBe(false)
  })

  it('doc-04-all-types: POST valid PDF with each of 6 valid type tags returns 201', async () => {
    expect(true).toBe(false)
  })
})
