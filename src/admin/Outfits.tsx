import { EyeIcon, EyeOffIcon, PlusIcon } from '../components/Icons'
import { OutfitCollage, outfitPieces, outfitTotal } from '../components/OutfitCard'
import { EmptyState, toast } from '../components/ui'
import { cx, money } from '../lib/format'
import { Link } from '../lib/router'
import { store } from '../lib/store'
import { useAdminCtx } from './AdminApp'
import { PageHeader, reportError, SortableList } from './components'

export default function Outfits() {
  const { catalog, reload } = useAdminCtx()

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      await reload()
      toast(msg)
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <>
      <PageHeader
        title="Outfits"
        subtitle="Put pieces together into looks. Each piece shows its price and where to buy it."
        actions={<Link to="/admin/outfits/new" className="btn btn-primary"><PlusIcon size={20} /> New outfit</Link>}
      />
      {catalog.outfits.length === 0 ? (
        <EmptyState title="No outfits yet">Tap “New outfit” to style your first look.</EmptyState>
      ) : (
        <SortableList
          label="Outfits"
          items={catalog.outfits}
          onReorder={(ids) => run(() => store.reorder('outfits', ids), 'Order saved ✓')}
          render={(o, handle) => {
            const pieces = outfitPieces(o, catalog.products)
            const tab = catalog.tabs.find((t) => t.id === o.tab_id)
            return (
              <div className={cx('flex items-center gap-2 rounded-3xl bg-white p-2 ring-2 ring-petal sm:gap-3', !o.is_published && 'opacity-70')}>
                {handle}
                <Link to={`/admin/outfits/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="w-16 shrink-0"><OutfitCollage pieces={pieces} cover={o.cover_image_url} /></div>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-semibold">{o.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {pieces.length} pieces · {money(outfitTotal(pieces))}{tab ? ` · ${tab.name}` : ' · no tab'}{!o.is_published && ' · hidden'}
                    </span>
                  </span>
                </Link>
                <button className="btn btn-ghost btn-sm !px-2.5" aria-label={o.is_published ? `Hide ${o.name}` : `Show ${o.name}`}
                  onClick={() => run(() => store.saveOutfit({ ...o, is_published: !o.is_published }, (o.outfit_items ?? []).map((i) => i.product_id)), o.is_published ? 'Outfit hidden' : 'Outfit is live ✨')}>
                  {o.is_published ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            )
          }}
        />
      )}
    </>
  )
}
