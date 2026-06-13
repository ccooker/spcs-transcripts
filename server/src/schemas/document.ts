import { z } from 'zod'
import { DocumentType } from '../generated/prisma/client.js'

export const documentTypeTagSchema = z.nativeEnum(DocumentType)

export const documentParamSchema = z.object({
  docId: z.string().uuid(),
})
