import { useEffect, useState } from 'react'
import { supabase } from './cloud'
import type { Photo, VideoMeta } from './types'

const BUCKET = 'progress-photos'
export const CREW_BUCKET = 'crew-photos'
const DB = 'wpf-photos'

// ---------- on-device storage (fallback when the cloud bucket isn't available) ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('p')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await withTimeout(openDB(), 15000, 'Opening photo storage')
  try {
    return await withTimeout(new Promise<T>((res, rej) => {
      const tx = db.transaction('p', mode)
      const req = fn(tx.objectStore('p'))
      tx.oncomplete = () => res(req.result)
      tx.onerror = tx.onabort = () => rej(tx.error || new Error('Could not save photo on this device.'))
    }), 15000, 'Device photo storage')
  } finally { db.close() }
}

/** Shrink a photo to ~1280px JPEG so uploads stay small and fast. */
export function withTimeout<T>(p: PromiseLike<T>, ms: number, what: string): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${what} timed out. Check your connection and try again.`)), ms)
    p.then((v) => { clearTimeout(t); res(v) }, (e) => { clearTimeout(t); rej(e) })
  })
}

export async function withRequestTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>, ms: number, what: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try { return await withTimeout(run(controller.signal), ms, what) }
  finally { clearTimeout(timer); controller.abort() }
}

// HTMLImageElement avoids Safari's createImageBitmap HEIC decode hangs.
const loadImg = (src: Blob) => new Promise<HTMLImageElement>((res, rej) => {
  const url = URL.createObjectURL(src); const img = new Image()
  const finish = (error?: Error) => {
    clearTimeout(timer); URL.revokeObjectURL(url); img.onload = img.onerror = null
    if (error) { img.src = ''; rej(error) } else res(img)
  }
  const timer = setTimeout(() => finish(new Error('Reading the photo timed out. Try a smaller JPEG photo.')), 15000)
  img.onload = () => finish()
  img.onerror = () => finish(new Error('Could not read that photo. Try exporting it as JPEG.'))
  img.src = url
})

export async function compress(src: Blob, max = 1280): Promise<Blob> {
  const img = await loadImg(src)
  const w = img.naturalWidth, h = img.naturalHeight
  if (!w || !h) throw new Error('That photo has invalid dimensions.')
  const scale = Math.min(1, Math.min(max, 1280) / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale))
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Not enough memory to process this photo. Try a smaller photo.')
  try {
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return await withTimeout(new Promise<Blob>((res, rej) => c.toBlob((b) => b ? res(b) : rej(new Error('Could not shrink that photo. Try a JPEG.')), 'image/jpeg', 0.82)), 15000, 'Preparing the photo')
  } finally { c.width = c.height = 0 }
}

/** Square-crop a picked photo to a small JPEG data URL (about 10 KB) for use as a profile picture. */
export async function avatarFromFile(src: Blob, size = 192): Promise<string> {
  const img = await loadImg(src)
  const w = img.naturalWidth, h = img.naturalHeight
  if (!w || !h) throw new Error('That photo has invalid dimensions.')
  const side = Math.min(w, h)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Not enough memory to process this photo. Try a smaller photo.')
  try {
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
    return c.toDataURL('image/jpeg', 0.82)
  } finally { c.width = c.height = 0 }
}

export function postPhotos(p: { id: string; imagePaths?: string[]; imageIds?: string[]; imagePath?: string; imageId?: string }) {
  const paths = p.imagePaths?.length ? p.imagePaths : p.imagePath ? [p.imagePath] : []
  if (paths.length) return paths.map((path) => ({ id: path, path }))
  return (p.imageIds?.length ? p.imageIds : p.imageId ? [p.imageId] : []).map((id) => ({ id }))
}

/** The clip on a crew post, if it has one. */
export function postVideo(meta?: Record<string, unknown>): VideoMeta | null {
  const v = meta?.video as VideoMeta | undefined
  return v && typeof v === 'object' && (v.path || v.id || v.expired) ? v : null
}

export interface SaveResult { path?: string; where: 'cloud' | 'device'; error?: string }

export async function savePhotoBlob(id: string, blob: Blob, userId: string | null, bucket = BUCKET, folder = userId ?? ''): Promise<SaveResult> {
  if (supabase && userId) {
    const path = `${folder}/${id}.jpg`
    let error: { message: string } | null = null
    try { error = (await withTimeout(supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: bucket !== CREW_BUCKET }), 30000, 'Photo upload')).error } catch (e) { error = { message: (e as Error).message } }
    if (!error) return { path, where: 'cloud' }
    if (bucket === CREW_BUCKET) throw new Error(error.message)
    console.warn('photo upload failed, keeping on device:', error.message)
    await idb('readwrite', (s) => s.put(blob, id))
    return { where: 'device', error: error.message }
  }
  await idb('readwrite', (s) => s.put(blob, id))
  return { where: 'device' }
}

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Storage's refusal, in words a person can act on (the server's own message stays in brackets for whoever sets this up). */
function uploadProblem(status: number, body: string): string {
  let message = ''
  try { const j = JSON.parse(body) as { message?: string; error?: string }; message = j.message ?? j.error ?? '' } catch { message = body.slice(0, 160) }
  const m = message.toLowerCase()
  const detail = message ? ` (${message})` : ` (error ${status})`
  if (status === 413 || m.includes('maximum allowed size') || m.includes('too large')) return `That video is bigger than this app's storage allows. Try a shorter clip or a lower camera quality.${detail}`
  if (m.includes('mime') || m.includes('not supported') || status === 415) return `Videos aren't switched on in this app's storage yet.${detail}`
  if (status === 401 || status === 403 || m.includes('row-level security') || m.includes('jwt')) return `Storage refused the upload. Log out and back in, make sure you are in this crew, and try again.${detail}`
  return `The video didn't upload.${detail}`
}

