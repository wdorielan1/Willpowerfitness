import { shareCard } from './shareCard'
import type { CardFormat } from './shareCard'
import type { StickerPlacement } from './types'

const MAX_PHOTO_EDGE = 1920
const DEFAULT_PLACEMENT: StickerPlacement = { x: 0.5, y: 0.72, scale: 0.72 }
type Size = { width: number; height: number }

export function getFrameSize(format: CardFormat): Size {
  return { width: 1080, height: format === 'story' ? 1920 : 1350 }
}

function boundedSize(width: number, height: number): Size {
  const ratio = Math.min(1, MAX_PHOTO_EDGE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

/** Read common photo headers so phone JPEGs can be resized during bitmap decoding. */
async function photoSize(file: File): Promise<Size | null> {
  const data = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
  if (data.byteLength < 24) return null
  if (data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a) {
    return { width: data.getUint32(16), height: data.getUint32(20) }
  }
  if (data.getUint16(0) !== 0xffd8) return null
  let width = 0, height = 0, orientation = 1, offset = 2
  while (offset + 4 <= data.byteLength) {
    if (data.getUint8(offset++) !== 0xff) break
    while (offset < data.byteLength && data.getUint8(offset) === 0xff) offset++
    if (offset + 3 > data.byteLength) break
    const marker = data.getUint8(offset++)
    if (marker === 0xda || marker === 0xd9) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    const length = data.getUint16(offset)
    if (length < 2 || offset + length > data.byteLength) break
    const start = offset + 2, end = offset + length
    if (marker === 0xe1 && start + 14 <= end && data.getUint32(start) === 0x45786966 && data.getUint16(start + 4) === 0) {
      const tiff = start + 6
      const byteOrder = data.getUint16(tiff)
      if (byteOrder === 0x4949 || byteOrder === 0x4d4d) {
        const little = byteOrder === 0x4949
        const directory = tiff + data.getUint32(tiff + 4, little)
        if (data.getUint16(tiff + 2, little) === 42 && directory >= tiff + 8 && directory + 2 <= end) {
          const entries = data.getUint16(directory, little)
          for (let i = 0; i < entries; i++) {
            const entry = directory + 2 + i * 12
            if (entry + 12 > end) break
            if (data.getUint16(entry, little) === 0x112 && data.getUint16(entry + 2, little) === 3 && data.getUint32(entry + 4, little) === 1) {
              orientation = data.getUint16(entry + 8, little)
              break
            }
          }
        }
      }
    }
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && start + 5 <= end) {
      height = data.getUint16(start + 1)
      width = data.getUint16(start + 3)
    }
    offset = end
  }
  if (!width || !height) return null
  return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height }
}

function rasterize(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  if (!width || !height) throw new Error('This photo has no image data. Choose another photo.')
  const size = boundedSize(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not open the photo on this device.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** A local, orientation-correct raster. Never upload or persist the selected file. */
export async function loadSharePhoto(file: File): Promise<HTMLCanvasElement> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('Choose an image from your camera or photo library.')
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | undefined
    try {
      const dimensions = await photoSize(file)
      const size = dimensions && dimensions.width > 0 && dimensions.height > 0 ? boundedSize(dimensions.width, dimensions.height) : null
      bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        ...(size ? { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high' as const } : {}),
      })
      return rasterize(bitmap, bitmap.width, bitmap.height)
    } catch {
      // Older Safari / HEIC may only support decoding through an image element.
    } finally {
      bitmap?.close()
    }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not open this photo. Try a JPEG, PNG, or another image.'))
      image.src = url
    })
    // Modern image elements apply EXIF orientation; do not rotate a second time.
    return rasterize(image, image.naturalWidth, image.naturalHeight)
  } finally {
    image.onload = null
    image.onerror = null
    image.src = ''
    URL.revokeObjectURL(url)
  }
}

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback

/** Positions use normalized centers; scale is sticker width as a fraction of frame width. */
export function clampPlacement(placement: StickerPlacement, sticker: Size, format: CardFormat): StickerPlacement {
  const frame = getFrameSize(format)
  const aspect = sticker.width > 0 && sticker.height > 0 ? sticker.height / sticker.width : 1
  const maxScale = Math.min(0.95, frame.height / (frame.width * aspect))
  const scale = Math.max(Math.min(0.2, maxScale), Math.min(maxScale, finite(placement.scale, DEFAULT_PLACEMENT.scale)))
  const halfWidth = scale / 2
  const halfHeight = frame.width * scale * aspect / frame.height / 2
  return {
    x: Math.max(halfWidth, Math.min(1 - halfWidth, finite(placement.x, DEFAULT_PLACEMENT.x))),
    y: Math.max(halfHeight, Math.min(1 - halfHeight, finite(placement.y, DEFAULT_PLACEMENT.y))),
    scale,
  }
}

