import { z } from 'zod'
// @ts-ignore — DocumentType not yet in generated client; available after prisma generate in 04-02
import { DocumentType } from '../generated/prisma/client.js'

export const documentTypeTagSchema = z.nativeEnum(DocumentType)

export const documentParamSchema = z.object({
  docId: z.string().uuid(),
})
