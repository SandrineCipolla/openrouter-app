import { useState, useCallback } from 'react'
import { HistoryEntry } from '../types'

const STORAGE_KEY = 'chat_history'

function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function saveToStorage(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(loadFromStorage)

  const upsertEntry = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      const next =
        idx >= 0
          ? prev.map((e) => (e.id === entry.id ? entry : e))
          : [entry, ...prev]
      saveToStorage(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { entries, upsertEntry, clearAll }
}