/** One upload with a live percentage (the Supabase client can't report progress, so this speaks to the same storage address directly). */
function uploadWithProgress(path: string, file: Blob, token: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SB_URL}/storage/v1/object/${CREW_BUCKET}/${encodeURI(path)}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', SB_KEY ?? '')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.timeout = 10 * 60 * 1000
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))) }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? res() : rej(new Error(uploadProblem(xhr.status, xhr.responseText))))
    xhr.onerror = () => rej(new Error('The upload was interrupted. Check your connection and try again.'))
    xhr.ontimeout = () => rej(new Error('The upload took too long. Try again on Wi-Fi, or with a shorter clip.'))
    const body = new FormData(); body.append('cacheControl', '3600'); body.append('', file)
    xhr.send(body)
  })
}

/** Save a crew clip next to the crew's photos (same private bucket and rules). Throws, with a readable reason, when the upload fails. */
export async function saveVideoBlob(id: string, file: Blob, type: string, userId: string | null, folder: string, onProgress?: (pct: number) => void): Promise<SaveResult> {
  if (supabase && userId) {
    const ext = type.includes('quicktime') ? 'mov' : type.includes('webm') ? 'webm' : 'mp4'
    const path = `${folder}/${id}.${ext}`
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new Error('You\u2019re signed out. Log in again to post a video.')
    await uploadWithProgress(path, file, data.session.access_token, onProgress)
    return { path, where: 'cloud' }
  }
  await idb('readwrite', (s) => s.put(file, id))
  return { where: 'device' }
}

/** A playable address for a crew clip: a signed link for cloud posts, an on-device copy otherwise. Revoke blob: addresses when done. */
export async function videoUrl(v: VideoMeta): Promise<string | null> {
  if (v.path && supabase) {
    const { data } = await supabase.storage.from(CREW_BUCKET).createSignedUrl(v.path, 3600)
    return data?.signedUrl ?? null
  }
  if (!v.id) return null
  const b = await idb<Blob | undefined>('readonly', (s) => s.get(v.id!))
  return b ? URL.createObjectURL(b) : null
}

export async function deletePhotoBlob(p: { id: string; path?: string }, bucket = BUCKET) {
  if (p.path && supabase) {
    const { error } = await withTimeout(supabase.storage.from(bucket).remove([p.path]), 30000, 'Deleting photo')
    if (error) throw new Error(error.message)
  }
  try { await idb('readwrite', (s) => s.delete(p.id)) } catch { /* nothing stored locally */ }
}

/** Resolve displayable URLs for a list of photos. */
export function usePhotoUrls(photos: { id: string; path?: string }[], bucket = BUCKET) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = photos.map((p) => p.id + (p.path ?? '')).join('|')
  useEffect(() => {
    let alive = true
    const made: string[] = []
    ;(async () => {
      const out: Record<string, string> = {}
      const cloud = photos.filter((p) => p.path)
      if (cloud.length && supabase) {
        const { data } = await supabase.storage.from(bucket).createSignedUrls(cloud.map((p) => p.path!), 3600)
        data?.forEach((d, i) => { if (d.signedUrl) out[cloud[i].id] = d.signedUrl })
      }
      for (const p of photos.filter((x) => !x.path)) {
        try {
          const b = await idb<Blob | undefined>('readonly', (s) => s.get(p.id))
          if (b) { const u = URL.createObjectURL(b); made.push(u); out[p.id] = u }
        } catch { /* ignore */ }
      }
      if (alive) setUrls(out)
    })()
    return () => { alive = false; made.forEach(URL.revokeObjectURL) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
