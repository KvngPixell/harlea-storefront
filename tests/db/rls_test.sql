-- Security tests for Row Level Security + the order-recording function.
-- Runs inside a transaction and ROLLS BACK, so it leaves no trace.
-- Any failure raises an exception ("FAIL: ...") and aborts.
\set ON_ERROR_STOP on
begin;

-- ---------- fixtures (as the database owner) ----------
insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-4111-8111-111111111111', 'admin@rls-test.local', now()),
  ('22222222-2222-4222-8222-222222222222', 'rando@rls-test.local', now()),
  ('33333333-3333-4333-8333-333333333333', 'unconfirmed@rls-test.local', null);
insert into public.admin_users (email) values ('admin@rls-test.local'), ('unconfirmed@rls-test.local');

insert into public.products (id, name, slug, price_cents, type, is_published)
values ('f0000000-0000-4000-8000-000000000001', 'Hidden Test', 'rls-hidden-test', 1000, 'dropship', false),
       ('f0000000-0000-4000-8000-000000000002', 'Live Test', 'rls-live-test', 2000, 'unique', true);
insert into public.product_private (product_id, supplier_url) values ('f0000000-0000-4000-8000-000000000002', 'https://supplier.example');
insert into public.ideas (title) values ('secret idea');
insert into private.settings (key, value) values ('order_rpc_secret', 'test-secret-123')
  on conflict (key) do update set value = excluded.value;

-- ---------- anonymous shopper ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ begin
  if exists (select 1 from public.products where slug = 'rls-hidden-test') then
    raise exception 'FAIL: anon can see an unpublished product';
  end if;
  if not exists (select 1 from public.products where slug = 'rls-live-test') then
    raise exception 'FAIL: anon cannot see a published product';
  end if;
  if exists (select 1 from public.orders) or exists (select 1 from public.ideas)
     or exists (select 1 from public.product_private) or exists (select 1 from public.admin_users) then
    raise exception 'FAIL: anon can read private tables';
  end if;
  raise notice 'PASS: anon read rules';
end $$;

do $$ begin
  begin
    insert into public.products (name, slug, price_cents) values ('Hack', 'rls-hack', 1);
    raise exception 'FAIL: anon inserted a product';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot insert products';
  end;
end $$;

update public.products set price_cents = 1 where slug = 'rls-live-test';
delete from public.products where slug = 'rls-live-test';

do $$ begin
  begin
    perform * from private.settings;
    raise exception 'FAIL: anon can read private.settings';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot read private settings';
  end;
end $$;

do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'products/hack.png');
    raise exception 'FAIL: anon uploaded an image';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot upload images';
  end;
end $$;

do $$ begin
  begin
    perform public.record_paid_order('wrong-secret', '{"stripe_session_id":"cs_bad"}'::jsonb);
    raise exception 'FAIL: record_paid_order accepted a wrong secret';
  exception when insufficient_privilege then
    raise notice 'PASS: record_paid_order rejects a wrong secret';
  end;
end $$;

reset role;
do $$ begin
  if (select price_cents from public.products where slug = 'rls-live-test') <> 2000 then
    raise exception 'FAIL: anon changed a price';
  end if;
  raise notice 'PASS: anon update/delete had no effect';
end $$;

-- ---------- signed-in, NOT an admin ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222","email":"rando@rls-test.local"}', true);
do $$ begin
  if public.is_admin() then raise exception 'FAIL: random user is admin'; end if;
  if exists (select 1 from public.products where slug = 'rls-hidden-test') then
    raise exception 'FAIL: random user sees unpublished product';
  end if;
  if exists (select 1 from public.orders) or exists (select 1 from public.ideas) then
    raise exception 'FAIL: random user reads private tables';
  end if;
  begin
    insert into public.tabs (name, slug) values ('Hack', 'rls-hack-tab');
    raise exception 'FAIL: random user created a tab';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: non-admin user is treated like a shopper';
end $$;

-- ---------- admin email that is NOT confirmed ----------
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333","email":"unconfirmed@rls-test.local"}', true);
do $$ begin
  if public.is_admin() then raise exception 'FAIL: unconfirmed email counts as admin'; end if;
  raise notice 'PASS: unconfirmed admin email is not admin';
