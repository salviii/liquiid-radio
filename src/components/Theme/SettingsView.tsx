import { useState, useEffect, useContext } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { Palette, Waves, Music } from 'lucide-react'
import { AuthPanel } from '../Auth/AuthPanel'
import { AuthContext } from '../../App'
import {
  isSpotifyConnected,
  startSpotifyAuth,
  clearTokens,
} from '../../lib/spotifyAuth'

const THEMES = [
  { id: 'default', name: 'Paper', description: 'clean white, no color' },
  { id: 'dark', name: 'Terminal', description: 'green on black, crt glow' },
  { id: 'midnight', name: 'Bruise', description: 'deep indigo, violet' },
  { id: 'vinyl', name: 'Rust', description: 'ochre, burnt orange' },
  { id: 'ocean', name: 'Ocean', description: 'calm blue, airy light' },
  { id: 'void', name: 'Void', description: 'pure black, red accent' },
  { id: 'chameleon', name: 'Chameleon', description: 'light + album art colors' },
  { id: 'chameleon-dark', name: 'Chameleon Dark', description: 'dark + album art colors' },
  { id: 'y2k', name: 'Y2K', description: 'bubblegum pop, glossy pink' },
]

export function SettingsView() {
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)

  const [accentColor, setAccentColor] = useState(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3DFF6A'
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-accent', accentColor)
    document.documentElement.style.setProperty('--theme-player-progress', accentColor)
  }, [accentColor])

  return (
    <div className="flex-1 overflow-auto pb-4">
      <div className="px-6 pt-4 pb-4">
        <h2 className="text-lg tracking-tight mb-4" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Settings
        </h2>

        {/* Theme selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="knob-label" style={{ fontSize: '11px' }}>
              Theme
            </h3>
          </div>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.06em',
              color: 'var(--theme-text)',
              background: 'var(--theme-bg)',
              border: '1px solid var(--theme-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {THEMES.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.description}
              </option>
            ))}
          </select>
        </div>

        {/* Accent color picker */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="knob-label" style={{ fontSize: '11px' }}>
              Accent Color
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.15em',
                
                color: 'var(--theme-text-muted)',
              }}>
                ACCENT
              </span>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="color-picker-knob"
              />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              color: 'var(--theme-text-secondary)',
              
            }}>
              {accentColor}
            </span>
          </div>
        </div>

        {/* Crossfade */}
        <CrossfadeControl />

        {/* Spotify Connection */}
        <SpotifyConnectSection />

        {/* Cloud Sync / Auth */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: '16px' }}>☁️</span>
            <h3 className="knob-label" style={{ fontSize: '11px' }}>
              Cloud Sync
            </h3>
          </div>
          <AuthPanelConnected />
        </div>

      </div>
    </div>
  )
}

function CrossfadeControl() {
  const crossfade = usePlayerStore((s) => s.crossfade)
  const setCrossfade = usePlayerStore((s) => s.setCrossfade)

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Waves size={16} style={{ color: 'var(--theme-accent)' }} />
        <h3 className="knob-label" style={{ fontSize: '11px' }}>
          Crossfade
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--theme-text-muted)',
          letterSpacing: '0.1em',
          minWidth: '20px',
        }}>
          OFF
        </span>
        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={crossfade}
          onChange={(e) => setCrossfade(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: 'var(--theme-accent)',
            cursor: 'pointer',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--theme-text-muted)',
          letterSpacing: '0.1em',
          minWidth: '20px',
        }}>
          12s
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--theme-text-secondary)',
        textAlign: 'center',
        marginTop: '4px',
        letterSpacing: '0.08em',
      }}>
        {crossfade === 0 ? 'No crossfade' : `${crossfade}s crossfade`}
      </p>
    </div>
  )
}

function SpotifyConnectSection() {
  const [connected, setConnected] = useState(isSpotifyConnected())

  function handleDisconnect() {
    clearTokens()
    setConnected(false)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Music size={16} style={{ color: '#1db954' }} />
        <h3 className="knob-label" style={{ fontSize: '11px' }}>
          Spotify Connect
        </h3>
      </div>

      {connected ? (
        <div className="panel-section p-4" style={{ borderRadius: '4px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="led active" />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--theme-text)',
                letterSpacing: '0.08em',
              }}>
                connected
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                color: 'var(--color-error, #e74c3c)',
                background: 'none',
                border: '1px solid color-mix(in srgb, var(--color-error, #e74c3c) 30%, transparent)',
                borderRadius: '3px',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              disconnect
            </button>
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--theme-text-muted)',
            marginTop: '6px',
            lineHeight: 1.4,
          }}>
            spotify premium playback active. full tracks play through your account.
          </p>
        </div>
      ) : (
        <div className="panel-section p-4" style={{ borderRadius: '4px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--theme-text-secondary)',
            marginBottom: '10px',
            lineHeight: 1.5,
          }}>
            connect your spotify premium account to play full tracks through liquiid radio.
          </p>
          <button
            onClick={() => startSpotifyAuth()}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: '#000',
              background: '#1db954',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              width: '100%',
            }}
          >
            connect with spotify
          </button>
        </div>
      )}
    </div>
  )
}

function AuthPanelConnected() {
  const auth = useContext(AuthContext)
  if (!auth) return null
  return (
    <AuthPanel
      user={auth.user}
      loading={auth.loading}
      onSignIn={auth.signIn}
      onSignUp={auth.signUp}
      onMagicLink={auth.signInWithMagicLink}
      onSignOut={auth.signOut}
      onSyncNow={auth.syncNow}
    />
  )
}
