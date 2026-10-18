// Small client for Supabase's documented REST APIs (database, auth, storage).
// We use plain fetch instead of the big SDK to keep the site light and simple.
import { MEDIA_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

export interface AuthUser {
  id: string
  email: string
}
export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number // unix seconds
  user: AuthUser
}

const SESSION_KEY = 'hs-auth-session'
const authListeners = new Set<(s: Session | null) => void>()
let refreshing: Promise<Session | null> | null = null

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function storeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* private browsing: session lasts for this tab only */
  }
  authListeners.forEach((l) => l(s))
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {}
  try {
    body = await res.json()
  } catch {
    /* not JSON */
  }
  const message =
    (body.error_description as string) ||
    (body.msg as string) ||
    (body.message as string) ||
    (body.error as string) ||
    `Request failed (${res.status})`
  return new ApiError(message, res.status, (body.code as string) || (body.error_code as string))
}

function toSession(data: {
  access_token: string
  refresh_token: string
  expires_in?: number
  expires_at?: number
  user?: { id: string; email?: string }
}): Session {
  const expires_at = data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at,
    user: { id: data.user?.id ?? '', email: (data.user?.email ?? '').toLowerCase() },
  }
}

async function authFetch(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('apikey', SUPABASE_ANON_KEY)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${SUPABASE_URL}/auth/v1${path}`, { ...init, headers })
}

async function refreshSession(s: Session): Promise<Session | null> {
  const res = await authFetch('/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  })
  if (!res.ok) {
    storeSession(null)
    return null
  }
  const next = toSession(await res.json())
  storeSession(next)
  return next
}

/** Returns a session whose token is still valid (refreshing it if needed), or null. */
export async function getSession(): Promise<Session | null> {
  const s = readStoredSession()
  if (!s) return null
  if (s.expires_at - 60 > Date.now() / 1000) return s
  refreshing ??= refreshSession(s).finally(() => {
    refreshing = null
  })
  return refreshing
}

export const auth = {
  onChange(cb: (s: Session | null) => void) {
    authListeners.add(cb)
    return () => {
      authListeners.delete(cb)
    }
  },

  /** Sends a one-click login link by email. */
  async sendMagicLink(email: string, redirectTo: string) {
    const res = await authFetch(`/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: true }),
    })
    if (!res.ok) throw await parseError(res)
  },

  async signInWithPassword(email: string, password: string) {
    const res = await authFetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (!res.ok) throw await parseError(res)
    const s = toSession(await res.json())
    storeSession(s)
    return s
  },

  /** After clicking the email link, the tokens arrive in the URL (#access_token=...). */
  async consumeRedirect(): Promise<Session | null> {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (hash.get('error_description')) {
      history.replaceState(null, '', window.location.pathname)
      throw new ApiError(hash.get('error_description') ?? 'Login link failed', 400)
    }
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    if (!access_token || !refresh_token) return null
    history.replaceState(null, '', window.location.pathname + window.location.search)
    const res = await authFetch('/user', {}, access_token)
    if (!res.ok) throw await parseError(res)
    const user = await res.json()
    const s = toSession({
      access_token,
      refresh_token,
      expires_at: Number(hash.get('expires_at')) || undefined,
      expires_in: Number(hash.get('expires_in')) || 3600,
      user,
    })
    storeSession(s)
    return s
  },

  async setPassword(password: string) {
    const s = await getSession()
    if (!s) throw new ApiError('Please log in again.', 401)
    const res = await authFetch('/user', { method: 'PUT', body: JSON.stringify({ password }) }, s.access_token)
    if (!res.ok) throw await parseError(res)
  },

  async signOut() {
    const s = readStoredSession()
    storeSession(null)
    if (s) await authFetch('/logout', { method: 'POST' }, s.access_token).catch(() => undefined)
  },
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** Calls the database API. `path` looks like "products?select=*&is_published=eq.true". */
export async function db<T = unknown>(
  path: string,
  opts: { method?: Method; body?: unknown; prefer?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const session = await getSession()
  const headers = new Headers({ apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' })
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
  if (opts.prefer) headers.set('Prefer', opts.prefer)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}

/** Uploads a file to the media bucket and returns its public URL. */
export async function uploadMedia(path: string, file: Blob): Promise<string> {
  const session = await getSession()
  if (!session) throw new ApiError('Please log in again.', 401)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
      'cache-control': '31536000',
    },
    body: file,
  })
  if (!res.ok) throw await parseError(res)
  return publicUrl(path)
}

/** Deletes a file we uploaded (ignores files that aren't in our bucket). */
export async function deleteMedia(url: string): Promise<void> {
  const prefix = publicUrl('')
  if (!url.startsWith(prefix)) return
  const session = await getSession()
  if (!session) return
  await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${url.slice(prefix.length)}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
  }).catch(() => undefined)
}
