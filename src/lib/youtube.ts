// YouTube integration
// Uses oEmbed for metadata + hidden YouTube embed iframe for playback
// Same pattern as SoundCloud — hidden iframe controlled via postMessage API

const YT_OEMBED = 'https://www.youtube.com/oembed'

export function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/)/.test(url)
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v')
    }
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/')[2] || null
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    return null
  } catch {
    return null
  }
}

export async function resolveYouTubeTrack(url: string): Promise<{
  title: string
  artist: string
  thumbnailUrl?: string
} | null> {
  try {
    const response = await fetch(
      `${YT_OEMBED}?format=json&url=${encodeURIComponent(url)}`
    )
    if (!response.ok) return null
    const data = await response.json()
    return {
      title: data.title || 'Unknown Track',
      artist: data.author_name || 'Unknown Artist',
      thumbnailUrl: data.thumbnail_url,
    }
  } catch {
    return null
  }
}

// ============================================================
// YouTube Embed Controller
// Uses a hidden YouTube embed iframe + postMessage API
// Same approach as SoundCloud widget — iframe is technically
// in-viewport but visually hidden via clip/opacity
// ============================================================

export interface YTPlayerController {
  load: (videoId: string) => void
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  setVolume: (vol: number) => void
  getDuration: () => Promise<number>
  destroy: () => void
  onPlay: (cb: () => void) => void
  onPause: (cb: () => void) => void
  onFinish: (cb: () => void) => void
  onProgress: (cb: (data: { currentPosition: number }) => void) => void
  onReady: (cb: () => void) => void
  onError: (cb: (e: any) => void) => void
}

export function createYTEmbed(container: HTMLElement, videoId: string): YTPlayerController {
  const callbacks = {
    play: [] as (() => void)[],
    pause: [] as (() => void)[],
    finish: [] as (() => void)[],
    progress: [] as ((data: { currentPosition: number }) => void)[],
    ready: [] as (() => void)[],
    error: [] as ((e: any) => void)[],
  }

  let progressInterval: ReturnType<typeof setInterval> | null = null
  let destroyed = false
  let playerReady = false
  let currentDuration = 0

  // Create iframe with YouTube embed
  const iframe = document.createElement('iframe')
  iframe.id = 'yt-embed-' + Date.now()
  iframe.allow = 'autoplay; encrypted-media'
  iframe.setAttribute('allowfullscreen', '')
  // enablejsapi=1 lets us use postMessage to control the player
  iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
  iframe.style.cssText = 'width:1px;height:1px;opacity:0;position:absolute;pointer-events:none;'
  container.appendChild(iframe)

  // postMessage helper to send commands to the YT embed
  function postCmd(event: string, args?: any) {
    if (destroyed || !iframe.contentWindow) return
    const msg: any = { event: 'command', func: event }
    if (args !== undefined) msg.args = Array.isArray(args) ? args : [args]
    iframe.contentWindow.postMessage(JSON.stringify(msg), '*')
  }

  // Listen for messages from the YouTube iframe
  function handleMessage(e: MessageEvent) {
    if (destroyed) return
    if (e.source !== iframe.contentWindow) return

    let data: any
    try {
      data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    } catch {
      return
    }

    if (!data || data.channel !== 'widget') return

    const event = data.event

    if (event === 'onReady') {
      playerReady = true
      console.log('[yt-embed] Player ready')
      // Start listening for state/time updates
      postCmd('addEventListener', 'onStateChange')
      // Start progress polling
      startProgressPolling()
      for (const cb of callbacks.ready) cb()
    }

    if (event === 'onStateChange') {
      const state = data.info
      // YT states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
      if (state === 1) {
        for (const cb of callbacks.play) cb()
      } else if (state === 2) {
        for (const cb of callbacks.pause) cb()
      } else if (state === 0) {
        for (const cb of callbacks.finish) cb()
      }
    }

    if (event === 'infoDelivery' && data.info) {
      // Progress updates come through infoDelivery
      if (typeof data.info.currentTime === 'number') {
        const ms = data.info.currentTime * 1000
        for (const cb of callbacks.progress) cb({ currentPosition: ms })
      }
      if (typeof data.info.duration === 'number' && data.info.duration > 0) {
        currentDuration = data.info.duration * 1000
      }
    }
  }

  window.addEventListener('message', handleMessage)

  // Also send a "listening" event so YT knows we want events
  iframe.onload = () => {
    if (destroyed) return
    // Tell the iframe we're listening for events
    const listenMsg = JSON.stringify({ event: 'listening', id: iframe.id })
    iframe.contentWindow?.postMessage(listenMsg, '*')
  }

  function startProgressPolling() {
    stopProgressPolling()
    // YouTube infoDelivery should send progress, but as backup poll getCurrentTime
    progressInterval = setInterval(() => {
      if (!destroyed && playerReady) {
        postCmd('getVideoData')
      }
    }, 500)
  }

  function stopProgressPolling() {
    if (progressInterval !== null) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  const controller: YTPlayerController = {
    load: (newVideoId: string) => {
      if (destroyed) return
      postCmd('loadVideoById', newVideoId)
      console.log('[yt-embed] Loading:', newVideoId)
    },

    play: () => postCmd('playVideo'),
    pause: () => postCmd('pauseVideo'),
    seekTo: (seconds: number) => postCmd('seekTo', [seconds, true]),
    setVolume: (vol: number) => postCmd('setVolume', vol),

    getDuration: () => Promise.resolve(currentDuration),

    destroy: () => {
      destroyed = true
      stopProgressPolling()
      window.removeEventListener('message', handleMessage)
      iframe.remove()
    },

    onReady: (cb) => callbacks.ready.push(cb),
    onPlay: (cb) => callbacks.play.push(cb),
    onPause: (cb) => callbacks.pause.push(cb),
    onFinish: (cb) => callbacks.finish.push(cb),
    onProgress: (cb) => callbacks.progress.push(cb),
    onError: (cb) => callbacks.error.push(cb),
  }

  return controller
}
