import { useEffect, useState } from 'react'
import { store, type Catalog } from './store'

// One shared copy of the public catalog per page load.
let pending: Promise<Catalog> | null = null
let latest: Catalog | null = null
const subscribers = new Set<() => void>()

function load(): Promise<Catalog> {
  pending ??= store.loadCatalog().then((c) => {
    latest = c
    return c
  })
  return pending
}

/** Call after admin changes so the storefront shows fresh data. */
export function refreshCatalog() {
  pending = null
  subscribers.forEach((s) => s())
}

export function useCatalog(): { catalog: Catalog | null; error: string | null; retry: () => void } {
  const [catalog, setCatalog] = useState<Catalog | null>(latest)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    subscribers.add(bump)
    return () => {
      subscribers.delete(bump)
    }
  }, [])

  useEffect(() => {
    let alive = true
    load()
      .then((c) => {
        if (!alive) return
        setCatalog(c)
        setError(null)
      })
      .catch(() => {
        if (!alive) return
        pending = null
        setError('We couldn’t load the shop just now. Please check your connection and try again.')
      })
    return () => {
      alive = false
    }
  }, [version])

  return { catalog, error, retry: refreshCatalog }
}
