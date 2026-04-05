import { usePlayerStore } from '../../store/playerStore'
import { formatTime } from '../../lib/utils'
import { Play, Pause, MoreHorizontal, Plus, Trash2, ListPlus, LinkIcon, X, GripVertical } from 'lucide-react'
import { useState, useRef } from 'react'
import type { Track } from '../../types'

// Favicon URLs for each audio source
const SOURCE_ICONS: Record<string, string> = {
  soundcloud: 'https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico',
  youtube: 'https://www.youtube.com/favicon.ico',
  spotify: 'https://open.spotify.com/favicon.ico',
  gdrive: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
}

function getSourceBadge(t: Track): { icon?: string; label: string; color: string } | null {
  if (t.sourceType === 'soundcloud' || t.tags?.includes('soundcloud')) return { icon: SOURCE_ICONS.soundcloud, label: 'SC', color: '#ff5500' }
  if (t.sourceType === 'youtube' || t.tags?.includes('youtube')) return { icon: SOURCE_ICONS.youtube, label: 'YT', color: '#ff0000' }
  if (t.sourceType === 'spotify' || t.tags?.includes('spotify')) return { icon: SOURCE_ICONS.spotify, label: 'SP', color: '#1db954' }
  if (t.sourceType === 'local') return { label: 'LOCAL', color: 'var(--theme-text-muted)' }
  if (t.sourceType === 'gdrive' || t.tags?.includes('gdrive')) return { icon: SOURCE_ICONS.gdrive, label: 'GDRIVE', color: '#4285f4' }
  const ext = t.url.match(/\.(mp3|wav|ogg|flac|aac|m4a|opus)(\?|$)/i)
  if (ext) return { label: ext[1].toUpperCase(), color: 'var(--theme-text-muted)' }
  return null
}

interface TrackListProps {
  tracks: Track[]
  viewMode?: 'list' | 'grid'
  playlistId?: string  // If set, shows "remove from playlist" instead of "delete from library"
  onReorder?: (fromIndex: number, toIndex: number) => void
}

function RelinkModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const relinkTrack = usePlayerStore((s) => s.relinkTrack)
  const removeTrack = usePlayerStore((s) => s.removeTrack)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { setError('Paste a URL or pick a file'); return }
    try { new URL(url); } catch { setError('Invalid URL'); return }
    relinkTrack(track.id, url.trim())
    onClose()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    relinkTrack(track.id, objectUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            
            color: 'var(--theme-text)',
          }}>
            Relink Track
          </h3>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
        <p className="truncate mb-3" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--theme-text-secondary)',
          letterSpacing: '0.08em',
        }}>
          {track.title} — {track.artist}
        </p>
        <form onSubmit={handleUrlSubmit}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste new URL..."
            className="panel-section w-full px-3 py-2 mb-2 outline-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--theme-text)',
            }}
            autoFocus
          />
          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-error)', marginBottom: '8px' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline flex-1" style={{ padding: '7px 10px' }}>
              PICK FILE
            </button>
            <button type="submit" className="btn-accent flex-1" style={{ padding: '7px 10px' }}>
              RELINK URL
            </button>
          </div>
          <button
            type="button"
            onClick={() => { removeTrack(track.id); onClose() }}
            className="w-full mt-2"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              
              color: 'var(--color-error)',
              background: 'none',
              border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
              borderRadius: '4px',
              padding: '7px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--color-error) 10%, transparent)'
              e.currentTarget.style.borderColor = 'var(--color-error)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-error) 25%, transparent)'
            }}
          >
            REMOVE FROM LIBRARY
          </button>
        </form>
      </div>
    </div>
  )
}

