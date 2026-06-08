export type Tab = 'chat' | 'historique' | 'config'

export interface Model {
  id: string
  name: string
  context_length?: number
}

export interface ModelResult {
  model: string
  content: string
  status: 'success' | 'error'
  error?: string
  temperature?: number
}

export interface HistoryEntry {
  id: string
  prompt: string
  results: ModelResult[]
  timestamp: number
}
