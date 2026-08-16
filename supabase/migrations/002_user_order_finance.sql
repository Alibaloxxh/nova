-- 002: User & Order Management + Finance
-- Depends on public.is_admin() from schema.sql / the recursion fix.

-- Users: suspend/activate + soft delete
alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));
alter table public.profiles
  add column if not exists deleted_at timestamptz;

-- Orders: payment status + updated_at
alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'paid', 'refunded'));
alter table public.orders
  add column if not exists updated_at timestamptz not null default now();

-- Order status timeline (who changed what, when)
create table if not exists public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Transactions tied to orders (payment / refund / payout)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  type text not null check (type in ('payment', 'refund', 'payout')),
  amount numeric not null check (amount >= 0),
  method text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.order_status_log enable row level security;
alter table public.transactions enable row level security;

create policy "order_status_log admin read" on public.order_status_log for select
  to authenticated using (public.is_admin());
create policy "transactions admin read" on public.transactions for select
  to authenticated using (public.is_admin());

-- RPC: change order status (any -> any), auto-log the change, auto-pay on delivered
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') then
    raise exception 'invalid status';
  end if;
  update public.orders
     set status = p_status,
         payment_status = case when p_status = 'delivered' then 'paid' else payment_status end,
         updated_at = now()
   where id = p_order_id;
  if not found then
    raise exception 'order not found';
  end if;
  insert into public.order_status_log (order_id, status, changed_by)
  values (p_order_id, p_status, auth.uid());
  if p_status = 'delivered' then
    insert into public.transactions (order_id, type, amount, method, note)
    select p_order_id, 'payment', total, payment_method, 'Auto-paid on delivery'
      from public.orders where id = p_order_id
      and not exists (select 1 from public.transactions t where t.order_id = p_order_id and t.type = 'payment');
  end if;
end;
$$;

-- RPC: record a refund against an order
create or replace function public.admin_record_refund(p_order_id uuid, p_amount numeric, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.orders set payment_status = 'refunded', updated_at = now() where id = p_order_id;
  if not found then
    raise exception 'order not found';
  end if;
  insert into public.transactions (order_id, type, amount, method, note)
  values (p_order_id, 'refund', p_amount, 'Refund', p_note);
end;
$$;

-- RPC: record a payout (e.g. COD cash deposited)
create or replace function public.admin_record_payout(p_order_id uuid, p_amount numeric, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  insert into public.transactions (order_id, type, amount, method, note)
  values (p_order_id, 'payout', p_amount, 'Cash deposit', p_note);
end;
$$;

revoke all on function public.admin_update_order_status(uuid, text) from public;
revoke all on function public.admin_record_refund(uuid, numeric, text) from public;
revoke all on function public.admin_record_payout(uuid, numeric, text) from public;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
grant execute on function public.admin_record_refund(uuid, numeric, text) to authenticated;
grant execute on function public.admin_record_payout(uuid, numeric, text) to authenticated;