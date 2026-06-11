import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'
import { makeTestToken } from './helpers/makeTestToken.js'
import { clearDb, prisma } from './helpers/testDb.js'

beforeEach(clearDb)

describe('GET /api/auth/me', () => {
  it('auth-01-401: returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('auth-01-200: returns 200 with user identity for valid token (preferred_username: staff@school.edu)', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Test Staff' })
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('email', 'staff@school.edu')
    expect(res.body).toHaveProperty('displayName')
    expect(res.body).toHaveProperty('role', 'STAFF')
  })

  it('auth-01-upsert: GET /api/auth/me with new user token creates User record in DB', async () => {
    const token = makeTestToken({ preferred_username: 'newuser@school.edu', name: 'New User' })
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    const user = await prisma.user.findUnique({ where: { email: 'newuser@school.edu' } })
    expect(user).not.toBeNull()
    expect(user?.email).toBe('newuser@school.edu')
  })

  it('auth-02-bootstrap: token with preferred_username matching BOOTSTRAP_ADMIN_EMAIL gets role ADMIN', async () => {
    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@school.edu'
    const token = makeTestToken({ preferred_username: adminEmail, name: 'Admin User' })
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('role', 'ADMIN')
    expect(res.body).toHaveProperty('email', adminEmail)
  })

  it('auth-02-admin-route: Staff role token gets 403 on admin-only route', async () => {
    const token = makeTestToken({ preferred_username: 'staff@school.edu', name: 'Staff User' })
    const res = await request(app)
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})
