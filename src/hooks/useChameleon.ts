import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { extractColors, generatePalette } from '../lib/colorExtract'
import type { ExtractedPalette } from '../lib/colorExtract'

/**
 * Chameleon Theme Hook
 * Watches the current track's cover art, extracts 3 vibrant colors,
 * and applies them as accent colors + legibility-adjusted backgrounds.
 * Only active when theme is set to 'chameleon' or 'chameleon-dark'.
 */
export function useChameleon() {
  const theme = usePlayerStore((s) => s.theme)
  const coverArt = usePlayerStore((s) => s.currentTrack?.coverArt)
  const lastCoverRef = useRef<string | null>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const isChameleon = theme === 'chameleon' || theme === 'chameleon-dark'

    if (!isChameleon) {
      // Clean up chameleon-specific styles when switching away
      const root = document.documentElement
      root.style.removeProperty('--chameleon-tint')
      root.style.removeProperty('--chameleon-accent')
      root.style.removeProperty('--theme-accent')
      root.style.removeProperty('--theme-accent-dim')
      root.style.removeProperty('--theme-accent-secondary')
      root.style.removeProperty('--theme-accent-tertiary')
      root.style.removeProperty('--theme-player-progress')
      root.style.removeProperty('--theme-player-bg')
      root.style.removeProperty('--theme-border')
      root.style.removeProperty('--theme-border-panel')
      return
    }

    // Don't re-extract for the same cover
    if (coverArt === lastCoverRef.current) return
    lastCoverRef.current = coverArt ?? null

    if (!coverArt) {
      // No cover art — soft lavender default
      applyPalette({
        primary: '#7B8CDE',
        secondary: '#DE7B9E',
        tertiary: '#7BDEBC',
        isDark: false,
        avgBrightness: 140,
      }, theme === 'chameleon-dark')
      return
    }

    // Extract 3 colors from cover art
    let cancelled = false
    extractColors(coverArt).then((palette) => {
      if (cancelled || !isChameleon) return
      if (palette) {
        console.log('[chameleon] Extracted palette:', palette)
        applyPalette(palette, theme === 'chameleon-dark')
      }
    })

    return () => { cancelled = true }
  }, [theme, coverArt])

  function applyPalette(palette: ExtractedPalette, isDarkTheme: boolean) {
    const root = document.documentElement

    // Generate full palette variants from primary
    const primaryPalette = generatePalette(palette.primary)
    const secondaryPalette = generatePalette(palette.secondary)
    const tertiaryPalette = generatePalette(palette.tertiary)

    // Smooth transition
    cancelAnimationFrame(animFrameRef.current)
    root.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'

    // Primary accent
    root.style.setProperty('--theme-accent', primaryPalette.accent)
    root.style.setProperty('--theme-accent-dim', primaryPalette.accentDim)
    root.style.setProperty('--theme-player-progress', primaryPalette.accent)

    // Reactive text color for buttons on accent backgrounds
    const hex = primaryPalette.accent
    const r = parseInt(hex.slice(1, 3), 16) || 0
    const g = parseInt(hex.slice(3, 5), 16) || 0
    const b = parseInt(hex.slice(5, 7), 16) || 0
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    root.style.setProperty('--theme-accent-text', lum > 0.5 ? '#111111' : '#fafafa')

    // Secondary & tertiary accents for immersive use
    root.style.setProperty('--theme-accent-secondary', secondaryPalette.accent)
    root.style.setProperty('--theme-accent-tertiary', tertiaryPalette.accent)

    // Legibility adjustments based on artwork brightness
    if (isDarkTheme) {
      // Dark chameleon: tint the dark background subtly with primary
      const tintAlpha = 0.08
      root.style.setProperty('--theme-player-bg',
        `color-mix(in srgb, ${palette.primary} ${Math.round(tintAlpha * 100)}%, #141414)`)
      root.style.setProperty('--theme-border',
        `color-mix(in srgb, ${palette.primary} 15%, #2A2A2A)`)
      root.style.setProperty('--theme-border-panel',
        `color-mix(in srgb, ${palette.secondary} 10%, #333333)`)
    } else {
      // Light chameleon: adjust player bg based on artwork brightness
      if (palette.avgBrightness > 200) {
        // Very bright artwork — darken bg slightly for contrast
        root.style.setProperty('--theme-player-bg',
          `color-mix(in srgb, ${palette.primary} 6%, #E8E4DE)`)
      } else if (palette.avgBrightness < 80) {
        // Very dark artwork — lighten bg to keep text readable
        root.style.setProperty('--theme-player-bg',
          `color-mix(in srgb, ${palette.primary} 5%, #F5F2EE)`)
      } else {
        // Normal — subtle tint
        root.style.setProperty('--theme-player-bg',
          `color-mix(in srgb, ${palette.primary} 4%, #F2EFE9)`)
      }
      root.style.setProperty('--theme-border',
        `color-mix(in srgb, ${palette.primary} 12%, #D8D3CA)`)
      root.style.setProperty('--theme-border-panel',
        `color-mix(in srgb, ${palette.secondary} 8%, #C5C0B6)`)
    }

    // Surface tint
    root.style.setProperty('--chameleon-tint', primaryPalette.surfaceTint)
    root.style.setProperty('--chameleon-accent', primaryPalette.accent)

    // Clean up transition after it completes
    animFrameRef.current = requestAnimationFrame(() => {
      setTimeout(() => {
        root.style.transition = ''
      }, 900)
    })
  }
}
