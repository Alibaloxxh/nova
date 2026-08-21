import test from 'node:test'
import assert from 'node:assert/strict'
import { ORDER_STATUSES, isValidStatus, paymentStatusForOrderStatus } from '../src/lib/orderState.js'

test('ORDER_STATUSES is the full, expected set', () => {
  assert.deepEqual(ORDER_STATUSES, ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
})

test('isValidStatus accepts known statuses and rejects others', () => {
  for (const s of ORDER_STATUSES) assert.equal(isValidStatus(s), true)
  assert.equal(isValidStatus('new'), false)
  assert.equal(isValidStatus(''), false)
  assert.equal(isValidStatus('DELIVERED'), false)
})

test('paymentStatusForOrderStatus: delivered means paid', () => {
  assert.equal(paymentStatusForOrderStatus('delivered'), 'paid')
})

test('paymentStatusForOrderStatus: all other statuses leave payment unchanged', () => {
  for (const s of ['pending', 'processing', 'shipped', 'cancelled', 'refunded']) {
    assert.equal(paymentStatusForOrderStatus(s), null)
  }
})