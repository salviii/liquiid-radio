import { useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { TrackList } from '../Library/TrackList'
import { getGradient } from '../../lib/utils'
import {
  Plus, LayoutGrid, List, Disc3, Play, MoreHorizontal, Trash2, Edit2, ArrowLeft,
} from 'lucide-react'
import type { Playlist } from '../../types'

export function PlaylistView() {
  const playlists = usePlayerStore((s) => s.playlists)
  const tracks = usePlayerStore((s) => s.tracks)
  const createPlaylist = usePlayerStore((s) => s.createPlaylist)
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist)
  const updatePlaylist = usePlayerStore((s) => s.updatePlaylist)
  const setQueue = usePlayerStore((s) => s.setQueue)

  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const activePlaylist = playlists.find(p => p.id === selectedPlaylist)

  function handleCreate() {
    const pl = createPlaylist(`Playlist ${playlists.length + 1}`)
    setSelectedPlaylist(pl.id)
    setEditingName(pl.id)
    setNameInput(pl.name)
  }

  function handleRename(id: string) {
    if (nameInput.trim()) {
      updatePlaylist(id, { name: nameInput.trim() })
    }
    setEditingName(null)
  }

  function handlePlayAll(playlist: Playlist) {
    const playlistTracks = playlist.tracks
      .map(tid => tracks.find(t => t.id === tid))
      .filter(Boolean) as typeof tracks
    if (playlistTracks.length > 0) {
      setQueue(playlistTracks)
    }
  }

  // Detail view
  if (activePlaylist) {
    const playlistTracks = activePlaylist.tracks
      .map(tid => tracks.find(t => t.id === tid))
      .filter(Boolean) as typeof tracks

    return (
      <div className="flex-1 overflow-auto pb-24">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="btn-ghost flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: 'var(--theme-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '10px',  letterSpacing: '0.15em' }}
          >
            <ArrowLeft size={14} /> Back to playlists
          </button>

          <div className="flex items-start gap-5">
            {/* Cover — inset panel area */}
            <div
              className="panel w-40 h-40 flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: activePlaylist.coverArt
                  ? `url(${activePlaylist.coverArt}) center/cover`
                  : getGradient(activePlaylist.id),
                borderRadius: '4px',
                boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {activePlaylist.viewMode === 'cd' ? (
                <Disc3 size={48} className="text-white/80" />
              ) : (
                <span className="text-4xl text-white/80" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {activePlaylist.name[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              {editingName === activePlaylist.id ? (
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => handleRename(activePlaylist.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(activePlaylist.id)}
                  className="text-2xl bg-transparent outline-none border-b-2 w-full"
                  style={{
                    color: 'var(--theme-text)',
                    borderColor: 'var(--theme-accent)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                  }}
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl tracking-tight" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {activePlaylist.name}
                </h2>
              )}
              <p style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px',  letterSpacing: '0.15em', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {playlistTracks.length} tracks
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handlePlayAll(activePlaylist)}
                  className="btn-accent flex items-center gap-2 px-4 py-2 text-sm font-medium"
                >
                  <Play size={16} fill="currentColor" /> Play All
                </button>
                <button
                  onClick={() => {
                    setEditingName(activePlaylist.id)
                    setNameInput(activePlaylist.name)
                  }}
                  className="btn-outline p-2"
                >
                  <Edit2 size={16} />
                </button>

                {/* View mode toggle */}
                <div className="flex overflow-hidden ml-auto"
                  style={{ border: '1px solid var(--theme-border)', borderRadius: '4px' }}>
                  {(['card', 'cd', 'list'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updatePlaylist(activePlaylist.id, { viewMode: mode })}
                      className="px-3 py-2"
                      style={{
                        background: activePlaylist.viewMode === mode ? 'var(--theme-accent)' : 'transparent',
                        color: activePlaylist.viewMode === mode ? '#fff' : 'var(--theme-text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                      }}
                    >
                      {mode === 'card' ? <LayoutGrid size={14} /> : mode === 'cd' ? <Disc3 size={14} /> : <List size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Track listing area */}
        <div className="px-4">
          <div className="panel-section" style={{ borderRadius: '4px' }}>
            <TrackList tracks={playlistTracks} playlistId={activePlaylist.id} />
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl tracking-tight" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Playlists
          </h2>
          <button
            onClick={handleCreate}
            className="btn-accent flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Playlist
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((playlist) => {
            const trackCount = playlist.tracks.length
            return (
              <div
                key={playlist.id}
                className="panel group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ padding: '8px', borderRadius: '4px' }}
                onClick={() => setSelectedPlaylist(playlist.id)}
              >
                {/* Inset cover area */}
                <div
                  className="aspect-square mb-3 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: playlist.coverArt
                      ? `url(${playlist.coverArt}) center/cover`
                      : getGradient(playlist.id),
                    borderRadius: '3px',
                    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {playlist.viewMode === 'cd' ? (
                    <Disc3 size={48} className="text-white/60" />
                  ) : (
                    <span className="text-5xl text-white/60" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {playlist.name[0]?.toUpperCase()}
                    </span>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                      <Play size={24} className="text-white" fill="white" />
                    </div>
                  </div>

                  {/* Menu */}
                  <button
                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '3px' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === playlist.id ? null : playlist.id)
                    }}
                  >
                    <MoreHorizontal size={16} className="text-white" />
                  </button>

                  {menuOpen === playlist.id && (
                    <div
                      className="panel absolute top-10 right-2 z-50 py-1 min-w-36 shadow-lg"
                      style={{ borderRadius: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                        style={{ color: 'var(--theme-accent-red)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                        onClick={() => {
                          deletePlaylist(playlist.id)
                          setMenuOpen(null)
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)' }}>
                  {playlist.name}
                </p>
                <p className="knob-label" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {trackCount} track{trackCount !== 1 ? 's' : ''}
                </p>
              </div>
            )
          })}

          {playlists.length === 0 && (
            <div className="col-span-full text-center py-16 panel-section" style={{ borderRadius: '4px' }}>
              <Disc3 size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-display)' }}>No playlists yet</p>
              <p className="knob-label mt-1">
                Create one to start organizing your audio
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
