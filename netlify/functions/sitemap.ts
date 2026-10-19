// GET /sitemap.xml: list of shop pages for search engines.
import { seedOutfits, seedProducts, seedTabs } from '../../src/data/seed'
import { buildSitemap } from '../lib/feed'
import { env, hasDatabase, siteOrigin } from '../lib/server'

type Slugged = { slug: string }

async function slugs(): Promise<{ tabs: Slugged[]; products: Slugged[]; outfits: Slugged[] }> {
  if (!hasDatabase()) return { tabs: seedTabs, products: seedProducts, outfits: seedOutfits }
  const base = env('SUPABASE_URL').replace(/\/$/, '')
  const headers = { apikey: env('SUPABASE_ANON_KEY') }
  const get = async (q: string) => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers })
    return r.ok ? ((await r.json()) as Slugged[]) : []
  }
  const [tabs, products, outfits] = await Promise.all([
    get('tabs?select=slug&is_published=eq.true'),
    get('products?select=slug&is_published=eq.true&type=neq.affiliate'),
    get('outfits?select=slug&is_published=eq.true'),
  ])
  return { tabs, products, outfits }
}

export default async (req: Request): Promise<Response> => {
  const s = await slugs()
  const paths = [
    '/',
    '/build',
    ...s.tabs.map((t) => `/shop/${t.slug}`),
    ...s.products.map((p) => `/p/${p.slug}`),
    ...s.outfits.map((o) => `/looks/${o.slug}`),
    ...['shipping', 'returns', 'privacy', 'terms', 'disclosure', 'contact'].map((p) => `/info/${p}`),
  ]
  return new Response(buildSitemap({ origin: siteOrigin(req), paths }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}

export const config = { path: '/sitemap.xml' }
