-- Harlea's Shop — core tables.
-- Every table has created_at / updated_at; storefront items have slug, sort_order, is_published.

-- Keeps updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Who may use /admin. Add rows here (lower-case emails) to give someone access.
create table public.admin_users (
  email text primary key check (email = lower(email)),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tabs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  kind text not null default 'products' check (kind in ('products', 'outfits')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  -- dropship = we sell it, supplier ships | unique = one-of-one we own | affiliate = link to another store
  type text not null default 'dropship' check (type in ('dropship', 'unique', 'affiliate')),
  category text not null default 'other'
    check (category in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory', 'beauty', 'other')),
  price_cents integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents >= 0),
  sizes text[] not null default '{}',
  tab_id uuid references public.tabs (id) on delete set null,
  store_name text,          -- "where to buy" label for affiliate items (e.g. "Target")
  affiliate_url text check (affiliate_url is null or affiliate_url ~ '^https://'),
  is_featured boolean not null default false,
  is_sold boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_needs_link check (type <> 'affiliate' or affiliate_url is not null)
);
create index products_tab_idx on public.products (tab_id, sort_order);

-- Private business info (never visible to shoppers).
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  supplier_name text,
  supplier_url text,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  tab_id uuid references public.tabs (id) on delete set null,
  cover_image_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outfit_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  email text,
  customer_name text,
  amount_total_cents integer not null default 0,
  amount_shipping_cents integer not null default 0,
  currency text not null default 'usd',
  status text not null default 'paid' check (status in ('paid', 'fulfilled', 'refunded', 'canceled')),
  livemode boolean not null default false,
  shipping jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  size text,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  product_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  notes text not null default '',
  image_url text,
  status text not null default 'new' check (status in ('new', 'sourcing', 'ready', 'published')),
  -- Proposed matching pieces: [{name, store, url, price_cents, image_url, note, decision}]
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row of shop-wide settings Harlea can edit in /admin → Settings.
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'Harlea''s Shop',
  tagline text not null default 'cute finds, curated looks & one-of-one treasures',
  announcement text not null default 'new drops every week ✦ free shipping over $75',
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['admin_users','tabs','products','product_private','product_images',
                           'outfits','outfit_items','orders','order_items','ideas','site_settings']
  loop
    execute format('create trigger %I_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