export function TrackList({ tracks, viewMode = 'list', playlistId, onReorder }: TrackListProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const removeTrack = usePlayerStore((s) => s.removeTrack)
  const removeFromPlaylist = usePlayerStore((s) => s.removeFromPlaylist)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const playlists = usePlayerStore((s) => s.playlists)
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist)
  const [menuTrack, setMenuTrack] = useState<string | null>(null)
  const [relinkTrackId, setRelinkTrackId] = useState<string | null>(null)
  const relinkTarget = tracks.find(t => t.id === relinkTrackId)

  function handleClick(track: Track, i: number) {
    if (track.dead) {
      setRelinkTrackId(track.id)
      return
    }
    currentTrack?.id === track.id ? (isPlaying ? pause() : play()) : setQueue(tracks, i)
  }

  function Menu({ track }: { track: Track }) {
    const menuBtnStyle: React.CSSProperties = {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.1em',
      
      color: 'var(--theme-text)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left' as const,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
    }

    return (
      <div
        className="panel"
        style={{
          position: 'fixed',
          zIndex: 9999,
          right: '20px',
          marginTop: '4px',
          padding: '4px 0',
          minWidth: '180px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          style={menuBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-bg-panel)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          onClick={(e) => { e.stopPropagation(); addToQueue(track); setMenuTrack(null) }}
        >
          <Plus size={12} /> Add to queue
        </button>
        {playlists.map(p => (
          <button
            key={p.id}
            style={{ ...menuBtnStyle, color: 'var(--theme-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-bg-panel)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            onClick={(e) => { e.stopPropagation(); addToPlaylist(p.id, track.id); setMenuTrack(null) }}
          >
            <ListPlus size={12} /> {p.name}
          </button>
        ))}
        <div style={{ margin: '4px 12px', borderTop: '1px solid var(--theme-border)' }} />
        {playlistId && (
          <button
            style={{ ...menuBtnStyle, color: 'var(--theme-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-bg-panel)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            onClick={(e) => { e.stopPropagation(); removeFromPlaylist(playlistId, track.id); setMenuTrack(null) }}
          >
            <X size={12} /> Remove from playlist
          </button>
        )}
        <button
          style={{ ...menuBtnStyle, color: 'var(--color-error, #e74c3c)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-bg-panel)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          onClick={(e) => { e.stopPropagation(); removeTrack(track.id); setMenuTrack(null) }}
        >
          <Trash2 size={12} /> Delete from library
        </button>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-20">
        <p
          className="knob-label"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          NO TRACKS
        </p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {tracks.map((t, i) => {
          const active = currentTrack?.id === t.id
          return (
            <div
              key={t.id}
              className="panel cursor-pointer group"
              style={{ padding: '8px' }}
              onClick={() => handleClick(t, i)}
            >
              {/* Cover area */}
              <div
                className="panel-section aspect-square mb-2 relative overflow-hidden flex items-center justify-center"
                style={{
                  background: t.coverArt ? `url(${t.coverArt}) center/cover` : 'var(--theme-bg-panel)',
                  borderColor: active ? 'var(--theme-accent)' : undefined,
                }}
              >
                {!t.coverArt && (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      color: 'var(--theme-text-muted)',
                      opacity: 0.4,
                    }}
                  >
                    {t.title[0]?.toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    {active && isPlaying
                      ? <Pause size={16} className="text-white" fill="white" />
                      : <Play size={16} className="text-white ml-0.5" fill="white" />}
                  </div>
                </div>
              </div>

              {/* Track info */}
              <div className="flex items-center gap-1.5">
                {active && (
                  <span className={`led ${isPlaying ? 'active playing' : 'active'}`} />
                )}
                <p
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    
                    color: active ? 'var(--theme-accent)' : 'var(--theme-text)',
                  }}
                >
                  {t.title}
                </p>
              </div>
              <p
                className="truncate mt-0.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  
                  color: 'var(--theme-text-muted)',
                }}
              >
                {t.artist}
              </p>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Invisible backdrop to close menu on outside click */}
      {menuTrack && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={() => setMenuTrack(null)}
        />
      )}
      <div>
        {tracks.map((t, i) => {
          const active = currentTrack?.id === t.id
          const isDead = !!t.dead
          const badge = getSourceBadge(t)
          return (
            <div
              key={t.id}
              className="group flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors"
              draggable={!!onReorder}
              onDragStart={(e) => {
                setDragIndex(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverIndex(i)
              }}
              onDragLeave={() => { if (dragOverIndex === i) setDragOverIndex(null) }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null && dragIndex !== i && onReorder) {
                  onReorder(dragIndex, i)
                }
                setDragIndex(null)
                setDragOverIndex(null)
              }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
              style={{
                borderBottom: '1px solid var(--theme-border)',
                borderTop: dragOverIndex === i && dragIndex !== null && dragIndex !== i
                  ? '2px solid var(--theme-accent)' : undefined,
                background: dragIndex === i
                  ? 'color-mix(in srgb, var(--theme-accent) 5%, transparent)'
                  : active
                  ? 'color-mix(in srgb, var(--theme-accent) 10%, transparent)'
                  : 'transparent',
                borderLeft: active ? '3px solid var(--theme-accent)' : '3px solid transparent',
                opacity: isDead ? 0.45 : dragIndex === i ? 0.5 : 1,
              }}
              onClick={() => handleClick(t, i)}
            >
              {/* Drag handle */}
              {onReorder && (
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} />
                </div>
              )}
              {/* LED / source badge indicator */}
              <div className="flex-shrink-0 flex justify-center" style={{ width: '28px' }}>
                {isDead ? (
                  <span style={{ fontSize: '10px', lineHeight: 1 }} title="Dead link — click to relink">🔗</span>
                ) : active ? (
                  <span className={`led ${isPlaying ? 'active playing' : 'active'}`} />
                ) : badge ? (
                  badge.icon ? (
                    <img
                      src={badge.icon}
                      alt={badge.label}
                      style={{
                        width: 14,
                        height: 14,
                        objectFit: 'contain',
                        opacity: 0.5,
                        borderRadius: '2px',
                        filter: 'grayscale(1) contrast(0.6) brightness(1.2)',
                      }}
                    />
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '7px',
                      letterSpacing: '0.08em',
                      color: 'var(--theme-text-muted)',
                      padding: '1px 3px',
                      borderRadius: '2px',
                      border: '1px solid var(--theme-border)',
                      opacity: 0.55,
                      lineHeight: '10px',
                      whiteSpace: 'nowrap',
                    }}>
                      {badge.label}
                    </span>
                  )
                ) : null}
              </div>

              {/* Cover */}
              <div
                className={`w-12 h-12 flex-shrink-0 relative overflow-hidden flex items-center justify-center ${!t.coverArt ? 'panel-section' : ''}`}
                style={{
                  border: t.coverArt ? '1px solid var(--theme-border)' : undefined,
                  background: t.coverArt ? `url(${t.coverArt}) center/cover` : undefined,
                  filter: isDead ? 'grayscale(1)' : 'none',
                }}
              >
                {!t.coverArt && (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--theme-text-muted)',
                      opacity: 0.5,
                    }}
                  >
                    {t.title[0]?.toUpperCase()}
                  </span>
                )}
                {!isDead && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {active && isPlaying
                        ? <Pause size={14} className="text-white" fill="white" />
                        : <Play size={14} className="text-white ml-0.5" fill="white" />}
                    </div>
                  </div>
                )}
                {isDead && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <LinkIcon size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    
                    color: isDead ? 'var(--theme-text-muted)' : active ? 'var(--theme-accent)' : 'var(--theme-text)',
                    textDecoration: isDead ? 'line-through' : 'none',
                  }}
                >
                  {t.title}
                </p>
                <p
                  className="truncate mt-1"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    
                    color: 'var(--theme-text-secondary)',
                  }}
                >
                  {isDead ? 'Link broken — click to relink' : `${t.artist}${t.album ? ` \u00b7 ${t.album}` : ''}`}
                </p>
              </div>

              {/* Duration readout */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.1em',
                  color: 'var(--theme-text-muted)',
                }}
              >
                {t.duration > 0 ? formatTime(t.duration) : ''}
              </span>

              {/* Menu button */}
              <div className="relative">
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: 'var(--theme-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={(e) => { e.stopPropagation(); setMenuTrack(menuTrack === t.id ? null : t.id) }}
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuTrack === t.id && <Menu track={t} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Relink modal */}
      {relinkTarget && (
        <RelinkModal track={relinkTarget} onClose={() => setRelinkTrackId(null)} />
      )}
    </>
  )
}
