import express from 'express'
import { requireRole } from './middleware/requireRole.js'
import { Role } from './generated/prisma/client.js'

export const app = express()

app.use(express.json())

// Temporary admin-only test route for auth-02-admin-route test (RED phase)
// requireRole import will fail until Plan 03 implements the middleware
app.get('/api/admin/test', requireRole(Role.ADMIN), (_req, res) => res.json({ ok: true }))
