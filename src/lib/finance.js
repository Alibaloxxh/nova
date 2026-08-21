const ymd = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const ym = (d) => ymd(d).slice(0, 7)

const weekKey = (d) => {
  const x = new Date(d)
  const day = x.getDay() === 0 ? 6 : x.getDay() - 1 // Monday = 0
  x.setDate(x.getDate() - day)
  return ymd(x)
}

const periodKey = (d, period) => (period === 'month' ? ym(d) : period === 'week' ? weekKey(d) : ymd(d))

export const grossRevenue = (orders) =>
  orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)

export const refundsTotal = (txns) =>
  txns.filter((t) => t.type === 'refund').reduce((s, t) => s + Number(t.amount), 0)

// COD cash collected (shipped/delivered) that has no payout transaction recorded yet.
export const pendingPayouts = (orders, txns) => {
  const deposited = new Set(txns.filter((t) => t.type === 'payout').map((t) => t.order_id))
  const list = orders.filter(
    (o) =>
      o.payment_method === 'Cash on delivery' &&
      (o.status === 'shipped' || o.status === 'delivered') &&
      !deposited.has(o.id)
  )
  return { count: list.length, total: list.reduce((s, o) => s + Number(o.total), 0), orders: list }
}

export const revenueByPeriod = (orders, period) => {
  const map = new Map()
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const key = periodKey(o.created_at, period)
    map.set(key, (map.get(key) ?? 0) + Number(o.total))
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, total]) => ({ key, total }))
}

// Flag orders where status and payment status disagree.
export const mismatches = (orders) => {
  const out = []
  for (const o of orders) {
    if (o.status === 'delivered' && o.payment_status !== 'paid') out.push({ ...o, reason: 'Delivered but payment not paid' })
    else if (o.status === 'cancelled' && o.payment_status === 'paid') out.push({ ...o, reason: 'Cancelled but payment paid (needs refund)' })
    else if (o.status === 'refunded' && o.payment_status !== 'refunded') out.push({ ...o, reason: 'Refunded but payment not marked refunded' })
  }
  return out
}