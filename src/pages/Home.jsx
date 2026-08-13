import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { getProducts, dbReady } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import { formatPrice } from '../lib/format'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const railRef = useRef(null)

  useEffect(() => {
    if (!dbReady) {
      setError('Supabase is not configured. Copy .env.example to .env and add your project keys. See README.')
      return
    }
    getProducts({})
      .then(({ products }) => setFeatured(products.filter((p) => p.featured).slice(0, 8)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const heroProduct = featured[0]
  const scroll = (dir) => railRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })

  return (
    <div>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrows">
              <span>Move comfortably</span>
              <span>Live freely</span>
              <span>Feel confident</span>
            </div>
            <h1 className="hero-title">Pure<br />comfort</h1>
            <p className="hero-sub">
              Thoughtfully made essentials in natural fabrics — designed to move with you, wear after wear.
            </p>
            <div className="hero-ctas">
              <Link to="/products" className="btn btn-coral">Shop the collection</Link>
              <Link to="/products" className="btn btn-outline-dark">Explore new arrivals</Link>
            </div>
          </div>
          <div className="hero-media">
            <img src="/images/products/hero.jpg" alt="Nova collection" />
            {heroProduct && (
              <div className="hero-card">
                {heroProduct.images?.[0] && <img src={heroProduct.images[0]} alt="" />}
                <div>
                  <div className="hero-card-name">{heroProduct.name}</div>
                  <div className="hero-card-price">{formatPrice(heroProduct.price)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="hotpicks">
        <div className="container">
          <div className="hotpicks-head">
            <div>
              <span className="hotpicks-pill">Hot picks</span>
              <h2>Everyday styles you'll love</h2>
            </div>
            <div className="hotpicks-arrows">
              <button className="arrow-btn" onClick={() => scroll(-1)} aria-label="Scroll left"><IconChevronLeft size={18} /></button>
              <button className="arrow-btn" onClick={() => scroll(1)} aria-label="Scroll right"><IconChevronRight size={18} /></button>
            </div>
          </div>
          {error && <p className="alert alert-error">{error}</p>}
          {loading ? (
            <p className="loading">
              <span className="spinner" aria-hidden="true" />
              Loading picks…
            </p>
          ) : (
            <div className="hotpicks-rail" ref={railRef}>
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      <section className="container promo">
        <div className="promo-photo">
          <img src="/images/products/lookbook.jpg" alt="Nova lookbook" />
          <span className="promo-tag promo-tag-1">New season</span>
          <span className="promo-tag promo-tag-2">Free shipping over $100</span>
        </div>
        <div className="promo-card">
          <span className="hotpicks-pill">About Nova</span>
          <h2>Elevated fashion for everyday shoppers</h2>
          <p>
            From first fittings to everyday wear — Nova brings together natural fabrics, honest pricing
            and silhouettes that work as hard as you do.
          </p>
          <div className="promo-avatars">
            <img src="/images/avatar-1.jpg" alt="Customer" />
            <img src="/images/avatar-2.jpg" alt="Customer" />
            <img src="/images/avatar-3.jpg" alt="Customer" />
            <span>+2,000 happy customers</span>
          </div>
          <div>
            <Link to="/products" className="btn btn-coral">Shop the collection</Link>
          </div>
        </div>
      </section>
    </div>
  )
}