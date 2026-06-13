import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function getSettings(prisma: InstanceType<typeof PrismaClient>) {
  return prisma.schoolSettings.findUnique({ where: { id: 'singleton' } })
}

export async function upsertSettings(
  prisma: InstanceType<typeof PrismaClient>,
  data: { schoolName: string; schoolAddress?: string; letterheadHtml?: string },
  logoFile?: { buffer: Buffer; originalname: string },
  uploadRoot?: string,
  userId?: string,
) {
  let logoPath: string | undefined

  if (logoFile && uploadRoot) {
    const ext = path.extname(logoFile.originalname).slice(1).toLowerCase() || 'png'
    logoPath = `branding/logo.${ext}`
    await writeFile(path.join(uploadRoot, logoPath), logoFile.buffer)
  }

  const result = await prisma.schoolSettings.upsert({
    where: { id: 'singleton' },
    update: {
      ...data,
      ...(logoPath !== undefined && { logoPath }),
      updatedAt: new Date(),
    },
    create: {
      id: 'singleton',
      ...data,
      ...(logoPath !== undefined && { logoPath }),
    },
  })

  if (userId) {
    await logAudit(prisma, {
      userId,
      action: 'UPDATE',
      model: 'SchoolSettings',
      recordId: 'singleton',
      details: { updatedFields: Object.keys(data) },
    })
  }

  return result
}
