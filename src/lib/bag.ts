// The shopping bag lives in this browser (localStorage) until checkout.
import { useSyncExternalStore } from 'react'
import type { CartLine } from '../types'

const KEY = 'hs-bag'
export const MAX_LINES = 10
export const MAX_QTY = 10
const listeners = new Set<() => void>()
let cached: CartLine[] | null = null
let cachedRaw: string | null = null

function read(): CartLine[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    raw = null
  }
  if (cached && raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cached = Array.isArray(parsed) ? parsed : []
  } catch {
    cached = []
  }
  return cached
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* storage unavailable: bag lasts until refresh */
    cached = lines
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((l) => l())
  })
}

const sameLine = (a: CartLine, productId: string, size: string | null) => a.productId === productId && a.size === size

export const bag = {
  lines: read,
  add(productId: string, size: string | null, quantity = 1, maxQty = MAX_QTY): { ok: boolean; message?: string } {
    const lines = [...read()]
    const existing = lines.find((l) => sameLine(l, productId, size))
    if (existing) {
      existing.quantity = Math.min(maxQty, existing.quantity + quantity)
    } else {
      if (lines.length >= MAX_LINES) return { ok: false, message: `Your bag can hold ${MAX_LINES} different items at a time.` }
      lines.push({ productId, size, quantity: Math.min(maxQty, quantity) })
    }
    write(lines.map((l) => ({ ...l })))
    return { ok: true }
  },
  setQuantity(productId: string, size: string | null, quantity: number) {
    write(
      read()
        .map((l) => (sameLine(l, productId, size) ? { ...l, quantity: Math.max(0, Math.min(MAX_QTY, quantity)) } : l))
        .filter((l) => l.quantity > 0),
    )
  },
  remove(productId: string, size: string | null) {
    write(read().filter((l) => !sameLine(l, productId, size)))
  },
  clear() {
    write([])
  },
}

export function useBag(): CartLine[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => [],
  )
}
