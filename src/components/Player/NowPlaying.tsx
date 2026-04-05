import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { formatTime } from '../../lib/utils'

const WAVEFORM_BARS = 80

/** Deterministic pseudo-waveform from a seed string */
function generateWaveform(seed: string, bars: number): number[] {
  // Simple hash → PRNG
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  const next = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
  const raw: number[] = []
  for (let i = 0; i < bars; i++) {
    // Blend two randoms for smoother shapes
    const v = (next() + next()) / 2
    raw.push(v)
  }
  // Smooth pass — average with neighbors
  return raw.map((v, i) => {
    const prev = raw[i - 1] ?? v
    const nxt = raw[i + 1] ?? v
    const smoothed = prev * 0.2 + v * 0.6 + nxt * 0.2
    return 0.12 + smoothed * 0.88 // min 12%, max 100%
  })
}
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  X, LogIn, ExternalLink, SlidersHorizontal, ListMusic, Eye,
} from 'lucide-react'

const VISUAL_MODES = ['disc', 'cover', 'visualizer', 'lava'] as const

// ── Cover View ──
function CoverView({ cover, isWidget }: { cover?: string; isWidget: boolean }) {
  return (
    <div style={{
      position: 'relative', zIndex: 2,
      width: isWidget ? '100px' : '60%', maxWidth: '220px', aspectRatio: '1 / 1',
      borderRadius: '8px', overflow: 'hidden',
      background: cover ? `url(${cover}) center/cover` : 'var(--theme-border)',
    }}>
      {!cover && (
        <img
          src="https://raw.githubusercontent.com/salviii/salviii.github.io/master/assets/sun%20dark.png"
          alt="" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '50%', height: '50%', objectFit: 'contain', opacity: 0.3,
          }}
        />
      )}
    </div>
  )
}

// ── 8-bit Pixel Visualizer (p5.js) ──
function PixelVisualizer({ isPlaying, isWidget }: { isPlaying: boolean; isWidget: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5Ref = useRef<any>(null)
  const playingRef = useRef(isPlaying)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!containerRef.current) return
    let analyser: AnalyserNode | null = null
    let dataArr: Uint8Array | null = null

    try {
      const audio = document.querySelector('audio')
      if (audio) {
        const actx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = actx.createMediaElementSource(audio)
        analyser = actx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.92
        source.connect(analyser)
        analyser.connect(actx.destination)
        dataArr = new Uint8Array(analyser.frequencyBinCount)
      }
    } catch { /* Howler owns audio context */ }

    import('p5').then(({ default: p5 }) => {
      const sketch = (p: any) => {
        const BARS = 16
        const PIXELS_HIGH = 12
        const size = isWidget ? 100 : 220

        p.setup = () => {
          p.createCanvas(size, size)
          p.noSmooth()
          p.frameRate(30)
        }

        p.draw = () => {
          p.background(17)
          const barW = Math.floor(p.width / BARS) - 2
          const pixH = Math.floor(p.height / PIXELS_HIGH)
          const values: number[] = []

          if (analyser && dataArr && playingRef.current) {
            analyser.getByteFrequencyData(dataArr)
            for (let i = 0; i < BARS; i++) {
              const idx = Math.floor((i / BARS) * dataArr.length)
              values.push(dataArr[idx] / 255)
            }
          } else {
            const t = p.millis() / 1000
            for (let i = 0; i < BARS; i++) {
              const v = playingRef.current
                ? 0.25 + 0.35 * Math.sin(t * 1.2 + i * 0.5) * Math.sin(t * 0.7 + i * 0.3)
                : 0.05 + 0.03 * Math.sin(t * 0.3 + i * 0.2)
              values.push(p.constrain(v, 0, 1))
            }
          }

          p.noStroke()
          for (let i = 0; i < BARS; i++) {
            const litPixels = Math.round(values[i] * PIXELS_HIGH)
            const x = i * (barW + 2) + 1
            for (let px = 0; px < litPixels; px++) {
              const y = p.height - (px + 1) * pixH
              const ratio = px / PIXELS_HIGH
              const r = ratio > 0.7 ? 255 : Math.round(ratio * 2.5 * 255)
              const g = ratio > 0.7 ? Math.round((1 - (ratio - 0.7) * 3.3) * 255) : 255
              p.fill(r, g, 50)
              p.rect(x, y, barW, pixH - 1)
            }
          }
        }
      }

      p5Ref.current = new p5(sketch, containerRef.current!)
    })

    return () => { p5Ref.current?.remove() }
  }, [isWidget])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', zIndex: 2,
        width: isWidget ? '100px' : '60vw',
        maxWidth: '220px',
        aspectRatio: '1 / 1',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#111',
        imageRendering: 'pixelated',
      }}
    />
  )
}

