// Placeholder catalog so the shop never looks empty.
// The same data is loaded into the database by supabase/migrations/0003_seed.sql
// (generated from this file with `node --import tsx scripts/generate-seed-sql.ts`).
import type { Outfit, Product, Tab } from '../types'

const tabId = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const productId = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const imageId = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const outfitId = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const outfitItemId = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const seedTabs: Tab[] = [
  {
    id: tabId(1),
    name: 'Fresh Drops',
    slug: 'fresh-drops',
    description: 'Cute everyday pieces, shipped straight to you.',
    kind: 'products',
    sort_order: 1,
    is_published: true,
  },
  {
    id: tabId(2),
    name: 'One of One',
    slug: 'one-of-one',
    description: 'Thrifted & vintage treasures. Only one of each, so grab it before it’s gone!',
    kind: 'products',
    sort_order: 2,
    is_published: true,
  },
  {
    id: tabId(3),
    name: 'Curated Looks',
    slug: 'curated-looks',
    description: 'Outfits we put together, with every piece and where to get it.',
    kind: 'outfits',
    sort_order: 3,
    is_published: true,
  },
]

type SeedProduct = Omit<Product, 'id' | 'product_images' | 'is_sold' | 'is_published' | 'compare_at_cents' | 'store_name' | 'affiliate_url' | 'is_featured'> &
  Partial<Pick<Product, 'compare_at_cents' | 'store_name' | 'affiliate_url' | 'is_featured' | 'is_sold'>>

const raw: SeedProduct[] = [
  { name: 'Satin Bow Cami', slug: 'satin-bow-cami', type: 'dropship', category: 'top', price_cents: 2400, sizes: ['XS', 'S', 'M', 'L', 'XL'], tab_id: tabId(1), sort_order: 1, is_featured: true,
    description: 'Silky blush satin with a tiny bow at the neckline. Adjustable straps. Dress it up or wear it with denim.' },
  { name: 'Pleated Tennis Skort', slug: 'pleated-tennis-skort', type: 'dropship', category: 'bottom', price_cents: 2800, sizes: ['XS', 'S', 'M', 'L', 'XL'], tab_id: tabId(1), sort_order: 2,
    description: 'Flippy pleats with built-in shorts so you can twirl worry-free. High waist, soft stretch.' },
  { name: 'Cloud Knit Cardigan', slug: 'cloud-knit-cardigan', type: 'dropship', category: 'outerwear', price_cents: 4200, compare_at_cents: 5600, sizes: ['S', 'M', 'L'], tab_id: tabId(1), sort_order: 3, is_featured: true,
    description: 'The coziest lilac knit with pearly buttons. Slightly cropped, made for layering.' },
  { name: 'Heart Charm Hoops', slug: 'heart-charm-hoops', type: 'dropship', category: 'accessory', price_cents: 1600, sizes: [], tab_id: tabId(1), sort_order: 4,
    description: 'Gold-tone hoops with a dangling pink enamel heart. Lightweight enough for all-day wear.' },
  { name: 'Sweetheart Baby Tee', slug: 'sweetheart-baby-tee', type: 'dropship', category: 'top', price_cents: 2200, sizes: ['XS', 'S', 'M', 'L'], tab_id: tabId(1), sort_order: 5,
    description: 'Fitted y2k baby tee with a puffy heart print. Soft cotton, slightly cropped.' },
  { name: 'Pearl Mini Shoulder Bag', slug: 'pearl-mini-shoulder-bag', type: 'dropship', category: 'bag', price_cents: 3400, sizes: [], tab_id: tabId(1), sort_order: 6, is_featured: true,
    description: 'A little cream bag with a pearl-beaded strap. Fits your phone, gloss and keys.' },
  { name: 'Vintage Lace Slip Dress', slug: 'vintage-lace-slip-dress', type: 'unique', category: 'dress', price_cents: 5800, sizes: ['S'], tab_id: tabId(2), sort_order: 1, is_featured: true,
    description: 'True vintage champagne slip with lace trim. Gently worn, no flaws. Fits like a modern small.' },
  { name: 'Y2K Butterfly Denim Jacket', slug: 'y2k-butterfly-denim-jacket', type: 'unique', category: 'outerwear', price_cents: 6500, sizes: ['M'], tab_id: tabId(2), sort_order: 2,
    description: 'Light-wash denim with hand-embroidered pink butterflies on the back. A real one-of-one.' },
  { name: 'Thrifted Mary Jane Platforms', slug: 'thrifted-mary-jane-platforms', type: 'unique', category: 'shoes', price_cents: 4500, sizes: ['7'], tab_id: tabId(2), sort_order: 3,
    description: 'Glossy pink Mary Janes with a chunky platform. Worn twice, like new. Women’s size 7.' },
  { name: 'Hand-Beaded Phone Charm', slug: 'hand-beaded-phone-charm', type: 'unique', category: 'accessory', price_cents: 1800, sizes: [], tab_id: tabId(2), sort_order: 4,
    description: 'Made by Harlea! Pastel beads, tiny hearts and a star. Only one exists.' },
  { name: 'Butter Yellow Ballet Flats', slug: 'butter-yellow-ballet-flats', type: 'affiliate', category: 'shoes', price_cents: 3999, sizes: [], tab_id: null, sort_order: 1,
    store_name: 'Partner Store (placeholder)', affiliate_url: 'https://example.com/ballet-flats',
    description: 'Soft butter-yellow flats with a little bow. We link to where we found them.' },
  { name: 'Glossy Lip Trio', slug: 'glossy-lip-trio', type: 'affiliate', category: 'beauty', price_cents: 1400, sizes: [], tab_id: null, sort_order: 2,
    store_name: 'Partner Store (placeholder)', affiliate_url: 'https://example.com/lip-trio',
    description: 'Three sheer glosses in pink, peach and berry. Our go-to for every look.' },
]

