import { Router } from 'express'

const router = Router()

router.get('/me', (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    displayName: req.user!.displayName,
    role: req.user!.role,
  })
})

export default router
