export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function isAudioUrl(url: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.opus', '.webm']
  const lowered = url.toLowerCase().split('?')[0]
  return audioExtensions.some(ext => lowered.endsWith(ext))
}

export function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const filename = pathname.split('/').pop() || 'Unknown'
    return decodeURIComponent(filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  } catch {
    return 'Unknown Track'
  }
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getGradient(seed: string): string {
  const colors = [
    ['#2A2A2A', '#484848'],  // matte knob tones
    ['#1A3A40', '#A8C4CC'],  // tape window
    ['#C94A2A', '#F5C49A'],  // thermal
    ['#1A8C35', '#3DFF6A'],  // signal green
    ['#3A3630', '#E8E4D8'],  // chassis warm
    ['#7BA8B2', '#DEDAD2'],  // tape + panel
  ]
  const index = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return `linear-gradient(135deg, ${colors[index][0]}, ${colors[index][1]})`
}
