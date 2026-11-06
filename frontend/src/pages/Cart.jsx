import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { imageUrl } from '../api/client';
import { formatPrice } from '../utils/format';
import QuantityStepper from '../components/QuantityStepper';
import { EmptyState, PageLoader } from '../components/States';

export default function Cart() {
  useTitle('Your cart');
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  if (cart.loading) return <PageLoader />;
  if (cart.items.length === 0) {
    return <div className="container"><EmptyState title="Your cart is empty" message="Find something you love." actionTo="/shop" actionLabel="Continue shopping" /></div>;
  }

  const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast.error(e.message); } };
  const checkout = () => (user ? navigate('/checkout') : navigate('/login', { state: { from: '/checkout' } }));

  return (
    <div className="container section">
      <h1>Your cart</h1>
      {cart.hasIssues && <div className="alert alert--warn" role="alert">Some items are no longer available in the requested quantity. Please update them before checking out.</div>}
      <div className="two-col">
        <section aria-label="Cart items">
          {cart.items.map((i) => (
            <div className="line" key={i.id}>
              <img src={imageUrl(i.image)} alt="" loading="lazy" />
              <div>
                <Link to={`/product/${i.slug}`}><strong>{i.name}</strong></Link>
                <div className="muted">{i.label} · {formatPrice(i.unitPrice)}</div>
                {i.issue && <span className="tag tag--bad">{i.issue === 'unavailable' ? 'No longer available' : `Only ${i.stock} in stock`}</span>}
                <div className="line__row">
                  <QuantityStepper value={i.quantity} max={Math.max(1, Math.min(10, i.stock ?? 10))} onChange={run((q) => cart.setQuantity(i.id, q))} label={`Quantity for ${i.name}`} />
                  <strong>{formatPrice(i.unitPrice * i.quantity)}</strong>
                  <button className="btn btn--ghost" onClick={run(() => cart.remove(i.id))} aria-label={`Remove ${i.name}`}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </section>
        <aside className="card sticky" aria-label="Order summary">
          <h2>Summary</h2>
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{cart.shippingFee === null ? 'Calculated at checkout' : cart.shippingFee === 0 ? 'Free' : formatPrice(cart.shippingFee)}</span></div>
          {cart.totalAmount !== null && <div className="summary-row summary-row--total"><span>Total</span><span>{formatPrice(cart.totalAmount)}</span></div>}
          <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={checkout} disabled={cart.hasIssues}>{user ? 'Proceed to checkout' : 'Log in to check out'}</button>
          <p className="muted" style={{ marginTop: 12, fontSize: 'var(--fs-sm)' }}>The final amount is confirmed by our server when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}
