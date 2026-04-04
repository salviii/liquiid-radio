// Spotify integration — SoundCloud-style hidden embed
// Creates a real Spotify embed iframe (properly sized, in-viewport but invisible)
// Uses the Spotify IFrame API for programmatic play/pause/seek control
// If logged into Spotify in the same browser → full track playback
// If not logged in → 30s preview

const SP_OEMBED = 'https://open.spotify.com/oembed'

export function isSpotifyUrl(url: string): boolean {
  return /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/[A-Za-z0-9]+/.test(url)
}

export function extractSpotifyId(url: string): { type: string; id: string } | null {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/)
  if (!match) return null
  return { type: match[1], id: match[2] }
}

export async function resolveSpotifyTrack(url: string): Promise<{
  title: string
  artist: string
  thumbnailUrl?: string
} | null> {
  try {
    const response = await fetch(`${SP_OEMBED}?url=${encodeURIComponent(url)}`)
    if (!response.ok) return null
    const data = await response.json()

    // Spotify oEmbed doesn't return author_name for tracks.
    // The visible embed in the player shows the full artist info natively.
    return {
      title: data.title || 'Unknown Track',
      artist: data.author_name || 'Spotify',
      thumbnailUrl: data.thumbnail_url,
    }
  } catch {
    return null
  }
}

// ============================================================
// Spotify Embed Controller
// ============================================================

export interface SpotifyController {
  load: (trackId: string) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  seekTo: (ms: number) => void
  setVolume: (vol: number) => void
  destroy: () => void
  onPlay: (cb: () => void) => void
  onPause: (cb: () => void) => void
  onFinish: (cb: () => void) => void
  onProgress: (cb: (data: { position: number; duration: number }) => void) => void
  onReady: (cb: () => void) => void
  onError: (cb: (err: unknown) => void) => void
}

// ============================================================
// Spotify IFrame API loader
// ============================================================
let iframeApiRef: any = null
let apiPromise: Promise<any> | null = null

function loadSpotifyIFrameAPI(): Promise<any> {
  if (iframeApiRef) return Promise.resolve(iframeApiRef)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<any>((resolve, reject) => {
    // Check if already loaded
    if ((window as any).SpotifyIframeApi) {
      iframeApiRef = (window as any).SpotifyIframeApi
      resolve(iframeApiRef)
      return
    }

    // The API delivers itself via callback, NOT a global
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      console.log('[spotify] IFrame API ready')
      iframeApiRef = IFrameAPI
      resolve(IFrameAPI)
    }

    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed/iframeapi/v1'
    script.onerror = () => {
      console.warn('[spotify] IFrame API script failed to load')
      apiPromise = null
      reject(new Error('Failed to load Spotify IFrame API'))
    }
    document.head.appendChild(script)

    setTimeout(() => {
      if (!iframeApiRef) {
        apiPromise = null
        reject(new Error('Spotify IFrame API timeout'))
      }
    }, 10000)
  })

  return apiPromise
}