export const seedProducts: Product[] = raw.map((p, i) => ({
  compare_at_cents: null,
  store_name: null,
  affiliate_url: null,
  is_featured: false,
  is_sold: false,
  ...p,
  id: productId(i + 1),
  is_published: true,
  brand: null,
  condition: p.type === 'unique' ? 'used' : 'new',
  color: null,
  product_images: [
    {
      id: imageId(i + 1),
      product_id: productId(i + 1),
      url: `/images/seed/${p.slug}.svg`,
      alt: p.name,
      sort_order: 0,
    },
  ],
}))

const bySlug = (slug: string) => {
  const p = seedProducts.find((x) => x.slug === slug)
  if (!p) throw new Error(`seed product missing: ${slug}`)
  return p.id
}

const looks: Array<{ name: string; slug: string; description: string; pieces: string[] }> = [
  { name: 'Brunch Date', slug: 'brunch-date', description: 'Soft, sweet and a little bit fancy. Perfect for mimosas.',
    pieces: ['satin-bow-cami', 'pleated-tennis-skort', 'butter-yellow-ballet-flats', 'heart-charm-hoops'] },
  { name: 'Coffee Run Cutie', slug: 'coffee-run-cutie', description: 'Comfy-cute for errands, campus or a latte with the girls.',
    pieces: ['sweetheart-baby-tee', 'cloud-knit-cardigan', 'thrifted-mary-jane-platforms', 'pearl-mini-shoulder-bag'] },
  { name: 'Vintage Romance', slug: 'vintage-romance', description: 'Lace, denim and a glossy lip. Date-night ready.',
    pieces: ['vintage-lace-slip-dress', 'y2k-butterfly-denim-jacket', 'glossy-lip-trio'] },
]

let itemCounter = 0
export const seedOutfits: Outfit[] = looks.map((look, i) => ({
  id: outfitId(i + 1),
  name: look.name,
  slug: look.slug,
  description: look.description,
  tab_id: tabId(3),
  cover_image_url: null,
  is_published: true,
  sort_order: i + 1,
  outfit_items: look.pieces.map((slug, j) => ({
    id: outfitItemId(++itemCounter),
    outfit_id: outfitId(i + 1),
    product_id: bySlug(slug),
    sort_order: j,
  })),
}))
