// No imports on purpose: used by the shop, the dashboard and tests.
import type { Product } from '../types'

/** Amazon's rules don't allow showing their prices on our site, so we hide them. */
export function isAmazonLink(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return /(^|\.)amazon\.[a-z.]+$/.test(host) || host === 'amzn.to' || host.endsWith('.amzn.to')
  } catch {
    return false
  }
}

export function hidesPrice(p: Pick<Product, 'type' | 'affiliate_url'>): boolean {
  return p.type === 'affiliate' && isAmazonLink(p.affiliate_url)
}
