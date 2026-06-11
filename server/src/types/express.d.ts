export {}

declare global {
  namespace Express {
    interface Request {
      user?: import('../generated/prisma/client.js').User
    }
  }
}
