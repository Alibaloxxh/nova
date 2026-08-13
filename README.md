# Nova

Full-stack e-commerce store — React (Vite) frontend, Supabase backend. Flat white UI, blue accent, no UI kit.

## Setup

1. **Supabase project** — create one at [supabase.com](https://supabase.com).
2. **Run the schema** — open SQL editor and run everything in `supabase/schema.sql` (tables, RLS, storage bucket `product-images`, profile trigger).
3. **Seed demo data** — run `supabase/seed.sql` (16 products across Apparel/Accessories/Home/Care, 6 featured, 3 orders). Re-runnable — it clears and re-inserts.
4. **Your keys** — copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Dashboard → Settings → API).
5. **Install & run**
   ```
   npm install
   npm run dev
   ```

## Make yourself admin

1. Sign up in the app at `/login` (add a "sign up" via Supabase Auth UI, or create a user in Dashboard → Authentication → Users — no signup form is included).
2. Run in the SQL editor:
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```
3. Open `/admin` and sign in.

## Notes

- Cart lives in `localStorage` (`nova-cart`); a `cart_items` table is deliberately skipped — add it if you want per-account sync.
- Payment is Cash on Delivery + a disabled Stripe placeholder. For real card payments, the flow is: stripe.js Checkout on the frontend → webhook (Supabase Edge Function) confirms payment → order becomes `paid`. Say the word and it gets wired in.
- Stock is displayed but not decremented on order — add a `update ... set stock = stock - qty` edge function (or trigger) if you want true inventory.

## Structure

```
src/pages           Home, Products, ProductDetail, Checkout, Receipt, Login, Admin
src/components      Nav, ProductCard
src/context         CartContext (localStorage-persisted)
src/lib             supabase.js (client + queries), format.js
supabase/schema.sql tables + RLS + bucket
```