import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeftIcon, TrashIcon } from '../components/Icons'
import { ErrorState, toast } from '../components/ui'
import { cx, money, parseMoney, slugify } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { store, type ImageInput, type ProductInput } from '../lib/store'
import type { Category, Product, ProductPrivate, ProductType } from '../types'
import { useAdminCtx } from './AdminApp'
import { ConfirmDialog, Field, Hint, PageHeader, Panel, PhotoManager, reportError, Toggle } from './components'

const TYPES: Array<{ value: ProductType; title: string; text: string }> = [
  { value: 'dropship', title: 'Supplier ships it', text: 'We sell it here; our supplier sends it to the buyer.' },
  { value: 'unique', title: 'One of a kind', text: 'A piece we own (vintage, thrifted, handmade). Only 1 can be sold.' },
  { value: 'affiliate', title: 'Link to another store', text: 'Shoppers buy it on another website through your link.' },
]
const CATEGORIES: Array<[Category, string]> = [
  ['top', 'Top'], ['bottom', 'Bottom'], ['dress', 'Dress'], ['outerwear', 'Jacket / layer'], ['shoes', 'Shoes'],
  ['bag', 'Bag'], ['accessory', 'Accessory / jewelry'], ['beauty', 'Beauty'], ['other', 'Other'],
]
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface Draft {
  name: string
  price: string
  compareAt: string
  type: ProductType
  category: Category
  tab_id: string
  sizes: string[]
  description: string
  store_name: string
  affiliate_url: string
  is_published: boolean
  is_featured: boolean
  is_sold: boolean
  slug: string
  photos: ImageInput[]
  brand: string
  condition: 'new' | 'used'
  color: string
}

const cents = (c: number | null) => (c === null ? '' : (c / 100).toFixed(c % 100 === 0 ? 0 : 2))

function toDraft(p: Product | undefined, defaultTab: string): Draft {
  return {
    name: p?.name ?? '',
    price: p ? cents(p.price_cents) : '',
    compareAt: p ? cents(p.compare_at_cents) : '',
    type: p?.type ?? 'dropship',
    category: p?.category ?? 'top',
    tab_id: p ? p.tab_id ?? '' : defaultTab,
    sizes: p?.sizes ?? [],
    description: p?.description ?? '',
    store_name: p?.store_name ?? '',
    affiliate_url: p?.affiliate_url ?? '',
    is_published: p?.is_published ?? true,
    is_featured: p?.is_featured ?? false,
    is_sold: p?.is_sold ?? false,
    slug: p?.slug ?? '',
    photos: (p?.product_images ?? []).map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    brand: p?.brand ?? '',
    condition: p?.condition ?? (p?.type === 'unique' ? 'used' : 'new'),
    color: p?.color ?? '',
  }
}

