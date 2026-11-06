import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <p className="logo">Gem<span>i</span>ca</p>
          <p className="muted">Elegant fashion jewellery, made to be worn every day.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <ul><li><Link to="/shop?category=rings">Rings</Link></li><li><Link to="/shop?category=necklaces">Necklaces</Link></li><li><Link to="/shop?category=earrings">Earrings</Link></li><li><Link to="/shop?category=bracelets">Bracelets</Link></li></ul>
        </div>
        <div>
          <h3>Support</h3>
          <ul><li><Link to="/orders">Track an order</Link></li><li><a href="mailto:care@gemica.example">care@gemica.example</a></li></ul>
        </div>
        <div>
          <h3>Policies</h3>
          <ul><li><span className="muted">Shipping &amp; returns</span></li><li><span className="muted">Privacy</span></li><li><span className="muted">Terms</span></li></ul>
        </div>
      </div>
    </footer>
  );
}
