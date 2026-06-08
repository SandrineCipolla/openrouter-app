import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ModelResult, HistoryEntry, Model } from '../types'
import { sendSingleMessage } from '../api/openrouter'

interface SendContext {
  prompt: string
}

interface EntryMeta {
  id: string
  prompt: string
  timestamp: number
}

interface Props {
  models: Model[]
  pickMultipleRandom: (n: number) => Model[]
  onUpsertEntry: (entry: HistoryEntry) => void
}

type CardState = { model: string; status: 'loading' } | ModelResult

function getTemperatureLabel(t: number): string {
  if (t <= 0.5) return 'précis'
  if (t <= 1.2) return 'équilibré'
  return 'créatif'
}

function SuccessCard({ card, onRerun }: { card: ModelResult; onRerun?: (temp: number) => void }) {
  const [rerunTemp, setRerunTemp] = useState(card.temperature ?? 0.7)
  return (
    <div className="response-card">
      <div className="card-header">
        <span className="card-model">{card.model}</span>
        {card.temperature !== undefined && (
          <span className="card-temp">temp {card.temperature.toFixed(1)}</span>
        )}
        <span className="card-status-ok">✓</span>
      </div>
      <div className="card-body">
        <p className="card-content">{card.content}</p>
      </div>
      {onRerun && (
        <div className="card-rerun">
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={rerunTemp}
            onChange={(e) => setRerunTemp(parseFloat(e.target.value))}
            className="temp-slider"
          />
          <span className="temp-value">{rerunTemp.toFixed(1)}</span>
          <button
            className="card-rerun-btn"
            onClick={() => onRerun(rerunTemp)}
            title="Relancer ce modèle avec cette température"
          >
            ↺ relancer
          </button>
        </div>
      )}
    </div>
  )
}

function ResponseCard({
  card,
  onRetry,
  onRefresh,
  onRerun,
  onCancel,
}: {
  card: CardState
  onRetry?: () => void
  onRefresh?: () => void
  onRerun?: (temp: number) => void
  onCancel?: () => void
}) {
  if (card.status === 'loading') {
    return (
      <div className="response-card">
        <div className="card-header">
          <span className="card-model">{card.model}</span>
          {onRefresh && (
            <button className="card-refresh-btn" onClick={onRefresh} title="Changer de modèle">
              ↺
            </button>
          )}
          {onCancel && (
            <button className="card-cancel-btn" onClick={onCancel} title="Annuler et restaurer la réponse précédente">
              ✕
            </button>
          )}
        </div>
        <div className="card-loading-area">
          <span className="spinner" />
          <span className="card-loading-label">en attente...</span>
        </div>
      </div>
    )
  }

  if (card.status === 'error') {
    return (
      <div className="response-card error">
        <div className="card-header">
          <span className="card-model">{card.model}</span>
          <span className="card-status-err">✗</span>
        </div>
        <div className="card-body">
          <p className="card-error-text">{card.error ?? 'Erreur inconnue'}</p>
          {onRetry && (
            <button className="card-retry-btn" onClick={onRetry}>
              ↺ Réessayer
            </button>
          )}
        </div>
      </div>
    )
  }

  return <SuccessCard card={card} onRerun={onRerun} />
}

