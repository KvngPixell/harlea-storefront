import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  BulbIcon,
  CloseIcon,
  FolderIcon,
  GearIcon,
  HangerIcon,
  HelpIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  ReceiptIcon,
  Sparkle,
  TagIcon,
} from '../components/Icons'
import { ErrorState, Spinner } from '../components/ui'
import { cx } from '../lib/format'
import { Link, match, useLocation } from '../lib/router'
import type { Catalog } from '../lib/store'
import Help from './Help'
import Ideas from './Ideas'
import Login from './Login'
import Orders from './Orders'
import OutfitEditor from './OutfitEditor'
import Outfits from './Outfits'
import Overview from './Overview'
import ProductEditor from './ProductEditor'
import Products from './Products'
import Settings from './Settings'
import Tabs from './Tabs'
import { useAdminCatalog, useAuth } from './useAdmin'

interface AdminCtx {
  catalog: Catalog
  reload: () => Promise<void>
  demo: boolean
  email: string
}
const Ctx = createContext<AdminCtx | null>(null)
export function useAdminCtx(): AdminCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('admin context missing')
  return v
}

const NAV = [
  { to: '/admin', label: 'Home', Icon: HomeIcon, exact: true },
  { to: '/admin/orders', label: 'Orders', Icon: ReceiptIcon },
  { to: '/admin/products', label: 'Products', Icon: TagIcon },
  { to: '/admin/tabs', label: 'Shop tabs', Icon: FolderIcon },
  { to: '/admin/outfits', label: 'Outfits', Icon: HangerIcon },
  { to: '/admin/ideas', label: 'Idea inbox', Icon: BulbIcon },
  { to: '/admin/settings', label: 'Settings', Icon: GearIcon },
  { to: '/admin/help', label: 'Help', Icon: HelpIcon },
]

function Page({ pathname }: { pathname: string }) {
  let m: Record<string, string> | null
  if (match('/admin', pathname)) return <Overview />
  if (match('/admin/orders', pathname)) return <Orders />
  if (match('/admin/products', pathname)) return <Products />
  if ((m = match('/admin/products/:id', pathname))) return <ProductEditor id={m.id} />
  if (match('/admin/tabs', pathname)) return <Tabs />
  if (match('/admin/outfits', pathname)) return <Outfits />
  if ((m = match('/admin/outfits/:id', pathname))) return <OutfitEditor id={m.id} />
  if (match('/admin/ideas', pathname)) return <Ideas />
  if (match('/admin/settings', pathname)) return <Settings />
  if (match('/admin/help', pathname)) return <Help />
  return <ErrorState message="That dashboard page doesn’t exist." />
}

function Frame({ children, onSignOut, email, demo, brand }: { children: ReactNode; onSignOut: () => void; email: string; demo: boolean; brand: string }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map(({ to, label, Icon, exact }) => (
        <Link
          key={to}
          to={to}
          aria-current={isActive(to, exact) ? 'page' : undefined}
          className={cx(
            'flex items-center gap-3 rounded-2xl px-4 py-3 font-display font-medium transition',
            isActive(to, exact) ? 'bg-rose text-white shadow-[0_3px_0_0_var(--color-rose-deep)]' : 'hover:bg-blush',
          )}
        >
          <Icon size={20} /> {label}
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r-2 border-petal bg-white/70 p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <Link to="/admin" className="mb-6 flex items-center gap-1.5 px-2 font-script text-2xl text-rose">
          {brand} <Sparkle size={14} color="var(--color-hotpink)" />
        </Link>
        {nav}
        <div className="mt-auto space-y-2 px-2 pt-6 text-sm">
          <Link to="/" target="_blank" className="block text-rose underline">View my shop ↗</Link>
          <p className="truncate text-muted" title={email}>{demo ? 'Practice mode' : email}</p>
          <button className="btn btn-ghost btn-sm !px-0" onClick={onSignOut}><LogoutIcon size={18} /> Log out</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-petal bg-cream/95 px-4 py-2 backdrop-blur lg:hidden">
          <button className="btn btn-ghost btn-sm -ml-2" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link to="/admin" className="font-script text-xl text-rose">{brand}</Link>
          <Link to="/" target="_blank" className="btn btn-ghost btn-sm">Shop ↗</Link>
        </header>
        {open && (
          <div className="border-b-2 border-petal bg-white p-4 lg:hidden">
            {nav}
            <button className="btn btn-ghost btn-sm mt-3" onClick={onSignOut}><LogoutIcon size={18} /> Log out</button>
          </div>
        )}
        {demo && (
          <div className="bg-butter px-4 py-2 text-center text-sm font-semibold">
            Practice mode: changes stay in this browser until the shop database is connected.
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const authState = useAuth()
  const { pathname } = useLocation()
  const signedIn = authState.status === 'admin'
  useEffect(() => {
    document.title = 'Dashboard'
  }, [])

  if (authState.status === 'loading') return <Spinner label="Checking your login…" />
  if (authState.status === 'signed-out')
    return <Login error={authState.error} onDemo={authState.enterDemo} onSignedIn={authState.refresh} />
  if (authState.status === 'not-admin') {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="card max-w-md px-6 py-8 text-center">
          <h1 className="text-2xl font-semibold">Almost!</h1>
          <p className="mt-2 text-muted">
            You’re logged in as <strong>{authState.email}</strong>, but that email isn’t on the shop’s team list yet. Ask Isaac to add it.
          </p>
          <button className="btn btn-soft mt-5" onClick={authState.signOut}>Log out</button>
        </div>
      </div>
    )
  }
  return signedIn ? <AdminData pathname={pathname} email={authState.email} demo={authState.demo} onSignOut={authState.signOut} /> : null
}

function AdminData({ pathname, email, demo, onSignOut }: { pathname: string; email: string; demo: boolean; onSignOut: () => Promise<void> }) {
  const { catalog, error, reload } = useAdminCatalog()
  if (error) return <div className="p-8"><ErrorState message={error} onRetry={() => void reload()} /></div>
  if (!catalog) return <Spinner label="Loading your shop…" />
  return (
    <Ctx.Provider value={{ catalog, reload, demo, email }}>
      <Frame onSignOut={() => void onSignOut()} email={email} demo={demo} brand={catalog.settings.brand_name}>
        <Page pathname={pathname} />
      </Frame>
    </Ctx.Provider>
  )
}
