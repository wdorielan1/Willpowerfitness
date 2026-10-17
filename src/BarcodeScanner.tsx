import { useEffect, useRef, useState } from 'react'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const
interface Detector { detect: (v: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o: { formats: readonly string[] }) => Detector

/** Camera barcode reader. Uses the browser's built-in BarcodeDetector where it exists (Android Chrome), otherwise a lazily loaded ZXing reader (iPhone Safari). Video never leaves the phone. */
export default function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let stopLib: (() => void) | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = (code: string) => { if (stopped) return; stopped = true; onCode(code) }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setError('This browser can’t open the camera here. Type the number under the barcode instead.'); return }
      try {
        const Det = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
        if (Det) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
          const v = video.current
          if (!v || stopped) return
          v.srcObject = stream
          await v.play()
          const det = new Det({ formats: FORMATS })
          const tick = async () => {
            if (stopped) return
            try { const hits = await det.detect(v); if (hits[0]?.rawValue) return done(hits[0].rawValue) } catch { /* frame not ready */ }
            timer = setTimeout(() => void tick(), 250)
          }
          void tick()
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
          const hints = new Map<number, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]])
          const reader = new BrowserMultiFormatReader(hints as never, { delayBetweenScanAttempts: 250 })
          if (!video.current || stopped) return
          const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video.current, (result) => { if (result) done(result.getText()) })
          stopLib = () => controls.stop()
          if (stopped) controls.stop()
        }
      } catch (e) {
        const name = e instanceof Error ? e.name : ''
        setError(name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the number under the barcode.' : name === 'NotFoundError' ? 'No camera found. Type the number under the barcode instead.' : 'Couldn’t start the camera. Type the number under the barcode instead.')
      }
    }
    void start()
    return () => { stopped = true; clearTimeout(timer); stopLib?.(); stream?.getTracks().forEach((t) => t.stop()) }
  }, [onCode])

  return (
    <div className="scan-box">
      {!error && <div className="scan-view"><video ref={video} playsInline muted /><span className="scan-line" /></div>}
      {error ? <p className="err" role="alert">{error}</p> : <p className="nutrition-help">Point the camera at the barcode and hold steady. Good light helps.</p>}
      <form className="scan-manual" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onCode(manual.trim()) }}>
        <input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type the barcode number" aria-label="Barcode number" />
        <button type="submit" className="primary" disabled={manual.replace(/\D/g, '').length < 8}>Look up</button>
      </form>
      <button type="button" className="ghost" onClick={onClose}>Cancel</button>
    </div>
  )
}
