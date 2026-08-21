export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

export const isValidStatus = (s) => ORDER_STATUSES.includes(s)

// Mirrors the SQL in admin_update_order_status: an order is paid when delivered.
// Returns null when the status leaves payment_status unchanged.
export const paymentStatusForOrderStatus = (s) => (s === 'delivered' ? 'paid' : null)