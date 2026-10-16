import { useEffect, useState } from 'react'

type ImageAsset = { key: string; blob: Blob; url: string; image: HTMLImageElement }

/** The image is prepared before the tap, preserving mobile clipboard/share user activation. */
export function useImageAsset(key: string, build: () => Promise<Blob>) {
  const [asset, setAsset] = useState<ImageAsset | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true, url = ''
    setError('')
    setAsset(null)
    if (!key) return
    const timer = window.setTimeout(() => {
      build().then(async (blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        const image = new Image(); image.src = url
        await image.decode()
        if (alive) setAsset({ key, blob, url, image })
      }).catch(() => { if (alive) setError('Could not make the image. Change a style or try again.') })
    }, 80)
    return () => { alive = false; clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
    // Build is represented by the full content key, not the inline function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { asset: asset?.key === key ? asset : null, error }
}
