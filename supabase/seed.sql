-- Nova — seed data (re-runnable: clears store data first, then inserts)
-- Product images are local files in public/images/products/ (served by the app itself).
-- Run in the Supabase SQL editor after schema.sql.

delete from public.order_items;
delete from public.orders;
delete from public.products;

with products_seed as (
  insert into public.products (name, description, price, category, stock, images, featured)
  values
    ('Aurora Crewneck Sweater', 'Brushed cotton crewneck with a relaxed fit and ribbed cuffs. The kind of sweater you never want to take off.', 58.00, 'Apparel', 24,
     array['/images/products/aurora-sweater.jpg', '/images/products/aurora-sweater-2.jpg'], true),
    ('Trailhead Fleece Jacket', 'Midweight fleece that layers under a shell or over a tee. Two zip pockets and a hidden chest pocket.', 84.00, 'Apparel', 18,
     array['/images/products/trailhead-fleece.jpg', '/images/products/trailhead-fleece-2.jpg'], false),
    ('Nova Everyday Tee', 'Heavyweight organic cotton tee that holds its shape wash after wash.', 24.00, 'Apparel', 60,
     array['/images/products/nova-tee.jpg'], true),
    ('Harbor Linen Shirt', 'Garment-washed linen button-up that gets softer with every wear.', 46.00, 'Apparel', 30,
     array['/images/products/harbor-linen.jpg', '/images/products/harbor-linen-2.jpg'], false),
    ('Arc Weekender Tote', 'Water-resistant canvas tote with a padded laptop sleeve and interior zip pocket.', 68.00, 'Accessories', 15,
     array['/images/products/arc-tote.jpg', '/images/products/arc-tote-2.jpg'], true),
    ('Drift Leather Card Holder', 'Slim vegetable-tanned leather card holder that fits four cards plus cash.', 32.00, 'Accessories', 40,
     array['/images/products/drift-card-holder.jpg'], false),
    ('Ridge Canvas Belt', 'Heavy-duty cotton webbing belt with a matte brass buckle.', 26.00, 'Accessories', 22,
     array['/images/products/ridge-belt.jpg'], false),
    ('Summit Insulated Bottle', 'Double-wall stainless bottle that keeps drinks cold for 24 hours. Not dishwasher safe.', 22.00, 'Accessories', 0,
     array['/images/products/summit-bottle.jpg', '/images/products/summit-bottle-2.jpg'], false),
    ('Glow Ceramic Lamp', 'Hand-glazed stoneware lamp with a warm dimmable bulb. USB-C charging port in the base.', 74.00, 'Home', 12,
     array['/images/products/glow-lamp.jpg', '/images/products/glow-lamp-2.jpg'], true),
    ('Terra Throw Blanket', 'Chunky knit cotton throw that looks good draped on anything.', 52.00, 'Home', 26,
     array['/images/products/terra-throw.jpg', '/images/products/terra-throw-2.jpg'], true),
    ('Forma Stoneware Mug Set', 'Set of four glazed stoneware mugs, each slightly different by design.', 38.00, 'Home', 35,
     array['/images/products/forma-mugs.jpg'], false),
    ('Calm Scented Candle', 'Soy wax candle with cedar and bergamot. Roughly 45 hours of burn time.', 28.00, 'Home', 50,
     array['/images/products/calm-candle.jpg'], false),
    ('Clean Slate Face Wash', 'Gentle foaming cleanser with green tea extract. Fragrance free, dermatologist tested.', 19.00, 'Care', 80,
     array['/images/products/clean-slate-wash.jpg'], true),
    ('Dew Daily Moisturizer', 'Lightweight hyaluronic moisturizer that plays nice under makeup and sunscreen.', 26.00, 'Care', 55,
     array['/images/products/dew-moisturizer.jpg'], false),
    ('Driftwood Body Oil', 'Fast-absorbing jojoba and squalane body oil with a warm driftwood scent.', 24.00, 'Care', 44,
     array['/images/products/driftwood-oil.jpg'], false),
    ('Renew Vitamin C Serum', '10% vitamin C with ferulic acid. Brightens and evens tone in four weeks.', 34.00, 'Care', 37,
     array['/images/products/renew-serum.jpg'], false)
  returning id, name, price
),
order1 as (
  insert into public.orders (customer_name, email, phone, address, payment_method, status, total)
  values ('Maya Chen', 'maya@example.com', '+1 415 555 0134', '820 Valencia St, San Francisco, CA 94110', 'Cash on delivery', 'pending', 160.00)
  returning id
),
items1 as (
  insert into public.order_items (order_id, product_id, name, price, quantity)
  select o.id, p.id, p.name, p.price, 1
  from order1 o
  join products_seed p on p.name in ('Aurora Crewneck Sweater', 'Arc Weekender Tote', 'Renew Vitamin C Serum')
),
order2 as (
  insert into public.orders (customer_name, email, phone, address, payment_method, status, total)
  values ('Liam Novak', 'liam.novak@example.com', '+1 312 555 0198', '1410 W Wrightwood Ave, Chicago, IL 60614', 'Cash on delivery', 'shipped', 186.00)
  returning id
),
items2 as (
  insert into public.order_items (order_id, product_id, name, price, quantity)
  select o.id, p.id, p.name, p.price, 2
  from order2 o
  join products_seed p on p.name = 'Glow Ceramic Lamp'
  union all
  select o.id, p.id, p.name, p.price, 1
  from order2 o
  join products_seed p on p.name = 'Forma Stoneware Mug Set'
),
order3 as (
  insert into public.orders (customer_name, email, phone, address, payment_method, status, total)
  values ('Sofia Reyes', 'sofia.reyes@example.com', '+44 20 7946 0958', '12 Kingsland Road, London E2 8DA', 'Cash on delivery', 'delivered', 89.00)
  returning id
),
items3 as (
  insert into public.order_items (order_id, product_id, name, price, quantity)
  select o.id, p.id, p.name, p.price, 2
  from order3 o
  join products_seed p on p.name = 'Nova Everyday Tee'
  union all
  select o.id, p.id, p.name, p.price, 1
  from order3 o
  join products_seed p on p.name in ('Clean Slate Face Wash', 'Summit Insulated Bottle')
)
select 'seeded';