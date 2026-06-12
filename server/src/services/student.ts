import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createStudentSchema } from '../schemas/student.js'

type CreateStudentInput = z.infer<typeof createStudentSchema>

export async function createStudent(
  prisma: InstanceType<typeof PrismaClient>,
  data: CreateStudentInput,
  userId: string,
) {
  const student = await prisma.student.create({
    data: {
      fullName: data.fullName,
      formLevel: data.formLevel,
      graduationYear: data.graduationYear,
      schoolStudentId: data.schoolStudentId,
      studentEmail: data.studentEmail || null,
      studentPhone: data.studentPhone ?? null,
      parentEmail: data.parentEmail || null,
      parentPhone: data.parentPhone ?? null,
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'Student',
    recordId: student.id,
  })

  return student
}