export default function ProductEditor({ id }: { id: string }) {
  const { catalog, reload } = useAdminCtx()
  const isNew = id === 'new'
  const existing = catalog.products.find((p) => p.id === id)
  const productTabs = catalog.tabs.filter((t) => t.kind === 'products')
  const [d, setD] = useState<Draft>(() => toDraft(existing, productTabs[0]?.id ?? ''))
  const [priv, setPriv] = useState<ProductPrivate | null>(null)
  const [cost, setCost] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [customSize, setCustomSize] = useState('')

  useEffect(() => {
    if (isNew || !existing) return
    store.getProductPrivate(existing.id).then((p) => {
      setPriv(p)
      setCost(p?.cost_cents != null ? cents(p.cost_cents) : '')
    }, () => undefined)
  }, [isNew, existing])

  if (!isNew && !existing) return <ErrorState message="We couldn’t find that product. It may have been deleted." />

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const toggleSize = (s: string) => set('sizes', d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s])
  const priceCents = parseMoney(d.price)
  const costCents = cost.trim() ? parseMoney(cost) : null

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!d.name.trim()) e.name = 'Give it a name'
    if (priceCents === null) e.price = 'Type a price like 24 or 24.99'
    if (d.compareAt.trim() && parseMoney(d.compareAt) === null) e.compareAt = 'Type a price like 30, or leave it empty'
    if (d.type === 'affiliate') {
      if (!/^https:\/\/\S+\.\S+/.test(d.affiliate_url.trim())) e.affiliate_url = 'Paste the full link (starts with https://)'
      if (!d.store_name.trim()) e.store_name = 'Which store is it from?'
    }
    const slug = d.slug || slugify(d.name)
    if (!slug) e.name = 'Use at least one letter or number in the name'
    else if (catalog.products.some((p) => p.slug === slug && p.id !== existing?.id)) e.name = 'Another product already has this name. Add a word to make it different.'
    return e
  }

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields')
      return
    }
    setSaving(true)
    const input: ProductInput = {
      id: existing?.id,
      name: d.name.trim(),
      slug: d.slug || slugify(d.name),
      description: d.description.trim(),
      type: d.type,
      category: d.category,
      price_cents: priceCents!,
      compare_at_cents: d.compareAt.trim() ? parseMoney(d.compareAt) : null,
      sizes: d.type === 'affiliate' ? [] : d.type === 'unique' ? d.sizes.slice(0, 1) : d.sizes,
      tab_id: d.tab_id || null,
      store_name: d.type === 'affiliate' ? d.store_name.trim() : null,
      affiliate_url: d.type === 'affiliate' ? d.affiliate_url.trim() : null,
      is_featured: d.is_featured,
      is_sold: d.type === 'unique' ? d.is_sold : false,
      is_published: d.is_published,
      sort_order: existing?.sort_order ?? catalog.products.length + 1,
      brand: d.brand.trim() || null,
      condition: d.condition,
      color: d.color.trim() || null,
    }
    try {
      const saved = await store.saveProduct(input, d.photos)
      if (d.type !== 'affiliate' && (priv || costCents !== null)) {
        await store.saveProductPrivate({
          product_id: saved.id,
          supplier_name: priv?.supplier_name ?? null,
          supplier_url: priv?.supplier_url ?? null,
          cost_cents: costCents,
          notes: priv?.notes ?? '',
        })
      }
      await reload()
      toast(isNew ? 'Product added! ✨' : 'Saved ✓')
      navigate('/admin/products')
    } catch (err) {
      reportError(err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    setConfirmDelete(false)
    try {
      await store.deleteProduct(existing.id)
      await reload()
      toast('Product deleted')
      navigate('/admin/products')
    } catch (e) {
      reportError(e)
    }
  }

  const profit = priceCents !== null && costCents !== null ? priceCents - costCents : null

  return (
    <form onSubmit={save} noValidate>
      <Link to="/admin/products" className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeftIcon size={18} /> All products</Link>
      <PageHeader
        title={isNew ? 'Add a product' : 'Edit product'}
        actions={existing && <Link to={`/p/${existing.slug}`} target="_blank" className="btn btn-soft btn-sm">View in shop ↗</Link>}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Basics">
            <div className="space-y-4">
              <Field label="Product name" error={errors.name}>
                <input className="field" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Satin Bow Cami" maxLength={80} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price ($)" error={errors.price}>
                  <input className="field" inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value)} placeholder="24" />
                </Field>
                <Field label="Original price ($)" hint="Optional. If this is higher than the price, the shop shows a little “sale” tag with this price crossed out." error={errors.compareAt}>
                  <input className="field" inputMode="decimal" value={d.compareAt} onChange={(e) => set('compareAt', e.target.value)} placeholder="leave empty if not on sale" />
                </Field>
              </div>
              <Field label="Description">
                <textarea className="field min-h-28" value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Fabric, fit, how to style it…" maxLength={2000} />
              </Field>
            </div>
          </Panel>

          <Panel title="Photos">
            <p className="mb-3 text-sm text-muted">The first photo is the main one. Use the arrows to reorder.</p>
            <PhotoManager photos={d.photos} onChange={(p) => set('photos', p)} />
          </Panel>

          <Panel title="What kind of item is this?">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Item type">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={d.type === t.value}
                  onClick={() => set('type', t.value)}
                  className={cx('rounded-2xl border-2 p-3 text-left transition', d.type === t.value ? 'border-rose bg-blush' : 'border-petal bg-white hover:border-bubblegum')}
                >
                  <span className="block font-display font-semibold">{t.title}</span>
                  <span className="mt-1 block text-sm text-muted">{t.text}</span>
                </button>
              ))}
            </div>
            {d.type === 'affiliate' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Store name" error={errors.store_name}>
                  <input className="field" value={d.store_name} onChange={(e) => set('store_name', e.target.value)} placeholder="e.g. Target" />
                </Field>
                <Field label="Link to the product" hint="Paste your affiliate link (or the normal product link). Shoppers go here when they tap “Buy”." error={errors.affiliate_url}>
                  <input className="field" type="url" value={d.affiliate_url} onChange={(e) => set('affiliate_url', e.target.value)} placeholder="https://…" />
                </Field>
              </div>
            )}
          </Panel>

          {d.type !== 'affiliate' && (
            <Panel title={<>Sizes <Hint>Tap the sizes you have. Leave all off for one-size items like jewelry or bags. One-of-a-kind pieces have just one size.</Hint></>}>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...SIZE_PRESETS, ...d.sizes])].map((s) => (
                  <button key={s} type="button" aria-pressed={d.sizes.includes(s)} onClick={() => toggleSize(s)}
                    className={cx('h-11 min-w-11 rounded-2xl border-2 px-3 font-display font-semibold', d.sizes.includes(s) ? 'border-rose bg-rose text-white' : 'border-petal bg-white')}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input className="field max-w-[10rem]" value={customSize} onChange={(e) => setCustomSize(e.target.value)} placeholder="Other size (e.g. 7)" maxLength={12} aria-label="Add another size" />
                <button type="button" className="btn btn-soft btn-sm" onClick={() => { const s = customSize.trim(); if (s && !d.sizes.includes(s)) set('sizes', [...d.sizes, s]); setCustomSize('') }}>Add</button>
              </div>
              {d.type === 'unique' && d.sizes.length > 1 && <p className="mt-2 text-sm text-rose">One-of-a-kind pieces keep only the first size.</p>}
            </Panel>
          )}

          {d.type !== 'affiliate' && (
            <Panel title={<>🔒 Private notes <Hint>Only you and Isaac see this. Shoppers never do.</Hint></>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Supplier / where it came from">
                  <input className="field" value={priv?.supplier_name ?? ''} onChange={(e) => setPriv((p) => ({ product_id: existing?.id ?? '', supplier_url: null, cost_cents: null, notes: '', ...p, supplier_name: e.target.value }))} />
                </Field>
                <Field label="Supplier link">
                  <input className="field" value={priv?.supplier_url ?? ''} onChange={(e) => setPriv((p) => ({ product_id: existing?.id ?? '', supplier_name: null, cost_cents: null, notes: '', ...p, supplier_url: e.target.value }))} placeholder="https://…" />
                </Field>
                <Field label="What it costs us ($)">
                  <input className="field" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
                </Field>
                <div className="self-end rounded-2xl bg-blush px-4 py-3 text-sm">
                  Profit per sale: <strong>{profit === null ? '—' : money(profit)}</strong>
                </div>
              </div>
              <Field label="Notes">
                <textarea className="field mt-1 min-h-20" value={priv?.notes ?? ''} onChange={(e) => setPriv((p) => ({ product_id: existing?.id ?? '', supplier_name: null, supplier_url: null, cost_cents: null, ...p, notes: e.target.value }))} />
              </Field>
            </Panel>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {d.type !== 'affiliate' && (
            <Panel title={<>Google & Pinterest details <Hint>Optional, but filling these in helps your products show up for free in Google Shopping, Pinterest and Instagram.</Hint></>}>
              <div className="space-y-3">
                <Field label="Brand" hint="Leave empty to use your shop name.">
                  <input className="field" value={d.brand} onChange={(e) => set('brand', e.target.value)} placeholder="96.co" maxLength={70} />
                </Field>
                <Field label="Condition">
                  <select className="field" value={d.condition} onChange={(e) => set('condition', e.target.value as 'new' | 'used')}>
                    <option value="new">New</option>
                    <option value="used">Pre-loved / vintage</option>
                  </select>
                </Field>
                <Field label="Main color">
                  <input className="field" value={d.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Pink" maxLength={40} />
                </Field>
              </div>
            </Panel>
          )}
          <Panel title="Where it shows">
            <div className="space-y-3">
              <Field label="Shop tab" hint="Which tab shoppers find it in. Pick “No tab” for items you only use inside outfits.">
                <select className="field" value={d.tab_id} onChange={(e) => set('tab_id', e.target.value)}>
                  {productTabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="">No tab (outfits only)</option>
                </select>
              </Field>
              <Field label="Category" hint="Used by “Build a Look” to put it in the right row.">
                <select className="field" value={d.category} onChange={(e) => set('category', e.target.value as Category)}>
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Toggle label="Show on the shop" checked={d.is_published} onChange={(v) => set('is_published', v)} hint="Turn off to hide it without deleting it." />
              <Toggle label="Feature on home page" checked={d.is_featured} onChange={(v) => set('is_featured', v)} />
              {d.type === 'unique' && <Toggle label="Sold" checked={d.is_sold} onChange={(v) => set('is_sold', v)} hint="We mark one-of-a-kind pieces sold automatically when someone buys them. You can also flip it here." />}
            </div>
          </Panel>
          <div className="flex flex-col gap-2">
            <button className="btn btn-primary text-lg" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button>
            {existing && (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
                <TrashIcon size={18} /> Delete product
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${existing?.name ?? ''}”?`}
        body="This removes it from the shop and from any outfits. This can’t be undone. (Tip: you can hide it instead.)"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  )
}
