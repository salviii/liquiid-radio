import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Widget } from './Widget.tsx'
import { handleSpotifyCallback } from './lib/spotifyAuth'

// Handle Spotify OAuth callback (code in URL)
const params = new URLSearchParams(window.location.search)
if (params.has('code') && !params.has('widget')) {
  handleSpotifyCallback().then((ok) => {
    if (ok) console.log('[spotify] Auth callback handled')
  })
}

const isWidget = params.has('widget')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isWidget ? <Widget /> : <App />}
  </StrictMode>,
)
