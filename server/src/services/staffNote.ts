import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'

export async function listStaffNotes(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.staffNote.findMany({
    where: { studentId },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createStaffNote(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  content: string,
  userId: string,
) {
  const note = await prisma.staffNote.create({
    data: {
      studentId,
      authorId: userId,
      content,
    },
    include: { author: { select: { displayName: true } } },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'StaffNote',
    recordId: note.id,
  })

  return note
}
// NO updateStaffNote or deleteStaffNote — append-only by design (D-17)
