// All reading/writing of shop data goes through here.
// - Live mode: the Supabase database.
// - Demo mode (database not connected yet): the placeholder catalog, with admin
//   changes saved only in this browser, so Harlea can practice safely.
import { seedOutfits, seedProducts, seedTabs } from '../data/seed'
import type {
  Idea,
  LinkClick,
  Order,
  OrderStatus,
  Outfit,
  Product,
  ProductImage,
  ProductPrivate,
  StoreEntry,
  Subscriber,
  Tab,
} from '../types'
import { IS_DEMO } from './config'
import { uid } from './format'
import { blobToDataUrl, resizeImage } from './image'
import { db, deleteMedia, uploadMedia } from './supabase'
import { seedStores } from '../data/stores'

export interface SiteSettings {
  brand_name: string
  tagline: string
  announcement: string
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  contact_email: string | null
}

export interface Catalog {
  tabs: Tab[]
  products: Product[]
  outfits: Outfit[]
  settings: SiteSettings
}

export type ProductInput = Omit<Product, 'id' | 'product_images' | 'created_at'> & { id?: string }
export type ImageInput = Pick<ProductImage, 'url' | 'alt'> & { id?: string }
export type SortableTable = 'products' | 'tabs' | 'outfits'

export interface Store {
  loadCatalog(opts?: { includeHidden?: boolean }): Promise<Catalog>
  saveProduct(input: ProductInput, images: ImageInput[]): Promise<Product>
  updateProduct(id: string, patch: Partial<Product>): Promise<void>
  deleteProduct(id: string): Promise<void>
  getProductPrivate(id: string): Promise<ProductPrivate | null>
  saveProductPrivate(p: ProductPrivate): Promise<void>
  reorder(table: SortableTable, ids: string[]): Promise<void>
  saveTab(tab: Partial<Tab> & { name: string; slug: string }): Promise<Tab>
  deleteTab(id: string): Promise<void>
  saveOutfit(o: Partial<Outfit> & { name: string; slug: string }, productIds: string[]): Promise<Outfit>
  deleteOutfit(id: string): Promise<void>
  listOrders(): Promise<Order[]>
  setOrderStatus(id: string, status: OrderStatus): Promise<void>
  listIdeas(): Promise<Idea[]>
  saveIdea(idea: Partial<Idea>): Promise<Idea>
  deleteIdea(id: string): Promise<void>
  saveSettings(s: SiteSettings): Promise<void>
  uploadImage(file: File, folder: 'products' | 'ideas' | 'outfits'): Promise<string>
  listStores(): Promise<StoreEntry[]>
  saveStore(s: Partial<StoreEntry> & { name: string }): Promise<StoreEntry>
  deleteStore(id: string): Promise<void>
  listSubscribers(): Promise<Subscriber[]>
  listClicks(sinceIso: string): Promise<LinkClick[]>
  /** Public: join the email list. Returns false for an invalid email. */
  subscribe(email: string, source: string): Promise<boolean>
  /** Public: count a click on a "Buy at …" link (never blocks the shopper). */
  trackClick(productId: string, source: string): void
}

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: '96.co',
  tagline: 'cute finds, curated looks & one-of-one treasures',
  announcement: 'new drops every week ✦ free shipping over $75',
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  contact_email: null,
}

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

/* ======================= LIVE (Supabase) ======================= */

const PRODUCT_COLUMNS = [
  'name', 'slug', 'description', 'type', 'category', 'price_cents', 'compare_at_cents', 'sizes', 'tab_id',
  'store_name', 'affiliate_url', 'is_featured', 'is_sold', 'is_published', 'sort_order', 'brand', 'condition', 'color',
] as const
const STORE_COLUMNS = [
  'name', 'kind', 'status', 'website_url', 'signup_url', 'commission', 'requirements', 'payout', 'cost', 'my_id', 'notes', 'sort_order',
] as const

function pick<T extends object>(obj: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (k in obj) out[k] = (obj as Record<string, unknown>)[k]
  return out as Partial<T>
}

