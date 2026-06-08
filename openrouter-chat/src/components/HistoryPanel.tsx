import { useState } from 'react'
import { HistoryEntry, ModelResult } from '../types'

interface Props {
  entries: HistoryEntry[]
  onClear: () => void
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

function ResultRow({ result }: { result: ModelResult }) {
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
      </div>
      {result.status === 'success' ? (
        <pre className="block-content">{result.content}</pre>
      ) : (
        <p className="history-result-error">{result.error}</p>
      )}
    </div>
  )
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
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
                <ResultRow key={i} result={r} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function HistoryPanel({ entries, onClear }: Props) {
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
        <span className="history-count">
          {entries.length} échange{entries.length > 1 ? 's' : ''}
        </span>
        <button className="btn-danger" onClick={onClear}>
          Tout effacer
        </button>
      </div>

      <div className="history-list">
        {entries.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
