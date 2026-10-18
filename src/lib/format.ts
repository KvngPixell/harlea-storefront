/** 2400 -> "$24" ; 3999 -> "$39.99" */
export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return ''
  const dollars = cents / 100
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/** "$24.50" or "24.5" -> 2450. Returns null when it isn't a price. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  return Math.round(parseFloat(cleaned) * 100)
}

/** "Satin Bow Cami!" -> "satin-bow-cami" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Joins class names, skipping empty ones. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function uid(): string {
  return crypto.randomUUID()
}
