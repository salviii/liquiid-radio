import { useRef, useCallback, useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { formatTime } from '../../lib/utils'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  X, LogIn, ExternalLink, SlidersHorizontal, ListMusic,
} from 'lucide-react'

interface NowPlayingProps {
  onSeek: (time: number) => void
}

function getSourceUrl(track: { sourceType: string; originalUrl?: string; url: string }): string | null {
  if (track.originalUrl && !track.originalUrl.startsWith('blob:')) return track.originalUrl
  if (!track.url.startsWith('blob:')) return track.url
  return null
}

export function NowPlaying({ onSeek }: NowPlayingProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const loginPrompt = usePlayerStore((s) => s.loginPrompt)
  const dismissLoginPrompt = usePlayerStore((s) => s.dismissLoginPrompt)
  const nextTrack = usePlayerStore((s) => s.next)

  const scrubRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const cover = currentTrack?.coverArt

  // Scrub helpers
  const calcSeekTime = useCallback((clientX: number) => {
    if (!scrubRef.current || duration <= 0) return null
    const rect = scrubRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }, [duration])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const t = calcSeekTime(e.clientX)
    if (t !== null) onSeek(t)
  }, [calcSeekTime, onSeek])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const t = calcSeekTime(e.clientX)
    if (t !== null) onSeek(t)
  }, [calcSeekTime, onSeek])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const sourceUrl = currentTrack ? getSourceUrl(currentTrack) : null

  // Check if we're already in widget mode
  const isWidget = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('widget')

  return (
    <div className="now-playing-wrapper" style={{
      zIndex: 10,
      overflow: 'hidden',
      padding: isWidget ? '4px' : '6px 6px 0',
    }}>
      {/* ========================================
          The whole player IS the cartridge
          ======================================== */}
      <div style={{
        position: 'relative',
        borderRadius: '8px',
        background: 'var(--theme-bg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── Disc area ── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          aspectRatio: '1 / 1',
          maxHeight: '50svh',
          overflow: 'hidden',
        }}>
          {/* Blurred artwork behind disc */}
          {cover && (
            <div style={{
              position: 'absolute',
              inset: '-30px',
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(24px) brightness(0.75) saturate(1.2)',
              transform: 'scale(1.2)',
              opacity: 0.4,
            }} />
          )}

          <MiniDisc cover={cover} isPlaying={isPlaying} isWidget={isWidget} />
        </div>

        {/* ── Track info ── */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          padding: '6px 12px 2px',
          textAlign: 'center',
        }}>
          <p className="truncate" style={{
            fontSize: '11px',
            color: 'var(--theme-text)',
            letterSpacing: '0.02em',
          }}>
            {currentTrack?.title || 'no track loaded'}
          </p>
          <p className="truncate" style={{
            fontSize: '9px',
            color: 'var(--theme-text-muted)',
            letterSpacing: '0.06em',
            marginTop: '1px',
          }}>
            {currentTrack?.artist || '\u2014'}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          padding: isWidget ? '3px 12px 0' : '2px 12px 0',
        }}>
          <div
            ref={scrubRef}
            style={{
              height: '12px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div style={{
              width: '100%',
              height: '2px',
              borderRadius: '1px',
              background: 'var(--theme-border)',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                borderRadius: '1px',
                width: `${pct}%`,
                background: 'var(--theme-accent)',
                transition: isDragging.current ? 'none' : 'width 0.15s linear',
              }} />
              {duration > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${pct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--theme-accent)',
                  opacity: 0.9,
                }} />
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span style={{
              fontSize: '8px',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--theme-text-muted)',
            }}>
              {formatTime(progress)}
            </span>
            <span style={{
              fontSize: '8px',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--theme-text-muted)',
            }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* ── Transport controls ── */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isWidget ? '6px' : '12px',
          padding: '2px 0 8px',
        }}>
          <button onClick={toggleShuffle} style={{
            background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
            color: shuffle ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
            transition: 'color 0.15s',
          }}>
            <Shuffle size={14} />
          </button>

          <button onClick={previous} style={{
            background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
            color: 'var(--theme-text-secondary)', transition: 'color 0.15s',
          }}>
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button onClick={togglePlay} style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: isPlaying ? 'var(--theme-accent)' : 'var(--theme-text)',
            color: isPlaying ? '#fff' : 'var(--theme-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '1px' }} />}
          </button>

          <button onClick={next} style={{
            background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
            color: 'var(--theme-text-secondary)', transition: 'color 0.15s',
          }}>
            <SkipForward size={18} fill="currentColor" />
          </button>

          <button onClick={cycleRepeat} style={{
            background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
            color: repeat !== 'off' ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
            transition: 'color 0.15s',
          }}>
            {repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
          </button>
        </div>

        {/* ── Login prompt overlay ── */}
        {loginPrompt && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '20px',
            borderRadius: '6px',
          }}>
            <button
              onClick={dismissLoginPrompt}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px',
              }}
            >
              <X size={14} />
            </button>

            <LogIn size={24} style={{ color: 'var(--theme-accent)', opacity: 0.9 }} />

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#fff',
              textAlign: 'center', lineHeight: 1.5, maxWidth: '240px',
            }}>
              {loginPrompt.service === 'spotify'
                ? 'connect your spotify account to play this track through hurakan.'
                : `this ${loginPrompt.service === 'youtube' ? 'youtube' : 'soundcloud'} track needs you to be logged in to play.`
              }
            </p>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.45)',
              textAlign: 'center', lineHeight: 1.4, maxWidth: '220px',
            }}>
              {loginPrompt.service === 'spotify'
                ? 'go to settings > spotify connect to link your premium account.'
                : `log into ${loginPrompt.service === 'youtube' ? 'youtube' : 'soundcloud'} in this browser, then retry.`
              }
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {loginPrompt.service === 'spotify' ? (
                <button
                  onClick={() => { dismissLoginPrompt(); usePlayerStore.getState().setView('settings') }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                    color: '#000', background: '#1db954', border: 'none', borderRadius: '4px',
                    padding: '6px 14px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  settings
                </button>
              ) : (
                <a
                  href={loginPrompt.service === 'youtube' ? 'https://accounts.google.com/signin' : 'https://soundcloud.com/signin'}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                    color: '#000', background: 'var(--theme-accent)', border: 'none', borderRadius: '4px',
                    padding: '6px 14px', cursor: 'pointer', textDecoration: 'none', fontWeight: 600,
                  }}
                >
                  log in
                </a>
              )}

              <button
                onClick={() => { dismissLoginPrompt(); const s = usePlayerStore.getState(); if (s.currentTrack) s.play(s.currentTrack) }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                  color: 'var(--theme-accent)', background: 'none',
                  border: '1px solid color-mix(in srgb, var(--theme-accent) 40%, transparent)',
                  borderRadius: '4px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600,
                }}
              >
                retry
              </button>

              <button
                onClick={() => { dismissLoginPrompt(); nextTrack() }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.5)', background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                  padding: '6px 14px', cursor: 'pointer',
                }}
              >
                skip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          Toolbar — source, crossfade, queue
          ======================================== */}
      <PlayerToolbar sourceUrl={sourceUrl} />
    </div>
  )
}

