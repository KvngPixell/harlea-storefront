import { useEffect, useState, type ReactNode } from 'react'
import { useBag } from '../lib/bag'
import { IS_DEMO } from '../lib/config'
import { cx } from '../lib/format'
import { Link, useLocation } from '../lib/router'
import { DEFAULT_SETTINGS } from '../lib/store'
import { useCatalog } from '../lib/useCatalog'
import {
  BagIcon,
  CloseIcon,
  FacebookIcon,
  HeartIcon,
  InstagramIcon,
  MailIcon,
  MenuIcon,
  Sparkle,
  TikTokIcon,
} from './Icons'

function Marquee({ text }: { text: string }) {
  if (!text.trim()) return null
  const items = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-6">
      {text}
      <Sparkle size={12} color="var(--color-butter)" />
    </span>
  ))
  return (
    <div className="overflow-hidden bg-rose py-2 font-display text-sm text-white" aria-label={text}>
      <div className="flex w-max animate-marquee whitespace-nowrap" aria-hidden="true">
        {items}
        {items}
      </div>
    </div>
  )
}

export function Header() {
  const { catalog } = useCatalog()
  const lines = useBag()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const settings = catalog?.settings ?? DEFAULT_SETTINGS
  const tabs = catalog?.tabs ?? []

  useEffect(() => setOpen(false), [pathname])

  const nav = [
    ...tabs.map((t) => ({ to: `/shop/${t.slug}`, label: t.name })),
    { to: '/build', label: 'Build a Look' },
    // Future: { to: '/media-kit', label: 'Media Kit' }  (reserved, not built yet)
  ]

  return (
    <header className="sticky top-0 z-40">
      <Marquee text={settings.announcement} />
      <div className="border-b-2 border-petal bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            className="btn btn-ghost btn-sm -ml-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link to="/" className="flex items-center gap-1.5 font-script text-[1.6rem] leading-none text-rose sm:text-3xl">
            {settings.brand_name}
            <Sparkle size={16} color="var(--color-hotpink)" className="animate-twinkle" />
          </Link>
          <nav aria-label="Shop sections" className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cx(
                  'rounded-full px-4 py-2 font-display font-medium transition hover:bg-blush',
                  pathname.startsWith(n.to) && 'bg-blush text-rose',
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link to="/bag" className="btn btn-soft btn-sm relative !px-3" aria-label={`Shopping bag, ${count} items`}>
            <BagIcon />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-rose px-1 font-display text-xs text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
        {open && (
          <nav aria-label="Shop sections" className="animate-pop-in border-t-2 border-petal px-4 pb-4 pt-2 md:hidden">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="block rounded-2xl px-4 py-3.5 font-display text-lg hover:bg-blush">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {IS_DEMO && (
        <div className="bg-butter px-4 py-1.5 text-center text-xs font-semibold text-ink">
          Preview shop ✦ sample products, checkout opens soon
        </div>
      )}
    </header>
  )
}

export function Footer() {
  const { catalog } = useCatalog()
  const s = catalog?.settings ?? DEFAULT_SETTINGS
  const socials = [
    { url: s.instagram_url, label: 'Instagram', Icon: InstagramIcon },
    { url: s.tiktok_url, label: 'TikTok', Icon: TikTokIcon },
    { url: s.facebook_url, label: 'Facebook', Icon: FacebookIcon },
    { url: s.contact_email ? `mailto:${s.contact_email}` : null, label: 'Email us', Icon: MailIcon },
  ].filter((x) => x.url)
  const links = [
    ['Shipping', '/info/shipping'],
    ['Returns', '/info/returns'],
    ['Privacy', '/info/privacy'],
    ['Terms', '/info/terms'],
    ['Affiliate & PR disclosure', '/info/disclosure'],
    ['Contact', '/info/contact'],
  ]
  return (
    <footer className="gingham mt-20 border-t-2 border-petal">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="card flex flex-col items-center gap-5 px-6 py-8 text-center">
          <p className="font-script text-3xl text-rose">{s.brand_name}</p>
          <p className="max-w-sm text-muted">{s.tagline}</p>
          {socials.length > 0 && (
            <ul className="flex gap-2">
              {socials.map(({ url, label, Icon }) => (
                <li key={label}>
                  <a href={url!} target={url!.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label} className="btn btn-soft btn-sm !px-3">
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Shop info" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {links.map(([label, to]) => (
              <Link key={to} to={to} className="underline-offset-4 hover:text-rose hover:underline">
                {label}
              </Link>
            ))}
          </nav>
          <p className="flex items-center gap-1 text-xs text-muted">
            made with <HeartIcon size={14} className="text-rose" /> · © {new Date().getFullYear()} {s.brand_name}
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
