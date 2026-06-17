import { Router } from 'express'
import type express from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { upsertTranscriptSchema } from '../schemas/transcript.js'
import {
  buildAutoPopulatedContent,
  buildPdfHtml,
  getOrBuild,
  upsert,
} from '../services/transcript.js'
import { generatePdf } from '../services/pdf.js'
import { getSettings } from '../services/settings.js'
import { logAudit } from '../services/audit.js'

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'

const router = Router({ mergeParams: true })

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

async function assertStudentExists(studentId: string, res: express.Response) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  return student
}

function mapTranscriptResponse(result: Awaited<ReturnType<typeof getOrBuild>>) {
  return {
    autoPopulated: result.autoPopulated,
    showRecordsBanner: result.showRecordsBanner,
    status: result.transcript?.status ?? 'NONE',
    updatedAt: result.transcript?.updatedAt ?? null,
    academicsContent: result.academicsContent,
    activitiesContent: result.activitiesContent,
    awardsContent: result.awardsContent,
    workExperienceContent: result.workExperienceContent,
    careerGoalsContent: result.careerGoalsContent,
    staffEndorsementContent: result.staffEndorsementContent,
    academicsVisible: result.academicsVisible,
    activitiesVisible: result.activitiesVisible,
    awardsVisible: result.awardsVisible,
    workExperienceVisible: result.workExperienceVisible,
    careerGoalsVisible: result.careerGoalsVisible,
    staffEndorsementVisible: result.staffEndorsementVisible,
  }
}

router.get('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  try {
    if (!(await assertStudentExists(studentId, res))) return

    const result = await getOrBuild(prisma, studentId)
    res.json(mapTranscriptResponse(result))
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  const parsed = upsertTranscriptSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  try {
    if (!(await assertStudentExists(studentId, res))) return

    const { regenerate, ...upsertData } = parsed.data

    if (regenerate === true) {
      const content = await buildAutoPopulatedContent(prisma, studentId)
      Object.assign(upsertData, content)
    }

    const result = await upsert(prisma, studentId, upsertData, req.user!.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/export', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return

  try {
    const student = await assertStudentExists(studentId, res)
    if (!student) return

    const transcriptData = await getOrBuild(prisma, studentId)
    const settings = await getSettings(prisma)
    const html = await buildPdfHtml(transcriptData, settings, UPLOAD_ROOT)
    const pdfBuffer = await generatePdf(html)

    await logAudit(prisma, {
      userId: req.user!.id,
      action: 'UPDATE',
      model: 'Transcript',
      recordId: transcriptData.transcript?.id ?? studentId,
      details: { export: true },
    })

    const filename = `transcript-${student.fullName}.pdf`
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (err) {
    console.error('Transcript export failed:', err)
    next(err)
  }
})

export default router
