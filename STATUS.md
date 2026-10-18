# STATUS: Harlea’s Shop

_Last updated: 2026-10-18 (America/Chicago)_

**Live URL:** https://harlea-storefront.netlify.app (Netlify project created; **no deploy yet**, see Blocked)
**Phase:** 0 (Foundation). Phases 1–3 features are built and tested locally; live gates are pending deploy + database.

## ✅ Done (verified)

| What | Evidence |
|---|---|
| Netlify project `harlea-storefront` created (new, isolated) | Netlify API: site id `9d9f71d9-…`; production set public, previews require team login |
| Database schema, RLS, storage bucket, seed (12 products, 3 tabs, 3 outfits) | `supabase/migrations/*.sql` applied cleanly to PostgreSQL 16 with a Supabase stub |
| RLS / order-recording security tests | `tests/db/rls_test.sql`: 11/11 checks PASS locally (anon can’t write/read private; non-admin & unconfirmed-email users aren’t admin; admin can CRUD; `record_paid_order` rejects bad secret, is idempotent, marks one-of-ones sold) |
| Unit tests (checkout rules, Stripe params, webhook signatures, helpers) | `npm test`: 19/19 PASS |
| Typecheck | `tsc --noEmit` PASS (local TS 6.0.3; CI uses TS 5.9.2) |
| Storefront: home, tabs, product pages, outfits, Build-a-Look, bag, policies, disclosure page, girly-pop theme | Local production-style build + screenshots at 1280px and 390px; no console errors |
| Dashboard: login, overview + charts, products CRUD + photo upload + drag reorder, tabs, outfits, idea inbox, orders, settings, help | 22/22 end-to-end steps PASS in Chromium (demo mode): add product with photo → appears in shop; hide → disappears; new tab → in menu; new outfit → live with correct total; idea → approved match → draft outfit; order → marked shipped; affiliate notice shown where required; checkout without Stripe key shows friendly message |

## 🚧 In progress
- Phase 0 gate: deploy and verify the live URL (blocked, below).

## ⛔ Blocked (human-only)

| Item | Why | Unblock |
|---|---|---|
| **Supabase project** | Creation refused (verified): Isaac’s account already has its 2 free projects. Pro plan costs money, so not created. | Harlea creates a free Supabase account with **harlearowland@gmail.com** and a project `harlea-storefront` (East US/Ohio), invites triplettisaac12@gmail.com as **Developer**, sets Auth → URL Configuration → Site URL to the Netlify URL. Then Claude applies migrations via the connector. |
| **Stripe test key** | Only connected Stripe account is “Media Agentics sandbox” (off-limits). | Harlea signs up at Stripe (test mode is instant), Isaac adds `STRIPE_SECRET_KEY` (sk_test_…) in Netlify env vars. |
| **Deploys / installs from this session** | Session network blocks npm, Netlify upload API, Supabase, Stripe. | Isaac allows `registry.npmjs.org`, `api.netlify.com`, `netlify-mcp.netlify.app`, `*.supabase.co`, `api.stripe.com` (claude.ai → Settings → Capabilities), **or** connects the GitHub repo so GitHub Actions/Netlify build it. |
| **GitHub repo** | This session can’t create repositories. | Isaac creates empty private repo `harlea-storefront` and grants this session access. Code is committed locally and ready to push. |

## 🕓 Deferred (would cost money or needs a later decision)
- **Branch protection on `main`**: not available for private repos on GitHub Free. CI still runs on every push and PR.
- **Stripe Tax** (paid add-on): not enabled. Check sales-tax obligations before live sales.
- **Custom email sender (SMTP)** for login emails: Supabase’s built-in sender is rate-limited; the password login option covers it.
- **Automatic idea sourcing inside the app** would need a paid AI API. Instead, Claude sources ideas in a Cowork session and writes suggestions to the Idea inbox for approval.
- **Media Kit page**: nav slot reserved only (Phase 4 parked).
- **Self-run Vite build + ESLint in this sandbox**: needs npm; runs in CI/Netlify instead.

## ⏭ Next
1. Deploy to Netlify and verify live URL on mobile + desktop (Phase 0 gate).
2. When Supabase exists: apply migrations, add admin emails, set `ORDER_RPC_SECRET` + Supabase env vars in Netlify, run `rls_test.sql` against it, redeploy.
3. When Stripe key exists: test checkout with card 4242 4242 4242 4242 → confirm order appears in dashboard (Phase 1 gate).
4. Verify Phases 2–3 live, then final summary.

## Free-tier limits (checked 2026-10-18)

| Service | Limits that matter | When exceeded |
|---|---|---|
| **Netlify Free** (credit plan) | 300 credits/month, **shared with Isaac’s other 5 sites**. Production deploy = 15 credits (~20/month); bandwidth 20 credits/GB; 10k requests = 2 credits; functions 10 credits/GB-hour. Deploy previews, branch deploys, failed deploys = free. | Hard limit, no auto-billing; projects pause until the next cycle. |
| **Supabase Free** | 2 active free projects per person (owner/admin, all orgs). 500 MB database, 1 GB file storage, 5 GB egress, 50k monthly users. Built-in login email is rate-limited. | **Pauses after 1 week with no activity**; restore from the dashboard (data kept). |
| **Stripe** | Test mode: free. Live: standard per-transaction card fees only (no monthly fee). | n/a |
| **GitHub Free** | Unlimited private repos; 2,000 Actions minutes/month for private repos. | Actions stop until next month. |

## Build-over-buy log (all $0)

| Obstacle | Route | Cost |
|---|---|---|
| Supabase 3rd project needs paid plan | Harlea’s own free account (step 1 free tier) | $0 |
| Drag-to-reorder library (dnd-kit) | Own ~80-line pointer sortable, touch-friendly (step 3) | $0 |
| Charts library | Own SVG column + rank charts (step 3) | $0 |
| Supabase JS SDK (can’t install here; heavy) | Own thin client for documented REST APIs (step 3) | $0 |
| Stripe SDK | Direct REST calls + own webhook signature check (step 3) | $0 |
| Router & icon libraries | Own tiny router + hand-drawn SVG icons (step 3) | $0 |
| Product photos | Own SVG illustrations (step 3) | $0 |
| Google Fonts hosting | Self-hosted OFL fonts subset from github.com/google/fonts (step 2) | $0 |
| Stripe Tax, branch protection, custom SMTP | Deferred (above) | $0 |

## Decisions & defaults (change anytime)
- Brand: “Harlea’s Shop” (placeholder). Admin logins: harlearowland@gmail.com, triplettisaac12@gmail.com. Harlea’s email is **not** shown publicly; contact email is set in Dashboard → Settings.
- Shipping: US only, $4.99 flat, free over $75 (`SHIPPING_CENTS`, `FREE_SHIPPING_OVER_CENTS`).
- Policies (shipping/returns/privacy/terms/disclosure) are plain-language drafts: **owners should review before real sales**.
- Orders are recorded by the thank-you page (confirms with Stripe) and, if set up, the Stripe webhook. Both are idempotent.
- Products created from the Idea inbox start **hidden**; nothing goes live without Harlea turning it on.
- Two buyers could pay for the same one-of-one at the same moment (rare); the second would need a refund.
- `frontend-design` skill wasn’t available in this session; the design system is hand-built (tokens in `src/styles/index.css`, contrast-checked).
