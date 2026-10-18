// Generates supabase/migrations/0003_seed.sql from src/data/seed.ts.
// Run: node --import tsx scripts/generate-seed-sql.ts
import { writeFileSync } from 'node:fs'
import { seedOutfits, seedProducts, seedTabs } from '../src/data/seed.ts'

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `array[${v.map(q).join(', ')}]::text[]`
  return `'${String(v).replace(/'/g, "''")}'`
}

const lines: string[] = [
  '-- Placeholder catalog (generated from src/data/seed.ts — do not edit by hand).',
  '-- Safe to re-run: existing rows are left alone.',
  '',
]

for (const t of seedTabs) {
  lines.push(
    `insert into public.tabs (id, name, slug, description, kind, sort_order, is_published) values (${[
      t.id, t.name, t.slug, t.description, t.kind, t.sort_order, t.is_published,
    ].map(q).join(', ')}) on conflict do nothing;`,
  )
}
lines.push('')
for (const p of seedProducts) {
  lines.push(
    `insert into public.products (id, name, slug, description, type, category, price_cents, compare_at_cents, sizes, tab_id, store_name, affiliate_url, is_featured, is_sold, is_published, sort_order) values (${[
      p.id, p.name, p.slug, p.description, p.type, p.category, p.price_cents, p.compare_at_cents,
      p.sizes, p.tab_id, p.store_name, p.affiliate_url, p.is_featured, p.is_sold, p.is_published, p.sort_order,
    ].map(q).join(', ')}) on conflict do nothing;`,
  )
  for (const img of p.product_images ?? []) {
    lines.push(
      `insert into public.product_images (id, product_id, url, alt, sort_order) values (${[
        img.id, img.product_id, img.url, img.alt, img.sort_order,
      ].map(q).join(', ')}) on conflict do nothing;`,
    )
  }
}
lines.push('')
for (const o of seedOutfits) {
  lines.push(
    `insert into public.outfits (id, name, slug, description, tab_id, cover_image_url, is_published, sort_order) values (${[
      o.id, o.name, o.slug, o.description, o.tab_id, o.cover_image_url, o.is_published, o.sort_order,
    ].map(q).join(', ')}) on conflict do nothing;`,
  )
  for (const it of o.outfit_items ?? []) {
    lines.push(
      `insert into public.outfit_items (id, outfit_id, product_id, sort_order) values (${[
        it.id, it.outfit_id, it.product_id, it.sort_order,
      ].map(q).join(', ')}) on conflict do nothing;`,
    )
  }
}
lines.push('')

writeFileSync(new URL('../supabase/migrations/0003_seed.sql', import.meta.url), lines.join('\n'))
console.log('wrote supabase/migrations/0003_seed.sql')