const liveStore: Store = {
  async loadCatalog(opts = {}) {
    const pub = opts.includeHidden ? '' : '&is_published=eq.true'
    const [tabs, products, outfits, settings] = await Promise.all([
      db<Tab[]>(`tabs?select=*&order=sort_order.asc,name.asc${pub}`),
      db<Product[]>(
        `products?select=*,product_images(*)&order=sort_order.asc,created_at.desc&product_images.order=sort_order.asc${pub}`,
      ),
      db<Outfit[]>(`outfits?select=*,outfit_items(*)&order=sort_order.asc&outfit_items.order=sort_order.asc${pub}`),
      db<SiteSettings[]>('site_settings?select=*&id=eq.1').catch(() => []),
    ])
    return { tabs, products, outfits, settings: { ...DEFAULT_SETTINGS, ...(settings[0] ?? {}) } }
  },

  async saveProduct(input, images) {
    const row = pick(input, PRODUCT_COLUMNS)
    let saved: Product
    if (input.id) {
      ;[saved] = await db<Product[]>(`products?id=eq.${input.id}`, {
        method: 'PATCH', body: row, prefer: 'return=representation',
      })
    } else {
      ;[saved] = await db<Product[]>('products', { method: 'POST', body: row, prefer: 'return=representation' })
    }
    const rows = images.map((img, i) => ({
      id: img.id ?? uid(), product_id: saved.id, url: img.url, alt: img.alt || saved.name, sort_order: i,
    }))
    const keep = rows.map((r) => r.id)
    await db(
      `product_images?product_id=eq.${saved.id}${keep.length ? `&id=not.in.(${keep.join(',')})` : ''}`,
      { method: 'DELETE' },
    )
    if (rows.length) {
      await db('product_images', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates' })
    }
    return { ...saved, product_images: rows }
  },

  async updateProduct(id, patch) {
    await db(`products?id=eq.${id}`, { method: 'PATCH', body: pick(patch, PRODUCT_COLUMNS) })
  },

  async deleteProduct(id) {
    const imgs = await db<ProductImage[]>(`product_images?select=url&product_id=eq.${id}`)
    await db(`products?id=eq.${id}`, { method: 'DELETE' })
    await Promise.all(imgs.map((i) => deleteMedia(i.url)))
  },

  async getProductPrivate(id) {
    const rows = await db<ProductPrivate[]>(`product_private?select=*&product_id=eq.${id}`)
    return rows[0] ?? null
  },

  async saveProductPrivate(p) {
    await db('product_private', {
      method: 'POST',
      body: pick(p, ['product_id', 'supplier_name', 'supplier_url', 'cost_cents', 'notes']),
      prefer: 'resolution=merge-duplicates',
    })
  },

  async reorder(table, ids) {
    await Promise.all(
      ids.map((id, i) => db(`${table}?id=eq.${id}`, { method: 'PATCH', body: { sort_order: i + 1 } })),
    )
  },

  async saveTab(tab) {
    const row = pick(tab, ['name', 'slug', 'description', 'kind', 'sort_order', 'is_published'])
    const [saved] = tab.id
      ? await db<Tab[]>(`tabs?id=eq.${tab.id}`, { method: 'PATCH', body: row, prefer: 'return=representation' })
      : await db<Tab[]>('tabs', { method: 'POST', body: row, prefer: 'return=representation' })
    return saved
  },

  async deleteTab(id) {
    await db(`tabs?id=eq.${id}`, { method: 'DELETE' })
  },

  async saveOutfit(o, productIds) {
    const row = pick(o, ['name', 'slug', 'description', 'tab_id', 'cover_image_url', 'is_published', 'sort_order'])
    const [saved] = o.id
      ? await db<Outfit[]>(`outfits?id=eq.${o.id}`, { method: 'PATCH', body: row, prefer: 'return=representation' })
      : await db<Outfit[]>('outfits', { method: 'POST', body: row, prefer: 'return=representation' })
    await db(`outfit_items?outfit_id=eq.${saved.id}`, { method: 'DELETE' })
    const items = productIds.map((pid, i) => ({ id: uid(), outfit_id: saved.id, product_id: pid, sort_order: i }))
    if (items.length) await db('outfit_items', { method: 'POST', body: items })
    return { ...saved, outfit_items: items }
  },

  async deleteOutfit(id) {
    await db(`outfits?id=eq.${id}`, { method: 'DELETE' })
  },

  listOrders() {
    return db<Order[]>('orders?select=*,order_items(*)&order=created_at.desc&limit=1000')
  },

  async setOrderStatus(id, status) {
    await db(`orders?id=eq.${id}`, { method: 'PATCH', body: { status } })
  },

  listIdeas() {
    return db<Idea[]>('ideas?select=*&order=created_at.desc')
  },

  async saveIdea(idea) {
    const row = pick(idea, ['title', 'notes', 'image_url', 'status', 'suggestions'])
    const [saved] = idea.id
      ? await db<Idea[]>(`ideas?id=eq.${idea.id}`, { method: 'PATCH', body: row, prefer: 'return=representation' })
      : await db<Idea[]>('ideas', { method: 'POST', body: row, prefer: 'return=representation' })
    return saved
  },

  async deleteIdea(id) {
    const [idea] = await db<Idea[]>(`ideas?select=image_url&id=eq.${id}`)
    await db(`ideas?id=eq.${id}`, { method: 'DELETE' })
    if (idea?.image_url) await deleteMedia(idea.image_url)
  },

  async saveSettings(s) {
    await db('site_settings?id=eq.1', {
      method: 'PATCH',
      body: pick(s, ['brand_name', 'tagline', 'announcement', 'instagram_url', 'facebook_url', 'tiktok_url', 'contact_email']),
    })
  },

  async uploadImage(file, folder) {
    const blob = await resizeImage(file, folder === 'ideas' ? 1400 : 1600)
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg'
    const path = `${folder}/${new Date().getFullYear()}/${uid()}.${ext}`
    return uploadMedia(path, blob)
  },

  listStores() {
    return db<StoreEntry[]>('stores?select=*&order=sort_order.asc,name.asc')
  },

  async saveStore(entry) {
    const row = pick(entry, STORE_COLUMNS)
    const [saved] = entry.id
      ? await db<StoreEntry[]>(`stores?id=eq.${entry.id}`, { method: 'PATCH', body: row, prefer: 'return=representation' })
      : await db<StoreEntry[]>('stores', { method: 'POST', body: row, prefer: 'return=representation' })
    return saved
  },

  async deleteStore(id) {
    await db(`stores?id=eq.${id}`, { method: 'DELETE' })
  },

  listSubscribers() {
    return db<Subscriber[]>('subscribers?select=*&order=created_at.desc&limit=5000')
  },

  listClicks(sinceIso) {
    return db<LinkClick[]>(`link_clicks?select=*&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=5000`)
  },

  async subscribe(email, source) {
    return db<boolean>('rpc/subscribe', { method: 'POST', body: { p_email: email, p_source: source } })
  },

  trackClick(productId, source) {
    void db('rpc/track_click', { method: 'POST', body: { p_product: productId, p_source: source }, keepalive: true }).catch(() => undefined)
  },
}

/* ======================= DEMO (this browser only) ======================= */

interface DemoDb {
  version: number
  tabs: Tab[]
  products: Product[]
  outfits: Outfit[]
  orders: Order[]
  ideas: Idea[]
  private: ProductPrivate[]
  settings: SiteSettings
  stores: StoreEntry[]
  subscribers: Subscriber[]
  clicks: LinkClick[]
}

const DEMO_KEY = 'hs-demo-db'
const DEMO_VERSION = 2
let demoMemory: DemoDb | null = null

function sampleOrders(products: Product[]): Order[] {
  const sellable = products.filter((p) => p.type !== 'affiliate')
  const names = ['Mia R.', 'Jade T.', 'Kayla P.', 'Bri S.', 'Ava L.', 'Nina C.', 'Sofia G.', 'Lily M.']
  return names.map((name, i) => {
    const picks = [sellable[(i * 3) % sellable.length], sellable[(i * 5 + 1) % sellable.length]].slice(0, (i % 2) + 1)
    const items = picks.map((p) => ({
      id: uid(), order_id: '', product_id: p.id, name: p.name, size: p.sizes[0] ?? null,
      unit_price_cents: p.price_cents, quantity: 1, product_type: p.type,
    }))
    const subtotal = items.reduce((s, it) => s + it.unit_price_cents * it.quantity, 0)
    const shipping = subtotal >= 7500 ? 0 : 499
    const id = uid()
    return {
      id,
      stripe_session_id: `sample_${i}`,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      customer_name: `${name} (sample)`,
      amount_total_cents: subtotal + shipping,
      amount_shipping_cents: shipping,
      currency: 'usd',
      status: i < 3 ? 'paid' : 'fulfilled',
      livemode: false,
      shipping: null,
      created_at: new Date(Date.now() - (i * 1.7 + 0.3) * 86400000).toISOString(),
      order_items: items.map((it) => ({ ...it, order_id: id })),
    }
  })
}

function freshDemo(): DemoDb {
  const products = structuredClone(seedProducts)
  return {
    version: DEMO_VERSION,
    tabs: structuredClone(seedTabs),
    products,
    outfits: structuredClone(seedOutfits),
    orders: sampleOrders(products),
    ideas: [
      {
        id: uid(), title: 'Pink gingham picnic look', status: 'new', image_url: null, suggestions: [],
        notes: 'Saw this on Pinterest: gingham top, white skirt, straw bag. Find similar pieces under $40 each?',
        created_at: new Date().toISOString(),
      },
    ],
    private: [],
    settings: { ...DEFAULT_SETTINGS },
    stores: structuredClone(seedStores),
    subscribers: [],
    clicks: [],
  }
}

function demo(): DemoDb {
  if (demoMemory) return demoMemory
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    const parsed = raw ? (JSON.parse(raw) as DemoDb) : null
    demoMemory = parsed && parsed.version === DEMO_VERSION ? parsed : freshDemo()
  } catch {
    demoMemory = freshDemo()
  }
  return demoMemory
}

