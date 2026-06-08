import { useState, useEffect, useCallback } from 'react'
import { HistoryEntry } from '../types'

const API = 'http://localhost:3001/api/history'

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((data) => setEntries(data))
      .catch(() => {})
  }, [])

  const upsertEntry = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      return idx >= 0
        ? prev.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...prev]
    })

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
      .then((r) => r.json())
      .then((saved: HistoryEntry) => {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? saved : e)))
      })
      .catch(() => {})
  }, [])

  const rateResult = useCallback((resultId: number, rating: 1 | -1 | 0) => {
    fetch(`${API}/results/${resultId}/rating`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    }).catch(() => {})

    setEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        results: entry.results.map((r) =>
          (r as any).id === resultId ? { ...r, rating } : r
        ),
      }))
    )
  }, [])

  const clearAll = useCallback(() => {
    fetch(API, { method: 'DELETE' }).catch(() => {})
    setEntries([])
  }, [])

  return { entries, upsertEntry, rateResult, clearAll }
}