// ============================================================
// Create Spotify embed — SoundCloud style
// Properly sized hidden iframe, IFrame API for control
// ============================================================
export async function createSpotifyEmbed(
  container: HTMLElement,
  trackId: string
): Promise<SpotifyController> {
  const callbacks = {
    play: [] as (() => void)[],
    pause: [] as (() => void)[],
    finish: [] as (() => void)[],
    progress: [] as ((data: { position: number; duration: number }) => void)[],
    ready: [] as (() => void)[],
    error: [] as ((err: unknown) => void)[],
  }

  let destroyed = false
  let wasPaused = true
  let lastPosition = 0

  // Create wrapper div — the IFrame API needs a div to inject into
  // Properly sized so Spotify doesn't throttle it, but visually hidden
  const wrapper = document.createElement('div')
  wrapper.id = 'sp-embed-' + Date.now()
  // In-viewport, proper size, but invisible — same trick as SoundCloud/YouTube
  wrapper.style.cssText = 'position:fixed;bottom:0;left:0;width:300px;height:80px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;'
  container.appendChild(wrapper)

  // Try the IFrame API first for programmatic control
  let embedController: any = null
  let useDirectEmbed = false

  try {
    const IFrameAPI = await loadSpotifyIFrameAPI()

    embedController = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Controller timeout')), 12000)
      IFrameAPI.createController(
        wrapper,
        {
          uri: `spotify:track:${trackId}`,
          width: 300,
          height: 80,
        },
        (ctrl: any) => {
          clearTimeout(timeout)
          console.log('[spotify] Controller created:', trackId)
          resolve(ctrl)
        }
      )
    })
  } catch (err) {
    console.warn('[spotify] IFrame API unavailable, using direct embed:', err)
    useDirectEmbed = true
  }

  // -------------------------------------------------------
  // Path A: IFrame API available — full programmatic control
  // -------------------------------------------------------
  if (embedController && !useDirectEmbed) {
    embedController.addListener('ready', () => {
      if (destroyed) return
      console.log('[spotify] Ready (IFrame API)')
      for (const cb of callbacks.ready) cb()
    })

    embedController.addListener('playback_update', (event: any) => {
      if (destroyed) return
      const data = event.data || event || {}
      const { isPaused, position, duration } = data

      if (typeof position === 'number' && typeof duration === 'number') {
        for (const cb of callbacks.progress) cb({ position, duration })
      }

      if (wasPaused && !isPaused) {
        for (const cb of callbacks.play) cb()
      }
      if (!wasPaused && isPaused) {
        const nearEnd = duration > 0 && (position >= duration - 500 || (position === 0 && lastPosition > 0))
        if (nearEnd) {
          for (const cb of callbacks.finish) cb()
        } else {
          for (const cb of callbacks.pause) cb()
        }
      }

      wasPaused = isPaused
      lastPosition = position
    })

    return {
      load: (id: string) => {
        if (destroyed) return
        wasPaused = true
        lastPosition = 0
        embedController.loadUri(`spotify:track:${id}`)
      },
      play: () => { if (!destroyed) embedController.play() },
      pause: () => { if (!destroyed) embedController.pause() },
      togglePlay: () => { if (!destroyed) embedController.togglePlay() },
      seekTo: (ms: number) => { if (!destroyed) embedController.seek(ms / 1000) },
      setVolume: () => {}, // Spotify embed doesn't support volume
      destroy: () => {
        destroyed = true
        try {
          embedController.removeListener('ready')
          embedController.removeListener('playback_update')
        } catch {}
        wrapper.remove()
      },
      onReady: (cb) => callbacks.ready.push(cb),
      onPlay: (cb) => callbacks.play.push(cb),
      onPause: (cb) => callbacks.pause.push(cb),
      onFinish: (cb) => callbacks.finish.push(cb),
      onProgress: (cb) => callbacks.progress.push(cb),
      onError: (cb) => callbacks.error.push(cb),
    }
  }

  // -------------------------------------------------------
  // Path B: Direct embed fallback — create iframe manually
  // The embed plays via Spotify's own UI inside the iframe.
  // We can't programmatically play/pause, but if the user is
  // logged in the embed auto-connects to their Spotify session.
  // We listen for postMessage events from the embed for progress.
  // -------------------------------------------------------
  console.log('[spotify] Creating direct embed for:', trackId)

  const iframe = document.createElement('iframe')
  iframe.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
  iframe.style.cssText = 'width:100%;height:100%;border:none;'
  wrapper.appendChild(iframe)

  // Listen for messages from the Spotify embed
  // The embed posts playback state via postMessage
  function handleMessage(event: MessageEvent) {
    if (destroyed) return
    if (!event.origin.includes('spotify.com')) return

    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      if (!data) return

      // Spotify embed sends various message types
      if (data.type === 'playback_update' || data.payload?.isPaused !== undefined) {
        const payload = data.payload || data
        const { isPaused, position, duration } = payload

        if (typeof position === 'number' && typeof duration === 'number') {
          for (const cb of callbacks.progress) cb({ position, duration })
        }

        if (wasPaused && !isPaused) {
          for (const cb of callbacks.play) cb()
        }
        if (!wasPaused && isPaused) {
          const nearEnd = duration > 0 && (position >= duration - 500)
          if (nearEnd) {
            for (const cb of callbacks.finish) cb()
          } else {
            for (const cb of callbacks.pause) cb()
          }
        }
        wasPaused = isPaused ?? wasPaused
        lastPosition = position ?? lastPosition
      }

      if (data.type === 'ready') {
        for (const cb of callbacks.ready) cb()
      }
    } catch {}
  }

  window.addEventListener('message', handleMessage)

  iframe.onload = () => {
    if (destroyed) return
    console.log('[spotify] Direct embed loaded:', trackId)
    for (const cb of callbacks.ready) cb()
  }

  iframe.onerror = () => {
    if (destroyed) return
    for (const cb of callbacks.error) cb(new Error('Spotify embed failed'))
  }

  // For direct embed, we try to communicate via postMessage
  function postToEmbed(cmd: object) {
    try {
      iframe.contentWindow?.postMessage(JSON.stringify(cmd), 'https://open.spotify.com')
    } catch {}
  }

  return {
    load: (id: string) => {
      if (destroyed) return
      wasPaused = true
      lastPosition = 0
      iframe.src = `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`
    },
    play: () => {
      if (destroyed) return
      postToEmbed({ command: 'toggle' })
      // Also try clicking the play button inside the iframe via focus
      try { iframe.focus() } catch {}
    },
    pause: () => {
      if (destroyed) return
      postToEmbed({ command: 'toggle' })
    },
    togglePlay: () => {
      if (destroyed) return
      postToEmbed({ command: 'toggle' })
    },
    seekTo: (ms: number) => {
      if (destroyed) return
      postToEmbed({ command: 'seek', value: ms })
    },
    setVolume: () => {},
    destroy: () => {
      destroyed = true
      window.removeEventListener('message', handleMessage)
      wrapper.remove()
    },
    onReady: (cb) => callbacks.ready.push(cb),
    onPlay: (cb) => callbacks.play.push(cb),
    onPause: (cb) => callbacks.pause.push(cb),
    onFinish: (cb) => callbacks.finish.push(cb),
    onProgress: (cb) => callbacks.progress.push(cb),
    onError: (cb) => callbacks.error.push(cb),
  }
}
