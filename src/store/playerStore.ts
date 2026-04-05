import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Track, Playlist, AudioSource, RepeatMode, ViewMode, FriendLibrary } from '../types'

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

interface PlayerState {
  // Playback
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  shuffle: boolean
  repeat: RepeatMode
  queue: Track[]
  queueIndex: number

  // Library
  tracks: Track[]
  playlists: Playlist[]
  sources: AudioSource[]
  friends: FriendLibrary[]

  // UI
  currentView: ViewMode
  sidebarOpen: boolean
  theme: string
  visualMode: 'disc' | 'cover' | 'visualizer' | 'lava'

  // Login prompt for embed failures
  loginPrompt: { service: 'youtube' | 'spotify' | 'soundcloud'; url: string } | null

  // Crossfade (seconds, 0 = off)
  crossfade: number

  // Playback actions
  play: (track?: Track) => void
  pause: () => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  setProgress: (p: number) => void
  setDuration: (d: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setQueue: (tracks: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void

  // Library actions
  addTrack: (track: Omit<Track, 'id' | 'addedAt'>) => Track
  removeTrack: (id: string) => void
  clearLibrary: () => void
  reorderLibrary: (fromIndex: number, toIndex: number) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  addSource: (source: Omit<AudioSource, 'id' | 'lastScanned' | 'trackCount'>) => AudioSource
  removeSource: (id: string) => void

  // Playlist actions
  createPlaylist: (name: string) => Playlist
  deletePlaylist: (id: string) => void
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void
  addToPlaylist: (playlistId: string, trackId: string) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void

  // Friend actions
  addFriend: (friend: Omit<FriendLibrary, 'id'>) => void
  removeFriend: (id: string) => void

  // Link health
  relinkTrack: (id: string, newUrl: string) => void
  markDead: (id: string) => void

  // Login prompt
  showLoginPrompt: (service: 'youtube' | 'spotify' | 'soundcloud', url: string) => void
  dismissLoginPrompt: () => void

  // Crossfade
  setCrossfade: (seconds: number) => void

  // UI actions
  setView: (view: ViewMode) => void
  toggleSidebar: () => void
  setTheme: (theme: string) => void
  setVisualMode: (mode: 'disc' | 'cover' | 'visualizer' | 'lava') => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      progress: 0,
      duration: 0,
      shuffle: false,
      repeat: 'off',
      queue: [],
      queueIndex: -1,
      tracks: [],
      playlists: [],
      sources: [],
      friends: [],
      currentView: 'library',
      sidebarOpen: true,
      theme: 'default',
      visualMode: 'disc',
      loginPrompt: null,
      crossfade: 0,

      // Playback
      play: (track) => {
        if (track) {
          const state = get()
          const queueIndex = state.queue.findIndex(t => t.id === track.id)
          set({
            currentTrack: track,
            isPlaying: true,
            progress: 0,
            queueIndex: queueIndex >= 0 ? queueIndex : state.queueIndex,
          })
        } else {
          set({ isPlaying: true })
        }
      },

      pause: () => set({ isPlaying: false }),

      togglePlay: () => {
        const state = get()
        if (state.currentTrack) {
          set({ isPlaying: !state.isPlaying })
        } else if (state.tracks.length > 0) {
          // Nothing selected — start playing from the top of the library
          const queue = [...state.tracks]
          set({
            currentTrack: queue[0],
            isPlaying: true,
            progress: 0,
            queue,
            queueIndex: 0,
          })
        }
      },

      next: () => {
        const state = get()
        if (state.queue.length === 0) return

        let nextIndex: number
        if (state.shuffle) {
          nextIndex = Math.floor(Math.random() * state.queue.length)
        } else if (state.repeat === 'one') {
          nextIndex = state.queueIndex
        } else {
          nextIndex = state.queueIndex + 1
          if (nextIndex >= state.queue.length) {
            nextIndex = state.repeat === 'all' ? 0 : state.queueIndex
            if (state.repeat !== 'all') {
              set({ isPlaying: false })
              return
            }
          }
        }

        set({
          currentTrack: state.queue[nextIndex],
          queueIndex: nextIndex,
          progress: 0,
          isPlaying: true,
        })
      },

      previous: () => {
        const state = get()
        if (state.progress > 3) {
          set({ progress: 0 })
          return
        }
        if (state.queue.length === 0) return

        let prevIndex = state.queueIndex - 1
        if (prevIndex < 0) {
          prevIndex = state.repeat === 'all' ? state.queue.length - 1 : 0
        }

        set({
          currentTrack: state.queue[prevIndex],
          queueIndex: prevIndex,
          progress: 0,
          isPlaying: true,
        })
      },

      seek: (time) => set({ progress: time }),
      setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),
      setProgress: (p) => set({ progress: p }),
      setDuration: (d) => set({ duration: d }),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () => set((s) => ({
        repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
      })),

      setQueue: (tracks, startIndex = 0) => set({
        queue: tracks,
        queueIndex: startIndex,
        currentTrack: tracks[startIndex] || null,
        isPlaying: true,
        progress: 0,
      }),

      addToQueue: (track) => set((s) => ({
        queue: [...s.queue, track],
      })),

      // Library
      addTrack: (trackData) => {
        const track: Track = {
          ...trackData,
          id: generateId(),
          addedAt: Date.now(),
        }
        set((s) => ({ tracks: [...s.tracks, track] }))
        return track
      },

      removeTrack: (id) => set((s) => ({
        tracks: s.tracks.filter(t => t.id !== id),
        playlists: s.playlists.map(p => ({
          ...p,
          tracks: p.tracks.filter(tid => tid !== id),
        })),
      })),

      clearLibrary: () => set((s) => {
        // Keep tracks referenced by any playlist
        const playlistTrackIds = new Set(s.playlists.flatMap(p => p.tracks))
        const keptTracks = s.tracks.filter(t => playlistTrackIds.has(t.id))
        return {
          tracks: keptTracks,
          currentTrack: null,
          isPlaying: false,
          progress: 0,
          duration: 0,
          queue: [],
          queueIndex: -1,
        }
      }),

      reorderLibrary: (fromIndex, toIndex) => set((s) => {
        const tracks = [...s.tracks]
        const [moved] = tracks.splice(fromIndex, 1)
        tracks.splice(toIndex, 0, moved)
        return { tracks }
      }),

      updateTrack: (id, updates) => set((s) => ({
        tracks: s.tracks.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      addSource: (sourceData) => {
        const source: AudioSource = {
          ...sourceData,
          id: generateId(),
          lastScanned: Date.now(),
          trackCount: 0,
        }
        set((s) => ({ sources: [...s.sources, source] }))
        return source
      },

      removeSource: (id) => set((s) => ({
        sources: s.sources.filter(src => src.id !== id),
      })),

      // Playlists
      createPlaylist: (name) => {
        const playlist: Playlist = {
          id: generateId(),
          name,
          description: '',
          tracks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          viewMode: 'card',
          isPublic: false,
        }
        set((s) => ({ playlists: [...s.playlists, playlist] }))
        return playlist
      },

      deletePlaylist: (id) => set((s) => ({
        playlists: s.playlists.filter(p => p.id !== id),
      })),

      updatePlaylist: (id, updates) => set((s) => ({
        playlists: s.playlists.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
        ),
      })),

      addToPlaylist: (playlistId, trackId) => set((s) => ({
        playlists: s.playlists.map(p =>
          p.id === playlistId && !p.tracks.includes(trackId)
            ? { ...p, tracks: [...p.tracks, trackId], updatedAt: Date.now() }
            : p
        ),
      })),

      removeFromPlaylist: (playlistId, trackId) => set((s) => ({
        playlists: s.playlists.map(p =>
          p.id === playlistId
            ? { ...p, tracks: p.tracks.filter(id => id !== trackId), updatedAt: Date.now() }
            : p
        ),
      })),

      reorderPlaylist: (playlistId, fromIndex, toIndex) => set((s) => ({
        playlists: s.playlists.map(p => {
          if (p.id !== playlistId) return p
          const tracks = [...p.tracks]
          const [moved] = tracks.splice(fromIndex, 1)
          tracks.splice(toIndex, 0, moved)
          return { ...p, tracks, updatedAt: Date.now() }
        }),
      })),

      // Friends
      addFriend: (friend) => set((s) => ({
        friends: [...s.friends, { ...friend, id: generateId() }],
      })),

      removeFriend: (id) => set((s) => ({
        friends: s.friends.filter(f => f.id !== id),
      })),

      // Link health
      relinkTrack: (id, newUrl) => set((s) => ({
        tracks: s.tracks.map(t => t.id === id ? { ...t, url: newUrl, dead: false } : t),
      })),

      markDead: (id) => set((s) => ({
        tracks: s.tracks.map(t => t.id === id ? { ...t, dead: true } : t),
      })),

      // Login prompt
      showLoginPrompt: (service, url) => set({ loginPrompt: { service, url } }),
      dismissLoginPrompt: () => set({ loginPrompt: null }),

      // Crossfade
      setCrossfade: (seconds) => set({ crossfade: Math.max(0, Math.min(12, seconds)) }),

      // UI
      setView: (view) => set({ currentView: view }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme)
        set({ theme })
      },
      setVisualMode: (mode) => set({ visualMode: mode }),
    }),
    {
      name: 'hurakan-player',
      partialize: (state) => ({
        // Keep ALL tracks (including local) — mark blob URLs as dead on reload
        tracks: state.tracks.map(t =>
          t.url.startsWith('blob:') ? { ...t, dead: true } : t
        ),
        playlists: state.playlists,
        sources: state.sources,
        friends: state.friends,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        theme: state.theme,
        visualMode: state.visualMode,
        crossfade: state.crossfade,
      }),
    }
  )
)
