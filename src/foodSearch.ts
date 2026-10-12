import type { FoodItem } from './types'

// Online food lookup. Open Food Facts (packaged foods, no key) and USDA FoodData Central (whole foods, free key).
// Both are optional: if one fails or has no key, the other still answers.
const USDA_KEY = (import.meta.env.VITE_USDA_API_KEY as string | undefined) ?? ''

const num = (v: unknown) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '')); return Number.isFinite(n) && n >= 0 ? n : null }
const r1 = (n: number) => Math.round(n * 10) / 10

async function getJson(url: string, ms = 9000): Promise<unknown> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(t) }
}

interface OffProduct { code?: string; product_name?: string; brands?: string; serving_size?: string; serving_quantity?: number | string; nutriments?: Record<string, unknown> }

async function searchOff(q: string): Promise<FoodItem[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,serving_size,serving_quantity,nutriments`
  const j = (await getJson(url)) as { products?: OffProduct[] }
  const out: FoodItem[] = []
  for (const p of j.products ?? []) {
    const name = (p.product_name ?? '').trim()
    const n = p.nutriments ?? {}
    if (!name || !p.code) continue
    const perServing = num(n['energy-kcal_serving']) !== null && num(p.serving_quantity) !== null
    const sfx = perServing ? '_serving' : '_100g'
    const cal = num(n[`energy-kcal${sfx}`])
    if (cal === null) continue
    const brand = (p.brands ?? '').split(',')[0].trim()
    out.push({
      id: `off-${p.code}`, name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
      serving: perServing ? (p.serving_size?.trim() || `${p.serving_quantity} g`) : '100 g',
      cal: Math.round(cal), p: r1(num(n[`proteins${sfx}`]) ?? 0), c: r1(num(n[`carbohydrates${sfx}`]) ?? 0), f: r1(num(n[`fat${sfx}`]) ?? 0), cat: 'Online',
    })
  }
  return out
}

interface UsdaFood { fdcId: number; description?: string; foodNutrients?: { nutrientNumber?: string; value?: number }[] }

async function searchUsda(q: string): Promise<FoodItem[]> {
  if (!USDA_KEY) return []
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${encodeURIComponent(q)}&pageSize=15&dataType=Foundation,SR%20Legacy`
  const j = (await getJson(url)) as { foods?: UsdaFood[] }
  const out: FoodItem[] = []
  for (const f of j.foods ?? []) {
    const get = (no: string) => num(f.foodNutrients?.find((x) => x.nutrientNumber === no)?.value)
    const cal = get('208')
    if (!f.description || cal === null) continue
    const title = f.description.toLowerCase().replace(/(^|[\s,])\w/g, (m) => m.toUpperCase())
    out.push({ id: `usda-${f.fdcId}`, name: title, serving: '100 g', cal: Math.round(cal), p: r1(get('203') ?? 0), c: r1(get('205') ?? 0), f: r1(get('204') ?? 0), cat: 'Online' })
  }
  return out
}

/** Whole-food matches first (USDA), then packaged products. Resolves with whatever worked. */
export async function searchFoodsOnline(q: string): Promise<{ items: FoodItem[]; failed: boolean }> {
  const query = q.trim()
  if (query.length < 2) return { items: [], failed: false }
  const [usda, off] = await Promise.allSettled([searchUsda(query), searchOff(query)])
  const items = [...(usda.status === 'fulfilled' ? usda.value : []), ...(off.status === 'fulfilled' ? off.value : [])]
  return { items, failed: usda.status === 'rejected' && off.status === 'rejected' }
}
