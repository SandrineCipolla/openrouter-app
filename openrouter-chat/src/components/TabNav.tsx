
import { Tab } from '../types'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: Tab[] = ['chat', 'historique', 'config']

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="tab-nav">
      {TABS.map((tab) => (
        <button
          key={tab}
          className={`tab-btn${active === tab ? ' active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  )
}