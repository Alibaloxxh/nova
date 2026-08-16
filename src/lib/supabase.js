import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const dbReady = Boolean(supabase)

export async function getProducts({ featured, category, search, range } = {}) {
  let q = supabase.from('products').select('*', { count: 'exact' })
  if (featured) q = q.eq('featured', true)
  if (category) q = q.eq('category', category)
  if (search) q = q.ilike('name', `%${search}%`)
  q = q.order('created_at', { ascending: false })
  if (range) q = q.range(range[0], range[1])
  const { data, error, count } = await q
  if (error) throw error
  return { products: data ?? [], count: count ?? 0 }
}

export async function getProduct(id) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getCategories() {
  const { data, error } = await supabase.from('products').select('category').order('category')
  if (error) throw error
  return [...new Set((data ?? []).map((p) => p.category).filter(Boolean))]
}

export async function saveProduct(product, id) {
  const { error } = id
    ? await supabase.from('products').update(product).eq('id', id)
    : await supabase.from('products').insert(product)
  if (error) throw error
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function uploadImages(files) {
  const urls = []
  for (const file of files) {
    const path = `${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

// Download a web image into the product-images bucket.
// Falls back to the original URL if the host blocks fetching (CORS).
export async function importImage(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const name = url.split('/').pop().split('?')[0] || 'image.jpg'
    const path = `${crypto.randomUUID()}-${name}`
    const { error } = await supabase.storage.from('product-images').upload(path, blob)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return url
  }
}

export async function createOrder(order, items) {
  // Generate the id/token client-side so we can build the receipt URL
  // without a returning SELECT (RLS blocks anon reads on orders).
  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const { error } = await supabase.from('orders').insert({ id, token, ...order })
  if (error) throw error
  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((i) => ({
      order_id: id,
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    }))
  )
  if (itemsError) throw itemsError
  return { id, token }
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getUsers({ search, status, role, joinedFrom, range } = {}) {
  let q = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (search) q = q.ilike('email', `%${search}%`)
  if (status === 'deleted') q = q.not('deleted_at', 'is', null)
  else {
    q = q.is('deleted_at', null)
    if (status) q = q.eq('status', status)
  }
  if (role) q = q.eq('is_admin', role === 'admin')
  if (joinedFrom) q = q.gte('created_at', new Date(joinedFrom).toISOString())
  if (range) q = q.range(range[0], range[1])
  const { data, error, count } = await q
  if (error) throw error
  return { users: data ?? [], count: count ?? 0 }
}

export async function setAdmin(id, isAdmin) {
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', id)
  if (error) throw error
}

export async function getOrder(id, token) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)', token ? { headers: { 'x-receipt-token': token } } : undefined)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function getPaymentMethods() {
  const { data, error } = await supabase.from('payment_methods').select('*').order('id')
  if (error) throw error
  return data ?? []
}

export async function updatePaymentMethod(id, enabled) {
  const { error } = await supabase.from('payment_methods').update({ enabled }).eq('id', id)
  if (error) throw error
}
