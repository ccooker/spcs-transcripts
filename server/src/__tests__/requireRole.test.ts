import { describe, it, expect, vi } from 'vitest'
import { requireRole } from '../../middleware/requireRole.js'
import { Role } from '../../generated/prisma/client.js'
import type { Request, Response, NextFunction } from 'express'

describe('requireRole middleware', () => {
  it('auth-02-403: returns 403 when user role is STAFF and Role.ADMIN is required', () => {
    const mockReq = { user: { role: Role.STAFF } } as unknown as Request
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    const mockNext = vi.fn() as unknown as NextFunction

    requireRole(Role.ADMIN)(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('auth-02-admin-pass: calls next() when user role is Role.ADMIN and Role.ADMIN is required', () => {
    const mockReq = { user: { role: Role.ADMIN } } as unknown as Request
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    const mockNext = vi.fn() as unknown as NextFunction

    requireRole(Role.ADMIN)(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalledWith(403)
  })
})
