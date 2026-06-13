import os from 'node:os'
process.env.UPLOAD_ROOT = os.tmpdir()

import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb } from './helpers/testDb.js'

const staffToken = () =>
  makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })

const adminToken = () => {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@school.edu'
  return makeTestToken({ preferred_username: adminEmail, name: 'Admin User' })
}

// Minimal valid 1x1 PNG
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

beforeEach(clearDb)

describe('Settings', () => {
  it('set-01-staff-forbidden: PUT /api/settings with staff token returns 403', async () => {
    const token = staffToken()
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolName: 'SPCS' })

    expect(res.status).toBe(403)
  })

  it('set-02-get-empty: GET /api/settings as Admin returns 200 with empty or null settings', async () => {
    const token = adminToken()
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body === null || Object.keys(res.body).length === 0 || !res.body.schoolName).toBe(
      true,
    )
  })

  it('set-03-put-upsert: PUT upserts schoolName; second PUT updates without duplicate row', async () => {
    const token = adminToken()
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    const firstRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolName: 'SPCS', schoolAddress: '123 School Rd' })

    expect(firstRes.status).toBe(200)

    const secondRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolName: 'St Paul Co-ed', schoolAddress: '123 School Rd' })

    expect(secondRes.status).toBe(200)

    const getRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.schoolName).toBe('St Paul Co-ed')
  })

  it('set-04-logo-get: PUT logo then GET /api/settings/logo returns image/png', async () => {
    const token = adminToken()
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    const putRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', validPngBuffer, { filename: 'logo.png', contentType: 'image/png' })
      .field('schoolName', 'SPCS')

    expect(putRes.status).toBe(200)

    const logoRes = await request(app)
      .get('/api/settings/logo')
      .set('Authorization', `Bearer ${token}`)

    expect(logoRes.status).toBe(200)
    expect(logoRes.headers['content-type']).toMatch(/image\/png/)
  })
})
