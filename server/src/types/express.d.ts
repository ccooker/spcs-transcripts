export {}

declare global {
  namespace Express {
    interface Request {
      auth?: Record<string, unknown>
      user?: import('../generated/prisma/client.js').User
    }
  }
}
