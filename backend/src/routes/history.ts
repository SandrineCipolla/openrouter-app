import { Router, Request, Response } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(db.getAll())
})

router.post('/', (req: Request, res: Response) => {
  const { id, prompt, timestamp, results } = req.body
  if (!id || !prompt || !timestamp || !Array.isArray(results)) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  db.upsert({ id, prompt, timestamp, results })
  const saved = db.getAll().find((e) => e.id === id)
  res.status(201).json(saved)
})

router.patch('/results/:resultId/rating', (req: Request, res: Response) => {
  const resultId = parseInt(req.params.resultId, 10)
  const { rating } = req.body
  if (![1, -1, 0].includes(rating)) {
    res.status(400).json({ error: 'rating doit être 1, -1 ou 0' })
    return
  }
  db.rate(resultId, rating)
  res.json({ ok: true })
})

router.delete('/', (_req: Request, res: Response) => {
  db.clear()
  res.json({ ok: true })
})

export default router