end $$;

-- ---------- real admin ----------
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","email":"admin@rls-test.local"}', true);
do $$ begin
  if not public.is_admin() then raise exception 'FAIL: admin not recognised'; end if;
  if not exists (select 1 from public.products where slug = 'rls-hidden-test') then
    raise exception 'FAIL: admin cannot see unpublished product';
  end if;
  if not exists (select 1 from public.ideas) or not exists (select 1 from public.product_private) then
    raise exception 'FAIL: admin cannot read private tables';
  end if;
  insert into public.products (name, slug, price_cents) values ('Admin Made', 'rls-admin-made', 500);
  update public.products set price_cents = 2500 where slug = 'rls-live-test';
  insert into storage.objects (bucket_id, name) values ('media', 'products/ok.png');
  raise notice 'PASS: admin can read and write';
end $$;

-- ---------- order recording ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare a uuid; b uuid;
begin
  a := public.record_paid_order('test-secret-123', jsonb_build_object(
    'stripe_session_id', 'cs_test_rls_1', 'email', 'buyer@example.com', 'amount_total_cents', 2999,
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', 'f0000000-0000-4000-8000-000000000002', 'name', 'Live Test',
      'unit_price_cents', 2500, 'quantity', 1, 'product_type', 'unique'))));
  b := public.record_paid_order('test-secret-123', jsonb_build_object('stripe_session_id', 'cs_test_rls_1',
    'items', jsonb_build_array(jsonb_build_object('name', 'dupe', 'unit_price_cents', 1, 'quantity', 1))));
  if a is null or a <> b then raise exception 'FAIL: record_paid_order not idempotent'; end if;
  raise notice 'PASS: record_paid_order works and is idempotent';
end $$;

reset role;
do $$ begin
  if (select count(*) from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.stripe_session_id = 'cs_test_rls_1') <> 1 then
    raise exception 'FAIL: duplicate order items were recorded';
  end if;
  if not (select is_sold from public.products where slug = 'rls-live-test') then
    raise exception 'FAIL: unique piece was not marked sold';
  end if;
  raise notice 'PASS: order items recorded once, unique piece marked sold';
end $$;

-- ---------- growth tables (stores, clicks, email list) ----------
insert into public.products (id, name, slug, price_cents, type, affiliate_url, store_name, is_published)
values ('f0000000-0000-4000-8000-000000000003', 'Aff Test', 'rls-aff-test', 1500, 'affiliate', 'https://example.com/x', 'Shop', true);
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists (select 1 from public.stores) or exists (select 1 from public.link_clicks) or exists (select 1 from public.subscribers) then
    raise exception 'FAIL: anon can read stores/clicks/subscribers';
  end if;
  if not public.subscribe('Fan@Example.com', 'footer') then raise exception 'FAIL: subscribe rejected a valid email'; end if;
  if public.subscribe('not-an-email', 'footer') then raise exception 'FAIL: subscribe accepted junk'; end if;
  perform public.track_click('f0000000-0000-4000-8000-000000000003', 'ig');
  perform public.track_click('f0000000-0000-4000-8000-000000000002', 'ig'); -- not an affiliate item: ignored
  begin
    insert into public.subscribers (email) values ('direct@example.com');
    raise exception 'FAIL: anon wrote subscribers directly';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: anon can subscribe/track but not read growth tables';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.link_clicks) <> 1 then raise exception 'FAIL: click tracking count wrong'; end if;
  if not exists (select 1 from public.subscribers where email = 'fan@example.com') then raise exception 'FAIL: email not stored lower-case'; end if;
  raise notice 'PASS: clicks and emails recorded correctly';
end $$;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","email":"admin@rls-test.local"}', true);
do $$ begin
  if not exists (select 1 from public.subscribers) or not exists (select 1 from public.link_clicks) then
    raise exception 'FAIL: admin cannot read growth tables';
  end if;
  insert into public.stores (name, kind) values ('Test Store', 'store');
  raise notice 'PASS: admin manages stores and reads clicks/emails';
end $$;
reset role;

rollback;
