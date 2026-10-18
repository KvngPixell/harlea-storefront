import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { money, parseMoney, slugify } from '../src/lib/format.ts'
import { match } from '../src/lib/router.tsx'
import { seedOutfits, seedProducts, seedTabs } from '../src/data/seed.ts'

describe('format helpers', () => {
  it('formats money nicely', () => {
    assert.equal(money(2400), '$24')
    assert.equal(money(3999), '$39.99')
    assert.equal(money(null), '')
  })
  it('parses typed prices', () => {
    assert.equal(parseMoney('$24.50'), 2450)
    assert.equal(parseMoney('12'), 1200)
    assert.equal(parseMoney('1,200'), 120000)
    assert.equal(parseMoney('abc'), null)
    assert.equal(parseMoney('1.234'), null)
  })
  it('makes web-safe slugs', () => {
    assert.equal(slugify('Satin Bow Cami!'), 'satin-bow-cami')
    assert.equal(slugify('  Harlea’s Café Look  '), 'harleas-cafe-look')
  })
})

describe('router.match', () => {
  it('matches params and rejects extras', () => {
    assert.deepEqual(match('/p/:slug', '/p/cute-top'), { slug: 'cute-top' })
    assert.equal(match('/p/:slug', '/p/cute-top/more'), null)
    assert.deepEqual(match('/', '/'), {})
    assert.deepEqual(match('/admin/*', '/admin/products/new'), { '*': 'products/new' })
  })
})

describe('seed catalog', () => {
  it('has 12 products, 3 tabs and valid outfit references', () => {
    assert.equal(seedProducts.length, 12)
    assert.equal(seedTabs.length, 3)
    const ids = new Set(seedProducts.map((p) => p.id))
    for (const o of seedOutfits) for (const it of o.outfit_items ?? []) assert.ok(ids.has(it.product_id))
    assert.equal(new Set(seedProducts.map((p) => p.slug)).size, 12, 'slugs are unique')
  })
})
