import { withTimeout } from './photos'

export const MAX_VIDEO_SECONDS = 30
export const MAX_VIDEO_BYTES = 45 * 1024 * 1024
const KNOWN = /\.(mp4|m4v|mov|webm)$/i
const mb = (n: number) => `${Math.round(n / 1048576)} MB`

export interface PreparedVideo { file: File; type: string; poster: Blob; seconds: number }

const once = (el: HTMLVideoElement, ok: string, ms: number, message: string) => new Promise<void>((res, rej) => {
  const done = (error?: Error) => { clearTimeout(timer); el.removeEventListener(ok, onOk); el.removeEventListener('error', onErr); if (error) rej(error); else res() }
  const onOk = () => done(), onErr = () => done(new Error(message))
  const timer = setTimeout(() => done(new Error(message)), ms)
  el.addEventListener(ok, onOk); el.addEventListener('error', onErr)
})

/**
 * Check a picked clip and grab a still from it for the feed. Clips are not re-encoded, so the limits are what keep
 * uploads small: up to 30 seconds and 45 MB, which is about what a phone camera makes at normal quality.
 */
export async function prepareVideo(file: File): Promise<PreparedVideo> {
  const type = file.type || (KNOWN.test(file.name) ? 'video/mp4' : '')
  if (!type.startsWith('video/')) throw new Error('Choose a video from your camera roll.')
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`That video is ${mb(file.size)} and the limit is ${mb(MAX_VIDEO_BYTES)}, about ${MAX_VIDEO_SECONDS} seconds from a phone camera at normal quality. Trim it or record at a lower quality, then try again.`)
  const unreadable = 'This device can’t read that video. Try another clip, or record in the most compatible format.'
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', ''); v.src = url
  try {
    await once(v, 'loadedmetadata', 15000, unreadable)
    if (v.duration === Infinity) { // some recorders leave the length out; seeking to the end makes the browser work it out
      const known = once(v, 'durationchange', 5000, unreadable); v.currentTime = 1e101; await known.catch(() => undefined); v.currentTime = 0
    }
    const seconds = v.duration
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(unreadable)
    if (seconds > MAX_VIDEO_SECONDS + 0.5) throw new Error(`That clip is ${Math.round(seconds)} seconds. Clips can be up to ${MAX_VIDEO_SECONDS} seconds, so trim it in your Photos app and try again.`)
    const seeked = once(v, 'seeked', 10000, unreadable)
    v.currentTime = Math.min(0.5, seconds / 2)
    await seeked
    const w = v.videoWidth, h = v.videoHeight
    if (!w || !h) throw new Error(unreadable)
    const scale = Math.min(1, 1280 / Math.max(w, h))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale))
    const g = c.getContext('2d')
    if (!g) throw new Error('Not enough memory to prepare this video. Try a shorter clip.')
    g.drawImage(v, 0, 0, c.width, c.height)
    const poster = await withTimeout(new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error(unreadable))), 'image/jpeg', 0.82)), 15000, 'Preparing the video')
    c.width = c.height = 0
    return { file, type, poster, seconds: Math.max(1, Math.round(seconds)) }
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url)
  }
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
