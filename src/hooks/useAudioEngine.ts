import { useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { usePlayerStore } from '../store/playerStore'
import { isSoundCloudUrl, createSCWidget, type SCWidgetController } from '../lib/soundcloud'
import { isYouTubeUrl, extractYouTubeId, createYTEmbed, type YTPlayerController } from '../lib/youtube'
import { isSpotifyUrl, extractSpotifyId, createSpotifyEmbed, type SpotifyController } from '../lib/spotify'
import {
  isSpotifyConnected,
  createSpotifySDKPlayer,
  type SpotifySDKPlayer,
} from '../lib/spotifyAuth'

type EngineMode = 'howler' | 'soundcloud' | 'youtube' | 'spotify' | 'spotify-sdk' | 'none'

export function useAudioEngine() {
  const howlRef = useRef<Howl | null>(null)
  const crossfadeHowlRef = useRef<Howl | null>(null)
  const scWidgetRef = useRef<SCWidgetController | null>(null)
  const ytPlayerRef = useRef<YTPlayerController | null>(null)
  const spPlayerRef = useRef<SpotifyController | null>(null)
  const spSdkRef = useRef<SpotifySDKPlayer | null>(null)
  const animRef = useRef<number>(0)
  const crossfadeTimerRef = useRef<number>(0)
  const modeRef = useRef<EngineMode>('none')
  const embedContainerRef = useRef<HTMLDivElement | null>(null)

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const next = usePlayerStore((s) => s.next)
  const updateTrack = usePlayerStore((s) => s.updateTrack)
  const markDead = usePlayerStore((s) => s.markDead)
  const showLoginPrompt = usePlayerStore((s) => s.showLoginPrompt)

  // Hidden container for embed iframes
  useEffect(() => {
    const container = document.createElement('div')
    container.id = 'embed-container'
    container.style.cssText = 'position:fixed;bottom:0;left:0;width:320px;height:100px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;'
    document.body.appendChild(container)
    embedContainerRef.current = container
    return () => { container.remove() }
  }, [])

  // Howler progress loop
  const updateHowlerProgress = useCallback(() => {
    if (howlRef.current && howlRef.current.playing()) {
      const seek = howlRef.current.seek() as number
      setProgress(seek)
      animRef.current = requestAnimationFrame(updateHowlerProgress)
    }
  }, [setProgress])

  // Cleanup all engines
  const cleanup = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload()
      howlRef.current = null
    }
    if (crossfadeHowlRef.current) {
      crossfadeHowlRef.current.unload()
      crossfadeHowlRef.current = null
    }
    cancelAnimationFrame(animRef.current)
    clearTimeout(crossfadeTimerRef.current)
    if (scWidgetRef.current) {
      scWidgetRef.current.destroy()
      scWidgetRef.current = null
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy()
      ytPlayerRef.current = null
    }
    if (spPlayerRef.current) {
      spPlayerRef.current.destroy()
      spPlayerRef.current = null
    }
    // Don't disconnect SDK player on track change — reuse it
    modeRef.current = 'none'
  }, [])

  // ==================
  // HOWLER — local files, direct URLs, Google Drive
  // ==================
  const loadWithHowler = useCallback((url: string, shouldPlay: boolean, trackId: string) => {
    modeRef.current = 'howler'
    console.log('[howler] Loading:', url.substring(0, 80))

    const howl = new Howl({
      src: [url],
      html5: true,
      volume,
      onload: () => {
        console.log('[howler] Loaded OK, duration:', howl.duration())
        setDuration(howl.duration())
        const track = usePlayerStore.getState().currentTrack
        if (track && track.duration === 0 && howl.duration() > 0) {
          updateTrack(track.id, { duration: Math.round(howl.duration()) })
        }
      },
      onplay: () => {
        animRef.current = requestAnimationFrame(updateHowlerProgress)
      },
      onpause: () => {
        cancelAnimationFrame(animRef.current)
      },
      onend: () => {
        cancelAnimationFrame(animRef.current)
        next()
      },
      onloaderror: (_id, error) => {
        console.error('[howler] Load error:', url.substring(0, 80), error)
        markDead(trackId)
      },
      onplayerror: (_id, error) => {
        console.error('[howler] Play error:', error)
        howl.once('unlock', () => { howl.play() })
      },
    })

    howlRef.current = howl
    if (shouldPlay) howl.play()
  }, [volume, setDuration, updateHowlerProgress, next, updateTrack, markDead])

  // ==================
  // SOUNDCLOUD — SC Widget embed
  // ==================
  const loadWithSCWidget = useCallback(async (scUrl: string, shouldPlay: boolean) => {
    modeRef.current = 'soundcloud'
    if (!embedContainerRef.current) return

    try {
      const widget = await createSCWidget(embedContainerRef.current)
      scWidgetRef.current = widget
      widget.setVolume(volume * 100)

      let loaded = false

      widget.onProgress((data) => {
        setProgress(data.currentPosition / 1000)
      })

      widget.onReady(() => {
        loaded = true
        widget.getDuration().then((durMs) => {
          const durSec = durMs / 1000
          setDuration(durSec)
          const track = usePlayerStore.getState().currentTrack
          if (track && track.duration === 0 && durSec > 0) {
            updateTrack(track.id, { duration: Math.round(durSec) })
          }
        })
        if (shouldPlay) widget.play()
      })

      widget.onPlay(() => {
        if (!usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: true })
        }
        // Re-fetch duration on play — onReady may have fired before track loaded
        widget.getDuration().then((durMs) => {
          const durSec = durMs / 1000
          if (durSec > 0) {
            setDuration(durSec)
            const track = usePlayerStore.getState().currentTrack
            if (track && track.duration === 0) {
              updateTrack(track.id, { duration: Math.round(durSec) })
            }
          }
        })
      })

      widget.onPause(() => {
        if (usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: false })
        }
      })

      widget.onFinish(() => next())
      widget.onError(() => {
        if (!loaded) return
        console.error('[sc-widget] Playback error after load')
        const track = usePlayerStore.getState().currentTrack
        const scUrl = track?.originalUrl || track?.url || ''
        showLoginPrompt('soundcloud', scUrl)
      })

      widget.load(scUrl)
    } catch (err) {
      console.error('[sc-widget] Failed:', err)
      const track = usePlayerStore.getState().currentTrack
      const scUrl = track?.originalUrl || track?.url || ''
      showLoginPrompt('soundcloud', scUrl)
    }
  }, [volume, setProgress, setDuration, next, updateTrack, showLoginPrompt])

  // ==================
  // YOUTUBE — hidden embed iframe + postMessage control
  // ==================
  const loadWithYouTube = useCallback((videoId: string, shouldPlay: boolean) => {
    modeRef.current = 'youtube'
    if (!embedContainerRef.current) return

    console.log('[yt-embed] Creating embed for:', videoId)
    const player = createYTEmbed(embedContainerRef.current, videoId)
    ytPlayerRef.current = player

    player.setVolume(volume * 100)

    player.onProgress((data) => {
      setProgress(data.currentPosition / 1000)
    })

    player.onPlay(() => {
      player.getDuration().then((durMs) => {
        const durSec = durMs / 1000
        if (durSec > 0) {
          setDuration(durSec)
          const track = usePlayerStore.getState().currentTrack
          if (track && track.duration === 0) {
            updateTrack(track.id, { duration: Math.round(durSec) })
          }
        }
      })
      if (!usePlayerStore.getState().isPlaying) {
        usePlayerStore.setState({ isPlaying: true })
      }
    })

    player.onPause(() => {
      if (usePlayerStore.getState().isPlaying) {
        usePlayerStore.setState({ isPlaying: false })
      }
    })

    player.onFinish(() => next())
    player.onError((e) => {
      console.error('[yt-embed] Error:', e)
      const track = usePlayerStore.getState().currentTrack
      const ytUrl = track?.originalUrl || track?.url || ''
      showLoginPrompt('youtube', ytUrl)
    })

    if (!shouldPlay) {
      player.onReady(() => {
        setTimeout(() => player.pause(), 500)
      })
    }
  }, [volume, setProgress, setDuration, next, updateTrack, showLoginPrompt])

  // ==================
  // SPOTIFY — hidden embed iframe via Spotify IFrame API
  // ==================
  const loadWithSpotify = useCallback(async (trackId: string, shouldPlay: boolean) => {
    modeRef.current = 'spotify'
    if (!embedContainerRef.current) return

    try {
      console.log('[spotify] Creating embed for:', trackId)
      const player = await createSpotifyEmbed(embedContainerRef.current, trackId)
      spPlayerRef.current = player

      player.onProgress((data) => {
        // Spotify gives position/duration in ms
        setProgress(data.position / 1000)
        if (data.duration > 0) {
          const durSec = data.duration / 1000
          setDuration(durSec)
          const track = usePlayerStore.getState().currentTrack
          if (track && track.duration === 0) {
            updateTrack(track.id, { duration: Math.round(durSec) })
          }
        }
      })

      player.onPlay(() => {
        if (!usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: true })
        }
      })

      player.onPause(() => {
        if (usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: false })
        }
      })

      player.onFinish(() => next())
      player.onError((err) => {
        console.error('[spotify] Error:', err)
        const track = usePlayerStore.getState().currentTrack
        const spUrl = track?.originalUrl || track?.url || ''
        showLoginPrompt('spotify', spUrl)
      })

      player.onReady(() => {
        if (shouldPlay) {
          player.play()
        }
      })
    } catch (err) {
      console.error('[spotify] Failed to create embed:', err)
      const track = usePlayerStore.getState().currentTrack
      const spUrl = track?.originalUrl || track?.url || ''
      showLoginPrompt('spotify', spUrl)
    }
  }, [setProgress, setDuration, next, updateTrack, showLoginPrompt])

  // ==================
  // SPOTIFY SDK — Web Playback SDK (Premium, full control)
  // ==================
  const loadWithSpotifySDK = useCallback(async (trackId: string, shouldPlay: boolean) => {
    modeRef.current = 'spotify-sdk'

    try {
      // Reuse existing SDK player or create new one
      if (!spSdkRef.current) {
        console.log('[spotify-sdk] Creating SDK player...')
        spSdkRef.current = await createSpotifySDKPlayer('hurakan')
      }

      const sdk = spSdkRef.current
      sdk.setVolume(volume)

      if (shouldPlay) {
        await sdk.play(`spotify:track:${trackId}`)
      }

      // Poll for state changes (SDK uses event-based but we need progress)
      let lastPaused = !shouldPlay
      const pollInterval = setInterval(async () => {
        if (modeRef.current !== 'spotify-sdk') {
          clearInterval(pollInterval)
          return
        }
        try {
          const state = await sdk.getState()
          if (!state) return

          const pos = state.position / 1000
          const dur = state.duration / 1000
          setProgress(pos)
          if (dur > 0) {
            setDuration(dur)
            const track = usePlayerStore.getState().currentTrack
            if (track && track.duration === 0) {
              updateTrack(track.id, { duration: Math.round(dur) })
            }
          }

          if (lastPaused && !state.paused) {
            if (!usePlayerStore.getState().isPlaying) {
              usePlayerStore.setState({ isPlaying: true })
            }
          }
          if (!lastPaused && state.paused) {
            // Check if track ended
            if (state.position === 0 && state.track_window?.previous_tracks?.length > 0) {
              next()
            } else if (usePlayerStore.getState().isPlaying) {
              usePlayerStore.setState({ isPlaying: false })
            }
          }
          lastPaused = state.paused
        } catch {}
      }, 250)

      // Also listen for state change events
      sdk.onStateChange((state) => {
        if (!state || modeRef.current !== 'spotify-sdk') return
        const pos = state.position / 1000
        const dur = state.duration / 1000
        setProgress(pos)
        if (dur > 0) setDuration(dur)
      })

      sdk.onError((err) => {
        console.error('[spotify-sdk] Playback error:', err)
        const track = usePlayerStore.getState().currentTrack
        const spUrl = track?.originalUrl || track?.url || ''
        showLoginPrompt('spotify', spUrl)
      })
    } catch (err) {
      console.error('[spotify-sdk] Failed, falling back to embed:', err)
      // Fall back to embed approach
      loadWithSpotify(trackId, shouldPlay)
    }
  }, [volume, setProgress, setDuration, next, updateTrack, showLoginPrompt, loadWithSpotify])

  // ==================
  // Track change effect
  // ==================
  useEffect(() => {
    cleanup()
    usePlayerStore.getState().dismissLoginPrompt()

    if (!currentTrack) return

    if (currentTrack.dead) {
      console.warn('[audio] Skipping dead track:', currentTrack.title)
      return
    }

    const url = currentTrack.url
    const isSC = currentTrack.sourceType === 'soundcloud' || currentTrack.tags?.includes('soundcloud') || isSoundCloudUrl(url)
    const isYT = currentTrack.sourceType === 'youtube' || currentTrack.tags?.includes('youtube') || isYouTubeUrl(url)
    const isSP = currentTrack.sourceType === 'spotify' || currentTrack.tags?.includes('spotify') || isSpotifyUrl(url)

    if (isSC) {
      const scUrl = currentTrack.originalUrl || url
      console.log('[audio] → SoundCloud:', currentTrack.title)
      loadWithSCWidget(scUrl, isPlaying).catch((err) => {
        console.error('[audio] SoundCloud load failed:', err)
        showLoginPrompt('soundcloud', scUrl)
      })
    } else if (isYT) {
      const videoId = extractYouTubeId(currentTrack.originalUrl || url)
      if (videoId) {
        console.log('[audio] → YouTube:', currentTrack.title)
        loadWithYouTube(videoId, isPlaying)
      }
    } else if (isSP) {
      const spInfo = extractSpotifyId(currentTrack.originalUrl || url)
      if (spInfo) {
        if (isSpotifyConnected()) {
          // Premium SDK — full programmatic control through our player
          console.log('[audio] → Spotify SDK:', currentTrack.title)
          loadWithSpotifySDK(spInfo.id, isPlaying).catch((err) => {
            console.error('[audio] Spotify SDK failed:', err)
            const spUrl = currentTrack.originalUrl || url
            showLoginPrompt('spotify', spUrl)
          })
        } else {
          // Not connected — prompt to connect in settings
          console.log('[audio] → Spotify (not connected):', currentTrack.title)
          modeRef.current = 'spotify'
          const spUrl = currentTrack.originalUrl || url
          showLoginPrompt('spotify', spUrl)
        }
      }
    } else {
      // Everything else: local files, direct URLs, Google Drive → Howler
      console.log('[audio] → Howler:', currentTrack.title)
      loadWithHowler(url, isPlaying, currentTrack.id)
    }

    return () => { cancelAnimationFrame(animRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  // ==================
  // Play/Pause sync
  // ==================
  useEffect(() => {
    if (modeRef.current === 'howler' && howlRef.current) {
      if (isPlaying && !howlRef.current.playing()) howlRef.current.play()
      else if (!isPlaying && howlRef.current.playing()) howlRef.current.pause()
    } else if (modeRef.current === 'soundcloud' && scWidgetRef.current) {
      isPlaying ? scWidgetRef.current.play() : scWidgetRef.current.pause()
    } else if (modeRef.current === 'youtube' && ytPlayerRef.current) {
      isPlaying ? ytPlayerRef.current.play() : ytPlayerRef.current.pause()
    } else if (modeRef.current === 'spotify' && spPlayerRef.current) {
      isPlaying ? spPlayerRef.current.play() : spPlayerRef.current.pause()
    } else if (modeRef.current === 'spotify-sdk' && spSdkRef.current) {
      isPlaying ? spSdkRef.current.resume() : spSdkRef.current.pause()
    }
  }, [isPlaying])

  // ==================
  // Volume sync
  // ==================
  useEffect(() => {
    if (modeRef.current === 'howler' && howlRef.current) {
      howlRef.current.volume(volume)
    } else if (modeRef.current === 'soundcloud' && scWidgetRef.current) {
      scWidgetRef.current.setVolume(volume * 100)
    } else if (modeRef.current === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(volume * 100)
    } else if (modeRef.current === 'spotify' && spPlayerRef.current) {
      spPlayerRef.current.setVolume(volume)
    } else if (modeRef.current === 'spotify-sdk' && spSdkRef.current) {
      spSdkRef.current.setVolume(volume)
    }
  }, [volume])

  // ==================
  // Seek
  // ==================
  const seekTo = useCallback((time: number) => {
    if (modeRef.current === 'howler' && howlRef.current) {
      howlRef.current.seek(time)
      setProgress(time)
    } else if (modeRef.current === 'soundcloud' && scWidgetRef.current) {
      scWidgetRef.current.seekTo(time * 1000)
      setProgress(time)
    } else if (modeRef.current === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time)
      setProgress(time)
    } else if (modeRef.current === 'spotify' && spPlayerRef.current) {
      spPlayerRef.current.seekTo(time * 1000)
      setProgress(time)
    } else if (modeRef.current === 'spotify-sdk' && spSdkRef.current) {
      spSdkRef.current.seek(time * 1000)
      setProgress(time)
    }
  }, [setProgress])

  // ==================
  // Cross-window sync: listen for widget commands (seek, play/pause)
  // ==================
  useEffect(() => {
    let lastKnownIsPlaying = usePlayerStore.getState().isPlaying
    let lastKnownTrackId = usePlayerStore.getState().currentTrack?.id

    function onStorage(e: StorageEvent) {
      if (e.key === 'hurakan-player' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          const remote = data.state
          if (!remote) return
          const current = usePlayerStore.getState()

          // If widget toggled play/pause
          if (typeof remote.isPlaying === 'boolean' && remote.isPlaying !== lastKnownIsPlaying) {
            lastKnownIsPlaying = remote.isPlaying
            if (remote.isPlaying !== current.isPlaying) {
              usePlayerStore.setState({ isPlaying: remote.isPlaying })
            }
          }

          // If widget changed track
          if (remote.currentTrack?.id && remote.currentTrack.id !== lastKnownTrackId) {
            lastKnownTrackId = remote.currentTrack.id
            if (remote.currentTrack.id !== current.currentTrack?.id) {
              usePlayerStore.setState({
                currentTrack: remote.currentTrack,
                isPlaying: true,
                progress: 0,
              })
            }
          }
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ==================
  // Cross-window sync: broadcast live playback state to localStorage
  // so the widget can mirror progress, duration, isPlaying in real time
  // ==================
  useEffect(() => {
    let lastBroadcast = 0
    const unsub = usePlayerStore.subscribe((state, prev) => {
      // Throttle to ~4 times/sec for progress, immediate for play state changes
      const now = Date.now()
      const playStateChanged = state.isPlaying !== prev.isPlaying
        || state.currentTrack?.id !== prev.currentTrack?.id
        || state.duration !== prev.duration
        || state.loginPrompt !== prev.loginPrompt
      const shouldBroadcast = playStateChanged || (now - lastBroadcast > 250)

      if (shouldBroadcast) {
        lastBroadcast = now
        try {
          const existing = localStorage.getItem('hurakan-player')
          if (existing) {
            const parsed = JSON.parse(existing)
            parsed.state = {
              ...parsed.state,
              progress: state.progress,
              duration: state.duration,
              isPlaying: state.isPlaying,
              currentTrack: state.currentTrack,
              shuffle: state.shuffle,
              repeat: state.repeat,
              volume: state.volume,
              loginPrompt: state.loginPrompt,
            }
            localStorage.setItem('hurakan-player', JSON.stringify(parsed))
          }
        } catch {}
      }
    })
    return unsub
  }, [])

  return { seekTo }
}
