import { Model, ModelResult } from '../types'

const BACKEND = 'http://localhost:3001'

export async function fetchFreeModels(): Promise<Model[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} lors du chargement des modèles`)
  const data = await res.json()
  return (data.data as Model[]).filter((m) => m.id.endsWith(':free'))
}

export async function sendSingleMessage(
  modelId: string,
  prompt: string,
  temperature: number,
  signal?: AbortSignal
): Promise<ModelResult> {
  const res = await fetch(`${BACKEND}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, prompt, temperature }),
  })

  if (!res.ok) {
    let message = `${res.status}`
    try {
      const body = await res.json()
      message = body?.error ?? message
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new Error(message)
  }

  const data = await res.json()
  return { ...data, status: 'success' as const }
}
