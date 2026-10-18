import { lazy, Suspense, useEffect } from 'react'
import { Shell } from './components/Layout'
import { Spinner, Toaster } from './components/ui'
import { match, useLocation } from './lib/router'
import BagPage from './pages/BagPage'
import Home from './pages/Home'
import InfoPage from './pages/InfoPage'
import NotFound from './pages/NotFound'
import OrderSuccess from './pages/OrderSuccess'
import OutfitBuilder from './pages/OutfitBuilder'
import OutfitPage from './pages/OutfitPage'
import ProductPage from './pages/ProductPage'
import TabPage from './pages/TabPage'
import { useCatalog } from './lib/useCatalog'

// The admin dashboard is loaded only when someone visits /admin (keeps the shop fast).
const AdminApp = lazy(() => import('./admin/AdminApp'))

function StorePage({ pathname }: { pathname: string }) {
  let m: Record<string, string> | null
  if (match('/', pathname)) return <Home />
  if ((m = match('/shop/:slug', pathname))) return <TabPage slug={m.slug} />
  if ((m = match('/p/:slug', pathname))) return <ProductPage slug={m.slug} />
  if ((m = match('/looks/:slug', pathname))) return <OutfitPage slug={m.slug} />
  if (match('/build', pathname)) return <OutfitBuilder />
  if (match('/bag', pathname)) return <BagPage />
  if (match('/order/success', pathname)) return <OrderSuccess />
  if ((m = match('/info/:page', pathname))) return <InfoPage page={m.page} />
  return <NotFound />
}

export default function App() {
  const { pathname } = useLocation()
  const { catalog } = useCatalog()
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  useEffect(() => {
    if (!isAdmin && catalog) document.title = catalog.settings.brand_name
  }, [pathname, isAdmin, catalog])

  return (
    <>
      {isAdmin ? (
        <Suspense fallback={<Spinner label="Opening your dashboard…" />}>
          <AdminApp />
        </Suspense>
      ) : (
        <Shell>
          <StorePage pathname={pathname} />
        </Shell>
      )}
      <Toaster />
    </>
  )
}
