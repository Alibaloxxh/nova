import { useEffect, useState } from 'react'
import { getOrdersAdmin, getTransactions, recordPayout } from '../../lib/supabase'
import { grossRevenue, refundsTotal, pendingPayouts, revenueByPeriod, mismatches } from '../../lib/finance'
import { downloadCsv } from '../../lib/csv'
import { formatPrice, shortId } from '../../lib/format'

const PAGE = 15

export default function Finance() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [period, setPeriod] = useState('day')
  const [txType, setTxType] = useState('')
  const [orders, setOrders] = useState([])
  const [txns, setTxns] = useState([])
  const [txPage, setTxPage] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError(null)
    try {
      const [o, t] = await Promise.all([
        getOrdersAdmin({ from, to }),
        getTransactions({ from, to }),
      ])
      setOrders(o.orders)
      setTxns(t)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [from, to])

  const revenue = grossRevenue(orders)
  const refunds = refundsTotal(txns)
  const payout = pendingPayouts(orders, txns)
  const flagged = mismatches(orders)
  const revenueRows = revenueByPeriod(orders, period)
  const maxRevenue = Math.max(0, ...revenueRows.map((r) => r.total))
  const filteredTx = txns.filter((t) => !txType || t.type === txType)
  const totalTxPages = Math.max(1, Math.ceil(filteredTx.length / PAGE))
  const shownTx = filteredTx.slice(txPage * PAGE, txPage * PAGE + PAGE)

  const exportTransactions = () => {
    downloadCsv(`transactions-${from || 'all'}-${to || 'all'}.csv`, [
      ['Date', 'Order', 'Customer', 'Type', 'Method', 'Note', 'Amount'],
      ...filteredTx.map((t) => [new Date(t.created_at).toISOString().slice(0, 10), shortId(t.order_id), t.orders?.customer_name ?? '', t.type, t.method ?? '', t.note ?? '', t.amount]),
    ])
  }

  const exportRevenue = () => {
    downloadCsv(`revenue-${period}-${from || 'all'}-${to || 'all'}.csv`, [
      ['Period', 'Revenue'],
      ...revenueRows.map((r) => [r.key, r.total]),
    ])
  }

  const deposit = async (o) => {
    const amount = prompt(`Record deposit for order #${shortId(o.id)}? (default ${o.total})`, String(o.total))
    if (amount === null) return
    const num = Number(amount)
    if (!(num > 0)) return setError('Enter a valid deposit amount.')
    setError(null)
    setBusy(true)
    try {
      await recordPayout(o.id, num)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const card = (label, value, sub) => (
    <div className="card body-card" style={{ flex: 1, minWidth: 160 }}>
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ paddingBottom: 40 }}>
      {error && <p className="alert alert-error">{error}</p>}

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>From</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setTxPage(0) }} />
        </label>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>To</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => { setTo(e.target.value); setTxPage(0) }} />
        </label>
      </div>

      <div className="row wrap" style={{ gap: 12, marginBottom: 24 }}>
        {card('Total revenue', formatPrice(revenue), 'excluding cancelled')}
        {card('Refunds issued', formatPrice(refunds))}
        {card('Net revenue', formatPrice(revenue - refunds))}
        {card('Pending payouts', formatPrice(payout.total), `${payout.count} COD order${payout.count === 1 ? '' : 's'} awaiting deposit`)}
      </div>

      <h2 style={{ fontSize: 18 }}>Revenue by period</h2>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        {['day', 'week', 'month'].map((p) => (
          <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
        ))}
        <button className="btn" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }} onClick={exportRevenue}>Export revenue CSV</button>
      </div>
      <div className="card body-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Period</th><th>Revenue</th></tr></thead>
            <tbody>
              {revenueRows.length === 0 && <tr><td colSpan={2} className="muted">No orders in this period.</td></tr>}
              {revenueRows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 120, height: 10, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${maxRevenue ? (r.total / maxRevenue) * 100 : 0}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                      <strong>{formatPrice(r.total)}</strong>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {flagged.length > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Mismatches ({flagged.length})</h2>
          <div className="card body-card" style={{ marginBottom: 24 }}>
            {flagged.map((o) => (
              <div key={o.id} className="row spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>#{shortId(o.id)}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>{o.customer_name}</span>
                </div>
                <span className="tag" style={{ color: 'var(--danger)' }}>{o.reason}</span>
                <span className="muted">{o.status} / {o.payment_status}</span>
                <strong>{formatPrice(o.total)}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      {payout.count > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Pending payouts — record deposits</h2>
          <div className="card body-card" style={{ marginBottom: 24 }}>
            {payout.orders.map((o) => (
              <div key={o.id} className="row spread wrap" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>#{shortId(o.id)}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>{o.customer_name}</span>
                  <span className="tag" style={{ marginLeft: 8 }}>{o.status}</span>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <strong>{formatPrice(o.total)}</strong>
                  <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => deposit(o)}>Record deposit</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row spread wrap" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Transactions ({filteredTx.length})</h2>
        <div className="row" style={{ gap: 8 }}>
          <select className="input" style={{ width: 'auto' }} aria-label="Filter by type" value={txType} onChange={(e) => { setTxType(e.target.value); setTxPage(0) }}>
            <option value="">All types</option>
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="payout">Payout</option>
          </select>
          <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={exportTransactions}>Export transactions CSV</button>
        </div>
      </div>
      <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Type</th><th>Method</th><th>Note</th><th>Amount</th></tr></thead>
            <tbody>
              {shownTx.length === 0 && <tr><td colSpan={7} className="muted">No transactions.</td></tr>}
              {shownTx.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>#{shortId(t.order_id)}</td>
                  <td>{t.orders?.customer_name ?? ''}</td>
                  <td><span className="tag">{t.type}</span></td>
                  <td>{t.method ?? ''}</td>
                  <td>{t.note ?? ''}</td>
                  <td>{formatPrice(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row spread" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 13 }}>Page {txPage + 1} of {totalTxPages}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={txPage === 0} onClick={() => setTxPage(txPage - 1)}>Prev</button>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={txPage >= totalTxPages - 1} onClick={() => setTxPage(txPage + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}