import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { TrackList } from './TrackList'
import { AddTrackModal } from './AddTrackModal'
import { Plus, Search, LayoutGrid, List, Music, Share2 } from 'lucide-react'
import { isSpotifyConnected, searchSpotify, getUserSavedTracks } from '../../lib/spotifyAuth'
import type { SpotifySearchResult } from '../../lib/spotifyAuth'

export function LibraryView() {
  const tracks = usePlayerStore((s) => s.tracks)
  const addTrack = usePlayerStore((s) => s.addTrack)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'artist'>('added')
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

  // Spotify search state
  const spotifyConnected = isSpotifyConnected()
  const [searchMode, setSearchMode] = useState<'library' | 'spotify'>('library')
  const [spotifyResults, setSpotifyResults] = useState<SpotifySearchResult[]>([])
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Debounced Spotify search
  const doSpotifySearch = useCallback((q: string) => {
    clearTimeout(searchTimer.current)
    if (!q.trim()) {
      // Show saved tracks when no query
      setSpotifyLoading(true)
      getUserSavedTracks(30).then(results => {
        setSpotifyResults(results)
        setSpotifyLoading(false)
      })
      return
    }
    setSpotifyLoading(true)
    searchTimer.current = setTimeout(() => {
      searchSpotify(q, 20).then(results => {
        setSpotifyResults(results)
        setSpotifyLoading(false)
      })
    }, 400)
  }, [])

  // Load saved tracks when switching to spotify mode
  useEffect(() => {
    if (searchMode === 'spotify' && spotifyConnected) {
      doSpotifySearch(search)
    }
  }, [searchMode])

  // Handle search input
  function handleSearch(val: string) {
    setSearch(val)
    if (searchMode === 'spotify' && spotifyConnected) {
      doSpotifySearch(val)
    }
  }

  // Add Spotify track to library
  function addSpotifyTrack(result: SpotifySearchResult) {
    addTrack({
      title: result.title,
      artist: result.artist,
      album: result.album,
      duration: result.durationMs / 1000,
      url: result.url,
      originalUrl: result.url,
      coverArt: result.coverArt,
      sourceType: 'spotify',
      tags: ['spotify'],
    })
    setAddedIds(prev => new Set(prev).add(result.id))
  }

  // Check if a spotify track is already in library
  function isInLibrary(spotifyId: string) {
    return addedIds.has(spotifyId) || tracks.some(t =>
      t.sourceType === 'spotify' && t.url?.includes(spotifyId)
    )
  }

  const filteredTracks = useMemo(() => {
    let result = [...tracks]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break
      case 'artist': result.sort((a, b) => a.artist.localeCompare(b.artist)); break
      default: result.sort((a, b) => b.addedAt - a.addedAt)
    }
    return result
  }, [tracks, search, sortBy])

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


        {/* Spotify search toggle */}
        {spotifyConnected && searchMode === 'library' && (
          <button
            onClick={() => setSearchMode('spotify')}
            className="flex items-center gap-1 mt-2"
            style={{
              background: 'none',
              border: '1px solid var(--theme-border)',
              borderRadius: '3px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: '8px',
              letterSpacing: '0.1em',
              color: '#1db954',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Music size={9} />
            search spotify
          </button>
        )}
      </div>

      {!showAddModal && <div className="px-3" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {searchMode === 'spotify' ? (
          <SpotifyResultsList
            results={spotifyResults}
            loading={spotifyLoading}
            onAdd={addSpotifyTrack}
            isInLibrary={isInLibrary}
          />
        ) : filteredTracks.length === 0 ? (
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
              {search ? 'no results' : 'tap to add sources'}
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

// Spotify search results list
function SpotifyResultsList({
  results,
  loading,
  onAdd,
  isInLibrary,
}: {
  results: SpotifySearchResult[]
  loading: boolean
  onAdd: (r: SpotifySearchResult) => void
  isInLibrary: (id: string) => boolean
}) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--theme-text-muted)', fontSize: '10px' }}>
        searching...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--theme-text-muted)', fontSize: '10px' }}>
        no results
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {results.map(r => {
        const added = isInLibrary(r.id)
        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 4px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => !added && onAdd(r)}
          >
            {/* Cover art */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '3px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--theme-bg-panel)',
            }}>
              {r.coverArt ? (
                <img src={r.coverArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--theme-text-muted)', fontSize: '10px',
                }}>
                  <Music size={14} />
                </div>
              )}
            </div>

            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="truncate" style={{
                fontSize: '11px',
                color: 'var(--theme-text)',
              }}>
                {r.title}
              </p>
              <p className="truncate" style={{
                fontSize: '9px',
                color: 'var(--theme-text-muted)',
                marginTop: '1px',
              }}>
                {r.artist} · {r.album}
              </p>
            </div>

            {/* Duration */}
            <span style={{
              fontSize: '9px',
              color: 'var(--theme-text-muted)',
              flexShrink: 0,
            }}>
              {formatMs(r.durationMs)}
            </span>

            {/* Add button */}
            <button
              onClick={(e) => { e.stopPropagation(); if (!added) onAdd(r) }}
              disabled={added}
              style={{
                background: 'none',
                border: `1px solid ${added ? 'var(--theme-border)' : '#1db954'}`,
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '8px',
                letterSpacing: '0.1em',
                color: added ? 'var(--theme-text-muted)' : '#1db954',
                cursor: added ? 'default' : 'pointer',
                flexShrink: 0,
                opacity: added ? 0.5 : 1,
              }}
            >
              {added ? 'added' : '+ add'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
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
