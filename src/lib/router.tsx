// A tiny router (a few dozen lines instead of a big library).
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', notify)
}

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  if (opts.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  notify()
  if (!opts.keepScroll) window.scrollTo({ top: 0 })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Current location as "/path?query". Re-renders on navigation. */
export function useLocation(): { pathname: string; search: URLSearchParams } {
  const href = useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.search,
    () => '/',
  )
  const [pathname, query = ''] = href.split('?')
  return { pathname, search: new URLSearchParams(query) }
}

/** match('/p/:slug', '/p/cute-top') -> { slug: 'cute-top' } ; no match -> null. '*' matches the rest. */
export function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const s = pathname.split('/').filter(Boolean)
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') {
      params['*'] = s.slice(i).join('/')
      return params
    }
    if (s[i] === undefined) return null
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return p.length === s.length ? params : null
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (rest.target && rest.target !== '_self') return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}
