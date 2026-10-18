-- Harlea's Shop — Row Level Security (RLS).
-- Rule of thumb: shoppers can only READ published storefront items.
-- Only allow-listed admins (admin_users) can write anything or see orders/ideas.

-- Private schema: never exposed through the public API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null
);
revoke all on private.settings from public, anon, authenticated;

-- True when the signed-in user has a CONFIRMED email that is on the admin list.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    join auth.users u on lower(u.email) = a.email
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.tabs enable row level security;
alter table public.products enable row level security;
alter table public.product_private enable row level security;
alter table public.product_images enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ideas enable row level security;
alter table public.site_settings enable row level security;

-- admin_users: you can see your own row (so the app knows you're an admin); admins see all.
-- No insert/update/delete policies: the list is managed with SQL only.
create policy "admin_users read own or admin" on public.admin_users
  for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')) or (select public.is_admin()));

create policy "site_settings public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings admin update" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public storefront tables: read published, admins do everything.
do $$
declare t text;
begin
  foreach t in array array['tabs', 'products', 'outfits']
  loop
    execute format('create policy "%1$s public read" on public.%1$I for select to anon, authenticated
                    using (is_published or (select public.is_admin()))', t);
    execute format('create policy "%1$s admin insert" on public.%1$I for insert to authenticated
                    with check ((select public.is_admin()))', t);
    execute format('create policy "%1$s admin update" on public.%1$I for update to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "%1$s admin delete" on public.%1$I for delete to authenticated
                    using ((select public.is_admin()))', t);
  end loop;
end $$;

create policy "product_images public read" on public.product_images
  for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    or (select public.is_admin())
  );
create policy "outfit_items public read" on public.outfit_items
  for select to anon, authenticated
  using (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.is_published)
    or (select public.is_admin())
  );

do $$
declare t text;
begin
  foreach t in array array['product_images', 'outfit_items']
  loop
    execute format('create policy "%1$s admin insert" on public.%1$I for insert to authenticated
                    with check ((select public.is_admin()))', t);
    execute format('create policy "%1$s admin update" on public.%1$I for update to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "%1$s admin delete" on public.%1$I for delete to authenticated
                    using ((select public.is_admin()))', t);
  end loop;
end $$;

-- Admin-only tables (no public access at all).
do $$
declare t text;
begin
  foreach t in array array['product_private', 'orders', 'order_items', 'ideas']
  loop
    execute format('create policy "%1$s admin all" on public.%1$I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- Records a PAID Stripe order. Called only by our Netlify Function, which proves itself
-- with a shared secret stored in private.settings. Safe to call twice (idempotent).
create or replace function public.record_paid_order(p_secret text, p_order jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected text;
  v_order_id uuid;
  v_item jsonb;
begin
  select value into v_expected from private.settings where key = 'order_rpc_secret';
  if v_expected is null or p_secret is null or p_secret <> v_expected then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.orders (stripe_session_id, stripe_payment_intent, email, customer_name,
                             amount_total_cents, amount_shipping_cents, currency, livemode, shipping)
  values (
    p_order ->> 'stripe_session_id',
    p_order ->> 'stripe_payment_intent',
    p_order ->> 'email',
    p_order ->> 'customer_name',
    coalesce((p_order ->> 'amount_total_cents')::integer, 0),
    coalesce((p_order ->> 'amount_shipping_cents')::integer, 0),
    coalesce(p_order ->> 'currency', 'usd'),
    coalesce((p_order ->> 'livemode')::boolean, false),
    p_order -> 'shipping'
  )
  on conflict (stripe_session_id) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    -- Already recorded earlier: return the existing order, add nothing.
    select id into v_order_id from public.orders where stripe_session_id = p_order ->> 'stripe_session_id';
    return v_order_id;
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_order -> 'items', '[]'::jsonb))
  loop
    insert into public.order_items (order_id, product_id, name, size, unit_price_cents, quantity, product_type)
    values (
      v_order_id,
      nullif(v_item ->> 'product_id', '')::uuid,
      coalesce(v_item ->> 'name', 'Item'),
      nullif(v_item ->> 'size', ''),
      coalesce((v_item ->> 'unit_price_cents')::integer, 0),
      greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1),
      v_item ->> 'product_type'
    );
  end loop;

  -- One-of-one pieces are gone once bought.
  update public.products p
     set is_sold = true
   where p.type = 'unique'
     and p.id in (select (e ->> 'product_id')::uuid
                    from jsonb_array_elements(coalesce(p_order -> 'items', '[]'::jsonb)) e
                   where coalesce(e ->> 'product_id', '') <> '');

  return v_order_id;
end;
$$;
revoke all on function public.record_paid_order(text, jsonb) from public;
grant execute on function public.record_paid_order(text, jsonb) to anon, authenticated;

-- Image storage: one public bucket. Anyone can VIEW a file by its URL; only admins can upload/change.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "media admin read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
