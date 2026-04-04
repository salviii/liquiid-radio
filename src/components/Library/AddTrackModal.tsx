import { useState, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { extractFilename } from '../../lib/utils'
import { isSoundCloudUrl, resolveSoundCloudTrack } from '../../lib/soundcloud'
import { isYouTubeUrl, resolveYouTubeTrack } from '../../lib/youtube'
import { isSpotifyUrl, resolveSpotifyTrack } from '../../lib/spotify'
import { isGDriveUrl, resolveGDriveFile, isGDriveFolderUrl } from '../../lib/gdrive'
import { Link, Plus, AlertCircle, FolderOpen, Music, X } from 'lucide-react'

interface AddTrackPanelProps {
  onClose: () => void
}

type TabMode = 'url' | 'local'

export function AddTrackModal({ onClose }: AddTrackPanelProps) {
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
      setError('paste at least one audio url')
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
      setError(`invalid url: ${invalid[0]}`)
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
          setError('google drive folders not supported — paste individual file links')
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
          setError(`could not parse google drive link`)
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

    setUrls('')
    onClose()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setLocalFiles(prev => [...prev, ...files])
    setError('')
  }

  function handleLocalSubmit() {
    if (localFiles.length === 0) {
      setError('select at least one audio file')
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

    setLocalFiles([])
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

  return (
    <div
      style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          onClick={() => { setTab('url'); setError('') }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '5px 8px',
            fontSize: '9px',
            letterSpacing: '0.1em',
            border: tab === 'url' ? 'none' : '1px solid var(--theme-border-panel)',
            borderRadius: '3px',
            background: tab === 'url' ? 'var(--theme-accent)' : 'transparent',
            color: tab === 'url' ? '#0a0a0a' : 'var(--theme-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Link size={10} /> paste urls
        </button>
        <button
          onClick={() => { setTab('local'); setError('') }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '5px 8px',
            fontSize: '9px',
            letterSpacing: '0.1em',
            border: tab === 'local' ? 'none' : '1px solid var(--theme-border-panel)',
            borderRadius: '3px',
            background: tab === 'local' ? 'var(--theme-accent)' : 'transparent',
            color: tab === 'local' ? '#0a0a0a' : 'var(--theme-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <FolderOpen size={10} /> local files
        </button>
      </div>

      {/* URL Tab */}
      {tab === 'url' && (
        <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <p style={{
            fontSize: '9px',
            letterSpacing: '0.08em',
            color: 'var(--theme-text-muted)',
            marginBottom: '6px',
          }}>
            youtube · soundcloud · spotify · drive · mp3
          </p>
          <div style={{ position: 'relative', flex: 1, minHeight: '60px', marginBottom: '6px' }}>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={"paste urls here, one per line..."}
              className="panel-section outline-none"
              style={{
                width: '100%',
                height: '100%',
                padding: '8px',
                resize: 'none',
                fontSize: '16px',
                letterSpacing: '0.03em',
                color: 'var(--theme-text)',
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '4px',
              fontSize: '9px',
              color: 'var(--color-error)',
            }}>
              <AlertCircle size={11} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '4px 10px',
                fontSize: '9px',
                letterSpacing: '0.1em',
                background: 'none',
                border: '1px solid var(--theme-border-panel)',
                borderRadius: '3px',
                color: 'var(--theme-text-secondary)',
                cursor: 'pointer',
              }}
            >
              cancel
            </button>
            <button type="submit"
              style={{
                padding: '4px 10px',
                fontSize: '9px',
                letterSpacing: '0.1em',
                background: 'var(--theme-accent)',
                border: 'none',
                borderRadius: '3px',
                color: '#0a0a0a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={11} /> add
            </button>
          </div>
        </form>
      )}

      {/* Local Files Tab */}
      {tab === 'local' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.wma,.webm"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: localFiles.length > 0 ? 'none' : 1,
              minHeight: '50px',
              padding: '12px',
              marginBottom: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              border: '1px dashed var(--theme-border-panel)',
              borderRadius: '4px',
              background: 'var(--theme-bg-panel)',
              color: 'var(--theme-text-muted)',
              cursor: 'pointer',
            }}
          >
            <FolderOpen size={18} />
            <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>
              tap to browse or drag files
            </span>
            <span style={{ fontSize: '8px', color: 'var(--theme-text-muted)', opacity: 0.6 }}>
              mp3 · wav · ogg · flac · aac · m4a
            </span>
          </button>

          {/* File list */}
          {localFiles.length > 0 && (
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '6px' }}>
              {localFiles.map((file, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 6px',
                    borderBottom: '1px solid var(--theme-border)',
                  }}
                >
                  <Music size={10} style={{ color: 'var(--theme-accent)', flexShrink: 0 }} />
                  <span style={{
                    flex: 1,
                    fontSize: '9px',
                    color: 'var(--theme-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeLocalFile(i)}
                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--theme-text-muted)' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '4px',
              fontSize: '9px',
              color: 'var(--color-error)',
            }}>
              <AlertCircle size={11} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '4px 10px',
                fontSize: '9px',
                letterSpacing: '0.1em',
                background: 'none',
                border: '1px solid var(--theme-border-panel)',
                borderRadius: '3px',
                color: 'var(--theme-text-secondary)',
                cursor: 'pointer',
              }}
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleLocalSubmit}
              style={{
                padding: '4px 10px',
                fontSize: '9px',
                letterSpacing: '0.1em',
                background: 'var(--theme-accent)',
                border: 'none',
                borderRadius: '3px',
                color: '#0a0a0a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: localFiles.length > 0 ? 1 : 0.4,
              }}
            >
              <Plus size={11} /> add {localFiles.length > 0 ? localFiles.length : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
