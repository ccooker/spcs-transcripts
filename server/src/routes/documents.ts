import { Router } from 'express'
import type express from 'express'
import multer from 'multer'
import { MulterError } from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import {
  uploadDocument,
  listDocuments,
  softDeleteDocument,
  getDocumentForDownload,
  UPLOAD_ROOT,
  DocumentNotFoundError,
} from '../services/document.js'
import { documentTypeTagSchema, documentParamSchema } from '../schemas/document.js'
import { studentIdParamSchema } from '../schemas/student.js'

const router = Router({ mergeParams: true })

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(null, false)
    } else {
      cb(null, true)
    }
  },
})

function parseStudentId(
  id: string | string[] | undefined,
  res: express.Response,
): string | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  const parsed = studentIdParamSchema.safeParse(raw)
  if (!parsed.success) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  return parsed.data
}

router.get('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    const docs = await listDocuments(prisma, studentId)
    res.json(docs)
  } catch (err) {
    next(err)
  }
})

router.post('/', upload.single('file'), async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  if (!req.file) {
    res.status(400).json({ error: 'Only PDF files are accepted.' })
    return
  }

  const magic = req.file.buffer.subarray(0, 4)
  if (!magic.equals(PDF_MAGIC)) {
    res.status(400).json({ error: 'Only PDF files are accepted.' })
    return
  }

  const parsedTypeTag = documentTypeTagSchema.safeParse(req.body?.typeTag)
  if (!parsedTypeTag.success) {
    res.status(400).json({ error: 'Invalid document type.' })
    return
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      res.status(404).json({ error: 'Student not found' })
      return
    }

    const doc = await uploadDocument(
      prisma,
      studentId,
      req.user!.id,
      req.file.buffer,
      req.file.originalname,
      parsedTypeTag.data,
    )
    res.status(201).json(doc)
  } catch (err) {
    next(err)
  }
})

router.get('/:docId/download', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  const parsedParam = documentParamSchema.safeParse({ docId: req.params['docId'] })
  if (!parsedParam.success) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  try {
    const doc = await getDocumentForDownload(prisma, parsedParam.data.docId, studentId)
    const fullPath = path.join(UPLOAD_ROOT, doc.storedPath)

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found on disk' })
      return
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalFilename)}`,
    )
    res.setHeader('Content-Type', 'application/pdf')

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
    if (err instanceof DocumentNotFoundError) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    next(err)
  }
})

router.delete('/:docId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  const parsedParam = documentParamSchema.safeParse({ docId: req.params['docId'] })
  if (!parsedParam.success) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  try {
    const doc = await softDeleteDocument(prisma, parsedParam.data.docId, studentId, req.user!.id)
    res.status(200).json(doc)
  } catch (err) {
    if (err instanceof DocumentNotFoundError) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    next(err)
  }
})

router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File exceeds the 25 MB limit.' })
      return
    }
    res.status(400).json({ error: 'Upload error.' })
    return
  }
  next(err)
})

export default router
