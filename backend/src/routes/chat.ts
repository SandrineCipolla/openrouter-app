import { Router, Request, Response } from 'express'
import fetch from 'node-fetch'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Clé API manquante côté serveur' })
    return
  }

  const { modelId, prompt, temperature } = req.body
  if (!modelId || !prompt) {
    res.status(400).json({ error: 'modelId et prompt sont requis' })
    return
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'OpenRouter Chat',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: temperature ?? 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    let message = `${response.status}`
    try {
      const body = await response.json() as { error?: { message?: string }; message?: string }
      message = body?.error?.message ?? body?.message ?? message
    } catch {
      const text = await response.text().catch(() => '')
      if (text) message = text
    }
    res.status(response.status).json({ error: message })
    return
  }

  const data = await response.json() as {
    model: string
    choices?: { message: { content: string } }[]
  }

  if (!data.choices?.[0]?.message?.content) {
    res.status(502).json({ error: `Réponse invalide du modèle : ${JSON.stringify(data)}` })
    return
  }

  res.json({
    model: data.model,
    content: data.choices[0].message.content,
    status: 'success',
  })
})

export default router