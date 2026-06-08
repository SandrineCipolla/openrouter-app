import { Model, ModelResult } from '../types'

const LOCAL_STORAGE_KEY = 'openrouter_api_key'

export function getApiKey(): string | null {
  return (
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    localStorage.getItem(LOCAL_STORAGE_KEY) ||
    null
  )
}

export async function fetchFreeModels(): Promise<Model[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} lors du chargement des modèles`)
  const data = await res.json()
  return (data.data as Model[]).filter((m) => m.id.endsWith(':free'))
}

export async function sendSingleMessage(
  apiKey: string,
  modelId: string,
  prompt: string,
  temperature: number,
  signal?: AbortSignal
): Promise<ModelResult> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'OpenRouter Chat',
    },
    body: JSON.stringify({
      model: modelId,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    let message = `${res.status}`
    try {
      const body = await res.json()
      message = body?.error?.message ?? body?.message ?? message
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new Error(message)
  }
  const data = await res.json()
  return {
    model: data.model as string,
    content: data.choices[0].message.content as string,
    status: 'success',
  }
}

export async function sendMessage(
  apiKey: string,
  modelIds: string[],
  prompt: string,
  temperature: number
): Promise<ModelResult[]> {
  const settled = await Promise.allSettled(
    modelIds.map((id) => sendSingleMessage(apiKey, id, prompt, temperature))
  )
  return settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      model: modelIds[i],
      content: '',
      status: 'error' as const,
      error: result.reason instanceof Error ? result.reason.message : 'Erreur inconnue',
    }
  })
}
