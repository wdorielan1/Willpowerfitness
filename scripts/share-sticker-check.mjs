/** Browser regression checks. Run with Vite serving this repository; no backend is used. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { homedir } from 'node:os'

const bundled = `${homedir()}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : await import('playwright').catch(() => import(pathToFileURL(bundled).href))
const output = process.env.SHARE_STICKER_OUTPUT || fileURLToPath(new URL('../../../outputs/share-sticker/', import.meta.url))
const base = process.env.SHARE_STICKER_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await context.newPage()
const errors = []
const external = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('request', (request) => { if (!request.url().startsWith(base) && !/^(blob:|data:)/.test(request.url())) external.push(request.url()) })
const report = { checks: [], screenshots: [], fixture: 'Invented regression workout history, processed by production summarize(). Photos are local repository exercise photography with light/dark exposure overlays.' }
const check = (label, condition) => { assert.ok(condition, label); report.checks.push(label) }
await mkdir(output, { recursive: true })
const screenshot = async (name, locator = page) => { await locator.screenshot({ path: `${output}/${name}.png` }); report.screenshots.push(`${name}.png`) }
const ready = async () => { await page.getByRole('button', { name: 'Share', exact: true }).waitFor(); await page.waitForFunction(() => !document.querySelector('.share-actions .primary')?.disabled) }
const prefs = () => page.evaluate(() => JSON.parse(localStorage.getItem(window.__shareTest.prefsKey) || '{}'))

try {
  await page.goto(`${base}/tests/share-sticker/`)
  await ready()
  check('Sheet fits 390px without horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 390 && [...document.querySelectorAll('.workout-share *')].every((e) => { const r = e.getBoundingClientRect(); return !r.width || (r.left >= -1 && r.right <= 391) })))
  await screenshot('sheet-390px')
  await screenshot('sticker-checkerboard', page.locator('.share-preview-wrap'))

  const raster = await page.evaluate(async () => {
    const { renderer, fixture, noPrFixture } = window.__shareTest
    const results = []
    for (const style of ['minimal', 'performance', 'full']) for (const color of ['white', 'dark']) {
      const blob = await renderer.buildWorkoutSticker(fixture, style, color)
      const bitmap = await createImageBitmap(blob)
      const cv = document.createElement('canvas'); cv.width = bitmap.width; cv.height = bitmap.height
      const g = cv.getContext('2d'); g.drawImage(bitmap, 0, 0)
      const p = g.getImageData(0, 0, cv.width, cv.height).data
      let transparent = 0, opaque = 0, matchingInk = 0
      const alpha = (x, y) => p[(y * cv.width + x) * 4 + 3]
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) transparent++
        if (p[i + 3] === 255) opaque++
        const target = color === 'white' ? [255, 255, 255] : [16, 17, 20]
        if (p[i + 3] === 255 && target.every((v, k) => p[i + k] === v)) matchingInk++
      }
      results.push({ style, color, mime: blob.type, width: cv.width, height: cv.height, transparent, opaque, matchingInk,
        edges: [Array.from({ length: cv.width }, (_, x) => alpha(x, 0)).some(Boolean), Array.from({ length: cv.width }, (_, x) => alpha(x, cv.height - 1)).some(Boolean), Array.from({ length: cv.height }, (_, y) => alpha(0, y)).some(Boolean), Array.from({ length: cv.height }, (_, y) => alpha(cv.width - 1, y)).some(Boolean)] })
      bitmap.close()
    }
    const drawn = []
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { drawn.push(String(text)); return original.call(this, text, ...args) }
    try {
      await renderer.buildWorkoutSticker(fixture, 'full', 'white')
      const allNames = fixture.prs.every((pr) => drawn.join(' ').includes(pr.name))
      drawn.length = 0
      await renderer.buildWorkoutSticker(noPrFixture, 'minimal', 'dark')
      const noPrText = [...drawn]
      drawn.length = 0
      const longName = 'Extraordinarily long custom exercise name with a slow controlled eccentric and a pause at full extension'
      await renderer.buildWorkoutSticker({ ...fixture, title: longName, prs: Array.from({ length: 40 }, (_, i) => ({ ...fixture.prs[i % fixture.prs.length], name: `${longName} ${i + 1}` })) }, 'full', 'white')
      const largeRecapAllRows = Array.from({ length: 40 }, (_, i) => `${longName} ${i + 1}`).every((name) => drawn.join(' ').includes(name))
      drawn.length = 0
      await renderer.buildWorkoutSticker({ ...fixture, minutes: undefined, volumeChangePct: -9, streak: 1 }, 'performance', 'dark')
      return { results, allNames, noPrText, largeRecapAllRows, negativeVolumeText: [...drawn], fixture }
    } finally { CanvasRenderingContext2D.prototype.fillText = original }
  })
  report.raster = raster.results
  for (const r of raster.results) {
    check(`${r.style}/${r.color}: PNG has real transparency and correct opaque text`, r.mime === 'image/png' && r.transparent > 0 && r.opaque > 0 && r.matchingInk > 0)
    check(`${r.style}/${r.color}: crop touches all four alpha bounds`, r.edges.every(Boolean))
  }
  check('Full recap draws every PR from the summarized session', raster.allNames)
  check('Long recap preserves all 40 wrapped exercise names', raster.largeRecapAllRows)
  check('No-PR minimal renders real title and workout-complete message without invented PR', raster.noPrText.includes('PUSH') && raster.noPrText.includes('WORKOUT COMPLETE') && !raster.noPrText.includes('NEW PR'))
  check('Performance retains negative volume progress and omits unknown duration/single-day streak', raster.negativeVolumeText.includes('−9% volume vs last session') && !raster.negativeVolumeText.includes('TIME') && !raster.negativeVolumeText.some((t) => t.includes('day streak')))

  const photos = await page.evaluate(async () => {
    const source = new Image(); source.src = '/ex/wide-grip-barbell-bench-press-0.jpg'; await source.decode()
    return Object.fromEntries(['light', 'dark'].map((tone) => {
      const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920
      const g = cv.getContext('2d'); const k = Math.max(cv.width / source.width, cv.height / source.height)
      g.drawImage(source, (cv.width - source.width * k) / 2, (cv.height - source.height * k) / 2, source.width * k, source.height * k)
      g.fillStyle = tone === 'light' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)'; g.fillRect(0, 0, cv.width, cv.height)
      return [tone, cv.toDataURL('image/jpeg', .9).split(',')[1]]
    }))
  })
  for (const tone of ['light', 'dark']) {
    await page.getByLabel('Choose your photo').setInputFiles({ name: `local-${tone}-photo.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(photos[tone], 'base64') })
    for (const [style, label] of [['minimal', 'Minimal'], ['performance', 'Performance'], ['full', 'Full recap']]) {
      await page.getByRole('button', { name: label, exact: true }).click()
      for (const color of ['white', 'dark']) {
        await page.getByRole('button', { name: color === 'white' ? 'White' : 'Dark', exact: true }).click()
        await ready()
        await screenshot(`${style}-${color}-on-${tone}`, page.locator('.share-preview-wrap'))
      }
    }
  }
  await page.getByRole('button', { name: 'Minimal', exact: true }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await ready()
  await screenshot('photo-story', page.locator('.share-preview-wrap'))
  const canvasStory = await page.locator('.share-photo-stage canvas').evaluate((c) => [c.width, c.height])
  check('Story composition is 1080 × 1920', canvasStory[0] === 1080 && canvasStory[1] === 1920)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await ready()
  await screenshot('photo-post', page.locator('.share-preview-wrap'))
  const canvasPost = await page.locator('.share-photo-stage canvas').evaluate((c) => [c.width, c.height])
  check('Post composition is 1080 × 1350', canvasPost[0] === 1080 && canvasPost[1] === 1350)

  await screenshot('drag-resize-before', page.locator('.share-preview-wrap'))
  const before = (await prefs()).shareStickerPlacement
  const handle = page.getByRole('button', { name: /^Move sticker/ })
  const h = await handle.boundingBox()
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down(); await page.mouse.move(h.x + h.width / 2 - 45, h.y + h.height / 2 - 85, { steps: 12 }); await page.mouse.up()
  await ready()
  const afterDrag = (await prefs()).shareStickerPlacement
  check('Pointer drag moves the sticker and persists its position', Math.abs(afterDrag.y - before.y) > .05)
  await page.getByLabel('Sticker size').press('Home')
  for (let i = 0; i < 35; i++) await page.getByLabel('Sticker size').press('ArrowRight')
  await ready()
  const afterSize = (await prefs()).shareStickerPlacement
  check('Size slider resizes sticker and persists scale', Math.abs(afterSize.scale - .55) < .001)
  await screenshot('drag-resize-after', page.locator('.share-preview-wrap'))

  const cdp = await context.newCDPSession(page)
  const ph = await handle.boundingBox()
  const cx = ph.x + ph.width / 2, cy = ph.y + ph.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 15, y: cy, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 15, y: cy, id: 1 }, { x: cx + 15, y: cy, id: 2 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 24, y: cy, id: 1 }, { x: cx + 24, y: cy, id: 2 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await ready()
  check('Two-finger touch gesture resizes the sticker', (await prefs()).shareStickerPlacement.scale > afterSize.scale + .03)
  await screenshot('pinch-resize-after', page.locator('.share-preview-wrap'))
  await handle.focus(); for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowLeft')
  for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowUp')
  const bounds = await page.evaluate(() => { const stage = document.querySelector('.share-photo-stage').getBoundingClientRect(); const sticker = document.querySelector('.share-sticker-handle').getBoundingClientRect(); return { stage: { x: stage.x, y: stage.y, right: stage.right, bottom: stage.bottom }, sticker: { x: sticker.x, y: sticker.y, right: sticker.right, bottom: sticker.bottom } } })
  check('Repeated moves keep the entire sticker inside the frame', bounds.sticker.x >= bounds.stage.x - 1 && bounds.sticker.y >= bounds.stage.y - 1 && bounds.sticker.right <= bounds.stage.right + 1 && bounds.sticker.bottom <= bounds.stage.bottom + 1)
  const saved = await prefs()
  await page.reload(); await ready()
  check('Style, text color, format, and placement survive remount', JSON.stringify(await prefs()) === JSON.stringify(saved))
  check('User photo does not persist in browser storage', !Object.values(await prefs()).some((value) => typeof value === 'string' && /^(data:|blob:)/.test(value)))

  await page.goto(`${base}/tests/share-sticker/?no-pr`); await ready()
  await screenshot('no-pr-sticker', page.locator('.share-preview-wrap'))
  await page.getByRole('button', { name: 'No photo? Use a card', exact: true }).click(); await ready()
  await screenshot('original-card-option', page.locator('.share-preview-wrap'))
  check('Original background card remains available', await page.getByAltText('Original Will Power background card').isVisible())
  await page.getByRole('button', { name: 'Back to stickers', exact: true }).click(); await ready()

  const helpers = await page.evaluate(async () => {
    const { photo, renderer, fixture } = window.__shareTest
    const geometry = []
    for (const format of ['story', 'post']) for (const size of [{ width: 800, height: 350 }, { width: 500, height: 4500 }, { width: 0, height: 0 }]) {
      for (const input of [{ x: -10, y: -10, scale: 5 }, { x: 10, y: 10, scale: .01 }, { x: NaN, y: Infinity, scale: NaN }]) {
        const p = photo.clampPlacement(input, size, format), r = photo.stickerRect(p, size, format), f = photo.getFrameSize(format)
        geometry.push(Object.values(p).every(Number.isFinite) && r.x >= -.00001 && r.y >= -.00001 && r.x + r.width <= f.width + .00001 && r.y + r.height <= f.height + .00001)
      }
    }
    const asBlob = (cv, type = 'image/jpeg') => new Promise((resolve) => cv.toBlob(resolve, type, .95))
    const huge = document.createElement('canvas'); huge.width = 5000; huge.height = 3000
    huge.getContext('2d').fillRect(0, 0, huge.width, huge.height)
    const large = await photo.loadSharePhoto(new File([await asBlob(huge)], 'large.jpg', { type: 'image/jpeg' }))
    const largeDimensions = [large.width, large.height]
    huge.width = huge.height = large.width = large.height = 1
    const source = document.createElement('canvas'); source.width = 80; source.height = 40
    const sg = source.getContext('2d')
    for (const [x, y, color] of [[0, 0, '#ff0000'], [40, 0, '#00ff00'], [0, 20, '#0000ff'], [40, 20, '#ffff00']]) { sg.fillStyle = color; sg.fillRect(x, y, 40, 20) }
    const originalBytes = new Uint8Array(await (await asBlob(source)).arrayBuffer())
    // EXIF TIFF orientation entry, added to a JPEG generated entirely inside the test browser.
    const exifResults = []
    const expected = { 1: [0, 1, 2, 3], 2: [1, 0, 3, 2], 3: [3, 2, 1, 0], 4: [2, 3, 0, 1], 5: [0, 2, 1, 3], 6: [2, 0, 3, 1], 7: [3, 1, 2, 0], 8: [1, 3, 0, 2] }
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]]
    for (let orientation = 1; orientation <= 8; orientation++) {
      const app1 = new Uint8Array([255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 18, 1, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0])
      const file = new File([originalBytes.slice(0, 2), app1, originalBytes.slice(2)], `orientation-${orientation}.jpg`, { type: 'image/jpeg' })
      const decoded = await photo.loadSharePhoto(file), g = decoded.getContext('2d')
      const corners = [[.25, .25], [.75, .25], [.25, .75], [.75, .75]].map(([x, y]) => {
        const rgb = g.getImageData(Math.floor(x * decoded.width), Math.floor(y * decoded.height), 1, 1).data
        return colors.map((c) => c.reduce((sum, v, i) => sum + (rgb[i] - v) ** 2, 0)).indexOf(Math.min(...colors.map((c) => c.reduce((sum, v, i) => sum + (rgb[i] - v) ** 2, 0))))
      })
      exifResults.push({ orientation, width: decoded.width, height: decoded.height, corners, expected: expected[orientation] })
      decoded.width = decoded.height = 1
    }
    const originalBitmap = window.createImageBitmap
    let fallbackDimensions
    try { window.createImageBitmap = undefined; const fallback = await photo.loadSharePhoto(new File([originalBytes], 'fallback.jpg', { type: 'image/jpeg' })); fallbackDimensions = [fallback.width, fallback.height] } finally { window.createImageBitmap = originalBitmap }
    let invalidRejected = false
    try { await photo.loadSharePhoto(new File(['not a photo'], 'invalid.txt', { type: 'text/plain' })) } catch { invalidRejected = true }
    const png = await renderer.buildWorkoutSticker(fixture)
    const jpeg = await asBlob(source)
    const descriptors = new Map(['clipboard', 'share', 'canShare'].map((name) => [name, Object.getOwnPropertyDescriptor(navigator, name)]))
    const originalItem = window.ClipboardItem, originalClick = HTMLAnchorElement.prototype.click
    const downloads = [], calls = []
    const set = (name, value) => Object.defineProperty(navigator, name, { configurable: true, value })
    const results = {}
    HTMLAnchorElement.prototype.click = function () { downloads.push(this.download) }
    class FakeClipboardItem { constructor(value) { this.value = value } }
    window.ClipboardItem = FakeClipboardItem
    try {
      set('clipboard', { write: (items) => { calls.push(items[0].value['image/png'] === png); return Promise.resolve() } })
      const pending = photo.copyWorkoutSticker(png, 'fixture')
      results.synchronousClipboard = calls.length === 1
      results.clipboard = await pending
      set('clipboard', { write: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) })
      set('canShare', () => true)
      set('share', async ({ files }) => { calls.push(files[0].type); return undefined })
      results.deniedClipboardUsesShare = await photo.copyWorkoutSticker(png, 'fixture')
      set('share', async () => { throw new DOMException('cancelled', 'AbortError') })
      const beforeCancel = downloads.length
      results.cancelled = await photo.copyWorkoutSticker(png, 'fixture')
      results.cancelDidNotDownload = downloads.length === beforeCancel
      set('share', async () => { throw new DOMException('denied', 'NotAllowedError') })
      results.deniedShareDownloads = await photo.copyWorkoutSticker(png, 'fixture')
      results.pngName = downloads.at(-1)
      set('clipboard', undefined); set('share', undefined); set('canShare', undefined)
      results.unsupported = await photo.copyWorkoutSticker(png, 'fixture')
      results.jpegDownload = await photo.shareWorkoutImage(jpeg, 'fixture')
      results.jpegName = downloads.at(-1)
      set('canShare', () => true)
      set('share', async ({ files }) => { results.jpegSharedName = files[0].name; results.jpegSharedType = files[0].type })
      results.jpegShare = await photo.shareWorkoutImage(jpeg, 'fixture')
    } finally {
      for (const [name, descriptor] of descriptors) { if (descriptor) Object.defineProperty(navigator, name, descriptor); else delete navigator[name] }
      window.ClipboardItem = originalItem; HTMLAnchorElement.prototype.click = originalClick
    }
    return { geometry, largeDimensions, exifResults, fallbackDimensions, invalidRejected, results }
  })
  check('Placement bounds hold across frames, very tall stickers, invalid sizes and invalid stored values', helpers.geometry.every(Boolean))
  check('Large local photo downscales to at most a 1920px edge', Math.max(...helpers.largeDimensions) === 1920)
  for (const r of helpers.exifResults) check(`EXIF orientation ${r.orientation} rotates/flips and sizes correctly`, JSON.stringify(r.corners) === JSON.stringify(r.expected) && (r.orientation < 5 ? r.width === 80 && r.height === 40 : r.width === 40 && r.height === 80))
  check('Image-element decode fallback and non-image rejection work', JSON.stringify(helpers.fallbackDimensions) === '[80,40]' && helpers.invalidRejected)
  const r = helpers.results
  check('Clipboard PNG write begins synchronously and reports copied', r.synchronousClipboard && r.clipboard === 'copied')
  check('Clipboard denial falls back to the transparent-PNG share sheet', r.deniedClipboardUsesShare === 'shared')
  check('Cancelling share does not download or report success', r.cancelled === 'cancelled' && r.cancelDidNotDownload)
  check('Share denial or unavailable APIs download a correctly named PNG', r.deniedShareDownloads === 'saved' && r.pngName.endsWith('.png') && r.unsupported === 'saved')
  check('Photo sharing/downloading uses JPEG MIME and filename', r.jpegDownload === 'saved' && r.jpegName.endsWith('.jpg') && r.jpegShare === 'shared' && r.jpegSharedName.endsWith('.jpg') && r.jpegSharedType === 'image/jpeg')
  report.helpers = helpers

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: () => Promise.resolve() } })
    window.ClipboardItem = class { constructor(value) { this.value = value } }
  })
  await page.getByRole('button', { name: 'Copy sticker', exact: true }).click()
  check('Successful copy shows Instagram paste instruction', await page.locator('.share-message').textContent() === 'Copied. In Instagram, open your story and paste.')
  await screenshot('copied-instruction')
  check('No JavaScript errors during browser scenarios', errors.length === 0)
  check('No photo or workout data uploaded; harness makes no external requests', external.length === 0)
  report.errors = errors; report.externalRequests = external
  await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Passed ${report.checks.length} checks. Saved ${report.screenshots.length} screenshots to ${output}`)
} catch (error) {
  await screenshot('failure').catch(() => {})
  await writeFile(`${output}/failure.json`, JSON.stringify({ message: error.message, errors, external, report }, null, 2))
  throw error
} finally { await browser.close() }
