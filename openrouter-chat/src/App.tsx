import { useState } from 'react'
import { Tab } from './types'
import { TabNav } from './components/TabNav'
import { ConfigPanel } from './components/ConfigPanel'
import { ChatPanel } from './components/ChatPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { useModels } from './hooks/useModels'
import { useHistory } from './hooks/useHistory'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const { models, loading: modelsLoading, error: modelsError, refresh, pickMultipleRandom } = useModels()
  const { entries, upsertEntry, rateResult, clearAll } = useHistory()

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          openrouter<span className="accent">_chat</span>
        </h1>
        <TabNav active={activeTab} onChange={setActiveTab} />
      </header>

      <main className="app-main">
        {activeTab === 'chat' && (
          <ChatPanel
            models={models}
            pickMultipleRandom={pickMultipleRandom}
            onUpsertEntry={upsertEntry}
          />
        )}
        {activeTab === 'historique' && (
          <HistoryPanel entries={entries} onClear={clearAll} onRate={rateResult} />
        )}
        {activeTab === 'config' && (
          <ConfigPanel
            modelsCount={models.length}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  )
}