export function ChatPanel({ models, pickMultipleRandom, onUpsertEntry }: Props) {
  const modelsReady = models.length > 0
  const [prompt, setPrompt] = useState('')
  const [modelCount, setModelCount] = useState(3)
  const [temperatures, setTemperatures] = useState<number[]>([0.7, 0.7, 0.7])
  const [cards, setCards] = useState<CardState[]>([])
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastSendRef = useRef<SendContext | null>(null)
  const entryMetaRef = useRef<EntryMeta | null>(null)
  const abortControllersRef = useRef<(AbortController | null)[]>([])
  const lastSuccessCardsRef = useRef<(ModelResult | null)[]>([])

  const isLoading = cards.some((c) => c.status === 'loading')

  // Sync temperatures array length with modelCount
  useEffect(() => {
    setTemperatures((prev) => {
      if (prev.length === modelCount) return prev
      if (prev.length < modelCount)
        return [...prev, ...Array<number>(modelCount - prev.length).fill(0.7)]
      return prev.slice(0, modelCount)
    })
  }, [modelCount])

  // Upsert history whenever all cards settle (initial send + every retry/refresh)
  useEffect(() => {
    if (cards.length === 0 || !entryMetaRef.current) return
    if (cards.some((c) => c.status === 'loading')) return
    onUpsertEntry({ ...entryMetaRef.current, results: cards as ModelResult[] })
  }, [cards, onUpsertEntry])

  const fireSingleRequest = useCallback(
    (
      index: number,
      modelId: string,
      ctx: SendContext,
      temperature: number,
      controller: AbortController
    ) => {
      abortControllersRef.current[index] = controller
      setCards((prev) => {
        const next = [...prev]
        next[index] = { model: modelId, status: 'loading' }
        return next
      })

      sendSingleMessage(modelId, ctx.prompt, temperature, controller.signal)
        .then((result) => {
          setCards((prev) => {
            const next = [...prev]
            next[index] = { ...result, temperature }
            return next
          })
          lastSuccessCardsRef.current[index] = null
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setCards((prev) => {
            const next = [...prev]
            next[index] = {
              model: modelId,
              content: '',
              status: 'error',
              temperature,
              error: e instanceof Error ? e.message : 'Erreur inconnue',
            }
            return next
          })
        })
    },
    []
  )

  const cancelRerun = useCallback((index: number) => {
    abortControllersRef.current[index]?.abort()
    const prev = lastSuccessCardsRef.current[index]
    if (prev) {
      setCards((cards) => {
        const next = [...cards]
        next[index] = prev
        return next
      })
      lastSuccessCardsRef.current[index] = null
    }
  }, [])

  const rerunCard = useCallback(
    (index: number, modelId: string, temperature: number, prevCard: ModelResult) => {
      const ctx = lastSendRef.current
      if (!ctx) return
      lastSuccessCardsRef.current[index] = prevCard
      entryMetaRef.current = { id: crypto.randomUUID(), prompt: ctx.prompt, timestamp: Date.now() }
      abortControllersRef.current[index]?.abort()
      fireSingleRequest(index, modelId, ctx, temperature, new AbortController())
    },
    [fireSingleRequest]
  )

  const refreshCard = useCallback(
    (index: number) => {
      const ctx = lastSendRef.current
      if (!ctx) return

      abortControllersRef.current[index]?.abort()

      const shownIds = new Set(cards.filter((_, i) => i !== index).map((c) => c.model))
      const candidates = models.filter((m) => !shownIds.has(m.id))
      const pool = candidates.length > 0 ? candidates : models
      const fresh = pool[Math.floor(Math.random() * pool.length)]
      const modelId = fresh?.id ?? cards[index]?.model

      fireSingleRequest(index, modelId, ctx, temperatures[index] ?? 0.7, new AbortController())
    },
    [cards, models, temperatures, fireSingleRequest]
  )

  const handleSend = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    const selectedModels = pickMultipleRandom(modelCount)
    if (selectedModels.length === 0) {
      setError('Aucun modèle disponible.')
      return
    }

    setError(null)
    setPrompt('')
    textareaRef.current?.focus()

    const ctx: SendContext = { prompt: trimmed }
    lastSendRef.current = ctx
    entryMetaRef.current = { id: crypto.randomUUID(), prompt: trimmed, timestamp: Date.now() }

    abortControllersRef.current = selectedModels.map(() => null)
    lastSuccessCardsRef.current = selectedModels.map(() => null)
    setCurrentPrompt(trimmed)
    setCards(selectedModels.map((m) => ({ model: m.id, status: 'loading' as const })))

    selectedModels.forEach((m, i) => {
      fireSingleRequest(i, m.id, ctx, temperatures[i] ?? 0.7, new AbortController())
    })
  }, [prompt, modelCount, temperatures, pickMultipleRandom, fireSingleRequest])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      if (!isLoading && modelsReady && prompt.trim()) handleSend()
    }
  }

  const canSend = !isLoading && modelsReady && prompt.trim().length > 0

  return (
    <div className="panel chat-panel">
      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Entrez votre message... (Ctrl+Entrée pour envoyer)"
          rows={4}
          disabled={isLoading}
        />

        <div className="per-slot-temps">
          {temperatures.map((t, i) => (
            <div key={i} className="slot-temp-row">
              <span className="slot-num">{i + 1}</span>
              <span className="slot-temp-descriptor">{getTemperatureLabel(t)}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={t}
                onChange={(e) =>
                  setTemperatures((prev) => {
                    const next = [...prev]
                    next[i] = parseFloat(e.target.value)
                    return next
                  })
                }
                className="temp-slider"
              />
              <span className="temp-value">{t.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="controls-row">
          <div className="model-count-control">
            <span className="temp-label">parallèle</span>
            <div className="stepper">
              <button
                className="stepper-btn"
                onClick={() => setModelCount((c) => Math.max(1, c - 1))}
                disabled={modelCount <= 1}
              >
                −
              </button>
              <span className="stepper-value">{modelCount}</span>
              <button
                className="stepper-btn"
                onClick={() => setModelCount((c) => Math.min(5, c + 1))}
                disabled={modelCount >= 5}
              >
                +
              </button>
            </div>
          </div>

          <button className="btn-primary send-btn" onClick={handleSend} disabled={!canSend}>
            {isLoading ? 'Envoi...' : 'Envoyer ↵'}
          </button>
        </div>
      </div>

      {!modelsReady && !isLoading && cards.length === 0 && (
        <p className="hint-inline">Chargement des modèles en cours...</p>
      )}

      {error && <div className="error-box">{error}</div>}

      {cards.length > 0 && (
        <div className="results-area">
          {currentPrompt && (
            <div className="current-prompt-display">
              <span className="current-prompt-label">prompt</span>
              <p className="current-prompt-text">{currentPrompt}</p>
            </div>
          )}
          <div className="response-grid">
            {cards.map((card, i) => (
              <ResponseCard
                key={i}
                card={card}
                onRefresh={card.status === 'loading' && !lastSuccessCardsRef.current[i] ? () => refreshCard(i) : undefined}
                onCancel={card.status === 'loading' && !!lastSuccessCardsRef.current[i] ? () => cancelRerun(i) : undefined}
                onRetry={card.status === 'error' ? () => refreshCard(i) : undefined}
                onRerun={card.status === 'success' ? (temp) => rerunCard(i, card.model, temp, card) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
