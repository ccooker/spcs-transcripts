import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { validateJwt, resolveUser } from './middleware/auth.js'
import { requireRole } from './middleware/requireRole.js'
import { Role } from './generated/prisma/client.js'
import authRouter from './routes/auth.js'
import studentsRouter from './routes/students.js'
import settingsRouter from './routes/settings.js'

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'
fs.mkdirSync(path.join(UPLOAD_ROOT, 'students'), { recursive: true })
fs.mkdirSync(path.join(UPLOAD_ROOT, 'branding'), { recursive: true })

export const app = express()

app.use(helmet())
app.use(express.json())

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
}

app.use('/api', validateJwt)
app.use('/api', resolveUser)

app.use('/api/auth', authRouter)
app.use('/api/students', studentsRouter)
app.use('/api/settings', settingsRouter)

// Admin-only test route used by auth-02-admin-route integration test
app.get('/api/admin/test', requireRole(Role.ADMIN), (_req, res) => res.json({ ok: true }))

// Global error handler for JWT validation failures
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Invalid or missing token' })
    return
  }
  next(err)
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err)
  res.status(500).json({ error: 'Internal server error' })
})
