/** Local browser checks with invented data; never post to a real crew or open native share. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright')
const base = process.env.SHARE_STICKER_BASE_URL || 'http://127.0.0.1:5173'
const output = process.env.WORKOUT_CARD_OUTPUT || 'work/workout-card-check'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, acceptDownloads: true })
const checks = [], errors = []
page.on('pageerror', (e) => errors.push(e.message))
const check = (label, ok) => { assert.ok(ok, label); checks.push(label) }
const ready = () => page.getByRole('button', { name: 'Share card', exact: true }).isEnabled()
const waitReady = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Share card')?.disabled)
try {
  await page.goto(`${base}/tests/workout-cards/`); await waitReady()
  check('Four styles visible without a toggle', await page.locator('.workout-card-option').count() === 4)
  check('Cards follow the sticker actions', await page.evaluate(() => document.querySelector('.workout-card-gallery').getBoundingClientRect().top > document.querySelector('.workout-share > .share-actions').getBoundingClientRect().bottom))
  check('390px sheet has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 390 && [...document.querySelectorAll('.workout-share *')].every((e) => { const b = e.getBoundingClientRect(); return !b.width || (b.left >= -1 && b.right <= 391) })))
  const screenshotStyle = await page.addStyleTag({ content: '.sheet-backdrop { position: absolute !important; display: block !important; } .sheet-panel { max-height: none !important; overflow: visible !important; }' })
  await page.locator('.workout-card-gallery').screenshot({ path: `${output}/gallery-mobile.png` })
  await screenshotStyle.evaluate((e) => e.remove())

  const renders = await page.evaluate(async () => {
    const { cards, fixture, previousBest } = window.__cards
    const results = [], draws = [], original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (value, ...args) { draws.push(String(value)); return original.call(this, value, ...args) }
    const photo = document.createElement('canvas'); photo.width = 600; photo.height = 1000
    const ctx = photo.getContext('2d'); ctx.fillStyle = '#47646d'; ctx.fillRect(0, 0, 600, 1000); ctx.fillStyle = '#f2b071'; ctx.fillRect(180, 200, 240, 560)
    try {
      for (const style of ['scorecard', 'photo', 'receipt', 'pr']) for (const format of ['post', 'story']) {
        draws.length = 0
        const blob = await cards.buildShareCard(fixture, format, { style, photo })
        const bitmap = await createImageBitmap(blob)
        const cv = document.createElement('canvas'); cv.width = bitmap.width; cv.height = bitmap.height
        const g = cv.getContext('2d'); g.drawImage(bitmap, 0, 0)
        const opaque = g.getImageData(10, 10, 1, 1).data[3] === 255
        bitmap.close()
        results.push({ style, format, width: cv.width, height: cv.height, opaque, text: [...draws], url: cv.toDataURL() })
      }
      const expectedSets = fixture.exerciseDetails.reduce((n, e) => n + e.sets, 0)
      const expectedVolume = fixture.exerciseDetails.reduce((n, e) => n + e.volume, 0)
      const historical = previousBest(fixture.prs[0])
      return { results, expectedSets, expectedVolume, actualSets: fixture.sets, actualVolume: fixture.volume, pct: fixture.volumeChangePct, prPct: fixture.prs[0].pct, historical, prE1: fixture.prs[0].e1 }
    } finally { CanvasRenderingContext2D.prototype.fillText = original }
  })
  check('Receipt exercise totals match the completed session', renders.expectedSets === renders.actualSets && renders.expectedVolume === renders.actualVolume)
  check('PR baseline matches the reported estimated strength increase', Math.abs((renders.prE1 / renders.historical - 1) * 100 - renders.prPct) <= .051)
  for (const r of renders.results) {
    check(`${r.style} ${r.format}: full-resolution opaque image`, r.width === 1080 && r.height === (r.format === 'story' ? 1920 : 1350) && r.opaque)
    check(`${r.style} ${r.format}: percentage preserved`, r.text.includes(`+${r.style === 'pr' ? renders.prPct : renders.pct}%`))
    check(`${r.style} ${r.format}: PR gain preserved`, r.text.some((text) => text.includes(`+${renders.prPct}%`)))
    await writeFile(`${output}/${r.style}-${r.format}.png`, Buffer.from(r.url.split(',')[1], 'base64'))
  }
  const edgeCases = await page.evaluate(async () => {
    const { cards, fixture, noPrFixture } = window.__cards
    const drawn = [], original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (v, ...args) { drawn.push(String(v)); return original.call(this, v, ...args) }
    try {
      await cards.buildShareCard({ ...fixture, title: 'A VERY LONG CUSTOM WORKOUT WITH SHOULDERS AND EXTRA ACCESSORIES', minutes: undefined, volumeChangePct: -12, exerciseDetails: Array.from({ length: 30 }, (_, i) => ({ name: `Very long exercise name number ${i}`, sets: 3, weight: 25, volume: 600 })) }, 'post', { style: 'receipt' })
      const negative = drawn.includes('−12%'), overflow = drawn.some((s) => s.includes('TOTALS INCLUDE ALL')), missingTime = drawn.some((s) => s.endsWith('/ —'))
      drawn.length = 0
      await cards.buildShareCard({ ...noPrFixture, volumeChangePct: 0 }, 'post')
      const zero = drawn.includes('0%')
      drawn.length = 0
      await cards.buildShareCard({ ...noPrFixture, volumeChangePct: null }, 'story')
      const noMadeUpPercent = !drawn.some((s) => s.includes('%'))
      let rejected = false
      try { await cards.buildShareCard(noPrFixture, 'post', { style: 'pr' }) } catch { rejected = true }
      return { negative, overflow, missingTime, zero, noMadeUpPercent, rejected }
    } finally { CanvasRenderingContext2D.prototype.fillText = original }
  })
  for (const [key, value] of Object.entries(edgeCases)) check(`Data edge case: ${key}`, value)
  const cardSizes = page.getByRole('group', { name: 'Card size', exact: true })
  await cardSizes.getByRole('button', { name: 'Post', exact: true }).click(); await waitReady()
  for (const name of ['Scorecard', 'Training Receipt', 'PR Poster']) {
    await page.getByRole('button', { name, exact: true }).click(); await waitReady()
    await page.getByRole('button', { name: 'Share card', exact: true }).click()
    check(`${name} shares a PNG file`, await page.evaluate(() => window.__cards.shareCalls.at(-1)?.files[0].type === 'image/png'))
  }
  await page.getByRole('button', { name: 'Photo Flex', exact: true }).click()
  check('Photo Flex waits for a real user photo', !(await ready()))
  await page.getByLabel('Photo Flex photo').setInputFiles({ name: 'local-test.png', mimeType: 'image/png', buffer: Buffer.from(renders.results[0].url.split(',')[1], 'base64') })
  await waitReady()
  const priorUrl = await page.locator('.workout-card-selected img').getAttribute('src')
  await page.getByLabel('Photo Flex photo').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(renders.results[2].url.split(',')[1], 'base64') })
  await page.waitForFunction((old) => { const img = document.querySelector('.workout-card-selected img'); return img && img.getAttribute('src') !== old }, priorUrl); await waitReady()
  check('Replacing a photo regenerates the export', await page.locator('.workout-card-selected img').getAttribute('src') !== priorUrl)
  await page.getByRole('button', { name: 'Share card', exact: true }).click()
  check('Photo Flex shares its composed PNG', await page.evaluate(() => window.__cards.shareCalls.length === 4))
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save card', exact: true }).click()
  check('Save card downloads a named PNG', (await downloadPromise).suggestedFilename().includes('willpower-photo-'))
  await page.getByRole('button', { name: 'Remove card photo', exact: true }).click()
  check('Removing the photo disables the stale export', !(await ready()))
  await page.goto(`${base}/tests/workout-cards/?no-pr`); await waitReady()
  await page.getByRole('button', { name: 'PR Poster', exact: true }).click()
  check('No PR gives an honest empty state and prevents sharing', await page.locator('.workout-card-empty').isVisible() && !(await ready()))
  await page.goto(`${base}/tests/workout-cards/?crew`); await waitReady()
  await page.getByRole('button', { name: 'Training Receipt', exact: true }).click(); await waitReady()
  await page.getByRole('button', { name: 'Post to crew', exact: true }).click()
  check('Crew posting receives the chosen card image', await page.evaluate(() => window.__cards.posts.length === 1 && window.__cards.posts[0].type === 'image/png'))
  await page.goto(`${base}/tests/workout-cards/?crew&fail`); await waitReady()
  await page.getByRole('button', { name: 'Post to crew', exact: true }).click()
  check('Crew errors appear beside the card actions', await page.locator('.workout-card-gallery [role="status"]').innerText() === 'Test crew could not receive this card.')
  await page.setViewportSize({ width: 320, height: 740 })
  check('320px sheet has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 320 && document.querySelector('.workout-card-gallery').getBoundingClientRect().right <= 320))
  check('No browser errors', errors.length === 0)
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors }, null, 2))
  console.log(`Passed ${checks.length} workout card checks. Screenshots: ${output}`)
} finally { await browser.close() }
