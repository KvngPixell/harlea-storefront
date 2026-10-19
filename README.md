# 96.co (Harlea’s shop) 🎀

A girly-pop online shop you can link from Instagram/TikTok/Facebook bios, plus a simple
dashboard for Harlea to run it, no coding needed.

- **Shop:** `https://harlea-storefront.netlify.app`
- **Dashboard:** add `/admin` to the end, e.g. `https://harlea-storefront.netlify.app/admin`

---

## For Harlea: everyday things (no code)

Everything below happens in the **dashboard** (`/admin`). Log in with your email; you’ll get a
login link. (You can also set a password in Settings.)

| I want to… | Go to |
|---|---|
| Add a product | **Products → Add a product**. Name, price, photos, type, then “Add product”. |
| Hide / show something | Tap the 👁 eye next to it |
| Mark a one-of-one piece sold | Happens automatically when it sells (or open it and flip **Sold**) |
| Change the order things appear | Drag the six dots ⋮⋮ (Products: pick a tab first) |
| Add / rename / hide a shop tab | **Shop tabs** |
| Make an outfit | **Outfits → New outfit**, tap pieces, save |
| Save an outfit idea or pic | **Idea inbox** |
| See sales | **Home** |
| Ship an order | **Orders**, open the order, “Mark as shipped” |
| Change the shop name, banner text, social links | **Settings** |

Tap any **?** in the dashboard for a quick explanation. **Help** has a 2-minute tour.

**Three kinds of products**
- **Supplier ships it** (dropship): you sell it; your supplier sends it to the buyer. Place the order with the supplier when it sells.
- **One of a kind**: something you own (vintage, thrifted, handmade). Only one can be bought.
- **Link to another store** (affiliate): shoppers buy it on another site through your link. The shop automatically shows the required “affiliate link” notice.

---

## For whoever edits the code

### Change colors or fonts
Open `src/styles/index.css`. The block at the top (`@theme static { … }`) holds every color
and font, e.g.

```css
--color-rose: #d61f69;   /* buttons & links */
--color-blush: #ffe8f0;  /* soft pink panels */
```

Change a value, save, and the whole site updates. Keep button/text colors dark enough to
read on white (the current ones pass accessibility contrast checks).

Fonts live in `public/fonts/` (Fredoka for headings, Nunito for text, Pacifico for the logo).

### Project layout

```
src/
  pages/        the shop pages (home, tabs, product, outfit, build-a-look, bag, policies)
  admin/        the dashboard
  components/   shared pieces (header, footer, product cards, icons)
  lib/          data, login, bag, router, checkout helpers
  data/seed.ts  the sample catalog (used until the database is connected)
  styles/       colors, fonts, buttons
netlify/
  functions/    server code: checkout, order confirmation, Stripe webhook
  lib/          shared server helpers (pricing rules, Stripe calls)
supabase/
  migrations/   database tables, security rules (RLS) and sample data
tests/          unit tests + database security tests
```

### Run it on your computer

```bash
npm install
npm run dev        # opens the site at http://localhost:5173
npm run check      # lint + typecheck + tests + build (same as CI)
```

Without a `.env` file the site runs in **demo mode** with sample products (the dashboard
saves changes only in your browser). Copy `.env.example` to `.env` to connect the real database.

### Settings (environment variables)

Set these in **Netlify → harlea-storefront → Project configuration → Environment variables**.
Never commit real values. See `.env.example` for the full list.

| Name | What it is |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Database address + public key (website) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Same values, for the server functions |
| `ORDER_RPC_SECRET` | Random secret that lets only our server record orders |
| `STRIPE_SECRET_KEY` | Stripe key (`sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | Optional, if a Stripe webhook is set up |
| `SHIPPING_CENTS`, `FREE_SHIPPING_OVER_CENTS` | Optional: shipping price & free-shipping threshold |

### Give someone dashboard access
Run in the Supabase SQL editor (use a lower-case email):

```sql
insert into public.admin_users (email) values ('someone@example.com');
```

They log in at `/admin` with that email. Remove access with `delete from public.admin_users where email = '…';`

### How it’s built
- **Vite + React + TypeScript + Tailwind**, hosted on **Netlify** (free plan).
- **Supabase** (free plan): Postgres database, email login, photo storage. Every table has
  Row Level Security: shoppers can only read published items; only listed admins can change anything.
- **Stripe Checkout** for payments. Prices are always looked up on the server, never trusted from the browser.
- Tests: `npm test` (checkout + webhook + helpers) and `tests/db/rls_test.sql` (database security).

See `STATUS.md` for what’s done and what’s next, and `CREDITS.md` for licenses.
