// Helpers for "Buy at …" links to other stores.
import type { AnchorHTMLAttributes } from 'react'
import type { Product } from '../types'
import { store } from './store'
export { hidesPrice, isAmazonLink } from './amazon'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { product: Product; source: string }

/** An outbound affiliate link that counts the click (for the dashboard) without slowing the shopper down. */
export function AffiliateLink({ product, source, onClick, children, ...rest }: Props) {
  return (
    <a
      href={product.affiliate_url ?? '#'}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={(e) => {
        onClick?.(e)
        store.trackClick(product.id, source)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
