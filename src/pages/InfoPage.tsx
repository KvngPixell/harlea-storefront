import type { ReactNode } from 'react'
import { useCatalog } from '../lib/useCatalog'
import { DEFAULT_SETTINGS } from '../lib/store'
import NotFound from './NotFound'

// Plain-language shop policies. Please review these before going live with real sales.
function pages(brand: string, email: string | null): Record<string, { title: string; body: ReactNode }> {
  const contact = email ? <a className="text-rose underline" href={`mailto:${email}`}>{email}</a> : 'the contact link in our social bios'
  return {
    shipping: {
      title: 'Shipping',
      body: (
        <>
          <p>We ship within the United States. Shipping is a flat $4.99, and <strong>free on orders over $75</strong>.</p>
          <p><strong>One-of-one pieces</strong> ship from us within 2–4 business days.</p>
          <p><strong>Fresh Drops</strong> ship from our trusted partners and usually arrive in 7–14 business days. You’ll get tracking by email once your order ships.</p>
          <p>Questions about an order? Reach us at {contact}.</p>
        </>
      ),
    },
    returns: {
      title: 'Returns',
      body: (
        <>
          <p>Want to return something? Contact us within <strong>14 days</strong> of delivery at {contact}.</p>
          <p>Items must be unworn, unwashed and in original condition. Once we receive the return we’ll refund your original payment method (shipping costs aren’t refundable).</p>
          <p><strong>One-of-one and vintage pieces are final sale</strong> unless they arrive damaged or not as described.</p>
          <p>Items bought through partner links (marked “Buy at …”) follow that store’s return policy.</p>
        </>
      ),
    },
    privacy: {
      title: 'Privacy',
      body: (
        <>
          <p>{brand} respects your privacy. Here’s what we collect and why:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Orders:</strong> your name, email and shipping address, so we can send your order. Payments are handled by Stripe; we never see or store your card number.</li>
            <li><strong>Your bag:</strong> saved only in your own browser until checkout.</li>
            <li><strong>Partner links:</strong> stores you visit through our links may use cookies to know we referred you.</li>
          </ul>
          <p>We don’t sell your information. To see or delete your data, email {contact}.</p>
        </>
      ),
    },
    terms: {
      title: 'Terms',
      body: (
        <>
          <p>By shopping with {brand} you agree to these simple terms.</p>
          <p>Prices are in US dollars and may change. We do our best to show colors and details accurately, but screens vary. Vintage and thrifted items may show gentle signs of wear, which we describe as best we can.</p>
          <p>If an item sells out after you order, we’ll refund you in full. We may cancel orders that look fraudulent.</p>
          <p>Products sold by other stores through our links are their responsibility, including shipping and returns.</p>
          <p>Questions? {contact}</p>
        </>
      ),
    },
    disclosure: {
      title: 'Affiliate & PR disclosure',
      body: (
        <>
          <p>Honesty matters to us. 💕</p>
          <p><strong>Affiliate links:</strong> some links on this site (marked “Buy at …”) are affiliate links. If you buy through them, we may earn a small commission <strong>at no extra cost to you</strong>.</p>
          <p><strong>Gifted / PR products:</strong> sometimes brands send us products for free. When a product or post features something we were gifted or paid to share, we’ll clearly say so (for example “gifted” or “#ad”).</p>
          <p>We only recommend things we actually like, and our opinions are always our own.</p>
        </>
      ),
    },
    contact: {
      title: 'Contact',
      body: (
        <>
          <p>We’d love to hear from you! Questions about an order, sizing, or collabs: reach us at {contact}.</p>
          <p>We usually reply within 1–2 days.</p>
        </>
      ),
    },
  }
}

export default function InfoPage({ page }: { page: string }) {
  const { catalog } = useCatalog()
  const s = catalog?.settings ?? DEFAULT_SETTINGS
  const content = pages(s.brand_name, s.contact_email)[page]
  if (!content) return <NotFound />
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12">
      <p className="font-script text-xl text-rose">{s.brand_name}</p>
      <h1 className="text-4xl font-semibold">{content.title}</h1>
      <div className="card mt-6 space-y-4 px-6 py-7 leading-relaxed">{content.body}</div>
    </article>
  )
}
