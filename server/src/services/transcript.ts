import { PrismaClient } from '../generated/prisma/client.js'
import type { TranscriptStatus } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

type PrismaClientInstance = InstanceType<typeof PrismaClient>

type PeriodRecord = {
  startYear: number
  endYear: number | null | undefined
}

export class TranscriptNotFoundError extends Error {
  constructor() {
    super('Transcript not found')
    this.name = 'TranscriptNotFoundError'
  }
}

function formatPeriod(record: PeriodRecord): string {
  if (record.endYear == null) {
    return `${record.startYear}–present`
  }
  return `${record.startYear}–${record.endYear}`
}

function formatCareerInterest(interest: string): string {
  return interest
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export async function buildAutoPopulatedContent(
  prisma: PrismaClientInstance,
  studentId: string,
) {
  const [academics, activities, awards, workExperiences, careerGoals] = await Promise.all([
    prisma.academicResult.findMany({
      where: { studentId },
      orderBy: { calendarYear: 'desc' },
    }),
    prisma.activity.findMany({
      where: { studentId },
      orderBy: { startYear: 'desc' },
    }),
    prisma.award.findMany({
      where: { studentId },
      orderBy: { awardYear: 'desc' },
    }),
    prisma.workExperience.findMany({
      where: { studentId },
      orderBy: { startYear: 'desc' },
    }),
    prisma.careerGoal.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
  ])

  const academicsContent =
    academics.length > 0
      ? academics
          .map(
            (result) =>
              `<p>Achieved ${result.grade} in ${result.subject} (${result.calendarYear}).</p>`,
          )
          .join('')
      : null

  const activitiesContent =
    activities.length > 0
      ? activities
          .map(
            (activity) =>
              `<p>${activity.role} at ${activity.organisation} (${formatPeriod(activity)}).</p>`,
          )
          .join('')
      : null

  const awardsContent =
    awards.length > 0
      ? awards
          .map(
            (award) =>
              `<p>${award.title} (${award.level}) from ${award.issuer} (${award.awardYear}).</p>`,
          )
          .join('')
      : null

  const workExperienceContent =
    workExperiences.length > 0
      ? workExperiences
          .map(
            (work) =>
              `<p>${work.role} at ${work.employer} (${formatPeriod(work)}).</p>`,
          )
          .join('')
      : null

  let careerGoalsContent: string | null = null
  const latestGoal = careerGoals[0]
  if (latestGoal) {
    const parts: string[] = []
    if (latestGoal.interests.length > 0) {
      parts.push(latestGoal.interests.map(formatCareerInterest).join(', '))
    }
    if (latestGoal.description) {
      parts.push(latestGoal.description)
    }
    if (parts.length > 0) {
      careerGoalsContent = `<p>${parts.join('. ')}</p>`
    }
  }

  return {
    academicsContent,
    activitiesContent,
    awardsContent,
    workExperienceContent,
    careerGoalsContent,
    staffEndorsementContent: null as string | null,
  }
}

export async function computeMaxRecordTimestamp(
  prisma: PrismaClientInstance,
  studentId: string,
): Promise<Date | null> {
  const [academic, activity, award, workExperience, careerGoal] = await Promise.all([
    prisma.academicResult.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.activity.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.award.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.workExperience.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.careerGoal.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const timestamps = [
    academic?.updatedAt,
    activity?.updatedAt,
    award?.updatedAt,
    workExperience?.updatedAt,
    careerGoal?.createdAt,
  ].filter((value): value is Date => value instanceof Date)

  if (timestamps.length === 0) {
    return null
  }

  return new Date(Math.max(...timestamps.map((value) => value.getTime())))
}

export type UpsertTranscriptData = {
  status?: TranscriptStatus
  academicsContent?: string | null
  activitiesContent?: string | null
  awardsContent?: string | null
  workExperienceContent?: string | null
  careerGoalsContent?: string | null
  staffEndorsementContent?: string | null
  academicsVisible?: boolean
  activitiesVisible?: boolean
  awardsVisible?: boolean
  workExperienceVisible?: boolean
  careerGoalsVisible?: boolean
  staffEndorsementVisible?: boolean
}

export async function getOrBuild(prisma: PrismaClientInstance, studentId: string) {
  const transcript = await prisma.transcript.findUnique({ where: { studentId } })

  if (!transcript) {
    const content = await buildAutoPopulatedContent(prisma, studentId)
    return {
      transcript: null,
      autoPopulated: true,
      showRecordsBanner: false,
      ...content,
      academicsVisible: true,
      activitiesVisible: true,
      awardsVisible: true,
      workExperienceVisible: true,
      careerGoalsVisible: true,
      staffEndorsementVisible: true,
    }
  }

  const maxTimestamp = await computeMaxRecordTimestamp(prisma, studentId)
  const showRecordsBanner = maxTimestamp ? maxTimestamp > transcript.updatedAt : false

  return {
    transcript,
    autoPopulated: false,
    showRecordsBanner,
    academicsContent: transcript.academicsContent,
    activitiesContent: transcript.activitiesContent,
    awardsContent: transcript.awardsContent,
    workExperienceContent: transcript.workExperienceContent,
    careerGoalsContent: transcript.careerGoalsContent,
    staffEndorsementContent: transcript.staffEndorsementContent,
    academicsVisible: transcript.academicsVisible,
    activitiesVisible: transcript.activitiesVisible,
    awardsVisible: transcript.awardsVisible,
    workExperienceVisible: transcript.workExperienceVisible,
    careerGoalsVisible: transcript.careerGoalsVisible,
    staffEndorsementVisible: transcript.staffEndorsementVisible,
  }
}

export async function upsert(
  prisma: PrismaClientInstance,
  studentId: string,
  data: UpsertTranscriptData,
  userId: string,
) {
  const result = await prisma.transcript.upsert({
    where: { studentId },
    update: { ...data, updatedAt: new Date() },
    create: { studentId, ...data },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'Transcript',
    recordId: result.id,
    details: { status: data.status ?? 'unchanged' },
  })

  return result
}

type SchoolSettingsRow = {
  schoolName: string
  schoolAddress: string | null
  letterheadHtml: string | null
  logoPath: string | null
}

type TranscriptPdfSource = {
  academicsContent: string | null
  activitiesContent: string | null
  awardsContent: string | null
  workExperienceContent: string | null
  careerGoalsContent: string | null
  staffEndorsementContent: string | null
  academicsVisible: boolean
  activitiesVisible: boolean
  awardsVisible: boolean
  workExperienceVisible: boolean
  careerGoalsVisible: boolean
  staffEndorsementVisible: boolean
}

async function readLogoDataUri(
  uploadRoot: string,
  logoPath: string | null | undefined,
): Promise<string | null> {
  if (!logoPath) {
    return null
  }

  try {
    const fullPath = path.join(uploadRoot, logoPath)
    const buffer = await readFile(fullPath)
    const ext = path.extname(logoPath).slice(1).toLowerCase()
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext || 'png'}`
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

function renderSection(title: string, content: string | null | undefined): string {
  if (!content) {
    return ''
  }
  return `<section><h2>${title}</h2>${content}</section>`
}

export async function buildPdfHtml(
  transcript: TranscriptPdfSource,
  settings: SchoolSettingsRow | null,
  uploadRoot: string,
): Promise<string> {
  const logoDataUri = settings?.logoPath
    ? await readLogoDataUri(uploadRoot, settings.logoPath)
    : null

  const sections = [
    transcript.academicsVisible
      ? renderSection('Academics', transcript.academicsContent)
      : '',
    transcript.activitiesVisible
      ? renderSection('Activities', transcript.activitiesContent)
      : '',
    transcript.awardsVisible ? renderSection('Awards', transcript.awardsContent) : '',
    transcript.workExperienceVisible
      ? renderSection('Work Experience', transcript.workExperienceContent)
      : '',
    transcript.careerGoalsVisible
      ? renderSection('Career Goals', transcript.careerGoalsContent)
      : '',
    transcript.staffEndorsementVisible
      ? renderSection('Staff Endorsement', transcript.staffEndorsementContent)
      : '',
  ].join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; margin: 0; }
    h1 { font-family: 'Times New Roman', Times, serif; font-size: 18pt; margin: 0 0 8px; }
    h2 { font-family: Arial, sans-serif; font-size: 14pt; margin: 20px 0 8px; }
    p { margin: 0 0 8px; }
    section { page-break-inside: avoid; margin-bottom: 16px; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  ${logoDataUri ? `<img src="${logoDataUri}" alt="School logo" style="height:60px;width:auto;margin-bottom:12px;">` : ''}
  <h1>${settings?.schoolName ?? 'School Transcript'}</h1>
  ${settings?.schoolAddress ? `<p>${settings.schoolAddress}</p>` : ''}
  ${settings?.letterheadHtml ?? ''}
  ${sections}
</body>
</html>`
}