function saveDemo() {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(demoMemory))
  } catch {
    throw new Error('This browser’s demo storage is full. Try removing a few demo photos.')
  }
}

export function resetDemo() {
  demoMemory = freshDemo()
  saveDemo()
}

const pause = () => new Promise((r) => setTimeout(r, 120))

const demoStore: Store = {
  async loadCatalog(opts = {}) {
    const d = structuredClone(demo())
    const show = <T extends { is_published: boolean; sort_order: number }>(rows: T[]) =>
      (opts.includeHidden ? rows : rows.filter((r) => r.is_published)).sort(bySort)
    return { tabs: show(d.tabs), products: show(d.products), outfits: show(d.outfits), settings: d.settings }
  },

  async saveProduct(input, images) {
    await pause()
    const d = demo()
    const id = input.id ?? uid()
    const product: Product = {
      ...(input as Product),
      id,
      created_at: new Date().toISOString(),
      product_images: images.map((img, i) => ({
        id: img.id ?? uid(), product_id: id, url: img.url, alt: img.alt || input.name, sort_order: i,
      })),
    }
    if (d.products.some((p) => p.slug === product.slug && p.id !== id)) {
      throw new Error('Another product already uses that web address. Try a slightly different name.')
    }
    const idx = d.products.findIndex((p) => p.id === id)
    if (idx >= 0) d.products[idx] = product
    else d.products.push(product)
    saveDemo()
    return product
  },

  async updateProduct(id, patch) {
    const d = demo()
    d.products = d.products.map((p) => (p.id === id ? { ...p, ...patch } : p))
    saveDemo()
  },

  async deleteProduct(id) {
    await pause()
    const d = demo()
    d.products = d.products.filter((p) => p.id !== id)
    d.outfits = d.outfits.map((o) => ({ ...o, outfit_items: o.outfit_items?.filter((it) => it.product_id !== id) }))
    saveDemo()
  },

  async getProductPrivate(id) {
    return demo().private.find((p) => p.product_id === id) ?? null
  },

  async saveProductPrivate(p) {
    const d = demo()
    d.private = [...d.private.filter((x) => x.product_id !== p.product_id), p]
    saveDemo()
  },

  async reorder(table, ids) {
    const d = demo()
    const rows = d[table] as Array<{ id: string; sort_order: number }>
    for (const row of rows) {
      const i = ids.indexOf(row.id)
      if (i >= 0) row.sort_order = i + 1
    }
    saveDemo()
  },

  async saveTab(tab) {
    await pause()
    const d = demo()
    if (d.tabs.some((t) => t.slug === tab.slug && t.id !== tab.id)) throw new Error('Another tab already uses that name.')
    const existing = d.tabs.find((t) => t.id === tab.id)
    const saved: Tab = {
      description: '', kind: 'products', sort_order: d.tabs.length + 1, is_published: true,
      ...existing, ...tab, id: tab.id ?? uid(),
    } as Tab
    d.tabs = existing ? d.tabs.map((t) => (t.id === saved.id ? saved : t)) : [...d.tabs, saved]
    saveDemo()
    return saved
  },

  async deleteTab(id) {
    const d = demo()
    d.tabs = d.tabs.filter((t) => t.id !== id)
    d.products = d.products.map((p) => (p.tab_id === id ? { ...p, tab_id: null } : p))
    d.outfits = d.outfits.map((o) => (o.tab_id === id ? { ...o, tab_id: null } : o))
    saveDemo()
  },

  async saveOutfit(o, productIds) {
    await pause()
    const d = demo()
    if (d.outfits.some((x) => x.slug === o.slug && x.id !== o.id)) throw new Error('Another outfit already uses that name.')
    const existing = d.outfits.find((x) => x.id === o.id)
    const id = o.id ?? uid()
    const saved: Outfit = {
      description: '', tab_id: null, cover_image_url: null, is_published: false, sort_order: d.outfits.length + 1,
      ...existing, ...o, id,
      outfit_items: productIds.map((pid, i) => ({ id: uid(), outfit_id: id, product_id: pid, sort_order: i })),
    } as Outfit
    d.outfits = existing ? d.outfits.map((x) => (x.id === id ? saved : x)) : [...d.outfits, saved]
    saveDemo()
    return saved
  },

  async deleteOutfit(id) {
    const d = demo()
    d.outfits = d.outfits.filter((o) => o.id !== id)
    saveDemo()
  },

  async listOrders() {
    return structuredClone(demo().orders).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async setOrderStatus(id, status) {
    const d = demo()
    d.orders = d.orders.map((o) => (o.id === id ? { ...o, status } : o))
    saveDemo()
  },

  async listIdeas() {
    return structuredClone(demo().ideas)
  },

  async saveIdea(idea) {
    await pause()
    const d = demo()
    const existing = d.ideas.find((x) => x.id === idea.id)
    const saved: Idea = {
      title: '', notes: '', image_url: null, status: 'new', suggestions: [], created_at: new Date().toISOString(),
      ...existing, ...idea, id: idea.id ?? uid(),
    } as Idea
    d.ideas = existing ? d.ideas.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...d.ideas]
    saveDemo()
    return saved
  },

  async deleteIdea(id) {
    const d = demo()
    d.ideas = d.ideas.filter((x) => x.id !== id)
    saveDemo()
  },

  async saveSettings(s) {
    demo().settings = { ...s }
    saveDemo()
  },

  async uploadImage(file) {
    const blob = await resizeImage(file, 900)
    return blobToDataUrl(blob)
  },

  async listStores() {
    return structuredClone(demo().stores).sort(bySort)
  },

  async saveStore(entry) {
    await pause()
    const d = demo()
    const existing = d.stores.find((x) => x.id === entry.id)
    const saved: StoreEntry = {
      kind: 'store', status: 'idea', website_url: null, signup_url: null, commission: '', requirements: '', payout: '',
      cost: '', my_id: '', notes: '', sort_order: d.stores.length + 1, ...existing, ...entry, id: entry.id ?? uid(),
    } as StoreEntry
    d.stores = existing ? d.stores.map((x) => (x.id === saved.id ? saved : x)) : [...d.stores, saved]
    saveDemo()
    return saved
  },

  async deleteStore(id) {
    const d = demo()
    d.stores = d.stores.filter((x) => x.id !== id)
    saveDemo()
  },

  async listSubscribers() {
    return structuredClone(demo().subscribers)
  },

  async listClicks(sinceIso) {
    return demo().clicks.filter((c) => c.created_at >= sinceIso)
  },

  async subscribe(email) {
    const e = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return false
    const d = demo()
    if (!d.subscribers.some((x) => x.email === e)) {
      d.subscribers.unshift({ email: e, source: 'footer', created_at: new Date().toISOString(), unsubscribed_at: null })
      saveDemo()
    }
    return true
  },

  trackClick(productId, source) {
    const d = demo()
    d.clicks.unshift({ id: Date.now(), product_id: productId, source, created_at: new Date().toISOString() })
    try {
      saveDemo()
    } catch {
      /* ignore */
    }
  },
}

export const store: Store = IS_DEMO ? demoStore : liveStore
