import { Link, useParams } from 'react-router-dom';
import { orders } from '../api';
import { useAsync, useTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatPrice } from '../utils/format';
import { ErrorState, PageLoader } from '../components/States';

export default function Invoice() {
  const { id } = useParams();
  const { user } = useAuth();
  useTitle('Invoice');
  const { data, loading, error, reload } = useAsync(() => orders.get(id), [id]);
  if (loading) return <PageLoader />;
  if (error) return <div className="container"><ErrorState message={error.message} onRetry={reload} /></div>;
  const o = data.order;
  const a = o.shippingAddress;
  return (
    <div className="container">
      <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <Link className="btn btn--secondary" to={`/orders/${o._id}`}>Back to order</Link>
      </div>
      <article className="invoice" aria-label={`Invoice ${o.orderNumber}`}>
        <div className="invoice__head">
          <div><h1 style={{ marginBottom: 0 }}>Gemica</h1><p>Fine fashion jewellery<br />care@gemica.example</p></div>
          <div style={{ textAlign: 'right' }}><h2>Invoice</h2><p>No. <strong>{o.orderNumber}</strong><br />Date: {formatDate(o.createdAt)}<br />Payment: {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online'} ({o.paymentStatus.replace('_', ' ')})</p></div>
        </div>
        <p><strong>Billed &amp; shipped to</strong><br />{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}{user?.email ? <><br />{user.email}</> : null}</p>
        <table>
          <thead><tr><th>Item</th><th>Option</th><th className="num">Price</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
          <tbody>{o.items.map((i) => <tr key={i.sku}><td>{i.name}<br /><small>SKU {i.sku}</small></td><td>{i.variantLabel}</td><td className="num">{formatPrice(i.unitPrice)}</td><td className="num">{i.quantity}</td><td className="num">{formatPrice(i.unitPrice * i.quantity)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan="4" className="num">Subtotal</td><td className="num">{formatPrice(o.subtotal)}</td></tr>
            {o.discountAmount > 0 && <tr><td colSpan="4" className="num">Discount {o.couponCode && `(${o.couponCode})`}</td><td className="num">−{formatPrice(o.discountAmount)}</td></tr>}
            <tr><td colSpan="4" className="num">Shipping</td><td className="num">{o.shippingFee ? formatPrice(o.shippingFee) : 'Free'}</td></tr>
            <tr><td colSpan="4" className="num"><strong>Total (INR, incl. taxes)</strong></td><td className="num"><strong>{formatPrice(o.totalAmount)}</strong></td></tr>
          </tfoot>
        </table>
        <p><small>Thank you for shopping with Gemica. This is a computer-generated invoice.</small></p>
      </article>
    </div>
  );
}
