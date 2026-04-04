import { useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { formatTime } from '../../lib/utils'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface PlayerProps {
  onSeek: (time: number) => void
}

export function Player({ onSeek }: PlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)

  const pct = duration > 0 ? (progress / duration) * 100 : 0
  // Map volume 0-1 to rotation -140deg to 140deg
  const knobRotation = -140 + volume * 280

  if (!currentTrack) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--theme-player-bg)',
        borderTop: '1px solid var(--theme-border)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative cursor-pointer"
        style={{
          height: '3px',
          background: 'var(--theme-bg-secondary)',
        }}
        onClick={(e) => {
          if (!progressRef.current || !duration) return
          const rect = progressRef.current.getBoundingClientRect()
          onSeek(((e.clientX - rect.left) / rect.width) * duration)
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--theme-accent)',
            boxShadow: isPlaying ? '0 0 8px var(--theme-accent), 0 0 20px rgba(61,255,106,0.3)' : 'none',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      <div className="flex items-center h-16 px-5 gap-5">
        {/* LED indicator */}
        <div
          className={`led ${isPlaying ? 'active playing' : ''}`}
          style={{ flexShrink: 0 }}
        />

        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '3px',
              border: '1px solid var(--theme-border)',
              background: currentTrack.coverArt
                ? `url(${currentTrack.coverArt}) center/cover`
                : 'var(--theme-bg-secondary)',
            }}
          />
          <div className="min-w-0">
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--theme-text)',
                lineHeight: 1.3,
              }}
            >
              {currentTrack.title}
            </p>
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--theme-text-muted)',
                letterSpacing: '0.04em',
                lineHeight: 1.4,
              }}
            >
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-3">
          {/* TRANSPORT silkscreen label */}
          <span
            className="hidden lg:block"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 500,
              letterSpacing: '0.15em',
              
              color: 'var(--theme-text-muted)',
              marginRight: '4px',
            }}
          >
            transport
          </span>

          <button
            onClick={previous}
            className="btn-ghost flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid var(--theme-border)',
              borderRadius: '4px',
              color: 'var(--theme-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: 0,
            }}
          >
            <SkipBack size={13} fill="currentColor" />
          </button>

          {/* Play button - dark matte knob style */}
          <button
            onClick={togglePlay}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #484848 0%, var(--theme-knob) 55%, #1E1E1E 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPlaying ? 'var(--theme-accent)' : 'var(--color-text-on-dark, #F0EDEA)',
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
          >
            {isPlaying
              ? <Pause size={16} fill="currentColor" />
              : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
            }
          </button>

          <button
            onClick={next}
            className="btn-ghost flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid var(--theme-border)',
              borderRadius: '4px',
              color: 'var(--theme-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: 0,
            }}
          >
            <SkipForward size={13} fill="currentColor" />
          </button>
        </div>

        {/* Time readout */}
        <div
          className="hidden md:flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--theme-text-muted)',
            letterSpacing: '0.06em',
          }}
        >
          <span style={{ color: 'var(--theme-text-secondary)' }}>{formatTime(progress)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Volume knob */}
        <div className="hidden md:flex flex-col items-center gap-1">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              fontWeight: 500,
              letterSpacing: '0.15em',
              
              color: 'var(--theme-text-muted)',
            }}
          >
            vol
          </span>
          <div
            onClick={() => {
              // Cycle through volume presets on click
              if (volume > 0.66) setVolume(0)
              else if (volume > 0.33) setVolume(1)
              else setVolume(0.66)
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #484848 0%, var(--theme-knob) 55%, #1E1E1E 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)',
              cursor: 'pointer',
              position: 'relative',
              transform: `rotate(${knobRotation}deg)`,
              transition: 'transform 0.15s ease',
            }}
          >
            {/* Knob indicator line */}
            <div
              style={{
                position: 'absolute',
                top: '3px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '1.5px',
                height: '6px',
                background: volume > 0 ? 'var(--theme-accent)' : '#F0EDEA',
                borderRadius: '1px',
                boxShadow: volume > 0 ? '0 0 4px var(--theme-accent)' : 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
