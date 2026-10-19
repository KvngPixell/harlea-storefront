import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { seedProducts } from '../src/data/seed.ts'
import { buildFeed, buildSitemap } from '../netlify/lib/feed.ts'
import { hidesPrice, isAmazonLink } from '../src/lib/amazon.ts'
import type { Product } from '../src/types.ts'

const withPhoto = (p: Product, url = 'https://cdn.example.com/a.jpg'): Product => ({ ...p, product_images: [{ id: 'i', product_id: p.id, url, alt: '', sort_order: 0 }] })

describe('product feed', () => {
  const cami = withPhoto(seedProducts.find((p) => p.slug === 'satin-bow-cami')!)
  const slip = withPhoto(seedProducts.find((p) => p.slug === 'vintage-lace-slip-dress')!)
  const flats = withPhoto(seedProducts.find((p) => p.slug === 'butter-yellow-ballet-flats')!)
  const xml = buildFeed({ products: [cami, slip, flats], origin: 'https://shop.example', brand: '96.co', title: '96.co' })

  it('emits one item per size with an item group', () => {
    assert.equal((xml.match(/<item>/g) ?? []).length, cami.sizes.length + 1)
    assert.match(xml, new RegExp(`<g:item_group_id>${cami.id}</g:item_group_id>`))
    assert.match(xml, /<g:size>XS<\/g:size>/)
  })
  it('has the fields Google, Pinterest and Meta require', () => {
    for (const tag of ['g:id', 'title', 'description', 'link', 'g:image_link', 'g:availability', 'g:price', 'g:condition', 'g:brand']) {
      assert.match(xml, new RegExp(`<${tag}>`), tag)
    }
    assert.match(xml, /<g:price>24\.00 USD<\/g:price>/)
    assert.match(xml, /<link>https:\/\/shop\.example\/p\/satin-bow-cami<\/link>/)
  })
  it('marks vintage pieces as used and leaves out affiliate items and SVG-only items', () => {
    assert.match(xml, /<g:condition>used<\/g:condition>/)
    assert.doesNotMatch(xml, /ballet-flats/)
    const svgOnly = buildFeed({ products: [seedProducts[0]], origin: 'https://s.example', brand: 'b', title: 't' })
    assert.equal((svgOnly.match(/<item>/g) ?? []).length, 0)
  })
  it('escapes XML', () => {
    const weird = withPhoto({ ...cami, sizes: [], name: 'Tom & Jerry <3', description: 'a "quote"' })
    const out = buildFeed({ products: [weird], origin: 'https://s.example', brand: 'b', title: 't' })
    assert.match(out, /Tom &amp; Jerry &lt;3/)
  })
  it('builds a sitemap', () => {
    assert.match(buildSitemap({ origin: 'https://s.example', paths: ['/', '/p/x'] }), /<loc>https:\/\/s\.example\/p\/x<\/loc>/)
  })
})

describe('Amazon price rule', () => {
  it('detects Amazon links', () => {
    assert.equal(isAmazonLink('https://www.amazon.com/dp/B0'), true)
    assert.equal(isAmazonLink('https://amzn.to/abc'), true)
    assert.equal(isAmazonLink('https://notamazon.example.com'), false)
    assert.equal(hidesPrice({ type: 'affiliate', affiliate_url: 'https://www.amazon.com/x' }), true)
    assert.equal(hidesPrice({ type: 'dropship', affiliate_url: 'https://www.amazon.com/x' }), false)
  })
})
