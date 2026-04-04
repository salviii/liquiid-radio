import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { formatTime } from '../../lib/utils'
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react'

interface MiniPlayerProps {
  onClose: () => void
}

export function MiniPlayer({ onClose }: MiniPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 220 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  // Drag handling
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }

    function handleMouseUp() {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
  }

  // Snap to corners
  function snapToCorner() {
    const w = window.innerWidth
    const h = window.innerHeight
    const pw = 320
    const ph = 180
    const pad = 16

    const cx = position.x + pw / 2
    const cy = position.y + ph / 2

    const snapX = cx < w / 2 ? pad : w - pw - pad
    const snapY = cy < h / 2 ? pad : h - ph - pad

    setPosition({ x: snapX, y: snapY })
  }

  useEffect(() => {
    if (!isDragging) snapToCorner()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  if (!currentTrack) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] select-none"
      style={{
        left: position.x,
        top: position.y,
        width: 320,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #e8e2d4 0%, #d9d1c0 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08)',
          border: '1px solid #c5bda8',
        }}>

        {/* Close / minimize buttons */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[8px] uppercase tracking-[0.2em] font-medium" style={{ color: '#7a7262' }}>
            hurakan mini
          </span>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors"
            style={{ color: '#7a7262' }}>
            <X size={12} />
          </button>
        </div>

        {/* Display */}
        <div className="mx-3 mb-2 rounded-lg overflow-hidden p-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3) inset',
            border: '1px solid #3a3530',
          }}>

          {/* Mini disc */}
          <div className={`w-12 h-12 rounded-full flex-shrink-0 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`}
            style={{
              background: '#111',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
            }}>
            <div className="absolute inset-0 m-auto w-5 h-5 rounded-full overflow-hidden"
              style={{
                background: currentTrack.coverArt
                  ? `url(${currentTrack.coverArt}) center/cover`
                  : '#2a2520',
              }} />
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: '#f0ece4' }}>
              {currentTrack.title}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {currentTrack.artist}
            </p>
            {/* Mini progress */}
            <div className="h-0.5 rounded-full mt-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{
                width: `${progressPercent}%`,
                background: 'var(--theme-accent)',
              }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] tabular-nums" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {formatTime(progress)}
              </span>
              <span className="text-[8px] tabular-nums" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Mini controls */}
        <div className="flex items-center justify-center gap-3 px-3 pb-3">
          <button onClick={previous}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #3a3530 0%, #2a2520 100%)',
              color: '#c5bda8',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}>
            <SkipBack size={12} fill="currentColor" />
          </button>

          <button onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #2a2520 0%, #1a1510 100%)',
              color: '#f0ece4',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px #c5bda8',
            }}>
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>

          <button onClick={next}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #3a3530 0%, #2a2520 100%)',
              color: '#c5bda8',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}>
            <SkipForward size={12} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )
}
