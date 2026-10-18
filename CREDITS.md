# Credits & open-source notes

We keep this shop light: **no code was copied from other projects**. We studied a few
well-rated, permissively licensed projects for layout ideas and wrote our own versions.
Libraries we *install* are listed in `package.json` with exact versions.

## Libraries we use (installed)

| Package | License | Used for |
|---|---|---|
| react, react-dom | MIT | UI |
| vite, @vitejs/plugin-react | MIT | building the site |
| tailwindcss, @tailwindcss/vite | MIT | styling |
| typescript, typescript-eslint, eslint, @eslint/js, eslint-plugin-react-hooks, globals | Apache-2.0 / MIT | code checks |
| tsx | MIT | running tests |

## Fonts (self-hosted, subset to Latin)

| Font | License | Source |
|---|---|---|
| Fredoka | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/fredoka |
| Nunito | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/nunito |
| Pacifico | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/pacifico |

The OFL lets us use, subset and self-host these fonts, including on a commercial site.

## Studied for ideas only (no code used)

| Project | License | What we looked at | Decision |
|---|---|---|---|
| [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (~15.8k ★) | MIT | Dashboard layout: sidebar, stat tiles | Wrote our own simpler dashboard (fewer deps) |
| [TailAdmin free-react-tailwind-admin-dashboard](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) (~1.3k ★) | MIT | React 19 + Tailwind 4 admin patterns | Same; ideas only |
| [vercel/commerce](https://github.com/vercel/commerce) (~14.2k ★) | MIT | Product page / gallery / variant picker patterns | Next.js + Shopify, too heavy; ideas only |
| [clauderic/dnd-kit](https://github.com/clauderic/dnd-kit) (~17.6k ★) | MIT | Drag-to-reorder | Built a ~80-line pointer-based sortable list instead (works on touch) |
| Outfit builders on GitHub | various / unlicensed | “mix & match” UX | None met the bar (stars, license); built our own |

## Services (official public docs only)

Supabase REST/Auth/Storage APIs, Stripe Checkout + webhook signature scheme, and Netlify
Functions are used through their documented HTTP APIs, implemented in our own code
(`src/lib/supabase.ts`, `netlify/lib/stripe.ts`).

## Placeholder product pictures

Drawn by us in code (`scripts/generate-seed-art.mjs`). Free to use; replace with real photos anytime.
