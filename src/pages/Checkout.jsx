import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconChevronLeft, IconPhoto } from '@tabler/icons-react'
import { useCart } from '../context/CartContext'
import { createOrder, dbReady } from '../lib/supabase'
import { formatPrice } from '../lib/format'

const empty = { customer_name: '', email: '', phone: '', address: '' }

const validate = (form) => {
  const errors = {}
  if (!form.customer_name.trim()) errors.customer_name = 'Full name is required.'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.phone.trim()) errors.phone = 'Phone number is required.'
  if (!form.address.trim()) errors.address = 'Shipping address is required.'
  return errors
}

export default function Checkout() {
  const { items, setQuantity, subtotal, clear } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [payment, setPayment] = useState('Cash on delivery')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!items.length) return
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    setPlacing(true)
    setError(null)
    try {
      const order = await createOrder(
        { ...form, payment_method: payment, status: 'pending', total: subtotal },
        items
      )
      clear()
      navigate(`/receipt/${order.id}?t=${order.token}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  if (!dbReady) {
    return (
      <div className="container section">
        <p className="alert alert-error">Supabase is not configured. Copy .env.example to .env and add your project keys. See README.</p>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="container">
        <div className="empty">
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Your bag is empty</p>
          <p className="muted" style={{ margin: '0 0 20px' }}>Add something you like before checking out.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container checkout-grid">
      <div>
        <Link to="/products" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <IconChevronLeft size={14} /> Back to products
        </Link>
        <h1 className="section-title">Checkout</h1>
        <form onSubmit={submit} noValidate>
          <h2 className="section-title" style={{ fontSize: 16 }}>Customer details</h2>
          <div className="row wrap">
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field-label">Full name</span>
              <input className={`input${errors.customer_name ? ' input-error' : ''}`} value={form.customer_name} onChange={set('customer_name')} aria-invalid={Boolean(errors.customer_name)} />
              {errors.customer_name && <p className="error-text">{errors.customer_name}</p>}
            </label>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field-label">Email</span>
              <input className={`input${errors.email ? ' input-error' : ''}`} type="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </label>
          </div>
          <div className="row wrap">
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field-label">Phone</span>
              <input className={`input${errors.phone ? ' input-error' : ''}`} value={form.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} />
              {errors.phone && <p className="error-text">{errors.phone}</p>}
            </label>
            <label className="field" style={{ flex: 2, minWidth: 260 }}>
              <span className="field-label">Shipping address</span>
              <input className={`input${errors.address ? ' input-error' : ''}`} placeholder="Street, city, zip" value={form.address} onChange={set('address')} aria-invalid={Boolean(errors.address)} />
              {errors.address && <p className="error-text">{errors.address}</p>}
            </label>
          </div>

          <h2 className="section-title" style={{ fontSize: 16 }}>Payment method</h2>
          <label className={`pay-option ${payment === 'Cash on delivery' ? 'selected' : ''}`}>
            <input type="radio" name="payment" checked={payment === 'Cash on delivery'} onChange={() => setPayment('Cash on delivery')} />
            <span>
              <strong>Cash on delivery</strong>
              <span className="field-hint" style={{ display: 'block' }}>Pay when your order arrives.</span>
            </span>
          </label>
          <label className="pay-option disabled">
            <input type="radio" name="payment" disabled />
            <span>
              <strong>Card payment</strong>
              <span className="field-hint" style={{ display: 'block' }}>Stripe integration coming soon.</span>
            </span>
          </label>

          {error && <p className="alert alert-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={placing}>
            {placing ? 'Placing order…' : `Place order · ${formatPrice(subtotal)}`}
          </button>
        </form>
      </div>

      <aside>
        <div className="card body-card">
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Order summary</h3>
          {items.map((i) => (
            <div className="order-line" key={i.product_id}>
              {i.image ? <img src={i.image} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg)', display: 'grid', placeItems: 'center' }}><IconPhoto size={16} /></div>}
              <div className="meta">
                <div style={{ fontSize: 14, fontWeight: 500 }}>{i.name}</div>
                <div className="muted">{formatPrice(i.price)} each</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="qty-btn" onClick={() => setQuantity(i.product_id, i.quantity - 1)} aria-label="Decrease quantity">−</button>
                <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14 }}>{i.quantity}</span>
                <button className="qty-btn" onClick={() => setQuantity(i.product_id, i.quantity + 1)} aria-label="Increase quantity">+</button>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>{formatPrice(i.quantity * i.price)}</span>
            </div>
          ))}
          <div className="summary-lines" style={{ marginTop: 12 }}>
            <div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="summary-line"><span>Shipping</span><span>Free</span></div>
            <div className="summary-line total"><span>Total</span><span>{formatPrice(subtotal)}</span></div>
          </div>
        </div>
      </aside>
    </div>
  )
}