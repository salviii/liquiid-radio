import { useState, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { extractFilename } from '../../lib/utils'
import { isSoundCloudUrl, resolveSoundCloudTrack } from '../../lib/soundcloud'
import { isYouTubeUrl, resolveYouTubeTrack } from '../../lib/youtube'
import { isSpotifyUrl, resolveSpotifyTrack } from '../../lib/spotify'
import { isGDriveUrl, resolveGDriveFile, isGDriveFolderUrl } from '../../lib/gdrive'
import { X, Link, Plus, AlertCircle, FolderOpen, Music } from 'lucide-react'

interface AddTrackModalProps {
  onClose: () => void
}

type TabMode = 'url' | 'local'

export function AddTrackModal({ onClose }: AddTrackModalProps) {
  const [tab, setTab] = useState<TabMode>('url')
  const [urls, setUrls] = useState('')
  const [error, setError] = useState('')
  const [localFiles, setLocalFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addTrack = usePlayerStore((s) => s.addTrack)

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const lines = urls
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setError('Paste at least one audio URL')
      return
    }

    const invalid = lines.filter(l => {
      try {
        new URL(l)
        return false
      } catch {
        return true
      }
    })

    if (invalid.length > 0) {
      setError(`Invalid URL(s): ${invalid[0]}`)
      return
    }

    for (const url of lines) {
      if (isSoundCloudUrl(url)) {
        resolveSoundCloudTrack(url).then(info => {
          addTrack({
            title: info?.title || extractFilename(url),
            artist: info?.artist || 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            coverArt: info?.thumbnailUrl,
            sourceType: 'soundcloud',
            tags: ['soundcloud'],
          })
        }).catch(() => {
          addTrack({
            title: extractFilename(url),
            artist: 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            sourceType: 'soundcloud',
            tags: ['soundcloud'],
          })
        })
      } else if (isYouTubeUrl(url)) {
        resolveYouTubeTrack(url).then(info => {
          addTrack({
            title: info?.title || extractFilename(url),
            artist: info?.artist || 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            coverArt: info?.thumbnailUrl,
            sourceType: 'youtube',
            tags: ['youtube'],
          })
        }).catch(() => {
          addTrack({
            title: extractFilename(url),
            artist: 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            sourceType: 'youtube',
            tags: ['youtube'],
          })
        })
      } else if (isSpotifyUrl(url)) {
        resolveSpotifyTrack(url).then(info => {
          addTrack({
            title: info?.title || extractFilename(url),
            artist: info?.artist || 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            coverArt: info?.thumbnailUrl,
            sourceType: 'spotify',
            tags: ['spotify'],
          })
        }).catch(() => {
          addTrack({
            title: extractFilename(url),
            artist: 'Unknown Artist',
            album: '',
            duration: 0,
            url,
            originalUrl: url,
            sourceType: 'spotify',
            tags: ['spotify'],
          })
        })
      } else if (isGDriveUrl(url)) {
        if (isGDriveFolderUrl(url)) {
          setError('Google Drive folders aren\'t supported yet — paste individual file links')
          return
        }
        const resolved = resolveGDriveFile(url)
        if (resolved) {
          addTrack({
            title: resolved.filename,
            artist: 'Unknown Artist',
            album: '',
            duration: 0,
            url: resolved.directUrl,
            originalUrl: url,
            sourceType: 'gdrive',
            tags: ['gdrive'],
          })
        } else {
          setError(`Could not parse Google Drive link: ${url}`)
          return
        }
      } else {
        const title = extractFilename(url)
        addTrack({
          title,
          artist: 'Unknown Artist',
          album: '',
          duration: 0,
          url,
          originalUrl: url,
          sourceType: 'url',
          tags: [],
        })
      }
    }

    onClose()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setLocalFiles(prev => [...prev, ...files])
    setError('')
  }

  function handleLocalSubmit() {
    if (localFiles.length === 0) {
      setError('Select at least one audio file')
      return
    }

    for (const file of localFiles) {
      const objectUrl = URL.createObjectURL(file)
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      addTrack({
        title: name,
        artist: 'Unknown Artist',
        album: '',
        duration: 0,
        url: objectUrl,
        sourceType: 'local',
        tags: [],
      })
    }

    onClose()
  }

  function removeLocalFile(index: number) {
    setLocalFiles(prev => prev.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|opus|wma|webm)$/i.test(f.name)
    )
    if (files.length > 0) {
      setLocalFiles(prev => [...prev, ...files])
      setTab('local')
    }
  }

  const monoStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}>
      <div
        className="panel w-full max-w-lg p-6"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              
              color: 'var(--theme-text)',
            }}
          >
            Add Audio
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '4px', color: 'var(--theme-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setTab('url'); setError('') }}
            className={tab === 'url' ? 'btn-accent' : 'btn-outline'}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
            }}
          >
            <Link size={13} /> PASTE URLS
          </button>
          <button
            onClick={() => { setTab('local'); setError('') }}
            className={tab === 'local' ? 'btn-accent' : 'btn-outline'}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
            }}
          >
            <FolderOpen size={13} /> LOCAL FILES
          </button>
        </div>

        {/* URL Tab */}
        {tab === 'url' && (
          <form onSubmit={handleUrlSubmit}>
            <p className="mb-3" style={{ ...monoStyle, color: 'var(--theme-text-secondary)' }}>
              Paste links to audio files, YouTube, SoundCloud, or Spotify tracks. One URL per line.
            </p>
            <div className="relative mb-3">
              <Link size={14} className="absolute left-3 top-3" style={{ color: 'var(--theme-text-muted)' }} />
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={"https://youtube.com/watch?v=...\nhttps://soundcloud.com/artist/track\nhttps://open.spotify.com/track/...\nhttps://drive.google.com/file/d/.../view\nhttps://example.com/song.mp3"}
                rows={5}
                className="panel-section w-full px-3 py-2.5 pl-10 resize-none outline-none"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                  color: 'var(--theme-text)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--theme-border-panel)')}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-3" style={{ ...monoStyle, color: 'var(--color-error)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="btn-outline" style={{ padding: '8px 16px' }}>
                CANCEL
              </button>
              <button type="submit" className="btn-accent flex items-center gap-2" style={{ padding: '8px 16px' }}>
                <Plus size={14} /> ADD TRACKS
              </button>
            </div>
          </form>
        )}

        {/* Local Files Tab */}
        {tab === 'local' && (
          <div>
            <p className="mb-3" style={{ ...monoStyle, color: 'var(--theme-text-secondary)' }}>
              Select audio files from your device, or drag and drop them here.
            </p>

            {/* Drop zone / file picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.wma,.webm"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 mb-3 flex flex-col items-center gap-2 transition-colors"
              style={{
                border: '2px dashed var(--theme-border-panel)',
                borderRadius: '4px',
                background: 'var(--theme-bg-panel)',
                color: 'var(--theme-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--theme-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--theme-border-panel)')}
            >
              <FolderOpen size={22} />
              <span style={{ ...monoStyle }}>Click to browse or drag files here</span>
              <span style={{ ...monoStyle, fontSize: '9px', color: 'var(--theme-text-muted)' }}>
                MP3, WAV, OGG, FLAC, AAC, M4A, OPUS
              </span>
            </button>

            {/* File list */}
            {localFiles.length > 0 && (
              <div className="max-h-40 overflow-auto mb-3 space-y-1">
                {localFiles.map((file, i) => (
                  <div
                    key={i}
                    className="panel-section flex items-center gap-2 px-3 py-2"
                  >
                    <Music size={13} style={{ color: 'var(--theme-accent)' }} />
                    <span className="flex-1 truncate" style={{ ...monoStyle, color: 'var(--theme-text)' }}>
                      {file.name}
                    </span>
                    <span style={{ ...monoStyle, fontSize: '9px', color: 'var(--theme-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => removeLocalFile(i)}
                      className="btn-ghost"
                      style={{ padding: '2px', color: 'var(--theme-text-muted)' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 mb-3" style={{ ...monoStyle, color: 'var(--color-error)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="btn-outline" style={{ padding: '8px 16px' }}>
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleLocalSubmit}
                className="btn-accent flex items-center gap-2"
                style={{
                  padding: '8px 16px',
                  opacity: localFiles.length > 0 ? 1 : 0.4,
                }}
              >
                <Plus size={14} /> ADD {localFiles.length > 0 ? `${localFiles.length} FILE${localFiles.length > 1 ? 'S' : ''}` : 'FILES'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
