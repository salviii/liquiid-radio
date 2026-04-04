export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  url: string
  coverArt?: string
  addedAt: number
  sourceType: 'url' | 'gdrive' | 'dropbox' | 'local' | 'youtube' | 'soundcloud' | 'spotify'
  originalUrl?: string   // original source page URL (for YT/SC/Spotify — never expires)
  dead?: boolean         // true when the link/blob is broken
  sourceId?: string
  tags: string[]
  metadata?: TrackMetadata
}

export interface TrackMetadata {
  genre?: string
  year?: number
  bitrate?: number
  sampleRate?: number
  format?: string
}

export interface Playlist {
  id: string
  name: string
  description: string
  coverArt?: string
  coverColor?: string
  tracks: string[] // track IDs
  createdAt: number
  updatedAt: number
  viewMode: 'card' | 'cd' | 'list'
  isPublic: boolean
  ownerId?: string
}

export interface AudioSource {
  id: string
  name: string
  url: string
  type: 'url' | 'gdrive' | 'dropbox' | 'folder'
  lastScanned: number
  trackCount: number
  autoSync: boolean
}

export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  theme: string
  customColors?: Record<string, string>
}

export interface FriendLibrary {
  id: string
  userId: string
  username: string
  displayName: string
  mode: 'follow' | 'snapshot'
  snapshotDate?: number
  trackCount: number
}

export type RepeatMode = 'off' | 'all' | 'one'
export type ViewMode = 'library' | 'playlists' | 'sources' | 'friends' | 'settings'

export interface Theme {
  id: string
  name: string
  colors: Record<string, string>
  isBuiltIn: boolean
}
