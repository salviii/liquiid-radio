// Google Drive integration
// Converts shared Google Drive links to direct download URLs for audio playback
// Supports individual files and folder links

/**
 * Detect if a URL is a Google Drive link
 */
export function isGDriveUrl(url: string): boolean {
  return /^https?:\/\/(drive\.google\.com|docs\.google\.com)\//.test(url)
}

/**
 * Extract the file ID from various Google Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/uc?id=FILE_ID
 */
export function extractGDriveFileId(url: string): string | null {
  // /file/d/FILE_ID/ pattern
  const fileMatch = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]

  // ?id=FILE_ID pattern
  try {
    const u = new URL(url)
    const id = u.searchParams.get('id')
    if (id) return id
  } catch {}

  return null
}

/**
 * Convert a Google Drive file URL to a direct download/stream URL.
 * This URL can be played directly by Howler.js (html5 audio).
 */
export function getGDriveDirectUrl(fileId: string): string {
  // This pattern gives a direct download without confirmation for small-ish files
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

/**
 * Alternative: use the Google Drive media endpoint (works better for streaming)
 */
export function getGDriveStreamUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=`
  // Note: without an API key this won't work. Use the /uc?export=download approach instead.
}

/**
 * Extract filename from a Google Drive URL (best-effort).
 * Returns a cleaned-up version or a generic name.
 */
export function getGDriveFilename(url: string): string {
  // Try to get filename from URL path or params
  try {
    const u = new URL(url)
    // Some GDrive URLs have the filename in the path
    const segments = u.pathname.split('/')
    const last = segments[segments.length - 1]
    if (last && last !== 'view' && last !== 'edit' && !last.startsWith('d')) {
      return decodeURIComponent(last).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    }
  } catch {}
  return 'Google Drive Audio'
}

/**
 * Check if a Google Drive URL looks like a folder (not a single file)
 */
export function isGDriveFolderUrl(url: string): boolean {
  return /\/folders\/[A-Za-z0-9_-]+/.test(url) || /\/drive\/(u\/\d+\/)?folders\//.test(url)
}

/**
 * Resolve a Google Drive file link to a playable audio URL.
 * Returns the direct download URL and extracted metadata.
 */
export function resolveGDriveFile(url: string): {
  directUrl: string
  fileId: string
  filename: string
} | null {
  const fileId = extractGDriveFileId(url)
  if (!fileId) return null

  return {
    directUrl: getGDriveDirectUrl(fileId),
    fileId,
    filename: getGDriveFilename(url),
  }
}
