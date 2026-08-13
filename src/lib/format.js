export const formatPrice = (n) => `$${Number(n ?? 0).toFixed(2)}`

export const shortId = (id) => (id ? id.slice(0, 8).toUpperCase() : '')