// ── Lava Lamp (p5.js) ──
function LavaLamp({ isPlaying, isWidget }: { isPlaying: boolean; isWidget: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5Ref = useRef<any>(null)
  const playingRef = useRef(isPlaying)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!containerRef.current) return

    // Read the theme accent color
    const accentRaw = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3DFF6A'

    import('p5').then(({ default: p5 }) => {
      const sketch = (p: any) => {
        const size = isWidget ? 100 : 220
        const blobs: { x: number; y: number; r: number; vx: number; vy: number; hueOff: number }[] = []
        let accentH = 0, accentS = 0, accentB = 0
        let pg: any // offscreen graphics for the goo effect

        p.setup = () => {
          p.createCanvas(size, size)
          p.colorMode(p.HSB, 360, 100, 100, 100)
          p.frameRate(30)

          // Parse accent color
          const c = p.color(accentRaw)
          accentH = p.hue(c)
          accentS = p.saturation(c)
          accentB = p.brightness(c)

          pg = p.createGraphics(size, size)
          pg.colorMode(pg.HSB, 360, 100, 100, 100)

          // Create blobs
          for (let i = 0; i < 6; i++) {
            blobs.push({
              x: p.random(size * 0.2, size * 0.8),
              y: p.random(size * 0.2, size * 0.8),
              r: p.random(size * 0.15, size * 0.28),
              vx: p.random(-0.5, 0.5),
              vy: p.random(-0.5, 0.5),
              hueOff: p.random(-40, 40),
            })
          }
        }

        p.draw = () => {
          const speed = playingRef.current ? 1 : 0.25

          // Move blobs
          for (const b of blobs) {
            b.x += b.vx * speed
            b.y += b.vy * speed
            // Bounce off edges with padding
            const pad = b.r * 0.3
            if (b.x < pad || b.x > size - pad) b.vx *= -1
            if (b.y < pad || b.y > size - pad) b.vy *= -1
            b.x = p.constrain(b.x, pad, size - pad)
            b.y = p.constrain(b.y, pad, size - pad)
            // Wobble radius
            b.r += Math.sin(p.frameCount * 0.03 * speed + b.hueOff) * 0.3
            b.r = p.constrain(b.r, size * 0.12, size * 0.32)
          }

          // Draw blobs to offscreen buffer with metaball-style rendering
          pg.clear()
          pg.noStroke()
          for (const b of blobs) {
            const h = (accentH + b.hueOff + 360) % 360
            const s = p.constrain(accentS + 10, 0, 100)
            const br = p.constrain(accentB, 40, 100)
            // Draw layered circles for soft glow
            for (let layer = 5; layer >= 0; layer--) {
              const t = layer / 5
              const radius = b.r * (1 + t * 0.6)
              const alpha = (1 - t) * 40
              pg.fill(h, s, br, alpha)
              pg.ellipse(b.x, b.y, radius * 2, radius * 2)
            }
          }

          // Apply circular mask and blur-like effect
          p.background(0)
          p.imageMode(p.CORNER)

          // Draw the lava content
          p.image(pg, 0, 0)

          // Draw blurred overlay for goo merging effect
          p.drawingContext.filter = 'blur(12px) saturate(1.5)'
          p.image(pg, 0, 0)
          p.drawingContext.filter = 'none'

          // Circular mask
          p.loadPixels()
          const cx = size / 2
          const cy = size / 2
          const rad = size / 2
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
              if (d > rad) {
                const idx = (y * size + x) * 4
                p.pixels[idx + 3] = 0
              } else if (d > rad - 2) {
                const idx = (y * size + x) * 4
                p.pixels[idx + 3] = Math.round(p.pixels[idx + 3] * (rad - d) / 2)
              }
            }
          }
          p.updatePixels()
        }
      }

      p5Ref.current = new p5(sketch, containerRef.current!)
    })

    return () => { p5Ref.current?.remove() }
  }, [isWidget])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', zIndex: 2,
        width: isWidget ? '100px' : '60vw',
        maxWidth: '220px',
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        overflow: 'hidden',
      }}
    />
  )
}

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
  const visualMode = usePlayerStore((s) => s.visualMode)
  const setVisualMode = usePlayerStore((s) => s.setVisualMode)
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
  const waveform = useMemo(
    () => generateWaveform(currentTrack?.id || currentTrack?.title || 'empty', WAVEFORM_BARS),
    [currentTrack?.id, currentTrack?.title],
  )

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
  // No mobile-specific layout — use the same full player everywhere
  return (
    <div className="now-playing-wrapper" style={{
      zIndex: 10,
      overflow: 'hidden',
      padding: isWidget ? '4px' : '6px 6px 0',
      height: '100%',
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
        height: '100%',
      }}>

        {/* ── Disc area ── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          minHeight: 0,
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

          {visualMode === 'disc' && <MiniDisc cover={cover} isPlaying={isPlaying} isWidget={isWidget} />}
          {visualMode === 'cover' && <CoverView cover={cover} isWidget={isWidget} />}
          {visualMode === 'visualizer' && <PixelVisualizer isPlaying={isPlaying} isWidget={isWidget} />}
          {visualMode === 'lava' && <LavaLamp isPlaying={isPlaying} isWidget={isWidget} />}
        </div>

        {/* ── Track info ── */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          padding: '6px 12px 2px',
          textAlign: 'center',
        }}>
          <p className="truncate" style={{
            fontSize: '13px',
            color: 'var(--theme-text)',
            letterSpacing: '0.02em',
          }}>
            {currentTrack?.title || 'no track loaded'}
          </p>
          <p className="truncate" style={{
            fontSize: '11px',
            color: 'var(--theme-text-muted)',
            letterSpacing: '0.04em',
            marginTop: '2px',
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
              height: '28px',
              display: 'flex',
              alignItems: 'flex-end',
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
              height: '24px',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '1px',
            }}>
              {waveform.map((h, i) => {
                const barPct = ((i + 0.5) / WAVEFORM_BARS) * 100
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h * 100}%`,
                    borderRadius: '1px',
                    background: barPct <= pct ? 'var(--theme-accent)' : 'var(--theme-border)',
                    transition: isDragging.current ? 'none' : 'background 0.1s',
                    minWidth: 0,
                  }} />
                )
              })}
              {duration > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${pct}%`,
                  width: '2px',
                  transform: 'translateX(-50%)',
                  background: 'var(--theme-accent)',
                  opacity: 0.7,
                }} />
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span style={{
              fontSize: '10px',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--theme-text-muted)',
            }}>
              {formatTime(progress)}
            </span>
            <span style={{
              fontSize: '10px',
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
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                color: 'var(--theme-text-muted)', transition: 'color 0.15s',
                display: 'flex', alignItems: 'center',
              }}
              title="Open source"
            >
              <ExternalLink size={14} />
            </a>
          )}

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
            borderRadius: '4px',
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

          <button
            onClick={() => {
              const idx = VISUAL_MODES.indexOf(visualMode)
              setVisualMode(VISUAL_MODES[(idx + 1) % VISUAL_MODES.length])
            }}
            title={`Visual: ${visualMode}`}
            style={{
              background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
              color: 'var(--theme-text-muted)', transition: 'color 0.15s',
            }}
          >
            <Eye size={14} />
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
                ? 'connect your spotify account to play this track through liquiid radio.'
                : loginPrompt.service === 'soundcloud'
                ? 'soundcloud requires you to be logged in to stream tracks here.'
                : 'this youtube track needs you to be logged in to play.'
              }
            </p>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.45)',
              textAlign: 'center', lineHeight: 1.4, maxWidth: '220px',
            }}>
              {loginPrompt.service === 'spotify'
                ? 'go to settings > spotify connect to link your premium account.'
                : loginPrompt.service === 'soundcloud'
                ? 'log into soundcloud.com in this browser, then come back and hit retry.'
                : 'log into youtube in this browser, then retry.'
              }
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
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

              {loginPrompt.service === 'soundcloud' && loginPrompt.url && (
                <a
                  href={loginPrompt.url}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                    color: '#fff', background: '#ff5500', border: 'none', borderRadius: '4px',
                    padding: '6px 14px', cursor: 'pointer', textDecoration: 'none', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <ExternalLink size={10} /> open track
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
        className="animate-[spin_3s_linear_infinite]"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          position: 'relative',
          overflow: 'hidden',
          animationPlayState: isPlaying ? 'running' : 'paused',
        }}
      >
        {/* Disc face — album art or default symbol */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: cover
            ? `url(${cover}) center/cover`
            : 'radial-gradient(circle, #e0e0e0 0%, #c8c8c8 40%, #b0b0b0 100%)',
        }} />
        {!cover && (
          <img
            src="https://raw.githubusercontent.com/salviii/salviii.github.io/master/assets/sun%20dark.png"
            alt=""
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50%',
              height: '50%',
              objectFit: 'contain',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          />
        )}

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
