// Spotify OAuth + Web Playback SDK
// Uses PKCE flow (no backend needed) for client-side auth
// Requires Spotify Premium for full playback via Web Playback SDK

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
].join(' ')

const STORAGE_KEY = 'hurakan-spotify-auth'

interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // epoch ms
}

// ============================================================
// Config — hardcoded app client ID (no user config needed)
// ============================================================
const SPOTIFY_CLIENT_ID = 'a8df016bc90a4da69daca6b1bc0f2a71'

export function getSpotifyClientId(): string {
  return SPOTIFY_CLIENT_ID
}

export function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`
}

// ============================================================
// PKCE helpers
// ============================================================
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(plain))
}

function base64urlencode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ============================================================
// Token storage
// ============================================================
export function getStoredTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storeTokens(tokens: SpotifyTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

export function isSpotifyConnected(): boolean {
  const tokens = getStoredTokens()
  return !!tokens?.accessToken
}

// ============================================================
// OAuth PKCE flow — initiate
// ============================================================
export async function startSpotifyAuth() {
  const clientId = getSpotifyClientId()
  if (!clientId) {
    throw new Error('Spotify Client ID not configured')
  }

  const codeVerifier = generateRandomString(64)
  const hashed = await sha256(codeVerifier)
  const codeChallenge = base64urlencode(hashed)

  // Store verifier for callback
  sessionStorage.setItem('spotify_code_verifier', codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: getRedirectUri(),
    state: generateRandomString(16),
  })

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

// ============================================================
// OAuth PKCE flow — handle callback
// ============================================================
export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return false

  const clientId = getSpotifyClientId()
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier')
  if (!clientId || !codeVerifier) return false

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      console.error('[spotify-auth] Token exchange failed:', response.status)
      return false
    }

    const data = await response.json()
    storeTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    })

    // Clean up URL
    sessionStorage.removeItem('spotify_code_verifier')
    window.history.replaceState({}, '', window.location.pathname)
    console.log('[spotify-auth] Authenticated successfully')
    return true
  } catch (err) {
    console.error('[spotify-auth] Callback error:', err)
    return false
  }
}

// ============================================================
// Token refresh
// ============================================================
export async function refreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  const clientId = getSpotifyClientId()
  if (!tokens?.refreshToken || !clientId) return null

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
    })

    if (!response.ok) {
      console.error('[spotify-auth] Refresh failed:', response.status)
      clearTokens()
      return null
    }

    const data = await response.json()
    storeTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    })

    return data.access_token
  } catch (err) {
    console.error('[spotify-auth] Refresh error:', err)
    return null
  }
}

// ============================================================
// Get valid access token (auto-refreshes if expired)
// ============================================================
export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  // Refresh 60s before expiry
  if (Date.now() > tokens.expiresAt - 60000) {
    return refreshAccessToken()
  }

  return tokens.accessToken
}

// ============================================================
// Spotify Web API helpers
// ============================================================
export async function spotifyApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    // Token expired mid-request, try refresh
    const newToken = await refreshAccessToken()
    if (!newToken) throw new Error('Auth expired')

    const retry = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${newToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!retry.ok) throw new Error(`Spotify API error: ${retry.status}`)
    return retry.status === 204 ? null : retry.json()
  }

  if (!response.ok) throw new Error(`Spotify API error: ${response.status}`)
  return response.status === 204 ? null : response.json()
}

// Get track metadata via Spotify API (better than oEmbed)
export async function getSpotifyTrackInfo(trackId: string): Promise<{
  title: string
  artist: string
  album: string
  thumbnailUrl?: string
  durationMs: number
} | null> {
  try {
    const data = await spotifyApi(`/tracks/${trackId}`)
    return {
      title: data.name,
      artist: data.artists.map((a: any) => a.name).join(', '),
      album: data.album?.name || '',
      thumbnailUrl: data.album?.images?.[0]?.url,
      durationMs: data.duration_ms,
    }
  } catch {
    return null
  }
}

// ============================================================
// Spotify Search — search user's library + Spotify catalog
// ============================================================
export interface SpotifySearchResult {
  id: string
  title: string
  artist: string
  album: string
  coverArt?: string
  durationMs: number
  uri: string
  url: string
}

export async function searchSpotify(query: string, limit: number = 20): Promise<SpotifySearchResult[]> {
  if (!query.trim()) return []
  try {
    const data = await spotifyApi(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`)
    if (!data?.tracks?.items) return []
    return data.tracks.items.map((t: any) => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map((a: any) => a.name).join(', '),
      album: t.album?.name || '',
      coverArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
      durationMs: t.duration_ms,
      uri: t.uri,
      url: `https://open.spotify.com/track/${t.id}`,
    }))
  } catch {
    return []
  }
}

