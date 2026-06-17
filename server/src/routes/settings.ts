import { Router } from 'express'
import type express from 'express'
import multer from 'multer'
import { MulterError } from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { Role } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { requireRole } from '../middleware/requireRole.js'
import { settingsBodySchema } from '../schemas/settings.js'
import { getSettings, upsertSettings } from '../services/settings.js'

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'

const router = Router()

router.use(requireRole(Role.ADMIN))

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(null, false)
    } else {
      cb(null, true)
    }
  },
})

function contentTypeForLogo(logoPath: string): string {
  const ext = path.extname(logoPath).slice(1).toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg'
  }
  return `image/${ext || 'png'}`
}

router.get('/', async (_req, res, next) => {
  try {
    const settings = await getSettings(prisma)
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

router.put('/', logoUpload.single('logo'), async (req, res, next) => {
  const parsed = settingsBodySchema.safeParse({
    schoolName: req.body?.schoolName,
    schoolAddress: req.body?.schoolAddress || undefined,
    letterheadHtml: req.body?.letterheadHtml || undefined,
  })

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  try {
    const logoFile = req.file
      ? { buffer: req.file.buffer, originalname: req.file.originalname }
      : undefined

    const settings = await upsertSettings(
      prisma,
      parsed.data,
      logoFile,
      UPLOAD_ROOT,
      req.user!.id,
    )
    res.json(settings)
  } catch (err) {
    console.error('Settings save failed:', err)
    next(err)
  }
})

router.get('/logo', async (_req, res, next) => {
  try {
    const settings = await getSettings(prisma)
    if (!settings?.logoPath) {
      res.status(404).json({ error: 'Logo not found' })
      return
    }

    const fullPath = path.join(UPLOAD_ROOT, settings.logoPath)

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Logo not found' })
      return
    }

    res.setHeader('Content-Type', contentTypeForLogo(settings.logoPath))

    const stream = fs.createReadStream(fullPath)
    stream.on('error', (streamErr) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'File read error' })
      } else {
        res.destroy(streamErr)
      }
    })
    stream.pipe(res)
  } catch (err) {
    next(err)
  }
})

router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File exceeds the 5 MB limit.' })
      return
    }
    res.status(400).json({ error: 'Upload error.' })
    return
  }
  next(err)
})

export default router
