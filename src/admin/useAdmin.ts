import { useCallback, useEffect, useState } from 'react'
import { IS_DEMO } from '../lib/config'
import { store, type Catalog } from '../lib/store'
import { auth, db, getSession, type Session } from '../lib/supabase'
import { refreshCatalog } from '../lib/useCatalog'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; error?: string }
  | { status: 'not-admin'; email: string }
  | { status: 'admin'; email: string; demo: boolean }

const DEMO_FLAG = 'hs-demo-admin'

export function useAuth(): AuthState & { refresh: () => void; enterDemo: () => void; signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const check = useCallback(async (s: Session | null, error?: string) => {
    if (IS_DEMO) {
      let on = false
      try {
        on = sessionStorage.getItem(DEMO_FLAG) === '1'
      } catch {
        on = false
      }
      setState(on ? { status: 'admin', email: 'demo@preview', demo: true } : { status: 'signed-out' })
      return
    }
    if (!s) return setState({ status: 'signed-out', error })
    try {
      const ok = await db<boolean>('rpc/is_admin', { method: 'POST', body: {} })
      setState(ok ? { status: 'admin', email: s.user.email, demo: false } : { status: 'not-admin', email: s.user.email })
    } catch {
      setState({ status: 'signed-out', error: 'We couldn’t check your login. Please try again.' })
    }
  }, [])

  const refresh = useCallback(() => {
    if (IS_DEMO) return void check(null)
    auth
      .consumeRedirect()
      .then(async (fromLink) => check(fromLink ?? (await getSession())))
      .catch((e) => check(null, e instanceof Error ? e.message : 'Login failed'))
  }, [check])

  useEffect(() => {
    refresh()
    return auth.onChange((s) => {
      if (!s) setState({ status: 'signed-out' })
    })
  }, [refresh])

  return {
    ...state,
    refresh,
    enterDemo: () => {
      try {
        sessionStorage.setItem(DEMO_FLAG, '1')
      } catch {
        /* ignore */
      }
      setState({ status: 'admin', email: 'demo@preview', demo: true })
    },
    signOut: async () => {
      try {
        sessionStorage.removeItem(DEMO_FLAG)
      } catch {
        /* ignore */
      }
      await auth.signOut()
      setState({ status: 'signed-out' })
    },
  }
}

/** Everything (including hidden items) for the dashboard, plus a reload function. */
export function useAdminCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setCatalog(await store.loadCatalog({ includeHidden: true }))
      setError(null)
    } catch {
      setError('Couldn’t load your shop data. Check your internet and try again.')
    }
    refreshCatalog()
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { catalog, error, reload }
}