// ============================================================
// MiniDisc cartridge — transparent shell with spinning disc
// ============================================================
function MiniDisc({ cover, isPlaying, isWidget }: { cover?: string; isPlaying: boolean; isWidget: boolean }) {
  return (
    <div style={{
      position: 'relative',
      zIndex: 2,
      width: isWidget ? '100px' : '60%',
      maxWidth: '220px',
      aspectRatio: '1 / 1',
    }}>
      <div
        className={isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Disc face — album art or iridescent */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: cover
            ? `url(${cover}) center/cover`
            : 'conic-gradient(from 30deg, #e8a0c0, #c0a0e8, #a0c8e8, #a0e8c0, #e8d0a0, #e8a0a0, #e8a0c0)',
        }} />

        {/* Iridescent rainbow overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(255,100,150,0.15), rgba(150,100,255,0.15), rgba(100,200,255,0.15), rgba(100,255,150,0.15), rgba(255,220,100,0.15), rgba(255,100,150,0.15))',
          mixBlendMode: 'screen',
        }} />

        {/* Groove rings */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle,
            transparent 14%,
            rgba(0,0,0,0.06) 15%, transparent 16%,
            transparent 24%,
            rgba(0,0,0,0.03) 25%, transparent 26%,
            transparent 38%,
            rgba(0,0,0,0.02) 39%, transparent 40%,
            transparent 55%,
            rgba(0,0,0,0.02) 56%, transparent 57%,
            transparent 72%,
            rgba(0,0,0,0.03) 73%, transparent 74%,
            transparent 88%,
            rgba(0,0,0,0.05) 89%, rgba(0,0,0,0.08) 100%
          )`,
        }} />

        {/* Light reflection sweep */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)',
        }} />

        {/* Center dot — subtle */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          boxShadow: '0 0 4px rgba(0,0,0,0.15)',
        }} />

        {/* Disc rim */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.12)',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.06)',
        }} />
      </div>
    </div>
  )
}

// ============================================================
// Player Toolbar — source link, crossfade, queue viewer
// ============================================================
function PlayerToolbar({ sourceUrl }: { sourceUrl: string | null }) {
  const crossfade = usePlayerStore((s) => s.crossfade)
  const setCrossfade = usePlayerStore((s) => s.setCrossfade)
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const [showQueue, setShowQueue] = useState(false)
  const [showCrossfade, setShowCrossfade] = useState(false)

  const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    color: 'var(--theme-text-muted)',
    transition: 'color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ position: 'relative', background: 'var(--theme-bg)' }}>
      {/* Button row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '2px 8px',
        borderTop: '1px solid var(--theme-border)',
      }}>
        {/* Source link */}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnStyle,
              textDecoration: 'none',
              color: 'var(--theme-accent)',
              opacity: 0.7,
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
            title={sourceUrl}
          >
            <ExternalLink size={11} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>source</span>
          </a>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Crossfade toggle */}
        <button
          style={{
            ...btnStyle,
            color: showCrossfade ? 'var(--theme-accent)' : crossfade > 0 ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
          }}
          onClick={() => { setShowCrossfade(!showCrossfade); setShowQueue(false) }}
          title={crossfade > 0 ? `crossfade: ${crossfade}s` : 'crossfade off'}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-accent)' }}
          onMouseLeave={(e) => {
            if (!showCrossfade) e.currentTarget.style.color = crossfade > 0 ? 'var(--theme-accent)' : 'var(--theme-text-muted)'
          }}
        >
          <SlidersHorizontal size={12} />
          <span>{crossfade > 0 ? `${crossfade}s` : 'xfade'}</span>
        </button>

        {/* Queue toggle */}
        <button
          style={{
            ...btnStyle,
            color: showQueue ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
          }}
          onClick={() => { setShowQueue(!showQueue); setShowCrossfade(false) }}
          title="view queue"
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-accent)' }}
          onMouseLeave={(e) => {
            if (!showQueue) e.currentTarget.style.color = 'var(--theme-text-muted)'
          }}
        >
          <ListMusic size={12} />
          <span>queue{queue.length > 0 ? ` (${queue.length})` : ''}</span>
        </button>
      </div>

      {/* Crossfade panel */}
      {showCrossfade && (
        <div style={{
          padding: '8px 16px 10px',
          borderTop: '1px solid var(--theme-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'var(--theme-text-muted)',
            letterSpacing: '0.08em',
            minWidth: '18px',
          }}>
            off
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
              height: '4px',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'var(--theme-text-muted)',
            letterSpacing: '0.08em',
            minWidth: '18px',
            textAlign: 'right',
          }}>
            12s
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--theme-accent)',
            letterSpacing: '0.05em',
            minWidth: '30px',
            textAlign: 'center',
          }}>
            {crossfade === 0 ? 'off' : `${crossfade}s`}
          </span>
        </div>
      )}

      {/* Queue panel */}
      {showQueue && (
        <div style={{
          borderTop: '1px solid var(--theme-border)',
          maxHeight: '180px',
          overflowY: 'auto',
        }}>
          {queue.length === 0 ? (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--theme-text-muted)',
              textAlign: 'center',
              padding: '16px',
              letterSpacing: '0.08em',
            }}>
              no tracks in queue
            </p>
          ) : (
            queue.map((t, i) => {
              const isActive = i === queueIndex
              return (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => setQueue(queue, i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    background: isActive ? 'color-mix(in srgb, var(--theme-accent) 8%, transparent)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--theme-surface-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Track number or playing indicator */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
                    minWidth: '16px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {isActive ? '\u25B6' : i + 1}
                  </span>

                  {/* Cover thumbnail */}
                  {t.coverArt ? (
                    <img
                      src={t.coverArt}
                      alt=""
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '3px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '3px',
                      background: 'var(--theme-bg-panel)',
                      flexShrink: 0,
                    }} />
                  )}

                  {/* Title + artist */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <p style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--theme-accent)' : 'var(--theme-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {t.title}
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--theme-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {t.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: 'var(--theme-text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                    {t.duration > 0 ? formatTime(t.duration) : ''}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
