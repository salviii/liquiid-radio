import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { TrackList } from './TrackList'
import { AddTrackModal } from './AddTrackModal'
import { Plus, Search, LayoutGrid, List, Music } from 'lucide-react'
import { isSpotifyConnected, searchSpotify, getUserSavedTracks } from '../../lib/spotifyAuth'
import type { SpotifySearchResult } from '../../lib/spotifyAuth'

export function LibraryView() {
  const tracks = usePlayerStore((s) => s.tracks)
  const addTrack = usePlayerStore((s) => s.addTrack)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'artist'>('added')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

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
    <div className="flex-1 overflow-auto pb-4">

      {/* Library header */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-sm"
            style={{
              letterSpacing: '0.15em',
              color: 'var(--theme-text)',
            }}
          >
            library
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`btn-outline flex items-center justify-center ${viewMode === 'list' ? 'active' : ''}`}
              style={{
                padding: '6px 8px',
                background: viewMode === 'list' ? 'var(--theme-accent-dim)' : undefined,
                borderColor: viewMode === 'list' ? 'var(--theme-accent)' : undefined,
                color: viewMode === 'list' ? 'var(--theme-accent)' : undefined,
              }}
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-outline flex items-center justify-center ${viewMode === 'grid' ? 'active' : ''}`}
              style={{
                padding: '6px 8px',
                background: viewMode === 'grid' ? 'var(--theme-accent-dim)' : undefined,
                borderColor: viewMode === 'grid' ? 'var(--theme-accent)' : undefined,
                color: viewMode === 'grid' ? 'var(--theme-accent)' : undefined,
              }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-accent flex items-center gap-1.5"
              style={{ padding: '6px 14px' }}
            >
              <Plus size={13} /> add
            </button>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--theme-text-muted)' }} />
            <input
              type="text"
              placeholder={searchMode === 'spotify' ? 'search spotify...' : 'search...'}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="panel-section w-full pl-9 pr-4 py-2.5 outline-none"
              style={{
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: 'var(--theme-text)',
              }}
            />
          </div>

          {/* Spotify toggle or sort */}
          {searchMode === 'library' ? (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="btn-outline cursor-pointer outline-none"
              style={{ padding: '6px 12px' }}
            >
              <option value="added">recent</option>
              <option value="title">title</option>
              <option value="artist">artist</option>
            </select>
          ) : (
            <button
              onClick={() => { setSearchMode('library'); setSearch('') }}
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: '9px', letterSpacing: '0.1em' }}
            >
              back
            </button>
          )}
        </div>

        {/* Spotify search toggle */}
        {spotifyConnected && searchMode === 'library' && (
          <button
            onClick={() => setSearchMode('spotify')}
            className="flex items-center gap-1.5 mt-3"
            style={{
              background: 'none',
              border: '1px solid var(--theme-border)',
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: '#1db954',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Music size={11} />
            search spotify library
          </button>
        )}
      </div>

      <div className="px-4" style={{ flex: 1 }}>
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
              {search ? 'no results' : 'drop a link or tap to add tracks'}
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
          <TrackList tracks={filteredTracks} viewMode={viewMode} />
        )}
      </div>

      {showAddModal && <AddTrackModal onClose={() => setShowAddModal(false)} />}
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
