import { Link } from '../lib/router'
import { PageHeader, Panel } from './components'

const STEPS: Array<{ title: string; body: string; to: string; cta: string }> = [
  { title: '1. Add a product', body: 'Products → “Add a product”. Type a name and price, add photos (the first one is the main photo), pick what kind of item it is, then tap “Add product”. It shows up in the shop right away.', to: '/admin/products/new', cta: 'Add a product' },
  { title: '2. Hide, feature or mark sold', body: 'Tap the eye on any product to hide or show it. Open a product to feature it on the home page. One-of-a-kind pieces mark themselves SOLD when someone buys them.', to: '/admin/products', cta: 'See products' },
  { title: '3. Organize your tabs', body: 'Shop tabs are the sections in the menu. Drag the dots to reorder, tap a name to rename, or tap the eye to hide a whole tab.', to: '/admin/tabs', cta: 'Shop tabs' },
  { title: '4. Style an outfit', body: 'Outfits → “New outfit”. Tap the pieces you want, drag them into order and save. Pieces from other stores? Add them as products with type “Link to another store” first.', to: '/admin/outfits/new', cta: 'New outfit' },
  { title: '5. Drop ideas in the inbox', body: 'Idea inbox → add a pic or a few words. Matching pieces get added for you to approve. Then one tap turns them into a draft outfit.', to: '/admin/ideas', cta: 'Idea inbox' },
  { title: '6. Ship your orders', body: 'Home shows sales and how many orders are waiting. In Orders, open one to see the address and items, then tap “Mark as shipped”. For “Supplier ships” items, place the order with your supplier.', to: '/admin/orders', cta: 'Orders' },
]

export default function Help() {
  return (
    <>
      <PageHeader title="Help & 2-minute tour" subtitle="Everything you can do here, in six steps." />
      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s) => (
          <Panel key={s.title} title={s.title}>
            <p className="text-ink/85">{s.body}</p>
            <Link to={s.to} className="btn btn-soft btn-sm mt-4">{s.cta} →</Link>
          </Panel>
        ))}
      </div>
      <Panel title="Good to know" className="mt-4">
        <ul className="list-disc space-y-2 pl-5 text-ink/85">
          <li>See a <strong>?</strong> next to something? Tap it for a quick explanation.</li>
          <li>Nothing you do here can break the website. Worst case, hide something and ask Isaac.</li>
          <li>Changing colors or fonts is a code change. Ask Isaac (it’s in the README).</li>
          <li>Payments are in <strong>test mode</strong> until Isaac switches Stripe to live, so no real money moves yet.</li>
        </ul>
      </Panel>
    </>
  )
}
