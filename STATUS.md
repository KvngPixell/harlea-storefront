# STATUS: 96.co (Harlea's storefront)

_Last updated: 2026-10-18, 7:30 PM CT_

**Live:** https://harlea-storefront.netlify.app (static deploy via Netlify Drop, built by GitHub Actions with Vite)
**Dashboard:** https://harlea-storefront.netlify.app/admin
**Repo:** https://github.com/KvngPixell/harlea-storefront (public)
**Supabase:** project `obmvinwhquxckjafmanb` in Harlea's "Digital Storefront" org (Isaac = Developer)
**Stripe:** "96.co" account, test mode
**Game plan doc:** "96.co Revenue Game Plan" (Claude Docs)

## ✅ Done (verified)

| What | Evidence |
|---|---|
| Live site on real database | Loaded live URL: 96.co branding, 8 featured products from Supabase, deep links (/p/…) work, no demo banner |
| Database: schema, RLS, storage, seed, growth tables, 25-entry Stores list, admin allowlist (2 emails), order secret | Setup SQL ran in Supabase SQL editor: products 12, stores 25, admins 2 |
| Security tests on the LIVE database | `tests/db/rls_test.sql` (rolled back) ran with no errors: 14 checks |
| CI on GitHub | Lint, typecheck, 25 unit tests, Vite build, RLS tests on Postgres 16: all green (CI #3) |
| Email signup live | Live footer form → row in `subscribers` (test row removed) |
| Netlify env vars | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_ANON_KEY set (public values) |
| Stripe branding | Icon, logo, brand #FFE8F0, accent #D61F69 saved; receipt + refund emails on (persisted after reload) |
| Local E2E | 22-step core flow + 7-step growth flow pass in Chromium (demo mode) |

## ⛔ Waiting on a person

| Item | Who | Why it's human-only |
|---|---|---|
| Supabase Auth Site URL + redirect URL | Harlea (Owner) | Developer role can't edit auth settings. Until set, dashboard login links don't work |
| Netlify ↔ GitHub link (adds checkout, feed, sitemap, /go functions) | Isaac | GitHub requires an emailed sudo code to grant the Netlify app access to the repo |
| `STRIPE_SECRET_KEY` in Netlify | Isaac | Claude may not copy API keys |
| `ORDER_RPC_SECRET` in Netlify (value from `select value from private.settings where key='order_rpc_secret'`) | Isaac | Credential handling blocked for Claude |
| Supabase connector access to the "Digital Storefront" org (optional) | Isaac | Needed for Claude to manage the DB via MCP and for an automated idea-sourcing task |

## 🕓 Deferred
- Stripe webhook endpoint (after functions deploy via Git): `https://harlea-storefront.netlify.app/api/stripe-webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`; signing secret → `STRIPE_WEBHOOK_SECRET`.
- Automated idea sourcing (scheduled Claude task) until the Supabase connector can reach the org.
- Stripe Tax, custom login email (SMTP), branch protection: paid or not needed yet.
- Remove `.github/workflows/import-bundle.yml` and `site-build.yml` once Netlify builds from GitHub.

## Free-tier limits

| Service | Limit | When exceeded |
|---|---|---|
| Netlify Free | 300 credits/month shared with 5 other sites; production deploy 15, 1 GB bandwidth 20, 10k requests 2 | Projects pause until next cycle; no auto-billing |
| Supabase Free | 2 free projects per owner (this one is Harlea's), 500 MB DB, 1 GB storage, 5 GB egress | Pauses after 1 week without activity |
| Stripe | Test mode free; live 2.9% + 30¢ per card sale | n/a |
| GitHub Free | Public repo: Actions minutes free | n/a |

## Build-over-buy log (all $0)
Supabase 3rd project → Harlea's own free org · dnd-kit → own sortable list · charts lib → own SVG · supabase-js → own REST client · Stripe SDK → REST + own signature check · router/icons → own · product photos → own SVG art · fonts → self-hosted OFL · GitHub push blocked from sandbox → upload bundle + import workflow · Netlify Git link blocked → CI-built zip via Netlify Drop.

## Decisions & defaults
- Brand: 96.co. Admin logins: harlearowland@gmail.com, triplettisaac12@gmail.com. Harlea's email not shown publicly.
- Shipping US only, $4.99, free over $75. Policies are drafts: review before live sales.
- Amazon affiliate items hide prices (Amazon rule). Feed excludes affiliate items and SVG-only items.
- Products created from ideas start hidden. Orders recorded by thank-you page + optional webhook (idempotent).
