import { ArrowRightIcon, HangerIcon, Sparkle } from '../components/Icons'
import { OutfitCard } from '../components/OutfitCard'
import { ProductGrid } from '../components/ProductCard'
import { ErrorState, ProductImg, SectionTitle, Spinner } from '../components/ui'
import { Link } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'

export default function Home() {
  const { catalog, error, retry } = useCatalog()
  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />

  const { tabs, products, outfits, settings } = catalog
  const shopTabs = tabs.filter((t) => t.kind === 'products')
  const looksTab = tabs.find((t) => t.kind === 'outfits')
  const listed = products.filter((p) => p.tab_id && tabs.some((t) => t.id === p.tab_id))
  const featured = (listed.filter((p) => p.is_featured && !p.is_sold).length >= 4
    ? listed.filter((p) => p.is_featured && !p.is_sold)
    : listed.filter((p) => !p.is_sold)
  ).slice(0, 8)
  const heroPics = featured.slice(0, 3)
  const uniques = listed.filter((p) => p.type === 'unique' && !p.is_sold).slice(0, 8)

  return (
    <>
      {/* HERO */}
      <section className="gingham relative overflow-hidden border-b-2 border-petal">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="relative z-10 text-center md:text-left">
            <p className="chip mb-4 bg-white text-rose shadow-soft">
              <Sparkle size={12} color="var(--color-hotpink)" /> new drops every week
            </p>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl">
              {settings.tagline.split('&')[0]}
              {settings.tagline.includes('&') && (
                <>
                  <span className="font-script text-rose">&amp;</span>
                  {settings.tagline.split('&').slice(1).join('&')}
                </>
              )}
            </h1>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              {shopTabs[0] && (
                <Link to={`/shop/${shopTabs[0].slug}`} className="btn btn-primary text-lg">
                  Shop {shopTabs[0].name} <ArrowRightIcon size={20} />
                </Link>
              )}
              {looksTab && (
                <Link to={`/shop/${looksTab.slug}`} className="btn btn-soft text-lg">
                  See {looksTab.name}
                </Link>
              )}
            </div>
          </div>
          <div className="relative mx-auto h-[300px] w-full max-w-[420px] sm:h-[380px]" aria-hidden="true">
            {heroPics.map((p, i) => (
              <Link
                key={p.id}
                to={`/p/${p.slug}`}
                tabIndex={-1}
                className="absolute block w-[46%] rounded-3xl bg-white p-2 pb-6 shadow-pop ring-2 ring-petal animate-float"
                style={{
                  left: ['2%', '52%', '27%'][i],
                  top: ['8%', '0%', '38%'][i],
                  rotate: ['-6deg', '5deg', '-2deg'][i],
                  animationDelay: `${i * -2}s`,
                  zIndex: [1, 2, 3][i],
                }}
              >
                <ProductImg product={p} className="aspect-[4/5] w-full rounded-2xl" />
              </Link>
            ))}
            <Sparkle size={40} color="var(--color-hotpink)" className="absolute -left-2 bottom-6 animate-twinkle" />
            <Sparkle size={28} color="#fff" className="absolute right-2 top-1/2 animate-twinkle [animation-delay:-1s]" />
          </div>
        </div>
      </section>

      {/* QUICK TABS */}
      <nav aria-label="Shop sections" className="mx-auto -mt-6 flex max-w-6xl flex-wrap justify-center gap-2 px-4">
        {tabs.map((t) => (
          <Link key={t.id} to={`/shop/${t.slug}`} className="btn btn-soft relative z-10 bg-white shadow-soft">
            {t.name}
          </Link>
        ))}
        <Link to="/build" className="btn btn-soft relative z-10 bg-white shadow-soft">
          <HangerIcon size={18} /> Build a Look
        </Link>
      </nav>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <SectionTitle kicker="fresh picks" title="Featured Drops">
            Our current favorites. Tap anything to see sizes and details.
          </SectionTitle>
          <ProductGrid products={featured} />
        </section>
      )}

      {/* LOOKS */}
      {outfits.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <SectionTitle kicker="styled by us" title={looksTab?.name ?? 'Curated Looks'}>
            Full outfits with every piece, its price and where to get it.
          </SectionTitle>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.slice(0, 3).map((o) => (
              <li key={o.id}>
                <OutfitCard outfit={o} products={products} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* BUILD CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-lilac px-6 py-10 text-center ring-2 ring-white sm:py-14">
          <Sparkle size={30} color="#fff" className="absolute left-6 top-6 animate-twinkle" />
          <Sparkle size={22} color="var(--color-hotpink)" className="absolute bottom-8 right-10 animate-twinkle [animation-delay:-1.2s]" />
          <p className="font-script text-2xl text-lilac-deep">your turn!</p>
          <h2 className="mt-1 text-3xl font-semibold sm:text-4xl">Build your own look</h2>
          <p className="mx-auto mt-2 max-w-md text-ink/80">Mix and match pieces, see the total, then grab them all in one go.</p>
          <Link to="/build" className="btn btn-primary mt-6 text-lg">
            Start styling <ArrowRightIcon size={20} />
          </Link>
        </div>
      </section>

      {/* ONE OF ONE */}
      {uniques.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <SectionTitle kicker="only one each" title="One-of-One Treasures">
            Vintage and thrifted finds. When they’re gone, they’re gone!
          </SectionTitle>
          <ProductGrid products={uniques.slice(0, 4)} />
        </section>
      )}
    </>
  )
}
