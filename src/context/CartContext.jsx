import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'nova-cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const add = (product) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] ?? '',
          quantity: 1,
        },
      ]
    })

  const setQuantity = (productId, quantity) =>
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product_id !== productId)
        : prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    )

  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((n, i) => n + i.quantity * i.price, 0), [items])

  return (
    <CartContext.Provider value={{ items, add, setQuantity, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
