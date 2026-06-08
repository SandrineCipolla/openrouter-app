import { useState, useEffect, useCallback } from 'react'
import { Model } from '../types'
import { fetchFreeModels } from '../api/openrouter'

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchFreeModels()
      setModels(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pickRandom = useCallback((): Model | null => {
    if (models.length === 0) return null
    return models[Math.floor(Math.random() * models.length)]
  }, [models])

  const pickMultipleRandom = useCallback((n: number): Model[] => {
    if (models.length === 0) return []
    const shuffled = [...models].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(n, models.length))
  }, [models])

  return { models, loading, error, refresh: load, pickRandom, pickMultipleRandom }
}