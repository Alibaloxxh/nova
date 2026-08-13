import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { IconPhoto, IconShoppingBag, IconCheck } from '@tabler/icons-react'
import { getProduct, dbReady } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/format'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [active, setActive] = useState(0)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)
  const { add } = useCart()

  useEffect(() => {
    if (!dbReady) {
      setError('Supabase is not configured. See README.')
      return
    }
    getProduct(id)
      .then(setProduct)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <div className="container section">
        <p className="alert alert-error">{error}</p>
      </div>
    )
  }
  if (!product) {
    return (
      <p className="loading">
        <span className="spinner" aria-hidden="true" />
        Loading product…
      </p>
    )
  }

  const outOfStock = product.stock <= 0

  const handleAdd = () => {
    if (outOfStock) return
    add(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div className="container detail">
      <div>
        {product.images?.[active] ? (
          <img className="card-media" style={{ borderRadius: 'var(--radius)' }} src={product.images[active]} alt={product.name} />
        ) : (
          <div className="card-media" style={{ borderRadius: 'var(--radius)' }}><IconPhoto size={40} /></div>
        )}
        {product.images?.length > 1 && (
          <div className="thumbs">
            {product.images.map((img, i) => (
              <button key={i} className={`thumb ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} aria-label={`View image ${i + 1} of ${product.images.length}`}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="tag">{product.category}</span>
        <h1 style={{ marginTop: 8 }}>{product.name}</h1>
        <p className="muted">{outOfStock ? <span className="stock-out">Out of stock</span> : <span className="stock-ok">{product.stock} in stock</span>}</p>
        <p className="price-lg">{formatPrice(product.price)}</p>
        <p style={{ margin: '0 0 24px' }}>{product.description || 'No description yet.'}</p>
        <button className="btn btn-primary btn-block" style={{ maxWidth: 320 }} onClick={handleAdd} disabled={outOfStock}>
          {added ? <><IconCheck size={16} /> Added to bag</> : <><IconShoppingBag size={16} /> Add to bag</>}
        </button>
      </div>
    </div>
  )
}