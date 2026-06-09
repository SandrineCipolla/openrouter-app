import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(__dirname, '..', 'history.json')

export interface StoredResult {
  id: number
  model: string
  content: string
  status: string
  error?: string
  temperature?: number
  rating?: number
}

export interface StoredEntry {
  id: string
  prompt: string
  timestamp: number
  results: StoredResult[]
}

interface Store {
  entries: StoredEntry[]
  nextResultId: number
}

function read(): Store {
  if (!fs.existsSync(DB_PATH)) return { entries: [], nextResultId: 1 }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Store
  } catch {
    return { entries: [], nextResultId: 1 }
  }
}

function write(store: Store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export const db = {
  getAll(): StoredEntry[] {
    return read().entries.sort((a, b) => b.timestamp - a.timestamp)
  },

  upsert(entry: { id: string; prompt: string; timestamp: number; results: Omit<StoredResult, 'id'>[] }) {
    const store = read()
    const idx = store.entries.findIndex((e) => e.id === entry.id)
    const results: StoredResult[] = entry.results.map((r) => ({
      ...r,
      id: store.nextResultId++,
    }))
    const stored: StoredEntry = { ...entry, results }
    if (idx >= 0) {
      store.entries[idx] = stored
    } else {
      store.entries.unshift(stored)
    }
    write(store)
  },

  rate(resultId: number, rating: number) {
    const store = read()
    for (const entry of store.entries) {
      const result = entry.results.find((r) => r.id === resultId)
      if (result) {
        result.rating = rating
        break
      }
    }
    write(store)
  },

  clear() {
    write({ entries: [], nextResultId: 1 })
  },
}
