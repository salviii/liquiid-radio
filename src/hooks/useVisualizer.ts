import { useEffect, useRef, useCallback } from 'react'

export function useVisualizer(isPlaying: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const connectedRef = useRef(false)

  const connectAudio = useCallback(() => {
    if (connectedRef.current) return

    const audioEl = document.querySelector('audio') as HTMLAudioElement | null
    if (!audioEl) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current

      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioEl)
      }

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.8

      sourceRef.current.connect(analyser)
      analyser.connect(ctx.destination)

      analyserRef.current = analyser
      connectedRef.current = true
    } catch {
      // Howler uses Web Audio API internally, so we can't double-connect
      // Fall back to fake visualizer
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const centerX = w / 2
    const centerY = h / 2
    const radius = Math.min(w, h) * 0.35

    ctx.clearRect(0, 0, w, h)

    const barCount = 48
    const analyser = analyserRef.current
    let dataArray: Uint8Array<ArrayBuffer>

    if (analyser) {
      dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
    } else {
      // Fake visualizer when we can't connect to audio
      dataArray = new Uint8Array(barCount)
      if (isPlaying) {
        const time = Date.now() / 1000
        for (let i = 0; i < barCount; i++) {
          const wave1 = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5
          const wave2 = Math.sin(time * 3.7 + i * 0.5) * 0.3 + 0.3
          const wave3 = Math.sin(time * 1.3 + i * 0.7) * 0.2 + 0.2
          dataArray[i] = Math.floor((wave1 + wave2 + wave3) * 85)
        }
      }
    }

    // Draw circular bars around the disc
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const value = dataArray[i % dataArray.length] / 255
      const barHeight = value * radius * 0.5 + 2

      const x1 = centerX + Math.cos(angle) * (radius + 4)
      const y1 = centerY + Math.sin(angle) * (radius + 4)
      const x2 = centerX + Math.cos(angle) * (radius + 4 + barHeight)
      const y2 = centerY + Math.sin(angle) * (radius + 4 + barHeight)

      const style = getComputedStyle(document.documentElement)
      const accent = style.getPropertyValue('--theme-accent').trim() || '#e8927c'

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = accent
      ctx.globalAlpha = 0.3 + value * 0.7
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (isPlaying) {
      animRef.current = requestAnimationFrame(draw)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
      connectAudio()
      animRef.current = requestAnimationFrame(draw)
    } else {
      cancelAnimationFrame(animRef.current)
      // Draw one last frame to show static bars
      draw()
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, draw, connectAudio])

  return canvasRef
}
