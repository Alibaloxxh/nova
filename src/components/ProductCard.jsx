import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconHeart, IconPhoto, IconShoppingBag } from '@tabler/icons-react'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const [saved, setSaved] = useState(false)
  const out = product.stock <= 0

  return (
    <div className="pcard">
      <Link to={`/products/${product.id}`} className="pcard-media">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" />
        ) : (
          <div className="pcard-placeholder"><IconPhoto size={28} /></div>
        )}
        {product.featured && <span className="pcard-badge">Best seller</span>}
        <button
          className={`pcard-heart${saved ? ' saved' : ''}`}
          aria-label="Add to wishlist"
          onClick={(e) => { e.preventDefault(); setSaved(!saved) }}
        >
          <IconHeart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button
          className="pcard-add"
          disabled={out}
          onClick={(e) => { e.preventDefault(); add(product) }}
        >
          <IconShoppingBag size={14} /> {out ? 'Out of stock' : 'Add to cart'}
        </button>
      </Link>
      <div className="pcard-info">
        <Link to={`/products/${product.id}`} className="pcard-name">{product.name}</Link>
        <span className="pcard-price">{formatPrice(product.price)}</span>
      </div>
    </div>
  )
}