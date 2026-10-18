// Shared shapes used by the storefront, admin and server functions.

export type ProductType = 'dropship' | 'unique' | 'affiliate'
export type Category =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'accessory'
  | 'beauty'
  | 'other'
export type TabKind = 'products' | 'outfits'
export type IdeaStatus = 'new' | 'sourcing' | 'ready' | 'published'
export type OrderStatus = 'paid' | 'fulfilled' | 'refunded' | 'canceled'

export interface Tab {
  id: string
  name: string
  slug: string
  description: string
  kind: TabKind
  sort_order: number
  is_published: boolean
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt: string
  sort_order: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  type: ProductType
  category: Category
  price_cents: number
  compare_at_cents: number | null
  sizes: string[]
  tab_id: string | null
  store_name: string | null
  affiliate_url: string | null
  is_featured: boolean
  is_sold: boolean
  is_published: boolean
  sort_order: number
  created_at?: string
  product_images?: ProductImage[]
}

export interface ProductPrivate {
  product_id: string
  supplier_name: string | null
  supplier_url: string | null
  cost_cents: number | null
  notes: string
}

export interface OutfitItem {
  id: string
  outfit_id: string
  product_id: string
  sort_order: number
}

export interface Outfit {
  id: string
  name: string
  slug: string
  description: string
  tab_id: string | null
  cover_image_url: string | null
  is_published: boolean
  sort_order: number
  outfit_items?: OutfitItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  name: string
  size: string | null
  unit_price_cents: number
  quantity: number
  product_type: string | null
}

export interface Order {
  id: string
  stripe_session_id: string
  email: string | null
  customer_name: string | null
  amount_total_cents: number
  amount_shipping_cents: number
  currency: string
  status: OrderStatus
  livemode: boolean
  shipping: unknown
  created_at: string
  order_items?: OrderItem[]
}

export interface IdeaSuggestion {
  name: string
  store: string
  url: string
  price_cents: number | null
  image_url?: string | null
  note?: string
  decision?: 'approved' | 'rejected' | null
}

export interface Idea {
  id: string
  title: string
  notes: string
  image_url: string | null
  status: IdeaStatus
  suggestions: IdeaSuggestion[]
  created_at: string
}

/** One line in the shopping bag / checkout request. */
export interface CartLine {
  productId: string
  quantity: number
  size: string | null
}
