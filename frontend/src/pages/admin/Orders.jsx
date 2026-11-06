import { useState } from 'react';
import { admin } from '../../api';
import { useAsync } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatPrice } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';

// Mirrors the server state machine for UX only; the server is the authority.
const NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => admin.orders({ page, limit: 20, status, q: term }), [page, status, term]);

  const change = async (o, next) => {
    if (!next) return;
    try { await admin.setOrderStatus(o._id, next); toast.success(`Order ${o.orderNumber} is now ${next}`); reload(); }
    catch (e) { toast.error(e.message); }
  };

  const refund = async (o) => {
    if (!window.confirm(`Refund ${formatPrice(o.totalAmount)} for order ${o.orderNumber} via Razorpay?`)) return;
    try { await admin.refundOrder(o._id); toast.success('Refund issued'); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <h2>Orders</h2>
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} role="search">
        <input className="input" style={{ flex: 1, minWidth: 200 }} type="search" aria-label="Search orders" placeholder="Order number, customer name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ width: 180 }} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn--secondary">Search</button>
      </form>
      {loading ? <PageLoader /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No orders found" /> : (
        <>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>{data.items.map((o) => (
              <tr key={o._id}>
                <td>{o.orderNumber}<br /><span className="muted">{formatDate(o.createdAt)}</span></td>
                <td>{o.user ? <>{o.user.name}<br /><span className="muted">{o.user.email}</span></> : '—'}</td>
                <td>{formatPrice(o.totalAmount)}</td>
                <td><StatusBadge value={o.paymentStatus} /><br /><span className="muted">{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</span></td>
                <td><StatusBadge value={o.orderStatus} /></td>
                <td>{o.paymentStatus === 'refund_pending' && o.paymentMethod === 'razorpay' && <button className="btn btn--danger btn--sm" onClick={() => refund(o)}>Refund</button>}
                  {NEXT[o.orderStatus].length === 0 ? (o.paymentStatus === 'refund_pending' ? null : <span className="muted">Final</span>) : (
                  <select className="select" aria-label={`Update status for ${o.orderNumber}`} value="" onChange={(e) => change(o, e.target.value)}>
                    <option value="">Move to…</option>{NEXT[o.orderStatus].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>)}</td>
              </tr>))}
            </tbody></table></div>
          {data.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {data.totalPages}</span>
              <button className="btn btn--secondary btn--sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
