import { useState, useEffect, useContext } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { Palette, Sun, Moon, Disc3, Waves, Sparkles, Music } from 'lucide-react'
import { AuthPanel } from '../Auth/AuthPanel'
import { AuthContext } from '../../App'
import {
  isSpotifyConnected,
  startSpotifyAuth,
  clearTokens,
} from '../../lib/spotifyAuth'

const THEMES = [
  { id: 'default', name: 'Signal', description: 'Warm analog light', icon: Sun, preview: '#F0EDEA' },
  { id: 'chameleon', name: 'Chameleon', description: 'Light + album art', icon: Sparkles, preview: 'linear-gradient(135deg, #e8a4a4, #a4c8e8, #a4e8b4)' },
  { id: 'chameleon-dark', name: 'Chameleon Dark', description: 'Dark + album art', icon: Sparkles, preview: 'linear-gradient(135deg, #3a1a1a, #1a2a3a, #1a3a1a)' },
  { id: 'dark', name: 'Blackout', description: 'Knob-palette dark', icon: Moon, preview: '#1C1A18' },
  { id: 'midnight', name: 'Midnight', description: 'Deep signal blue', icon: Waves, preview: '#0a0e1a' },
  { id: 'vinyl', name: 'Vinyl', description: 'Warm tape tones', icon: Disc3, preview: '#1a1410' },
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

          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(t => {
              const isActive = theme === t.id
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="panel p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    borderRadius: '4px',
                    border: `2px solid ${isActive ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 flex items-center justify-center"
                      style={{ background: t.preview, borderRadius: '4px', border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
                      <Icon size={16} style={{ color: isActive ? 'var(--theme-accent)' : '#999' }} />
                    </div>
                    {/* LED indicator for active theme */}
                    {isActive && (
                      <span className="led active" />
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t.name}</p>
                  <p className="knob-label mt-0.5">{t.description}</p>
                </button>
              )
            })}
          </div>
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

        {/* About — panel-section inset */}
        <div className="panel-section p-6" style={{ borderRadius: '4px' }}>
          <h3 className="text-sm mb-2" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            About hurakan
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            A decentralized audio player and library manager. Your music lives where you put it —
            hurakan just brings it all together. Link any audio URL, build playlists, share with friends.
            No uploads, no storage limits, no middleman.
          </p>
          <p className="knob-label mt-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
            v0.1.0 &middot; Made with care
          </p>
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
            connect your spotify premium account to play full tracks through hurakan.
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
