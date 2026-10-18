-- 96.co: growth features: product details for shopping feeds, a Stores & Programs
-- directory, affiliate click tracking and an email list.

-- Shopping-feed details (Google / Pinterest / Meta need brand + condition; apparel needs color).
alter table public.products
  add column brand text,
  add column condition text not null default 'new' check (condition in ('new', 'used')),
  add column color text;
update public.products set condition = 'used' where type = 'unique';

alter table public.site_settings alter column brand_name set default '96.co';
update public.site_settings set brand_name = '96.co' where brand_name = 'Harlea''s Shop';

-- Stores & Programs: affiliate programs, suppliers, sales channels and tools Harlea tracks.
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'store'
    check (kind in ('affiliate', 'supplier', 'wholesale', 'channel', 'tool', 'store')),
  status text not null default 'idea'
    check (status in ('idea', 'applied', 'approved', 'active', 'later', 'not_a_fit')),
  website_url text check (website_url is null or website_url ~ '^https?://'),
  signup_url text check (signup_url is null or signup_url ~ '^https?://'),
  commission text not null default '',
  requirements text not null default '',
  payout text not null default '',
  cost text not null default '',
  my_id text not null default '',   -- e.g. her affiliate/creator ID or tag (not a password)
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

-- Clicks on "Buy at …" links (logged by /go/<product-slug>).
create table public.link_clicks (
  id bigint generated always as identity primary key,
  product_id uuid references public.products (id) on delete set null,
  source text,
  created_at timestamptz not null default now()
);
create index link_clicks_created_idx on public.link_clicks (created_at desc);
create index link_clicks_product_idx on public.link_clicks (product_id);

-- Email list ("first dibs on drops").
create table public.subscribers (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.stores enable row level security;
alter table public.link_clicks enable row level security;
alter table public.subscribers enable row level security;

create policy "stores admin all" on public.stores for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "link_clicks admin read" on public.link_clicks for select to authenticated
  using ((select public.is_admin()));
create policy "link_clicks admin delete" on public.link_clicks for delete to authenticated
  using ((select public.is_admin()));
create policy "subscribers admin all" on public.subscribers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public, write-only entry points (shoppers can add, never read).
create or replace function public.track_click(p_product uuid, p_source text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.link_clicks (product_id, source)
  select p.id, left(p_source, 80)
  from public.products p
  where p.id = p_product and p.is_published and p.type = 'affiliate';
$$;
revoke all on function public.track_click(uuid, text) from public;
grant execute on function public.track_click(uuid, text) to anon, authenticated;

create or replace function public.subscribe(p_email text, p_source text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_email text := lower(trim(p_email));
begin
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;
  insert into public.subscribers (email, source) values (v_email, left(p_source, 80))
  on conflict (email) do update set unsubscribed_at = null;
  return true;
end;
$$;
revoke all on function public.subscribe(text, text) from public;
grant execute on function public.subscribe(text, text) to anon, authenticated;
