import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { IconShoppingBag, IconHeart, IconUserCircle, IconMenu, IconX } from '@tabler/icons-react'
import { useCart } from '../context/CartContext'

const PERKS = ['Free shipping on orders over $100', 'Fresh & natural, just for you', 'Buy more, save more']

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'New arrivals' },
  { to: '/products', label: 'Products' },
  { to: '/', label: 'Categories' },
  { to: '/products', label: 'Sale' },
]

export default function Nav() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="announce">
        <div className="announce-inner">
          {PERKS.map((p, i) => (
            <span className="announce-item" key={p}>
              {i > 0 && <span className="announce-divider" aria-hidden="true" />}
              {p}
            </span>
          ))}
        </div>
      </div>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand">NOVA</Link>
          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.label} className="link" to={l.to} end={l.to === '/'}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="nav-icons">
            <Link to="/checkout" className="bag-link" aria-label={`Bag, ${count} item${count === 1 ? '' : 's'}`}>
              <IconShoppingBag size={20} />
              {count > 0 && <span className="bag-count">{count}</span>}
            </Link>
            <button className="icon-btn" aria-label="Wishlist" title="Wishlist"><IconHeart size={20} /></button>
            <Link to="/login" className="icon-btn" aria-label="Account" title="Account"><IconUserCircle size={22} /></Link>
            <button
              className="burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <IconX size={22} /> : <IconMenu size={22} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="nav-panel" id="mobile-menu" aria-label="Mobile">
            {LINKS.map((l) => (
              <NavLink key={l.label} className="link" to={l.to} end={l.to === '/'}>{l.label}</NavLink>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}