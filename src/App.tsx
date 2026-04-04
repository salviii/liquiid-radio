import { createContext, useEffect, useState } from 'react'
import { usePlayerStore } from './store/playerStore'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useMetadataReader } from './hooks/useMetadata'
import { useAuth } from './hooks/useAuth'
import { useCloudSync } from './hooks/useCloudSync'
import { useChameleon } from './hooks/useChameleon'
import { TabNav } from './components/Layout/Sidebar'
import { MiniPlayer } from './components/Player/MiniPlayer'
import { NowPlaying } from './components/Player/NowPlaying'
import { LibraryView } from './components/Library/LibraryView'
import { PlaylistView } from './components/Playlist/PlaylistView'
import { SourcesView } from './components/Library/SourcesView'
import { FriendsView } from './components/Library/FriendsView'
import { SettingsView } from './components/Theme/SettingsView'
import type { User } from '@supabase/supabase-js'

// Auth context shared across the app
interface AuthContextValue {
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow?: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function App() {
  const { seekTo } = useAudioEngine()
  useMetadataReader()
  useChameleon()

  const auth = useAuth()
  const { triggerSave } = useCloudSync(auth.user)

  const currentView = usePlayerStore((s) => s.currentView)
  const theme = usePlayerStore((s) => s.theme)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)

  // Apply persisted theme on mount
  useEffect(() => {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const store = usePlayerStore.getState()
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.togglePlay()
          break
        case 'ArrowRight':
          if (e.shiftKey) store.next()
          break
        case 'ArrowLeft':
          if (e.shiftKey) store.previous()
          break
        case 'ArrowUp':
          if (e.shiftKey) store.setVolume(store.volume + 0.1)
          break
        case 'ArrowDown':
          if (e.shiftKey) store.setVolume(store.volume - 0.1)
          break
        case 'KeyM':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            setShowMiniPlayer(prev => !prev)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function renderView() {
    switch (currentView) {
      case 'library': return <LibraryView />
      case 'playlists': return <PlaylistView />
      case 'sources': return <SourcesView />
      case 'friends': return <FriendsView />
      case 'settings': return <SettingsView />
      default: return <LibraryView />
    }
  }

  const authContextValue: AuthContextValue = {
    ...auth,
    syncNow: triggerSave,
  }

  const currentCover = usePlayerStore((s) => s.currentTrack?.coverArt)

  return (
    <AuthContext.Provider value={authContextValue}>
      <div
        className="flex items-start justify-center min-h-screen pt-8"
        style={{ background: 'var(--theme-bg-secondary)', position: 'relative' }}
      >
        {/* Blurred album art background — 18% opacity */}
        {currentCover && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: '-40px',
              backgroundImage: `url(${currentCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px) saturate(1.2)',
              opacity: 0.18,
              pointerEvents: 'none',
              zIndex: 0,
              transform: 'scale(1.1)',
            }}
          />
        )}

        {/* Thermal gradient - background glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40vw',
            background: 'linear-gradient(to left, rgba(245,196,154,0.08), rgba(232,115,74,0.04) 40%, transparent 100%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Pocket shell */}
        <div className="pocket-shell">
          {/* Left side: player (landscape) / top (portrait) */}
          <div className="pocket-player-col">
            <NowPlaying onSeek={seekTo} />
          </div>

          {/* Right side: content (landscape) / bottom (portrait) */}
          <div className="pocket-content-col">
            <div className="pocket-content">
              {renderView()}
            </div>
            <TabNav />
          </div>
        </div>

        {showMiniPlayer && <MiniPlayer onClose={() => setShowMiniPlayer(false)} />}
      </div>
    </AuthContext.Provider>
  )
}

export default App
