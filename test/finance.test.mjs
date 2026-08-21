import test from 'node:test'
import assert from 'node:assert/strict'
import {
  grossRevenue, refundsTotal, pendingPayouts, revenueByPeriod, mismatches,
} from '../src/lib/finance.js'

const order = (id, total, status, payment_status, payment_method, created_at) => ({
  id, total, status, payment_status, payment_method, created_at,
})

test('grossRevenue sums totals, excluding cancelled', () => {
  const orders = [
    order('a', 100, 'delivered', 'paid', 'COD', '2026-08-01'),
    order('b', 50, 'shipped', 'unpaid', 'COD', '2026-08-02'),
    order('c', 80, 'cancelled', 'unpaid', 'COD', '2026-08-03'),
  ]
  assert.equal(grossRevenue(orders), 150)
  assert.equal(grossRevenue([]), 0)
})

test('refundsTotal sums refund transactions only', () => {
  const txns = [
    { type: 'payment', amount: 100 },
    { type: 'refund', amount: 20 },
    { type: 'payout', amount: 100 },
    { type: 'refund', amount: 5 },
  ]
  assert.equal(refundsTotal(txns), 25)
})

test('pendingPayouts: COD shipped/delivered with no payout tx', () => {
  const orders = [
    order('a', 100, 'delivered', 'paid', 'Cash on delivery', '2026-08-01'),
    order('b', 50, 'shipped', 'unpaid', 'Cash on delivery', '2026-08-02'),
    order('c', 80, 'pending', 'unpaid', 'Cash on delivery', '2026-08-03'),
    order('d', 60, 'delivered', 'paid', 'Bank transfer', '2026-08-04'),
    order('e', 40, 'delivered', 'paid', 'Cash on delivery', '2026-08-05'),
  ]
  const txns = [{ type: 'payout', order_id: 'e' }, { type: 'payment', order_id: 'a' }]
  const { count, total, orders: list } = pendingPayouts(orders, txns)
  assert.equal(count, 2)
  assert.equal(total, 150)
  assert.deepEqual(list.map((o) => o.id), ['a', 'b'])
})

test('revenueByPeriod groups by day', () => {
  const orders = [
    order('a', 100, 'delivered', 'paid', 'COD', '2026-08-01T10:00:00'),
    order('b', 50, 'shipped', 'unpaid', 'COD', '2026-08-01T14:00:00'),
    order('c', 80, 'cancelled', 'unpaid', 'COD', '2026-08-02T10:00:00'),
  ]
  assert.deepEqual(revenueByPeriod(orders, 'day'), [
    { key: '2026-08-01', total: 150 },
  ])
})

test('revenueByPeriod groups by month', () => {
  const orders = [
    order('a', 100, 'delivered', 'paid', 'COD', '2026-07-15T10:00:00'),
    order('b', 40, 'delivered', 'paid', 'COD', '2026-08-01T10:00:00'),
    order('c', 20, 'delivered', 'paid', 'COD', '2026-08-20T10:00:00'),
  ]
  assert.deepEqual(revenueByPeriod(orders, 'month'), [
    { key: '2026-07', total: 100 },
    { key: '2026-08', total: 60 },
  ])
})

test('mismatches flags delivered-unpaid, cancelled-paid, refunded-unpaid', () => {
  const orders = [
    order('a', 100, 'delivered', 'unpaid', 'COD', '2026-08-01'),
    order('b', 50, 'delivered', 'paid', 'COD', '2026-08-01'),
    order('c', 80, 'cancelled', 'paid', 'COD', '2026-08-01'),
    order('d', 40, 'refunded', 'paid', 'COD', '2026-08-01'),
    order('e', 30, 'refunded', 'refunded', 'COD', '2026-08-01'),
  ]
  const flagged = mismatches(orders)
  assert.equal(flagged.length, 3)
  assert.deepEqual(flagged.map((o) => o.id), ['a', 'c', 'd'])
  assert.match(flagged[0].reason, /Delivered/)
})