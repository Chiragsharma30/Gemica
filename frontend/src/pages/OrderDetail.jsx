import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { orders } from '../api';
import { imageUrl } from '../api/client';
import { useAsync, useTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, formatPrice } from '../utils/format';
import { payForOrder } from '../utils/razorpay';
import StatusBadge from '../components/StatusBadge';
import { ErrorState, PageLoader } from '../components/States';

const STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  useTitle('Order');
  const { data, loading, error, reload } = useAsync(() => orders.get(id), [id]);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) {
    return error.status === 404
      ? <div className="container state"><h1>Order not found</h1><Link className="btn btn--primary" to="/orders">My orders</Link></div>
      : <div className="container"><ErrorState message={error.message} onRetry={reload} /></div>;
  }
  const o = data.order;
  const cancelled = o.orderStatus === 'cancelled';
  const canCancel = ['placed', 'confirmed'].includes(o.orderStatus);
  const canPay = o.paymentMethod === 'razorpay' && ['pending', 'failed'].includes(o.paymentStatus) && !cancelled;

  const act = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container section">
      {params.get('placed') && (
        <div className={`alert ${canPay ? 'alert--warn' : 'alert--ok'}`} role="status">
          {canPay ? 'Your order is placed, but payment is still pending.' : 'Thank you! Your order has been placed.'}
        </div>
      )}
      <h1>Order {o.orderNumber}</h1>
      <p className="muted">Placed on {formatDate(o.createdAt)}</p>
      <p><StatusBadge value={o.orderStatus} /> <StatusBadge value={o.paymentStatus} /></p>

      {!cancelled && (
        <ol aria-label="Order progress" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s} className="tag" aria-current={s === o.orderStatus ? 'step' : undefined}
              style={{ fontWeight: STEPS.indexOf(o.orderStatus) >= i ? 600 : 400, opacity: STEPS.indexOf(o.orderStatus) >= i ? 1 : 0.55 }}>{s}</li>
          ))}
        </ol>
      )}

      <div className="two-col" style={{ marginTop: 16 }}>
        <section className="card" aria-label="Items">
          {o.items.map((i) => (
            <div className="line" key={i.sku + i.name}>
              <img src={imageUrl(i.image)} alt="" loading="lazy" />
              <div><strong>{i.name}</strong><div className="muted">{i.variantLabel} · {formatPrice(i.unitPrice)} × {i.quantity}</div></div>
            </div>
          ))}
          <h3 style={{ marginTop: 16 }}>Delivery address</h3>
          <p>{o.shippingAddress.fullName}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''}<br />{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}<br />{o.shippingAddress.phone}</p>
        </section>
        <aside className="card" aria-label="Payment summary">
          <h2>Summary</h2>
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(o.subtotal)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{o.shippingFee ? formatPrice(o.shippingFee) : 'Free'}</span></div>
          {o.discountAmount > 0 && <div className="summary-row"><span>Discount {o.couponCode && `(${o.couponCode})`}</span><span>−{formatPrice(o.discountAmount)}</span></div>}
          <div className="summary-row summary-row--total"><span>Total</span><span>{formatPrice(o.totalAmount)}</span></div>
          <p className="muted">{o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online (Razorpay)'}</p>
          <Link className="btn btn--secondary btn--block" style={{ marginBottom: 8 }} to={`/orders/${o._id}/invoice`}>View invoice</Link>
          {canPay && <button className="btn btn--primary btn--block" disabled={busy} onClick={() => act(() => payForOrder(o, user), 'Payment received')}>Pay now</button>}
          {canCancel && <button className="btn btn--secondary btn--block" style={{ marginTop: 8 }} disabled={busy} onClick={() => window.confirm('Cancel this order?') && act(() => orders.cancel(o._id), 'Order cancelled')}>Cancel order</button>}
          {o.paymentStatus === 'refund_pending' && <p className="alert alert--warn" style={{ marginTop: 12 }}>Your refund is being processed.</p>}
        </aside>
      </div>
    </div>
  );
}
