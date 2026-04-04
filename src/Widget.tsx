import { useEffect } from 'react'
import { usePlayerStore } from './store/playerStore'
import { NowPlaying } from './components/Player/NowPlaying'

/**
 * Widget mode — a tiny 300x300 pop-out window with just the player.
 * Opened via window.open('?widget=true').
 *
 * Shares the Zustand store with the main window via localStorage sync.
 * The main window runs the actual audio engine — this widget is a pure
 * remote control that reads/writes to the shared store.
 *
 * Zustand persist middleware fires `storage` events on writes,
 * which both windows pick up automatically.
 */
export function Widget() {
  const theme = usePlayerStore((s) => s.theme)

  // Apply theme
  useEffect(() => {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    // Compact body for mini player
    document.body.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
  }, [theme])

  // Cross-window sync: listen for storage changes and rehydrate
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'hurakan-player' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          if (data.state) {
            // Merge remote state into our store (non-destructive)
            const current = usePlayerStore.getState()
            const remote = data.state
            // Sync playback-relevant fields
            if (remote.currentTrack !== undefined) {
              const changed = current.currentTrack?.id !== remote.currentTrack?.id
              if (changed || current.isPlaying !== remote.isPlaying) {
                usePlayerStore.setState({
                  currentTrack: remote.currentTrack ?? current.currentTrack,
                  isPlaying: remote.isPlaying ?? current.isPlaying,
                })
              }
            }
            if (typeof remote.progress === 'number') {
              usePlayerStore.setState({ progress: remote.progress })
            }
            if (typeof remote.duration === 'number') {
              usePlayerStore.setState({ duration: remote.duration })
            }
            if (typeof remote.volume === 'number') {
              usePlayerStore.setState({ volume: remote.volume })
            }
          }
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Keyboard shortcuts in widget
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const store = usePlayerStore.getState()
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.togglePlay()
          break
        case 'ArrowRight':
          store.next()
          break
        case 'ArrowLeft':
          store.previous()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // No-op seek for widget (seek is handled by main window via store sync)
  const handleSeek = (time: number) => {
    usePlayerStore.getState().setProgress(time)
    // The main window's audio engine will pick this up
    usePlayerStore.getState().seek(time)
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--theme-bg)',
      borderRadius: '0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <NowPlaying onSeek={handleSeek} />
    </div>
  )
}
