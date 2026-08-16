import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  IconPencil, IconTrash, IconPlus, IconX, IconPhoto,
} from '@tabler/icons-react'
import { supabase, getProducts, getOrders, getProfiles, setAdmin, getPaymentMethods, updatePaymentMethod, updateOrderStatus, deleteOrder, saveProduct, deleteProduct, uploadImages, importImage, dbReady } from '../lib/supabase'
import { formatPrice, shortId } from '../lib/format'

const blank = { name: '', description: '', price: '', category: '', stock: '', featured: false }

export default function Admin() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [methods, setMethods] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [files, setFiles] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dbReady) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session
      if (s) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', s.user.id).single()
        setIsAdmin(profile?.is_admin === true)
      }
      setSession(s)
      setChecking(false)
    })
  }, [])

  const loadProducts = () =>
    getProducts({})
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message))

  useEffect(() => {
    if (!checking && session && isAdmin) {
      setLoading(true)
      Promise.all([
        loadProducts(),
        getOrders().then(setOrders).catch((e) => setError(e.message)),
        getProfiles().then(setUsers).catch((e) => setError(e.message)),
        getPaymentMethods().then(setMethods).catch((e) => setError(e.message)),
      ]).finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, session, isAdmin])

  if (!dbReady) {
    return (
      <div className="container section">
        <p className="alert alert-error">Supabase is not configured. See README.</p>
      </div>
    )
  }
  if (checking) {
    return (
      <p className="loading">
        <span className="spinner" aria-hidden="true" />
        Checking access…
      </p>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submitProduct = async (e) => {
    e.preventDefault()
    if (!editing && !files.length && !imageUrl.trim()) {
      setError('Add at least one image — upload files or paste a web URL.')
      return
    }
    setError(null)
    try {
      const images = files.length
        ? await uploadImages(files)
        : imageUrl.trim()
          ? [await importImage(imageUrl.trim())]
          : (editing?.images ?? [])
      await saveProduct(
        {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          stock: Number(form.stock),
          featured: form.featured,
          images,
        },
        editing?.id
      )
      setForm(blank)
      setFiles([])
      setImageUrl('')
      setEditing(null)
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (p) => {
    setForm({ name: p.name, description: p.description ?? '', price: String(p.price), category: p.category, stock: String(p.stock), featured: p.featured })
    setEditing(p)
    setFiles([])
    setImageUrl('')
    window.scrollTo({ top: 0 })
  }

  const cancelEdit = () => {
    setForm(blank)
    setEditing(null)
    setFiles([])
    setImageUrl('')
  }

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return
    setError(null)
    try {
      await deleteProduct(p.id)
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleAdmin = async (u) => {
    setError(null)
    try {
      await setAdmin(u.id, !u.is_admin)
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x)))
    } catch (err) {
      setError(err.message)
    }
  }

  const changeStatus = async (o, status) => {
    setError(null)
    try {
      await updateOrderStatus(o.id, status)
      setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)))
    } catch (err) {
      setError(err.message)
    }
  }

  const removeOrder = async (o) => {
    if (!confirm(`Delete order #${shortId(o.id)}?`)) return
    setError(null)
    try {
      await deleteOrder(o.id)
      setOrders((list) => list.filter((x) => x.id !== o.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleMethod = async (m) => {
    setError(null)
    try {
      await updatePaymentMethod(m.id, !m.enabled)
      setMethods((list) => list.map((x) => (x.id === m.id ? { ...x, enabled: !m.enabled } : x)))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <div className="admin-head row spread">
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Admin</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Signed in as {session.user.email}</p>
        </div>
        <button className="btn" onClick={() => supabase.auth.signOut().then(() => setSession(null))}>Sign out</button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users ({users.length})</button>
        <button className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments</button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {tab === 'products' ? (
        <div className="admin-grid">
          <form className="card form-card" onSubmit={submitProduct}>
            <h3>{editing ? `Edit — ${editing.name}` : 'Add product'}</h3>
            {editing && (
              <button type="button" onClick={cancelEdit} className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12, fontSize: 13 }}>
                <IconX size={13} /> Cancel edit
              </button>
            )}
            <label className="field">
              <span className="field-label">Name</span>
              <input className="input" required value={form.name} onChange={set('name')} />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span className="field-label">Price</span>
                <input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={set('price')} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span className="field-label">Stock</span>
                <input className="input" type="number" min="0" required value={form.stock} onChange={set('stock')} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Category</span>
              <input className="input" required placeholder="e.g. Electronics" value={form.category} onChange={set('category')} />
            </label>
            <label className="check">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
              Featured on the home page
            </label>
            <label className="field">
              <span className="field-label">Image from web URL</span>
              <input className="input" type="url" placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <span className="field-hint">
                Paste any image URL — it gets downloaded into your storage bucket. Overrides the file upload. CORS-blocked hosts fall back to the raw link.
              </span>
            </label>
            <label className="field">
              <span className="field-label">Images ({files.length ? `${files.length} new` : editing ? 'keep existing' : 'none yet'})</span>
              <input className="file-input" type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
              <span className="field-hint">
                {editing && !files.length
                  ? 'Select files to replace the current images.'
                  : 'Upload one or more images; the first is used as the thumbnail.'}
              </span>
              {(files.length > 0 || (editing?.images ?? []).length > 0) && (
                <div className="preview-row">
                  {[...files].map((f, i) => (
                    <img key={`f${i}`} src={URL.createObjectURL(f)} alt="" />
                  ))}
                  {!files.length && (editing?.images ?? []).map((img, i) => <img key={`e${i}`} src={img} alt="" />)}
                </div>
              )}
            </label>
            <button className="btn btn-primary btn-block">
              <IconPlus size={15} /> {editing ? 'Save changes' : 'Add product'}
            </button>
          </form>

          <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <p className="loading">
                <span className="spinner" aria-hidden="true" />
                Loading products…
              </p>
            ) : products.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>No products yet. Add your first one.</p>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th></th></tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.images?.[0] ? <img src={p.images[0]} alt="" /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><IconPhoto size={16} /></div>}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>{p.category}</td>
                        <td>{formatPrice(p.price)}</td>
                        <td>{p.stock}</td>
                        <td>{p.featured ? 'Yes' : 'No'}</td>
                        <td>
                          <div className="row" style={{ gap: 4 }}>
                            <button className="icon-btn" onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`}><IconPencil size={16} /></button>
                            <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><IconTrash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'orders' ? (
        <div style={{ paddingBottom: 40 }}>
          {loading ? (
            <p className="loading">
              <span className="spinner" aria-hidden="true" />
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <div className="card body-card"><p className="muted" style={{ margin: 0 }}>No orders yet.</p></div>
          ) : (
            orders.map((o) => (
              <div className="card body-card" key={o.id} style={{ marginBottom: 16 }}>
                <div className="row spread wrap">
                  <div>
                    <strong>Order #{shortId(o.id)}</strong>
                    <span className="muted" style={{ marginLeft: 10 }}>{new Date(o.created_at).toLocaleString()}</span>
                    <select className="input" aria-label="Order status" value={o.status} style={{ width: 'auto', fontSize: 13, padding: '4px 8px', marginLeft: 10 }} onChange={(e) => changeStatus(o, e.target.value)}>
                      {['pending', 'shipped', 'delivered', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row" style={{ gap: 20 }}>
                    <span className="muted">{o.payment_method}</span>
                    <strong>{formatPrice(o.total)}</strong>
                    <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeOrder(o)} aria-label={`Delete order ${shortId(o.id)}`}><IconTrash size={16} /></button>
                  </div>
                </div>
                <table className="receipt-items">
                  <tbody>
                    {(o.order_items ?? []).map((i) => (
                      <tr key={i.id}>
                        <td>{i.name}</td>
                        <td className="num">×{i.quantity}</td>
                        <td className="num">{formatPrice(i.quantity * i.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {o.customer_name} · {o.email} · {o.phone} · {o.address}
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'users' ? (
        <div style={{ paddingBottom: 40 }}>
          {loading ? (
            <p className="loading">
              <span className="spinner" aria-hidden="true" />
              Loading users…
            </p>
          ) : users.length === 0 ? (
            <div className="card body-card">
              <p className="muted" style={{ margin: 0 }}>
                No user profiles found. Users created before the profile trigger are missing profiles — run in the SQL editor:
                <code style={{ display: 'block', marginTop: 8, fontSize: 12 }}>insert into public.profiles (id, email) select id, email from auth.users on conflict (id) do nothing;</code>
              </p>
            </div>
          ) : (
            <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Email</th><th>Admin</th><th>Created</th><th></th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500 }}>{u.email}</td>
                        <td>{u.is_admin ? 'Yes' : 'No'}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            disabled={u.id === session.user.id}
                            title={u.id === session.user.id ? "You can't demote yourself" : undefined}
                            onClick={() => toggleAdmin(u)}
                          >
                            {u.is_admin ? 'Remove admin' : 'Make admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ paddingBottom: 40 }}>
          {methods.length === 0 ? (
            <div className="card body-card"><p className="muted" style={{ margin: 0 }}>No payment methods configured.</p></div>
          ) : (
            <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Method</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {methods.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>{m.label}</td>
                        <td>{m.enabled ? 'Enabled' : 'Disabled'}</td>
                        <td>
                          <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => toggleMethod(m)}>
                            {m.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: '12px 16px 16px' }}>
                Card payment stays disabled until a Stripe gateway is wired up. Checkout only shows enabled methods.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}