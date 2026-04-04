import { useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { Link, Plus, Trash2, RefreshCw, Globe, HardDrive, X, FolderOpen } from 'lucide-react'

export function SourcesView() {
  const sources = usePlayerStore((s) => s.sources)
  const addSource = usePlayerStore((s) => s.addSource)
  const removeSource = usePlayerStore((s) => s.removeSource)
  const [showAdd, setShowAdd] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [nameInput, setNameInput] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return

    addSource({
      name: nameInput.trim() || new URL(urlInput).hostname,
      url: urlInput.trim(),
      type: 'url',
      autoSync: true,
    })

    setUrlInput('')
    setNameInput('')
    setShowAdd(false)
  }

  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl tracking-tight" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Sources
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-accent flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:scale-105"
          >
            <Plus size={16} /> Add Source
          </button>
        </div>
        <p className="knob-label mb-6" style={{ fontSize: '11px' }}>
          Connect folders, drives, and URLs to auto-discover audio files
        </p>

        {/* Source list */}
        <div className="space-y-3">
          {sources.map(source => (
            <div
              key={source.id}
              className="panel flex items-center gap-4 p-4 transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <div className="w-10 h-10 flex items-center justify-center"
                style={{ background: 'var(--theme-bg-panel)', borderRadius: '4px', border: '1px solid var(--theme-border)', color: 'var(--theme-accent)' }}>
                {source.type === 'folder' ? <FolderOpen size={20} /> :
                 source.type === 'gdrive' ? <HardDrive size={20} /> :
                 <Globe size={20} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)' }}>
                  {source.name}
                </p>
                <p className="truncate" style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em' }}>
                  {source.url}
                </p>
              </div>

              {/* LED status indicator */}
              <div className="flex items-center gap-2">
                <span className="led active" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px',  letterSpacing: '0.15em', color: 'var(--theme-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {source.trackCount} tracks
                </span>
              </div>

              <button className="btn-ghost p-2 transition-colors"
                style={{ color: 'var(--theme-text-muted)' }}>
                <RefreshCw size={16} />
              </button>

              <button
                onClick={() => removeSource(source.id)}
                className="btn-ghost p-2 transition-colors"
                style={{ color: 'var(--theme-accent-red)' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {sources.length === 0 && (
            <div className="panel-section text-center py-16"
              style={{ borderRadius: '4px' }}>
              <Link size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-display)' }}>No sources connected</p>
              <p className="knob-label mt-1">
                Add a Google Drive folder, Dropbox link, or any URL with audio files
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add source modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAdd(false)}>
          <div className="panel w-full max-w-md p-6 shadow-xl"
            style={{ borderRadius: '6px' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Add Source</h3>
              <button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ color: 'var(--theme-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="knob-label" style={{ display: 'block', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  placeholder="Source name (optional)"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--theme-bg)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
              <div>
                <label className="knob-label" style={{ display: 'block', marginBottom: '4px' }}>URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--theme-bg)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-accent w-full py-2.5 text-sm font-medium"
              >
                Connect Source
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
