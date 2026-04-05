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
import { LibraryView, SharePlaylistButton, decodePlaylist } from './components/Library/LibraryView'
import { isSoundCloudUrl, resolveSoundCloudTrack } from './lib/soundcloud'
import { isYouTubeUrl, resolveYouTubeTrack } from './lib/youtube'
import { resolveSpotifyTrack } from './lib/spotify'
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

function CookieConsent() {
  const [visible, setVisible] = useState(() => !localStorage.getItem('cookies-accepted'))
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
      padding: '14px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '12px',
      fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.8)',
      letterSpacing: '0.04em',
    }}>
      <span>this site uses local storage to save your library and preferences.</span>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => { localStorage.setItem('cookies-accepted', 'true'); setVisible(false) }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
            color: '#000', background: 'var(--theme-accent)', border: 'none',
            borderRadius: '4px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600,
          }}
        >
          accept
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.5)', background: 'none',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
            padding: '6px 14px', cursor: 'pointer',
          }}
        >
          dismiss
        </button>
      </div>
    </div>
  )
}

function App() {
  const { seekTo } = useAudioEngine()
  useMetadataReader()
  useChameleon()

  const auth = useAuth()
  const { triggerSave } = useCloudSync(auth.user)

  const currentView = usePlayerStore((s) => s.currentView)
  const theme = usePlayerStore((s) => s.theme)
  const currentTrackForMarquee = usePlayerStore((s) => s.currentTrack)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)

  // Apply persisted theme on mount
  useEffect(() => {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [])

  // Import shared playlist from URL param ?p=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const playlistData = params.get('p')
    if (!playlistData) return

    const decoded = decodePlaylist(playlistData)
    if (decoded.length === 0) return

    const addTrack = usePlayerStore.getState().addTrack
    const updateTrack = usePlayerStore.getState().updateTrack

    // Add tracks immediately with basic info
    const addedIds: string[] = []
    for (const t of decoded) {
      const sourceType = isSoundCloudUrl(t.url) ? 'soundcloud'
        : isYouTubeUrl(t.url) ? 'youtube'
        : t.url.includes('open.spotify.com') ? 'spotify'
        : 'url'
      const tags = sourceType !== 'url' ? [sourceType] : []
      const track = addTrack({
        title: t.title,
        artist: t.artist,
        album: '',
        duration: 0,
        url: t.url,
        originalUrl: t.url,
        sourceType,
        tags,
      })
      addedIds.push(track.id)
    }

    // Resolve metadata (cover art, better titles) in the background
    decoded.forEach(async (t, i) => {
      const trackId = addedIds[i]
      if (!trackId) return
      try {
        let resolved: { title: string; artist: string; thumbnailUrl?: string } | null = null
        if (t.url.includes('open.spotify.com')) {
          resolved = await resolveSpotifyTrack(t.url)
        } else if (isYouTubeUrl(t.url)) {
          resolved = await resolveYouTubeTrack(t.url)
        } else if (isSoundCloudUrl(t.url)) {
          resolved = await resolveSoundCloudTrack(t.url)
        }
        if (resolved) {
          updateTrack(trackId, {
            title: resolved.title || t.title,
            artist: resolved.artist || t.artist,
            coverArt: resolved.thumbnailUrl,
          })
        }
      } catch (err) {
        console.warn(`[playlist] failed to resolve metadata for ${t.url}`, err)
      }
    })

    // Clean URL after importing
    window.history.replaceState({}, '', window.location.pathname)
    console.log(`[playlist] imported ${decoded.length} tracks from shared link`)
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

  const marqueeText = currentTrackForMarquee
    ? `${currentTrackForMarquee.title} — ${currentTrackForMarquee.artist}${currentTrackForMarquee.album ? ` — ${currentTrackForMarquee.album}` : ''}`
    : 'liquiid radio'

  return (
    <AuthContext.Provider value={authContextValue}>
      <div
        className="flex items-center justify-center"
        style={{
          background: 'var(--theme-bg-secondary)',
          position: 'fixed',
          inset: 0,
          padding: '2%',
        }}
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
          {/* Marquee — always visible at top */}
          <div className="marquee-bar">
            <div className="marquee-track">
              <span className="marquee-text">{marqueeText}</span>
              <span className="marquee-text" aria-hidden="true">{marqueeText}</span>
            </div>
          </div>

          {/* Body: player + content */}
          <div className="pocket-body">
            {/* Player always at top */}
            <div className="pocket-player-col">
              <NowPlaying onSeek={seekTo} />
            </div>

            {/* Content below player */}
            <div className="pocket-content-col">
              <TabNav />
              <div className="pocket-content">
                {renderView()}
              </div>
              <SharePlaylistButton />
            </div>
          </div>
        </div>

        {showMiniPlayer && <MiniPlayer onClose={() => setShowMiniPlayer(false)} />}
        <CookieConsent />
      </div>
    </AuthContext.Provider>
  )
}

export default App
