import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-contact">
          <div className="brand">NOVA</div>
          <p className="muted">
            415 Mission Street<br />
            San Francisco, CA 94105<br />
            hello@shopnova.co<br />
            +1 415 555 0134
          </p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Quick links</h4>
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/products">New arrivals</Link>
            <Link to="/admin">Admin</Link>
          </div>
          <div className="footer-col">
            <h4>Services</h4>
            <span>Shipping & returns</span>
            <span>Size guide</span>
            <span>FAQ</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">NOVA</div>
      <div className="footer-bottom">© 2026 Nova. All rights reserved.</div>
    </footer>
  )
}