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
    const isChameleon = theme === 'chameleon' || theme === 'chameleon-dark' || theme === 'y2k'

    if (!isChameleon) {
      // Clean up chameleon-specific styles when switching away
      const root = document.documentElement
      const props = [
        '--chameleon-tint', '--chameleon-accent',
        '--theme-accent', '--theme-accent-dim', '--theme-accent-text',
        '--theme-accent-secondary', '--theme-accent-tertiary',
        '--theme-player-progress', '--theme-player-bg',
        '--theme-border', '--theme-border-panel',
        '--theme-bg', '--theme-bg-secondary', '--theme-bg-panel',
        '--theme-surface', '--theme-surface-hover',
        '--theme-text-muted', '--theme-text-secondary',
        '--theme-tape-bg', '--theme-tape-line', '--theme-knob',
      ]
      props.forEach(p => root.style.removeProperty(p))
      return
    }

    // Don't re-extract for the same cover
    if (coverArt === lastCoverRef.current) return
    lastCoverRef.current = coverArt ?? null

    if (!coverArt) {
      // No cover art — soft lavender default
      applyPalette({
        primary: theme === 'y2k' ? '#999999' : '#7B8CDE',
        secondary: theme === 'y2k' ? '#888888' : '#DE7B9E',
        tertiary: theme === 'y2k' ? '#777777' : '#7BDEBC',
        isDark: false,
        avgBrightness: 140,
      }, theme === 'chameleon-dark', theme === 'y2k')
      return
    }

    // Extract 3 colors from cover art
    let cancelled = false
    extractColors(coverArt).then((palette) => {
      if (cancelled || !isChameleon) return
      if (palette) {
        console.log('[chameleon] Extracted palette:', palette)
        applyPalette(palette, theme === 'chameleon-dark', theme === 'y2k')
      }
    })

    return () => { cancelled = true }
  }, [theme, coverArt])

  function applyPalette(palette: ExtractedPalette, isDarkTheme: boolean, isY2k: boolean = false) {
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
    if (isY2k) {
      // Y2K: tint EVERYTHING with the extracted colors — full immersion
      // Neutral gray/white bases — color comes entirely from album art
      const p = palette.primary
      const s = palette.secondary
      root.style.setProperty('--theme-bg',
        `color-mix(in srgb, ${p} 12%, #f8f7f5)`)
      root.style.setProperty('--theme-bg-secondary',
        `color-mix(in srgb, ${p} 18%, #f0efed)`)
      root.style.setProperty('--theme-bg-panel',
        `color-mix(in srgb, ${p} 20%, #eae8e6)`)
      root.style.setProperty('--theme-surface',
        `color-mix(in srgb, ${p} 8%, #fbfaf9)`)
      root.style.setProperty('--theme-surface-hover',
        `color-mix(in srgb, ${p} 14%, #f3f2f0)`)
      root.style.setProperty('--theme-player-bg',
        `color-mix(in srgb, ${p} 10%, #f8f7f5)`)
      root.style.setProperty('--theme-border',
        `color-mix(in srgb, ${p} 30%, #e0deda)`)
      root.style.setProperty('--theme-border-panel',
        `color-mix(in srgb, ${s} 25%, #d4d0cc)`)
      root.style.setProperty('--theme-text-muted',
        `color-mix(in srgb, ${p} 30%, #aaaaaa)`)
      root.style.setProperty('--theme-text-secondary',
        `color-mix(in srgb, ${p} 25%, #777777)`)
      root.style.setProperty('--theme-tape-bg',
        `color-mix(in srgb, ${s} 20%, #eae8e6)`)
      root.style.setProperty('--theme-tape-line',
        `color-mix(in srgb, ${s} 20%, #d4d0cc)`)
      root.style.setProperty('--theme-knob', primaryPalette.accent)
    } else if (isDarkTheme) {
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
        root.style.setProperty('--theme-player-bg',
          `color-mix(in srgb, ${palette.primary} 6%, #E8E4DE)`)
      } else if (palette.avgBrightness < 80) {
        root.style.setProperty('--theme-player-bg',
          `color-mix(in srgb, ${palette.primary} 5%, #F5F2EE)`)
      } else {
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
