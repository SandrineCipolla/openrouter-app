import { useState, useEffect } from 'react'

interface Props {
  modelsCount: number
  modelsLoading: boolean
  modelsError: string | null
  onRefresh: () => void
}

const API_KEY_STORAGE = 'openrouter_api_key'

export function ConfigPanel({ modelsCount, modelsLoading, modelsError, onRefresh }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE)
    if (stored) setApiKey(stored)
  }, [])

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="panel config-panel">
      <section className="config-section">
        <h2>Clé API</h2>
        <p className="hint">
          Obtenez une clé sur{' '}
          <span className="accent">openrouter.ai/keys</span>
        </p>
        <div className="input-row">
          <input
            type="password"
            className="text-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apiKey.trim() && handleSave()}
            placeholder="sk-or-..."
            spellCheck={false}
            autoComplete="off"
          />
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </div>
      </section>

      <section className="config-section">
        <h2>Modèles gratuits</h2>
        <div className="models-status">
          {modelsLoading && <span className="status-loading">Chargement...</span>}
          {!modelsLoading && modelsError && (
            <span className="status-error">{modelsError}</span>
          )}
          {!modelsLoading && !modelsError && (
            <span className="status-ok">{modelsCount} modèles disponibles</span>
          )}
          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={modelsLoading}
          >
            ↻ Rafraîchir
          </button>
        </div>
      </section>
    </div>
  )
}
