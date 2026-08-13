import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { IconPrinter } from '@tabler/icons-react'
import { getOrder, dbReady } from '../lib/supabase'
import { formatPrice, shortId } from '../lib/format'

export default function Receipt() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!dbReady) {
      setError('Supabase is not configured. See README.')
      return
    }
    getOrder(id, token).then(setOrder).catch((e) => setError(e.message))
  }, [id, token])

  if (error) {
    return (
      <div className="container section">
        <p className="alert alert-error">{error}</p>
        <Link to="/products" className="btn">Back to products</Link>
      </div>
    )
  }
  if (!order) {
    return (
      <p className="loading">
        <span className="spinner" aria-hidden="true" />
        Loading receipt…
      </p>
    )
  }

  const subtotal = (order.order_items ?? []).reduce((n, i) => n + i.quantity * i.price, 0)

  return (
    <div className="container receipt-wrap">
      <div className="receipt card">
        <div className="receipt-head">
          <div className="receipt-logo">🧾</div>
          <h2>Order confirmed</h2>
          <p className="muted" style={{ margin: 0 }}>
            Order #{shortId(order.id)} · {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <table className="receipt-items">
          <thead>
            <tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th></tr>
          </thead>
          <tbody>
            {(order.order_items ?? []).map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">{formatPrice(i.price)}</td>
                <td className="num">{formatPrice(i.quantity * i.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-total"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        <div className="receipt-total" style={{ borderTop: 'none', paddingTop: 4 }}><span>Shipping</span><span>Free</span></div>
        <div className="receipt-total"><span>Total ({order.payment_method})</span><span>{formatPrice(order.total)}</span></div>

        <div className="receipt-meta">
          <div>
            <span className="muted">Customer</span>
            <strong>{order.customer_name}</strong><br />
            <span style={{ fontSize: 13 }}>{order.email}<br />{order.phone}</span>
          </div>
          <div>
            <span className="muted">Shipping address</span>
            <span style={{ fontSize: 13 }}>{order.address}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <IconPrinter size={16} /> Print / Download
          </button>
          <Link to="/products" className="btn">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}