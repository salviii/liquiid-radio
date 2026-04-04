/**
 * Lightweight color extraction using Canvas.
 * Extracts multiple vibrant colors from an image for an immersive palette.
 * No external dependencies — pure browser APIs.
 */

interface RGB { r: number; g: number; b: number }

export interface ExtractedPalette {
  primary: string    // dominant vibrant color
  secondary: string  // second most prominent color (different hue)
  tertiary: string   // third color for accents
  isDark: boolean    // whether the artwork is overall dark
  avgBrightness: number // 0-255
}

/**
 * Extract 3 distinct vibrant colors from an image URL.
 */
export async function extractColors(imageUrl: string): Promise<ExtractedPalette | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = imageUrl
      setTimeout(() => reject(new Error('Image load timeout')), 5000)
    })

    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(img, 0, 0, size, size)
    const imageData = ctx.getImageData(0, 0, size, size)
    const pixels = imageData.data

    // Track overall brightness
    let totalBrightness = 0
    let pixelCount = 0

    const colorBuckets = new Map<string, { color: RGB; count: number; saturation: number; hue: number }>()

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const a = pixels[i + 3]

      if (a < 128) continue

      const brightness = (r + g + b) / 3
      totalBrightness += brightness
      pixelCount++

      if (brightness < 25 || brightness > 240) continue

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const saturation = max === 0 ? 0 : (max - min) / max

      if (saturation < 0.08) continue

      const hsl = rgbToHsl({ r, g, b })

      const qr = Math.round(r / 32) * 32
      const qg = Math.round(g / 32) * 32
      const qb = Math.round(b / 32) * 32
      const key = `${qr},${qg},${qb}`

      const existing = colorBuckets.get(key)
      if (existing) {
        existing.count++
        if (saturation > existing.saturation) {
          existing.color = { r, g, b }
          existing.saturation = saturation
          existing.hue = hsl.h
        }
      } else {
        colorBuckets.set(key, { color: { r, g, b }, count: 1, saturation, hue: hsl.h })
      }
    }

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128
    const isDark = avgBrightness < 100

    if (colorBuckets.size === 0) return null

    // Sort by score (count * saturation)
    const sorted = [...colorBuckets.values()]
      .sort((a, b) => (b.count * Math.pow(b.saturation, 1.5)) - (a.count * Math.pow(a.saturation, 1.5)))

    const primary = sorted[0].color
    const primaryHue = sorted[0].hue

    // Find secondary — must differ in hue by at least 0.08 (30° on color wheel)
    let secondary = primary
    for (const bucket of sorted.slice(1)) {
      const hueDiff = Math.abs(bucket.hue - primaryHue)
      const wrappedDiff = Math.min(hueDiff, 1 - hueDiff)
      if (wrappedDiff > 0.08) {
        secondary = bucket.color
        break
      }
    }

    // Find tertiary — must differ from both primary and secondary
    let tertiary = secondary
    const secondaryHue = rgbToHsl(secondary).h
    for (const bucket of sorted.slice(1)) {
      const hueDiff1 = Math.min(Math.abs(bucket.hue - primaryHue), 1 - Math.abs(bucket.hue - primaryHue))
      const hueDiff2 = Math.min(Math.abs(bucket.hue - secondaryHue), 1 - Math.abs(bucket.hue - secondaryHue))
      if (hueDiff1 > 0.06 && hueDiff2 > 0.06) {
        tertiary = bucket.color
        break
      }
    }

    return {
      primary: rgbToHex(primary),
      secondary: rgbToHex(secondary),
      tertiary: rgbToHex(tertiary),
      isDark,
      avgBrightness,
    }
  } catch (err) {
    console.warn('[color-extract] Failed:', err)
    return null
  }
}

/** Legacy single-color extraction — wraps extractColors */
export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  const palette = await extractColors(imageUrl)
  return palette?.primary ?? null
}

/**
 * Generate a palette of complementary colors from a dominant color.
 * Returns accent, dim, and muted variants.
 */
export function generatePalette(hex: string): {
  accent: string
  accentDim: string
  accentMuted: string
  surfaceTint: string
} {
  const rgb = hexToRgb(hex)
  if (!rgb) return { accent: hex, accentDim: hex, accentMuted: hex, surfaceTint: hex }

  // Ensure the accent is vibrant enough — boost saturation if needed
  const hsl = rgbToHsl(rgb)
  hsl.s = Math.max(hsl.s, 0.5) // Minimum 50% saturation
  hsl.l = Math.max(0.4, Math.min(0.6, hsl.l)) // Clamp lightness to visible range
  const boosted = hslToRgb(hsl)
  const accent = rgbToHex(boosted)

  // Dim version — same hue, lower saturation + lightness
  const dim = rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s * 0.6, l: hsl.l * 0.5 }))

  // Muted — very low saturation
  const muted = rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s * 0.2, l: hsl.l * 0.4 }))

  // Surface tint — very subtle, used for background hints
  const surfaceTint = rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s * 0.15, l: 0.92 }))

  return { accent, accentDim: dim, accentMuted: muted, surfaceTint }
}

// ========================
// Color utility functions
// ========================

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): RGB | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RGB {
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}