export async function getUserSavedTracks(limit: number = 50): Promise<SpotifySearchResult[]> {
  try {
    const data = await spotifyApi(`/me/tracks?limit=${limit}`)
    if (!data?.items) return []
    return data.items.map((item: any) => {
      const t = item.track
      return {
        id: t.id,
        title: t.name,
        artist: t.artists.map((a: any) => a.name).join(', '),
        album: t.album?.name || '',
        coverArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
        durationMs: t.duration_ms,
        uri: t.uri,
        url: `https://open.spotify.com/track/${t.id}`,
      }
    })
  } catch {
    return []
  }
}

// ============================================================
// Web Playback SDK
// ============================================================
let sdkPromise: Promise<void> | null = null

function loadPlaybackSDK(): Promise<void> {
  if (sdkPromise) return sdkPromise
  if ((window as any).Spotify?.Player) return Promise.resolve()

  sdkPromise = new Promise<void>((resolve, reject) => {
    // SDK calls this when ready
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.log('[spotify-sdk] Web Playback SDK ready')
      resolve()
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('Failed to load Spotify Web Playback SDK'))
    }
    document.head.appendChild(script)

    setTimeout(() => {
      if (!(window as any).Spotify?.Player) {
        sdkPromise = null
        reject(new Error('Spotify SDK load timeout'))
      }
    }, 15000)
  })

  return sdkPromise
}

export interface SpotifySDKPlayer {
  deviceId: string
  play: (trackUri: string) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  setVolume: (vol: number) => Promise<void>
  getState: () => Promise<any>
  disconnect: () => void
  onStateChange: (cb: (state: any) => void) => void
  onError: (cb: (err: any) => void) => void
}

export async function createSpotifySDKPlayer(name: string = 'liquiid radio'): Promise<SpotifySDKPlayer> {
  await loadPlaybackSDK()

  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated with Spotify')

  const SpotifyPlayer = (window as any).Spotify.Player

  return new Promise<SpotifySDKPlayer>((resolve, reject) => {
    const player = new SpotifyPlayer({
      name,
      getOAuthToken: async (cb: (token: string) => void) => {
        const t = await getAccessToken()
        if (t) cb(t)
      },
      volume: 0.8,
    })

    let deviceId = ''
    const stateCallbacks: ((state: any) => void)[] = []
    const errorCallbacks: ((err: any) => void)[] = []

    player.addListener('ready', ({ device_id }: any) => {
      console.log('[spotify-sdk] Player ready, device:', device_id)
      deviceId = device_id
      resolve({
        deviceId: device_id,
        play: async (trackUri: string) => {
          await spotifyApi(`/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ uris: [trackUri] }),
          })
        },
        pause: async () => { await player.pause() },
        resume: async () => { await player.resume() },
        seek: async (ms: number) => { await player.seek(ms) },
        setVolume: async (vol: number) => { await player.setVolume(vol) },
        getState: async () => player.getCurrentState(),
        disconnect: () => { player.disconnect() },
        onStateChange: (cb) => { stateCallbacks.push(cb) },
        onError: (cb) => { errorCallbacks.push(cb) },
      })
    })

    player.addListener('not_ready', ({ device_id }: any) => {
      console.warn('[spotify-sdk] Device went offline:', device_id)
    })

    player.addListener('player_state_changed', (state: any) => {
      for (const cb of stateCallbacks) cb(state)
    })

    player.addListener('initialization_error', ({ message }: any) => {
      console.error('[spotify-sdk] Init error:', message)
      for (const cb of errorCallbacks) cb(message)
      reject(new Error(message))
    })

    player.addListener('authentication_error', ({ message }: any) => {
      console.error('[spotify-sdk] Auth error:', message)
      clearTokens()
      for (const cb of errorCallbacks) cb(message)
      reject(new Error(message))
    })

    player.addListener('account_error', ({ message }: any) => {
      console.error('[spotify-sdk] Account error (Premium required):', message)
      for (const cb of errorCallbacks) cb(message)
      reject(new Error('Spotify Premium required for playback'))
    })

    player.connect().then((success: boolean) => {
      if (!success) reject(new Error('Failed to connect Spotify player'))
    })

    setTimeout(() => {
      if (!deviceId) reject(new Error('Spotify player connection timeout'))
    }, 15000)
  })
}
