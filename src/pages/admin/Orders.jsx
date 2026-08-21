import { useEffect, useState } from 'react'
import { IconArrowLeft, IconTrash, IconRefresh } from '@tabler/icons-react'
import { supabase, getOrdersAdmin, updateOrderStatusAdmin, getOrderStatusLog, getOrderTransactions, recordRefund, deleteOrder } from '../../lib/supabase'
import { ORDER_STATUSES, isValidStatus } from '../../lib/orderState'
import { formatPrice, shortId } from '../../lib/format'

const PAGE = 10

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [email, setEmail] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [selected, setSelected] = useState(null)
  const [log, setLog] = useState([])
  const [txns, setTxns] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError(null)
    try {
      const { orders, count } = await getOrdersAdmin({
        status, email, from, to,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        range: [page * PAGE, page * PAGE + PAGE - 1],
      })
      setOrders(orders)
      setCount(count)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [page, status, email, from, to, minAmount, maxAmount])

  const openOrder = async (o) => {
    setSelected(o)
    setError(null)
    try {
      const [l, t] = await Promise.all([getOrderStatusLog(o.id), getOrderTransactions(o.id)])
      setLog(l)
      setTxns(t)
    } catch (e) {
      setError(e.message)
    }
  }

  const changeStatus = async (newStatus) => {
    if (!isValidStatus(newStatus) || newStatus === selected.status) return
    setError(null)
    setBusy(true)
    try {
      await updateOrderStatusAdmin(selected.id, newStatus)
      try { await supabase.functions.invoke('notify-order-status', { body: { orderId: selected.id, status: newStatus } }) } catch { /* best-effort */ }
      await openOrder({ ...selected, status: newStatus })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const refund = async () => {
    const amount = prompt(`Refund amount for order #${shortId(selected.id)}? (max ${selected.total})`)
    if (amount === null) return
    const num = Number(amount)
    if (!(num > 0) || num > selected.total) return setError('Enter a valid refund amount (0 < amount <= total).')
    setError(null)
    setBusy(true)
    try {
      await recordRefund(selected.id, num)
      await openOrder({ ...selected, payment_status: 'refunded' })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete order #${shortId(selected.id)}?`)) return
    setError(null)
    setBusy(true)
    try {
      await deleteOrder(selected.id)
      setSelected(null)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE))

  return (
    <div style={{ paddingBottom: 40 }}>
      {error && <p className="alert alert-error">{error}</p>}

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        <input className="input" style={{ width: 200 }} placeholder="Search customer email" value={email} onChange={(e) => { setPage(0); setEmail(e.target.value) }} />
        <select className="input" style={{ width: 'auto' }} aria-label="Filter by status" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value) }}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>From</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value) }} />
        </label>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>To</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value) }} />
        </label>
        <input className="input" style={{ width: 110 }} type="number" min="0" placeholder="Min $" value={minAmount} onChange={(e) => { setPage(0); setMinAmount(e.target.value) }} />
        <input className="input" style={{ width: 110 }} type="number" min="0" placeholder="Max $" value={maxAmount} onChange={(e) => { setPage(0); setMaxAmount(e.target.value) }} />
        <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>{count} order{count === 1 ? '' : 's'}</span>
      </div>

      <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => openOrder(o)}>
                  <td style={{ fontWeight: 500 }}>#{shortId(o.id)}</td>
                  <td>{o.customer_name}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td><span className="tag">{o.status}</span></td>
                  <td><span className="tag">{o.payment_status}</span></td>
                  <td>{formatPrice(o.total)}</td>
                  <td><button className="icon-btn" onClick={(e) => { e.stopPropagation(); openOrder(o) }} aria-label={`View order ${shortId(o.id)}`}>›</button></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="muted">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="row spread" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="card body-card" style={{ marginTop: 16 }}>
          <div className="row spread wrap">
            <h3 style={{ margin: 0, fontSize: 17 }}>
              Order #{shortId(selected.id)}
              <span className="tag" style={{ marginLeft: 10 }}>{selected.status}</span>
              <span className="tag" style={{ marginLeft: 6 }}>{selected.payment_status}</span>
            </h3>
            <button className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelected(null)}>
              <IconArrowLeft size={16} /> Back to list
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Placed {new Date(selected.created_at).toLocaleString()} · {selected.payment_method} · {selected.customer_name} · {selected.email} · {selected.phone} · {selected.address}
          </p>

          <table className="receipt-items">
            <tbody>
              {(selected.order_items ?? []).map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="num">×{i.quantity}</td>
                  <td className="num">{formatPrice(i.quantity * i.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <label className="row" style={{ gap: 6, alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 13 }}>Set status</span>
              <select className="input" style={{ width: 'auto', fontSize: 13, padding: '4px 8px' }} value={selected.status} disabled={busy} onChange={(e) => changeStatus(e.target.value)}>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => { setSelected(null); load() }}><IconRefresh size={13} /> Refresh</button>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={refund}>Refund</button>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)' }} disabled={busy} onClick={remove}><IconTrash size={13} /> Delete</button>
          </div>

          <h4 style={{ fontSize: 15, margin: '24px 0 8px' }}>Status timeline</h4>
          {log.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No status changes recorded yet.</p>
          ) : (
            <div className="receipt-items" style={{ fontSize: 13 }}>
              {log.map((l) => (
                <div key={l.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="tag">{l.status}</span>
                  <span className="muted">{new Date(l.created_at).toLocaleString()}</span>
                  <span className="muted">{l.profiles?.email ?? 'admin'}</span>
                </div>
              ))}
            </div>
          )}

          {txns.length > 0 && (
            <>
              <h4 style={{ fontSize: 15, margin: '24px 0 8px' }}>Transactions</h4>
              <div className="receipt-items" style={{ fontSize: 13 }}>
                {txns.map((t) => (
                  <div key={t.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="tag">{t.type}</span>
                    <span>{t.method}</span>
                    <span className="muted">{t.note}</span>
                    <span>{formatPrice(t.amount)}</span>
                    <span className="muted">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}