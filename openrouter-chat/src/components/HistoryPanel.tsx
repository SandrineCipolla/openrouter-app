import { useState, useMemo } from 'react'
import { HistoryEntry, ModelResult } from '../types'

interface Props {
  entries: HistoryEntry[]
  onClear: () => void
  onRate: (resultId: number, rating: 1 | -1 | 0) => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max = 72): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function RatingButtons({ result, onRate }: { result: ModelResult; onRate: Props['onRate'] }) {
  if (result.id === undefined) return null
  const id = result.id
  return (
    <div className="rating-buttons">
      <button
        className={`rating-btn${result.rating === 1 ? ' active-pos' : ''}`}
        onClick={() => onRate(id, result.rating === 1 ? 0 : 1)}
        title="Bon modèle"
      >👍</button>
      <button
        className={`rating-btn${result.rating === -1 ? ' active-neg' : ''}`}
        onClick={() => onRate(id, result.rating === -1 ? 0 : -1)}
        title="Mauvais modèle"
      >👎</button>
    </div>
  )
}

function ResultRow({ result, onRate }: { result: ModelResult; onRate: Props['onRate'] }) {
  return (
    <div className={`history-result ${result.status}`}>
      <div className="history-result-header">
        <span className="meta-model">{result.model}</span>
        {result.temperature !== undefined && (
          <span className="meta-temp">temp {result.temperature.toFixed(1)}</span>
        )}
        <span className={result.status === 'success' ? 'card-status-ok' : 'card-status-err'}>
          {result.status === 'success' ? '✓' : '✗'}
        </span>
        <RatingButtons result={result} onRate={onRate} />
      </div>
      {result.status === 'success' ? (
        <pre className="block-content">{result.content}</pre>
      ) : (
        <p className="history-result-error">{result.error}</p>
      )}
    </div>
  )
}

function HistoryItem({ entry, onRate }: { entry: HistoryEntry; onRate: Props['onRate'] }) {
  const [expanded, setExpanded] = useState(false)
  const successCount = entry.results.filter((r) => r.status === 'success').length
  const total = entry.results.length

  return (
    <div className={`history-item${expanded ? ' expanded' : ''}`}>
      <button className="history-header" onClick={() => setExpanded((v) => !v)}>
        <span className="history-prompt">{truncate(entry.prompt)}</span>
        <span className="history-badge">{successCount}/{total}</span>
        <span className="history-time">{formatDate(entry.timestamp)}</span>
        <span className="history-toggle">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="history-body">
          <div className="history-block">
            <span className="block-label">réponses</span>
            <div className="history-results-list">
              {entry.results.map((r, i) => (
                <ResultRow key={i} result={r} onRate={onRate} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function HistoryPanel({ entries, onClear, onRate }: Props) {
  const [search, setSearch] = useState('')
  const [filterModel, setFilterModel] = useState('')

  const allModels = useMemo(() => {
    const models = new Set<string>()
    entries.forEach((e) => e.results.forEach((r) => models.add(r.model)))
    return Array.from(models).sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch = search === '' || e.prompt.toLowerCase().includes(search.toLowerCase())
      const matchModel = filterModel === '' || e.results.some((r) => r.model === filterModel)
      return matchSearch && matchModel
    })
  }, [entries, search, filterModel])

  if (entries.length === 0) {
    return (
      <div className="panel history-panel empty">
        <p className="empty-msg">Aucun échange pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div className="panel history-panel">
      <div className="history-toolbar">
        <input
          className="history-search"
          type="text"
          placeholder="Rechercher un prompt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="history-filter"
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
        >
          <option value="">Tous les modèles</option>
          {allModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="history-count">
          {filtered.length} / {entries.length}
        </span>
        <button className="btn-danger" onClick={onClear}>
          Tout effacer
        </button>
      </div>

      <div className="history-list">
        {filtered.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} onRate={onRate} />
        ))}
        {filtered.length === 0 && (
          <p className="empty-msg">Aucun résultat pour cette recherche.</p>
        )}
      </div>
    </div>
  )
}
