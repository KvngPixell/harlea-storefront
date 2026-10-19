// Builds one product feed (RSS 2.0 + Google "g:" fields) that Google Merchant Center,
// Pinterest catalogs and Meta (Facebook/Instagram) catalogs all accept.
import type { Category, Product } from '../../src/types'

const GOOGLE_CATEGORY: Partial<Record<Category, string>> = {
  top: '212', // Apparel & Accessories > Clothing > Shirts & Tops
  bottom: '1604',
  dress: '2271', // Clothing > Dresses
  outerwear: '203', // Clothing > Outerwear
  shoes: '187',
  bag: '3032', // Handbags, Wallets & Cases
  accessory: '167', // Clothing Accessories
  beauty: '473', // Health & Beauty > Personal Care > Cosmetics
  other: '166',
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const plain = (s: string) => s.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
const price = (cents: number) => `${(cents / 100).toFixed(2)} USD`

export function buildFeed(opts: { products: Product[]; origin: string; brand: string; title: string }): string {
  const { origin, brand } = opts
  const items: string[] = []
  // Only items sold on OUR site (feeds must link to our own pages). Affiliate items are left out.
  for (const p of opts.products.filter((x) => x.is_published && x.type !== 'affiliate')) {
    const images = (p.product_images ?? [])
      .map((i) => new URL(i.url, origin).toString())
      .filter((u) => !u.endsWith('.svg')) // Google/Pinterest/Meta don't accept SVG images
    if (images.length === 0) continue
    const onSale = p.compare_at_cents !== null && p.compare_at_cents > p.price_cents
    const variants = p.sizes.length > 0 ? p.sizes : [null]
    for (const size of variants) {
      const id = size ? `${p.id.slice(0, 36)}-${size}`.slice(0, 50) : p.id
      const f: string[] = [
        `<g:id>${esc(id)}</g:id>`,
        `<title>${esc(p.name.slice(0, 150))}</title>`,
        `<description>${esc(plain(p.description || p.name).slice(0, 5000))}</description>`,
        `<link>${esc(`${origin}/p/${p.slug}`)}</link>`,
        `<g:image_link>${esc(images[0])}</g:image_link>`,
        ...images.slice(1, 10).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`),
        `<g:availability>${p.is_sold ? 'out_of_stock' : 'in_stock'}</g:availability>`,
        `<g:price>${price(onSale ? p.compare_at_cents! : p.price_cents)}</g:price>`,
        ...(onSale ? [`<g:sale_price>${price(p.price_cents)}</g:sale_price>`] : []),
        `<g:condition>${p.condition === 'used' ? 'used' : 'new'}</g:condition>`,
        `<g:brand>${esc((p.brand || brand).slice(0, 70))}</g:brand>`,
        '<g:identifier_exists>no</g:identifier_exists>',
        '<g:gender>female</g:gender>',
        '<g:age_group>adult</g:age_group>',
        `<g:google_product_category>${GOOGLE_CATEGORY[p.category] ?? '166'}</g:google_product_category>`,
        `<g:product_type>${esc(p.category)}</g:product_type>`,
        `<g:custom_label_0>${esc(p.type === 'unique' ? 'one-of-one' : 'dropship')}</g:custom_label_0>`,
        ...(p.color ? [`<g:color>${esc(p.color)}</g:color>`] : []),
        ...(size ? [`<g:size>${esc(size)}</g:size>`, `<g:item_group_id>${esc(p.id)}</g:item_group_id>`] : []),
      ]
      items.push(`<item>${f.join('')}</item>`)
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(opts.title)}</title>
<link>${esc(origin)}</link>
<description>${esc(`${opts.title} products`)}</description>
${items.join('\n')}
</channel>
</rss>
`
}

export function buildSitemap(opts: { origin: string; paths: string[] }): string {
  const urls = opts.paths.map((p) => `<url><loc>${esc(opts.origin + p)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