export function stickerRect(placement: StickerPlacement, sticker: Size, format: CardFormat): { x: number; y: number; width: number; height: number } {
  const frame = getFrameSize(format)
  const clamped = clampPlacement(placement, sticker, format)
  const width = frame.width * clamped.scale
  const height = width * (sticker.width > 0 && sticker.height > 0 ? sticker.height / sticker.width : 1)
  return { x: frame.width * clamped.x - width / 2, y: frame.height * clamped.y - height / 2, width, height }
}

export function drawPhotoComposition(canvas: HTMLCanvasElement, photo: HTMLCanvasElement, sticker: HTMLImageElement, placement: StickerPlacement, format: CardFormat): void {
  const frame = getFrameSize(format)
  if (canvas.width !== frame.width) canvas.width = frame.width
  if (canvas.height !== frame.height) canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context || !photo.width || !photo.height) throw new Error('Could not prepare the photo.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.fillStyle = '#101114'
  context.fillRect(0, 0, frame.width, frame.height)
  const cover = Math.max(frame.width / photo.width, frame.height / photo.height)
  const width = photo.width * cover, height = photo.height * cover
  context.drawImage(photo, (frame.width - width) / 2, (frame.height - height) / 2, width, height)
  const rect = stickerRect(placement, { width: sticker.naturalWidth || sticker.width, height: sticker.naturalHeight || sticker.height }, format)
  context.drawImage(sticker, rect.x, rect.y, rect.width, rect.height)
}

/** Average brightness (0 dark to 1 bright) of the photo under a frame rectangle, after cover-fit. */
export function photoBrightness(photo: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }, format: CardFormat): number {
  const frame = getFrameSize(format), k = 0.1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(frame.width * k); canvas.height = Math.round(frame.height * k)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !photo.width || !photo.height) return 0
  const cover = Math.max(frame.width / photo.width, frame.height / photo.height)
  const width = photo.width * cover, height = photo.height * cover
  context.drawImage(photo, (frame.width - width) / 2 * k, (frame.height - height) / 2 * k, width * k, height * k)
  const x = Math.max(0, Math.floor(rect.x * k)), y = Math.max(0, Math.floor(rect.y * k))
  const w = Math.max(1, Math.min(canvas.width - x, Math.ceil(rect.width * k))), h = Math.max(1, Math.min(canvas.height - y, Math.ceil(rect.height * k)))
  const data = context.getImageData(x, y, w, h).data
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
  canvas.width = canvas.height = 1
  return sum / (data.length / 4)
}

/** JPEG removes source photo metadata, including any location metadata. */
export function composeSharePhoto(photo: HTMLCanvasElement, sticker: HTMLImageElement, placement: StickerPlacement, format: CardFormat): Promise<Blob> {
  const canvas = document.createElement('canvas')
  drawPhotoComposition(canvas, photo, sticker, placement, format)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = canvas.height = 1
      if (blob) resolve(blob)
      else reject(new Error('Could not make the photo. Please try again.'))
    }, 'image/jpeg', 0.92)
  })
}

function downloadImage(blob: Blob): 'saved' {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = blob.type === 'image/jpeg' ? 'will-power-workout.jpg' : 'will-power-workout.png'
  try {
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
  return 'saved'
}

const isCancelled = (error: unknown) => error instanceof Error && error.name === 'AbortError'

/** Preserve the existing card share path; composed photos need a JPEG filename/MIME. */
export async function shareWorkoutImage(blob: Blob, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  if (blob.type !== 'image/jpeg') {
    try { return await shareCard(blob, text) }
    catch (error) { if (isCancelled(error)) return 'cancelled' }
    return downloadImage(blob)
  }
  try {
    const file = new File([blob], 'will-power-workout.jpg', { type: 'image/jpeg' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text })
      return 'shared'
    }
  } catch (error) {
    if (isCancelled(error)) return 'cancelled'
  }
  return downloadImage(blob)
}

export async function copyWorkoutSticker(blob: Blob, text: string): Promise<'copied' | 'shared' | 'saved' | 'cancelled'> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      // Start the write before any await so Safari sees the button's user gesture.
      const write = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      await write
      return 'copied'
    }
  } catch {
    // Permission denied, unsupported PNG clipboard, or an unavailable clipboard.
  }
  return shareWorkoutImage(blob, text)
}
