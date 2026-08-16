-- Nova — Supabase schema (run in the SQL editor)
-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  category text not null,
  stock integer not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  payment_method text not null,
  status text not null default 'pending',
  total numeric not null check (total >= 0),
  token uuid not null default gen_random_uuid(),  -- receipt access key
  created_at timestamptz not null default now()
);

-- For databases created before the token column existed:
alter table public.orders add column if not exists token uuid not null default gen_random_uuid();

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  name text not null,
  price numeric not null check (price >= 0),
  quantity integer not null check (quantity > 0)
);

-- Profiles (created automatically for every auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Make yourself an admin after signing up (replace with your email):
-- update public.profiles set is_admin = true where email = 'you@example.com';

-- Payment methods (admin-managed; shown on checkout when enabled)
create table if not exists public.payment_methods (
  id text primary key,
  label text not null,
  enabled boolean not null default true
);

insert into public.payment_methods (id, label, enabled) values
  ('cod', 'Cash on delivery', true),
  ('card', 'Card payment', false),
  ('bank_transfer', 'Bank transfer', true)
on conflict (id) do update set label = excluded.label;

-- RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;
alter table public.payment_methods enable row level security;

-- Products: public read, admin-only write
create policy "products public read" on public.products for select using (true);
create policy "products admin write" on public.products for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Orders: anyone may place an order (guest checkout), admin reads all,
-- and the receipt page can read an order by presenting its token (x-receipt-token header)
create policy "orders insert" on public.orders for insert with check (true);
create policy "orders admin read" on public.orders for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "orders receipt read" on public.orders for select
  using (token::text = coalesce(current_setting('request.headers', true)::json ->> 'x-receipt-token', ''));

-- Order items: same as orders
create policy "order_items insert" on public.order_items for insert with check (true);
create policy "order_items admin read" on public.order_items for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "order_items receipt read" on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.token::text = coalesce(current_setting('request.headers', true)::json ->> 'x-receipt-token', '')
  ));

-- Profiles: users read their own row, admins read all, admins promote/demote
create policy "profiles own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles admin read" on public.profiles for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "profiles admin update" on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Users can read their own orders, matched by account email (no migration needed)
create policy "orders owner read" on public.orders for select
  to authenticated
  using (email = (select email from public.profiles where id = auth.uid()));

create policy "order_items owner read" on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.email = (select email from public.profiles where id = auth.uid())
  ));

-- Backfill for users created before the profile trigger existed (run once):
-- insert into public.profiles (id, email) select id, email from auth.users on conflict (id) do nothing;

-- Payment methods: public read, admin write
create policy "payment methods public read" on public.payment_methods for select using (true);
create policy "payment methods admin write" on public.payment_methods for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Admins can change order status and delete orders (items cascade)
create policy "orders admin update" on public.orders for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "orders admin delete" on public.orders for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));