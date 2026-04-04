import { useState, useMemo, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { TrackList } from './TrackList'
import { AddTrackModal } from './AddTrackModal'
import { Plus, LayoutGrid, List, Share2, Trash2 } from 'lucide-react'

export function LibraryView() {
  const tracks = usePlayerStore((s) => s.tracks)
  const clearLibrary = usePlayerStore((s) => s.clearLibrary)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [shareCopied, setShareCopied] = useState(false)

  function handleShare() {
    const encoded = encodePlaylist(tracks)
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }).catch(() => {
      prompt('copy this link:', url)
    })
  }

  const filteredTracks = useMemo(() => {
    const result = [...tracks]
    result.sort((a, b) => b.addedAt - a.addedAt)
    return result
  }, [tracks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', minHeight: 0 }}>

      {/* Library header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 style={{
            fontSize: '10px',
            letterSpacing: '0.15em',
            color: 'var(--theme-text)',
          }}>
            library
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('list')}
              className={`btn-outline flex items-center justify-center ${viewMode === 'list' ? 'active' : ''}`}
              style={{
                padding: '4px 6px',
                background: viewMode === 'list' ? 'var(--theme-accent-dim)' : undefined,
                borderColor: viewMode === 'list' ? 'var(--theme-accent)' : undefined,
                color: viewMode === 'list' ? 'var(--theme-accent)' : undefined,
              }}
            >
              <List size={11} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-outline flex items-center justify-center ${viewMode === 'grid' ? 'active' : ''}`}
              style={{
                padding: '4px 6px',
                background: viewMode === 'grid' ? 'var(--theme-accent-dim)' : undefined,
                borderColor: viewMode === 'grid' ? 'var(--theme-accent)' : undefined,
                color: viewMode === 'grid' ? 'var(--theme-accent)' : undefined,
              }}
            >
              <LayoutGrid size={11} />
            </button>
            {tracks.length > 0 && (
              <button
                onClick={() => { if (confirm('Clear all tracks from library?')) clearLibrary() }}
                className="btn-outline flex items-center justify-center"
                style={{ padding: '4px 6px' }}
                title="Clear library"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-accent flex items-center gap-1"
              style={{ padding: '4px 10px', fontSize: '9px' }}
            >
              <Plus size={11} /> add
            </button>
            {tracks.length > 0 && (
              <button
                onClick={handleShare}
                className="btn-accent flex items-center gap-1"
                style={{ padding: '4px 10px', fontSize: '9px' }}
              >
                <Share2 size={11} /> {shareCopied ? 'copied!' : 'share'}
              </button>
            )}
          </div>
        </div>


      </div>

      {!showAddModal && <div className="px-3" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {filteredTracks.length === 0 ? (
          <div
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              cursor: 'pointer',
              border: '1px dashed var(--theme-border-panel)',
              borderRadius: '6px',
              marginTop: '8px',
              transition: 'border-color 0.15s',
            }}
          >
            <Plus size={24} style={{ color: 'var(--theme-text-muted)', marginBottom: '8px' }} />
            <p style={{
              fontSize: '11px',
              color: 'var(--theme-text-muted)',
              letterSpacing: '0.1em',
              textAlign: 'center',
            }}>
              tap to add sources
            </p>
            <p style={{
              fontSize: '9px',
              color: 'var(--theme-text-muted)',
              opacity: 0.6,
              marginTop: '4px',
              letterSpacing: '0.08em',
            }}>
              youtube · soundcloud · spotify · mp3
            </p>
          </div>
        ) : (
          <>
            <TrackList tracks={filteredTracks} viewMode={viewMode} />
            {/* Empty space below tracks — tap to add */}
            <div
              onClick={() => setShowAddModal(true)}
              style={{
                flex: 1,
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: 0.4,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
            >
              <Plus size={16} style={{ color: 'var(--theme-text-muted)' }} />
              <span style={{
                fontSize: '9px',
                color: 'var(--theme-text-muted)',
                letterSpacing: '0.1em',
                marginLeft: '6px',
              }}>
                add more
              </span>
            </div>
          </>
        )}
      </div>}

      {showAddModal && (
        <div className="px-3" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <AddTrackModal onClose={() => setShowAddModal(false)} />
        </div>
      )}
    </div>
  )
}

// Compact LZ-style compression for playlist URLs
function compressString(input: string): string {
  // Use pipe-delimited format: url|title|artist per track, newline separated
  // Then deflate-like compression using repeated substring elimination
  const bytes = new TextEncoder().encode(input)
  const binStr = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decompressString(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - input.length % 4) % 4)
  const binStr = atob(padded)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Encode playlist as compact pipe-delimited string → base64url
function encodePlaylist(tracks: { url: string; originalUrl?: string; title: string; artist: string }[]): string {
  // Format: url|title|artist per line — much more compact than JSON
  const lines = tracks.map(t => {
    const url = t.originalUrl || t.url
    // Strip common prefixes to save space
    const shortUrl = url
      .replace('https://open.spotify.com/track/', 'sp:')
      .replace('https://www.youtube.com/watch?v=', 'yt:')
      .replace('https://youtu.be/', 'yt:')
      .replace('https://soundcloud.com/', 'sc:')
      .replace('https://', '')
    return `${shortUrl}|${t.title}|${t.artist}`
  })
  return compressString(lines.join('\n'))
}

// Decode playlist from URL param
export function decodePlaylist(encoded: string): { url: string; title: string; artist: string }[] {
  try {
    const raw = decompressString(encoded)
    return raw.split('\n').filter(Boolean).map(line => {
      const [shortUrl, title, artist] = line.split('|')
      // Restore shortened URLs
      let url = shortUrl
      if (url.startsWith('sp:')) url = 'https://open.spotify.com/track/' + url.slice(3)
      else if (url.startsWith('yt:')) url = 'https://www.youtube.com/watch?v=' + url.slice(3)
      else if (url.startsWith('sc:')) url = 'https://soundcloud.com/' + url.slice(3)
      else if (!url.startsWith('http')) url = 'https://' + url
      return { url, title: title || 'untitled', artist: artist || 'unknown' }
    })
  } catch {
    return []
  }
}

// Generate a shareable link encoding the playlist
function useAccentTextColor(): string {
  const [color, setColor] = useState('#fff')
  useEffect(() => {
    function update() {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim()
      const hex = accent.startsWith('#') ? accent : '#000'
      const r = parseInt(hex.slice(1, 3), 16) || 0
      const g = parseInt(hex.slice(3, 5), 16) || 0
      const b = parseInt(hex.slice(5, 7), 16) || 0
      // Relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      setColor(luminance > 0.5 ? '#000' : '#fff')
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    return () => observer.disconnect()
  }, [])
  return color
}

export function SharePlaylistButton() {
  const tracks = usePlayerStore((s) => s.tracks)
  const [copied, setCopied] = useState(false)
  const textColor = useAccentTextColor()

  function generateShareLink() {
    const encoded = encodePlaylist(tracks)
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      prompt('copy this link:', url)
    })
  }

  if (tracks.length === 0) return null

  return (
    <button
      onClick={generateShareLink}
      className="share-playlist-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: '100%',
        padding: '8px 0',
        background: 'var(--theme-accent)',
        color: textColor,
        border: 'none',
        cursor: 'pointer',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        transition: 'opacity 0.15s',
        opacity: copied ? 1 : 0.9,
      }}
    >
      <Share2 size={12} />
      {copied ? 'link copied!' : 'share playlist'}
    </button>
  )
}
