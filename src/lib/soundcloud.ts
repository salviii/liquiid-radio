// SoundCloud integration
// Uses oEmbed for metadata + hidden Widget iframe for playback

const SC_OEMBED = 'https://soundcloud.com/oembed'
const SC_WIDGET_API = 'https://w.soundcloud.com/player/api.js'

export function isSoundCloudUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(soundcloud\.com|on\.soundcloud\.com)\//.test(url)
}

/**
 * Resolve SoundCloud metadata via oEmbed (always works, no API key)
 */
export async function resolveSoundCloudTrack(url: string): Promise<{
  title: string
  artist: string
  thumbnailUrl?: string
  embedHtml?: string
} | null> {
  try {
    const response = await fetch(
      `${SC_OEMBED}?format=json&url=${encodeURIComponent(url)}`
    )

    if (!response.ok) return null

    const data = await response.json()

    // Parse "Title by Artist" pattern
    const titleMatch = data.title?.match(/^(.+?)(?:\s+by\s+(.+))?$/)
    const title = titleMatch?.[1] || data.title || 'Unknown Track'
    const artist = data.author_name || titleMatch?.[2] || 'Unknown Artist'

    return {
      title,
      artist,
      thumbnailUrl: data.thumbnail_url,
      embedHtml: data.html,
    }
  } catch {
    return null
  }
}

// ============================================================
// SoundCloud Widget Controller
// Controls a hidden SC iframe via the Widget API
// ============================================================

let widgetApiLoaded = false
let widgetApiPromise: Promise<void> | null = null

/** Load the SoundCloud Widget API script */
function loadWidgetApi(): Promise<void> {
  if (widgetApiLoaded) return Promise.resolve()
  if (widgetApiPromise) return widgetApiPromise

  widgetApiPromise = new Promise((resolve, reject) => {
    // Check if already on page
    if ((window as any).SC?.Widget) {
      widgetApiLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = SC_WIDGET_API
    script.onload = () => {
      widgetApiLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load SC Widget API'))
    document.head.appendChild(script)
  })

  return widgetApiPromise
}

export interface SCWidgetController {
  load: (scUrl: string, shouldPlay?: boolean) => void
  play: () => void
  pause: () => void
  seekTo: (ms: number) => void
  setVolume: (vol: number) => void  // 0-100
  getPosition: () => Promise<number>
  getDuration: () => Promise<number>
  destroy: () => void
  onPlay: (cb: () => void) => void
  onPause: (cb: () => void) => void
  onFinish: (cb: () => void) => void
  onProgress: (cb: (data: { currentPosition: number }) => void) => void
  onReady: (cb: () => void) => void
  onError: (cb: () => void) => void
  iframe: HTMLIFrameElement
}

/**
 * Create a hidden SoundCloud widget controller.
 * Returns an object that lets you control playback.
 */
export async function createSCWidget(container: HTMLElement): Promise<SCWidgetController> {
  await loadWidgetApi()

  const SC = (window as any).SC

  // Create hidden iframe
  const iframe = document.createElement('iframe')
  iframe.id = 'sc-widget-' + Date.now()
  iframe.width = '1'
  iframe.height = '1'
  iframe.allow = 'autoplay'
  iframe.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
  iframe.src = 'https://w.soundcloud.com/player/?url=https://soundcloud.com&auto_play=false&show_artwork=false'
  container.appendChild(iframe)

  // Wait for iframe to be ready
  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve()
  })

  const widget = SC.Widget(iframe)

  // Wrap widget methods in promises where needed
  const controller: SCWidgetController = {
    iframe,

    load: (scUrl: string, shouldPlay?: boolean) => {
      widget.load(scUrl, {
        auto_play: shouldPlay !== false,
        show_artwork: false,
        show_comments: false,
        show_playcount: false,
        show_user: false,
        buying: false,
        sharing: false,
        download: false,
        visual: false,
        callback: () => {
          console.log('[sc-widget] Loaded:', scUrl)
          // Backup play trigger — READY event may not re-fire
          if (shouldPlay !== false) {
            setTimeout(() => widget.play(), 200)
          }
        },
      })
    },

    play: () => widget.play(),
    pause: () => widget.pause(),

    seekTo: (ms: number) => widget.seekTo(ms),

    setVolume: (vol: number) => widget.setVolume(vol),

    getPosition: () => new Promise<number>((resolve) => {
      widget.getPosition((pos: number) => resolve(pos))
    }),

    getDuration: () => new Promise<number>((resolve) => {
      widget.getDuration((dur: number) => resolve(dur))
    }),

    destroy: () => {
      try {
        widget.unbind(SC.Widget.Events.READY)
        widget.unbind(SC.Widget.Events.PLAY)
        widget.unbind(SC.Widget.Events.PAUSE)
        widget.unbind(SC.Widget.Events.FINISH)
        widget.unbind(SC.Widget.Events.PLAY_PROGRESS)
        widget.unbind(SC.Widget.Events.ERROR)
      } catch {}
      iframe.remove()
    },

    onReady: (cb) => widget.bind(SC.Widget.Events.READY, cb),
    onPlay: (cb) => widget.bind(SC.Widget.Events.PLAY, cb),
    onPause: (cb) => widget.bind(SC.Widget.Events.PAUSE, cb),
    onFinish: (cb) => widget.bind(SC.Widget.Events.FINISH, cb),
    onProgress: (cb) => widget.bind(SC.Widget.Events.PLAY_PROGRESS, cb),
    onError: (cb) => widget.bind(SC.Widget.Events.ERROR, cb),
  }

  return controller
}
