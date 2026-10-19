// GET /feed.xml: product feed for Google Merchant Center, Pinterest and Meta catalogs.
import { seedProducts } from '../../src/data/seed'
import type { Product } from '../../src/types'
import { buildFeed } from '../lib/feed'
import { env, hasDatabase, siteOrigin } from '../lib/server'

async function loadAll(): Promise<{ products: Product[]; brand: string }> {
  if (!hasDatabase()) return { products: seedProducts, brand: '96.co' }
  const base = env('SUPABASE_URL').replace(/\/$/, '')
  const headers = { apikey: env('SUPABASE_ANON_KEY') }
  const [pr, st] = await Promise.all([
    fetch(`${base}/rest/v1/products?select=*,product_images(url,sort_order)&is_published=eq.true&product_images.order=sort_order.asc&order=sort_order.asc`, { headers }),
    fetch(`${base}/rest/v1/site_settings?select=brand_name&id=eq.1`, { headers }),
  ])
  if (!pr.ok) throw new Error(`products ${pr.status}`)
  const settings = st.ok ? ((await st.json()) as Array<{ brand_name: string }>) : []
  return { products: (await pr.json()) as Product[], brand: settings[0]?.brand_name || '96.co' }
}

export default async (req: Request): Promise<Response> => {
  try {
    const { products, brand } = await loadAll()
    const xml = buildFeed({ products, origin: siteOrigin(req), brand, title: brand })
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
    })
  } catch (e) {
    console.error('feed failed:', e)
    return new Response('Feed temporarily unavailable', { status: 503 })
  }
}

export const config = { path: '/feed.xml' }
