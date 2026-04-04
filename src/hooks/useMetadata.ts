import { useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'

// Read ID3 tags from audio URLs using jsmediatags
export function useMetadataReader() {
  const tracks = usePlayerStore((s) => s.tracks)
  const updateTrack = usePlayerStore((s) => s.updateTrack)

  useEffect(() => {
    // Find tracks that haven't been scanned for metadata yet
    const unscanned = tracks.filter(
      t => !t.metadata && t.artist === 'Unknown Artist'
    )

    for (const track of unscanned) {
      readMetadata(track.url, track.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length])

  async function readMetadata(url: string, trackId: string) {
    try {
      // Dynamic import to avoid bundling if unused
      // @ts-ignore
      const jsmediatags = await import('jsmediatags')

      // For blob/object URLs (local files), read directly
      // For remote URLs, we need to fetch first
      if (url.startsWith('blob:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        readTagsFromBlob(blob, trackId, jsmediatags)
      } else {
        // Try reading from URL directly
        jsmediatags.default.read(url, {
          onSuccess: (tag: any) => applyTags(tag, trackId),
          onError: () => {
            // Mark as scanned even on failure so we don't retry
            updateTrack(trackId, { metadata: { format: 'unknown' } })
          },
        })
      }
    } catch {
      updateTrack(trackId, { metadata: { format: 'unknown' } })
    }
  }

  function readTagsFromBlob(blob: Blob, trackId: string, jsmediatags: any) {
    jsmediatags.default.read(blob, {
      onSuccess: (tag: any) => applyTags(tag, trackId),
      onError: () => {
        updateTrack(trackId, { metadata: { format: 'unknown' } })
      },
    })
  }

  function applyTags(tag: any, trackId: string) {
    const tags = tag.tags || {}
    const updates: Record<string, any> = {
      metadata: {
        genre: tags.genre || undefined,
        year: tags.year ? parseInt(tags.year) : undefined,
        format: tag.type || 'unknown',
      },
    }

    if (tags.title) updates.title = tags.title
    if (tags.artist) updates.artist = tags.artist
    if (tags.album) updates.album = tags.album

    // Extract cover art
    if (tags.picture) {
      const { data, format } = tags.picture
      const bytes = new Uint8Array(data)
      const blob = new Blob([bytes], { type: format })
      const coverUrl = URL.createObjectURL(blob)
      updates.coverArt = coverUrl
    }

    updateTrack(trackId, updates)
  }
}
