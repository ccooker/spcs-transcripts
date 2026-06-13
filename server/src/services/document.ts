import { PrismaClient } from '../generated/prisma/client.js'
import type { DocumentType } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? 'uploads'

export class DocumentNotFoundError extends Error {
  constructor() {
    super('Document not found')
    this.name = 'DocumentNotFoundError'
  }
}

export async function uploadDocument(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  uploaderId: string,
  buffer: Buffer,
  originalFilename: string,
  typeTag: DocumentType,
) {
  const dir = path.join(UPLOAD_ROOT, 'students', studentId)
  await mkdir(dir, { recursive: true })
  const uuid = randomUUID()
  const storedPath = path.join('students', studentId, `${uuid}.pdf`)
  await writeFile(path.join(UPLOAD_ROOT, storedPath), buffer)

  const doc = await prisma.document.create({
    data: { studentId, uploaderId, originalFilename, storedPath, typeTag },
    include: { uploader: { select: { displayName: true } } },
  })

  await logAudit(prisma, {
    userId: uploaderId,
    action: 'CREATE',
    model: 'Document',
    recordId: doc.id,
    details: { originalFilename, typeTag },
  })

  return doc
}

export async function listDocuments(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.document.findMany({
    where: { studentId, deletedAt: null },
    include: { uploader: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function softDeleteDocument(
  prisma: InstanceType<typeof PrismaClient>,
  docId: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.document.findUnique({ where: { id: docId } })
  if (!existing || existing.studentId !== studentId || existing.deletedAt !== null) {
    throw new DocumentNotFoundError()
  }

  const doc = await prisma.document.update({
    where: { id: docId },
    data: { deletedAt: new Date() },
  })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'Document',
    recordId: docId,
    details: { originalFilename: doc.originalFilename, typeTag: doc.typeTag },
  })

  return doc
}

export async function getDocumentForDownload(
  prisma: InstanceType<typeof PrismaClient>,
  docId: string,
  studentId: string,
) {
  const doc = await prisma.document.findUnique({ where: { id: docId } })
  if (!doc || doc.studentId !== studentId || doc.deletedAt !== null) {
    throw new DocumentNotFoundError()
  }
  return doc
}
