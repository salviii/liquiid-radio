import { usePlayerStore } from '../../store/playerStore'
import type { ViewMode } from '../../types'
import { Library, ListMusic, Link, Users, Settings } from 'lucide-react'

const NAV: { id: ViewMode; icon: React.ElementType }[] = [
  { id: 'library', icon: Library },
  { id: 'playlists', icon: ListMusic },
  { id: 'sources', icon: Link },
  { id: 'friends', icon: Users },
  { id: 'settings', icon: Settings },
]

export function TabNav() {
  const currentView = usePlayerStore((s) => s.currentView)
  const setView = usePlayerStore((s) => s.setView)

  return (
    <nav className="tab-nav">
      {NAV.map(({ id, icon: Icon }) => {
        const active = currentView === id
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`tab-nav-btn ${active ? 'active' : ''}`}
          >
            <Icon size={15} strokeWidth={1.5} />
            {active && <span className="tab-nav-led" />}
          </button>
        )
      })}
    </nav>
  )
}
