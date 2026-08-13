import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconSearch } from '@tabler/icons-react'
import { getProducts, getCategories, dbReady } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 12

export default function Products() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const query = params.get('q') ?? ''
  const [search, setSearch] = useState(query)
  const [products, setProducts] = useState([])
  const [count, setCount] = useState(0)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!dbReady) {
      setError('Supabase is not configured. Copy .env.example to .env and add your project keys. See README.')
      return
    }
    setLoading(true)
    setProducts([])
    setError(null)
    getProducts({ category: category || undefined, search: query || undefined, range: [0, PAGE_SIZE - 1] })
      .then((r) => {
        setProducts(r.products)
        setCount(r.count)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    if (!categories.length) getCategories().then(setCategories).catch(() => {})
  }, [category, query])

  const loadMore = () => {
    if (loadingMore) return
    setLoadingMore(true)
    getProducts({ category: category || undefined, search: query || undefined, range: [products.length, products.length + PAGE_SIZE - 1] })
      .then((r) => setProducts((prev) => [...prev, ...r.products]))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMore(false))
  }

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <div className="container section">
      <h1 className="section-title">Products</h1>
      <div className="filters">
        <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setFilter('category', '')}>All</button>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setFilter('category', c)}>
            {c}
          </button>
        ))}
        <form className="search-bar" onSubmit={(e) => { e.preventDefault(); setFilter('q', search.trim()) }}>
          <span className="icon"><IconSearch size={16} /></span>
          <input className="input" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {loading ? (
        <p className="loading">
          <span className="spinner" aria-hidden="true" />
          Loading products…
        </p>
      ) : products.length === 0 ? (
        <div className="empty">
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No products found</p>
          <p className="muted" style={{ margin: 0 }}>Try a different search or category.</p>
        </div>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 16px' }}>{count} product{count === 1 ? '' : 's'}</p>
          <div className="grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {products.length < count && (
            <div className="center" style={{ marginTop: 28 }}>
              <button className="btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}