/** Local-only profile checks. No real accounts, posts, or external sharing. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright')
const base = process.env.PROFILE_BASE_URL || 'http://127.0.0.1:5173'
const output = process.env.PROFILE_OUTPUT || 'work/profile-check'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const checks = [], errors = []
page.on('pageerror', (e) => errors.push(e.message))
const check = (label, ok) => { assert.ok(ok, label); checks.push(label) }
const load = async (query = '') => { await page.goto(`${base}/tests/profile/${query}`); await page.getByRole('tab', { name: 'Posts', exact: true }).waitFor() }
const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.pv *')].every((el) => { const r = el.getBoundingClientRect(); return !r.width || r.left >= -1 && r.right <= innerWidth + 1 }))
try {
  await load()
  await page.locator('.pv-tile img').first().waitFor()
  check('Three-column mobile grid with real local images', await page.locator('.pv-tile').count() === 9 && await page.locator('.pv-tile img').count() === 3 && await page.locator('.pv-post-grid').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length) === 3)
  check('No likes or comments in the profile', await page.getByRole('button', { name: /like|comment/i }).count() === 0 && !/likes|comments/i.test(await page.locator('.pv').innerText()))
  check('Recorded totals render in the header', /280\s*Workouts\s*142h\s*Total time\s*89.4k\s*Volume \(LB\)\s*12\s*Day streak/.test(await page.locator('.pv-stats').innerText()))
  await page.getByRole('button', { name: 'Change profile photo' }).click()
  await page.getByRole('button', { name: 'Share profile', exact: true }).click()
  check('Avatar and sharing controls remain connected', await page.evaluate(() => window.__profile.edits === 1 && window.__profile.shares === 1))
  await page.getByRole('button', { name: 'Open Push Day, Oct 15' }).click()
  await page.getByRole('dialog').waitFor()
  check('A post opens its full image, caption, and workout', await page.getByRole('dialog').getByText('Stronger every day.').isVisible() && await page.getByRole('dialog').getByText('225 lb × 5').isVisible())
  await page.keyboard.press('Escape')
  check('Escape closes the post and restores focus', await page.getByRole('dialog').count() === 0 && await page.getByRole('button', { name: 'Open Push Day, Oct 15' }).evaluate((el) => el === document.activeElement))
  await page.getByRole('button', { name: /Open Photo,/ }).click()
  check('Missing photos have a fallback', await page.getByRole('dialog').getByText('Photo unavailable').isVisible())
  await page.getByRole('button', { name: 'Close post' }).click()
  await page.getByRole('button', { name: /Open Crew clip,/ }).click()
  check('Expired video has an honest empty state', await page.getByRole('dialog').getByText('This video has expired.').isVisible())
  await page.getByRole('button', { name: 'Close post' }).click()

  await page.locator('.pv-streak').click()
  check('Streak banner opens Stats', await page.getByRole('tab', { name: 'Stats', exact: true }).getAttribute('aria-selected') === 'true' && await page.getByRole('img', { name: /last 12 weeks/ }).isVisible())
  await page.getByRole('tab', { name: 'Stats', exact: true }).press('ArrowRight')
  check('Keyboard navigation opens Achievements', await page.getByRole('tab', { name: 'Achievements' }).getAttribute('aria-selected') === 'true' && await page.locator('.pv-badge.is-earned').count() === 4)
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  check('About preserves crews and profile settings', await page.getByText('Early Crew', { exact: true }).isVisible() && await page.getByRole('link', { name: 'Profile settings' }).isVisible())
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const tab of ['Posts', 'Stats', 'Achievements', 'About']) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      check(`${width}px ${tab}: no horizontal overflow`, await fits())
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Posts', exact: true }).click()
  await page.screenshot({ path: `${output}/posts-mobile.png`, fullPage: true })
  await page.getByRole('tab', { name: 'Achievements' }).click()
  await page.screenshot({ path: `${output}/achievements-mobile.png`, fullPage: true })

  const stats = await page.evaluate(() => {
    const { computeStats, data } = window.__profile
    const d = structuredClone(data)
    d.settings.shareLifts = false
    d.logs.push({ ...d.logs[0], date: '2026-10-13', skipped: true }, { ...d.logs[0], date: '2026-10-12', imported: true }, { ...d.logs[0], date: '2026-10-11', baseline: true }, { ...d.logs[0], date: '2026-12-01' })
    d.checkins['2026-10-15'] = { done: true }
    d.checkins['2026-12-01'] = { done: true }
    const published = computeStats(d, '2026-10-17')
    const owner = computeStats(d, '2026-10-17', { includePrivate: true })
    const old = computeStats({ ...d, logs: [], checkins: { '2026-10-15': { done: true } } }, '2026-10-17', { includePrivate: true })
    return { published, owner, old }
  })
  check('Completed workouts exclude skipped, imported, baseline, future and duplicate check-ins', stats.owner.workoutsTotal === 2)
  check('Training time uses completed session minutes', stats.owner.minutesTotal === 100)
  check('Volume uses completed sets', stats.owner.volumeTotal === 2000)
  check('Private lift weights never enter published totals', !Object.hasOwn(stats.published, 'volumeTotal'))
  check('Older check-ins do not invent time or volume', stats.old.minutesTotal === undefined && stats.old.volumeTotal === undefined)

  await load('?empty')
  check('Empty posts display a useful state', await page.getByText('Nothing shared yet').isVisible())
  await load('?loading')
  check('Loading has a visible grid skeleton', await page.locator('[aria-busy="true"]').count() === 1)
  await load('?error')
  await page.getByRole('button', { name: 'Try again' }).click()
  check('Post loading errors can be retried', await page.locator('.pv-tile').count() === 9)
  await load('?legacy')
  check('Older profiles show unavailable metrics as dashes', (await page.locator('.pv-stats').innerText()).match(/—/g).length === 3)
  await load('?long')
  check('Long names fit mobile', await fits())
  await load('?public')
  check('Public layout works without a router or editing controls', await page.getByRole('link', { name: 'Join Alex on Will Power' }).isVisible() && await page.getByRole('button', { name: 'Change profile photo' }).count() === 0)
  await page.getByRole('tab', { name: 'Achievements' }).click()
  check('Other profiles show earned achievements only', await page.locator('.pv-badge').count() === 4)
  await load('?owner')
  await page.locator('.pv-tile').first().waitFor()
  check('Actual owner profile includes saved posts and edit link', await page.locator('.pv-tile').count() === 9 && await page.getByRole('link', { name: 'Edit profile', exact: true }).getAttribute('href') === '/settings')
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  check('Owner About retains details, friends, plans, privacy, and logout', await page.getByText('Your details', { exact: true }).isVisible() && await page.getByRole('link', { name: 'Open Friends' }).isVisible() && await page.getByText('Free beta', { exact: true }).isVisible() && await page.getByRole('link', { name: 'Privacy Policy' }).isVisible() && await page.getByRole('button', { name: 'Log out' }).isVisible())
  check('No uncaught browser errors', errors.length === 0)
  await writeFile(`${output}/checks.json`, JSON.stringify({ checks, errors }, null, 2))
  console.log(`${checks.length} profile checks passed. Screenshots: ${output}`)
} finally { await browser.close() }
