import { Role } from '../generated/prisma/client.js'
import type { Request, Response, NextFunction } from 'express'

export const requireRole = (role: Role) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
