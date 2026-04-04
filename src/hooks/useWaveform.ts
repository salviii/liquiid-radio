import { useEffect, useRef, useCallback } from 'react'

export function useWaveform(isPlaying: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const blobsRef = useRef<{ x: number; y: number; r: number; vx: number; vy: number; phase: number }[]>([])

  // Initialize blobs
  useEffect(() => {
    blobsRef.current = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random(),
      y: 0.3 + Math.random() * 0.4,
      r: 0.03 + Math.random() * 0.06,
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.001,
      phase: i * 0.5,
    }))
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    const w = rect.width
    const h = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--theme-accent').trim() || '#e8927c'
    const time = Date.now() / 1000

    // Parse accent color to RGB for manipulation
    const tempDiv = document.createElement('div')
    tempDiv.style.color = accent
    document.body.appendChild(tempDiv)
    const computed = getComputedStyle(tempDiv).color
    document.body.removeChild(tempDiv)
    const rgbMatch = computed.match(/(\d+)/g)
    const r = parseInt(rgbMatch?.[0] || '232')
    const g = parseInt(rgbMatch?.[1] || '146')
    const b = parseInt(rgbMatch?.[2] || '124')

    // Update and draw liquid blobs
    for (const blob of blobsRef.current) {
      if (isPlaying) {
        // Reactive movement
        const energy = Math.sin(time * 2.5 + blob.phase) * 0.3 + 0.5
        const pulse = Math.sin(time * 4 + blob.phase * 1.7) * 0.15
        blob.x += blob.vx + Math.sin(time * 1.3 + blob.phase) * 0.001
        blob.y += blob.vy + Math.cos(time * 1.7 + blob.phase) * 0.0008

        // Bounce off edges
        if (blob.x < 0.05 || blob.x > 0.95) blob.vx *= -1
        if (blob.y < 0.1 || blob.y > 0.9) blob.vy *= -1
        blob.x = Math.max(0.02, Math.min(0.98, blob.x))
        blob.y = Math.max(0.05, Math.min(0.95, blob.y))

        const currentR = blob.r * (1 + energy * 0.6 + pulse)
        const px = blob.x * w
        const py = blob.y * h
        const pr = currentR * Math.min(w, h)

        // Draw liquid puddle
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, pr)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 + energy * 0.25})`)
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.2 + energy * 0.15})`)
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${0.08 + energy * 0.06})`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.beginPath()
        // Organic shape using bezier curves
        const points = 8
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2
          const wobble = 1 + Math.sin(time * 3 + blob.phase + i * 1.2) * 0.25 * energy
          const rx = pr * wobble * (1 + Math.sin(angle * 2 + time) * 0.1)
          const ry = pr * wobble * (1 + Math.cos(angle * 3 + time) * 0.1)
          const ptx = px + Math.cos(angle) * rx
          const pty = py + Math.sin(angle) * ry
          if (i === 0) ctx.moveTo(ptx, pty)
          else {
            const prevAngle = ((i - 1) / points) * Math.PI * 2
            const cpx = px + Math.cos((prevAngle + angle) / 2) * rx * 1.1
            const cpy = py + Math.sin((prevAngle + angle) / 2) * ry * 1.1
            ctx.quadraticCurveTo(cpx, cpy, ptx, pty)
          }
        }
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Highlight/reflection
        ctx.beginPath()
        ctx.ellipse(px - pr * 0.2, py - pr * 0.2, pr * 0.3, pr * 0.2, -0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + energy * 0.04})`
        ctx.fill()
      } else {
        // Idle — small still puddles
        blob.r *= 0.998
        if (blob.r < 0.02) blob.r = 0.02

        const px = blob.x * w
        const py = blob.y * h
        const pr = blob.r * Math.min(w, h) * 0.7

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, pr)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.12)`)
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.05)`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.beginPath()
        ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    // Draw connecting liquid bridges between nearby blobs when playing
    if (isPlaying) {
      for (let i = 0; i < blobsRef.current.length; i++) {
        for (let j = i + 1; j < blobsRef.current.length; j++) {
          const a = blobsRef.current[i]
          const bBlob = blobsRef.current[j]
          const dx = (a.x - bBlob.x) * w
          const dy = (a.y - bBlob.y) * h
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = Math.min(w, h) * 0.2

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.08
            ctx.beginPath()
            ctx.moveTo(a.x * w, a.y * h)
            const cpx = (a.x + bBlob.x) / 2 * w + Math.sin(time * 2 + i) * 20
            const cpy = (a.y + bBlob.y) / 2 * h + Math.cos(time * 2.5 + j) * 15
            ctx.quadraticCurveTo(cpx, cpy, bBlob.x * w, bBlob.y * h)
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
            ctx.lineWidth = 3 + (1 - dist / maxDist) * 8
            ctx.lineCap = 'round'
            ctx.stroke()
          }
        }
      }
    }

    ctx.restore()
    animRef.current = requestAnimationFrame(draw)
  }, [isPlaying])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  return canvasRef
}
