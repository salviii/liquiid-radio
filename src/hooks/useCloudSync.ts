import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { saveLibraryToCloud, loadLibraryFromCloud, type CloudLibrary } from '../lib/cloudSync'
import type { User } from '@supabase/supabase-js'

/**
 * useCloudSync — auto-loads library from cloud on login,
 * auto-saves to cloud when library changes (debounced).
 *
 * Call this once in App with the current auth user.
 */
export function useCloudSync(user: User | null) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)

  // Load from cloud when user logs in
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return
    if (hasLoadedRef.current) return

    hasLoadedRef.current = true
    console.log('[sync] Loading library from cloud...')

    loadLibraryFromCloud().then((cloud) => {
      if (!cloud) {
        console.log('[sync] No cloud library found — using local')
        // First time user: save current local library to cloud
        triggerSave()
        return
      }

      const localState = usePlayerStore.getState()
      const localUpdated = Math.max(
        ...localState.tracks.map(t => t.addedAt || 0),
        0
      )

      // If cloud is newer, merge cloud → local
      if (cloud.updatedAt > localUpdated) {
        console.log('[sync] Cloud is newer — merging')
        mergeCloudToLocal(cloud)
      } else {
        console.log('[sync] Local is newer — saving to cloud')
        triggerSave()
      }
    })
  }, [user])

  // Reset loaded flag when user logs out
  useEffect(() => {
    if (!user) {
      hasLoadedRef.current = false
    }
  }, [user])

  // Subscribe to store changes and auto-save (debounced 3s)
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return

    const unsub = usePlayerStore.subscribe(
      (state, prevState) => {
        // Only save if tracks, playlists, or theme changed
        if (
          state.tracks !== prevState.tracks ||
          state.playlists !== prevState.playlists ||
          state.theme !== prevState.theme
        ) {
          debouncedSave()
        }
      }
    )

    return () => unsub()
  }, [user])

  function debouncedSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => triggerSave(), 3000)
  }

  const triggerSave = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true

    const state = usePlayerStore.getState()
    const library: CloudLibrary = {
      tracks: state.tracks.filter(t => !t.url.startsWith('blob:')), // Don't save blob URLs
      playlists: state.playlists,
      theme: state.theme,
      updatedAt: Date.now(),
    }

    await saveLibraryToCloud(library)
    isSavingRef.current = false
  }, [])

  return { triggerSave }
}

/**
 * Merge cloud library into local store.
 * Adds tracks from cloud that don't exist locally (by URL match).
 */
function mergeCloudToLocal(cloud: CloudLibrary) {
  const state = usePlayerStore.getState()

  // Merge tracks — use URL as the unique key
  const localUrls = new Set(state.tracks.map(t => t.originalUrl || t.url))
  const newTracks = cloud.tracks.filter(t => !localUrls.has(t.originalUrl || t.url))

  if (newTracks.length > 0) {
    usePlayerStore.setState({
      tracks: [...state.tracks, ...newTracks],
    })
    console.log(`[sync] Merged ${newTracks.length} tracks from cloud`)
  }

  // Merge playlists — by name
  const localNames = new Set(state.playlists.map(p => p.name))
  const newPlaylists = cloud.playlists.filter(p => !localNames.has(p.name))

  if (newPlaylists.length > 0) {
    usePlayerStore.setState({
      playlists: [...state.playlists, ...newPlaylists],
    })
    console.log(`[sync] Merged ${newPlaylists.length} playlists from cloud`)
  }

  // Apply theme if local is default
  if (cloud.theme && state.theme === 'default') {
    usePlayerStore.getState().setTheme(cloud.theme)
  }
}
