import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, dbReady } from '../lib/supabase'
import { formatPrice, shortId } from '../lib/format'

export default function Account() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!dbReady) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session
      if (s) {
        const { data: profile } = await supabase.from('profiles').select('email, is_admin').eq('id', s.user.id).single()
        setProfile(profile)
        const { data: orders } = await supabase
          .from('orders')
          .select('id, customer_name, total, status, created_at, order_items(name, price, quantity)')
          .order('created_at', { ascending: false })
        setOrders(orders ?? [])
      }
      setSession(s)
      setChecking(false)
    })
  }, [])

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
        Loading account…
      </p>
    )
  }
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="container">
      <div className="admin-head row spread">
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>My account</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {session.user.email}
            {profile?.is_admin && <span className="tag" style={{ marginLeft: 10 }}>Admin</span>}
          </p>
        </div>
        <button className="btn" onClick={() => supabase.auth.signOut().then(() => setSession(null))}>Sign out</button>
      </div>

      <div style={{ paddingBottom: 40 }}>
        <h2 style={{ fontSize: 18 }}>My orders</h2>
        {orders.length === 0 ? (
          <div className="card body-card"><p className="muted" style={{ margin: 0 }}>No orders yet.</p></div>
        ) : (
          orders.map((o) => (
            <div className="card body-card" key={o.id} style={{ marginBottom: 16 }}>
              <div className="row spread wrap">
                <div>
                  <strong>Order #{shortId(o.id)}</strong>
                  <span className="muted" style={{ marginLeft: 10 }}>{new Date(o.created_at).toLocaleString()}</span>
                  <span className="tag" style={{ marginLeft: 10 }}>{o.status}</span>
                </div>
                <div className="row" style={{ gap: 20 }}>
                  <span className="muted">{o.payment_method}</span>
                  <strong>{formatPrice(o.total)}</strong>
                </div>
              </div>
              <table className="receipt-items">
                <tbody>
                  {(o.order_items ?? []).map((i) => (
                    <tr key={`${o.id}-${i.name}`}>
                      <td>{i.name}</td>
                      <td className="num">×{i.quantity}</td>
                      <td className="num">{formatPrice(i.quantity * i.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}