import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orders } from '../api';
import { useAsync, useTitle } from '../hooks';
import { formatDate, formatPrice } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, ErrorState, PageLoader } from '../components/States';

export default function Orders() {
  useTitle('My orders');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => orders.mine({ page, limit: 10 }), [page]);
  if (loading) return <PageLoader />;
  if (error) return <div className="container"><ErrorState message={error.message} onRetry={reload} /></div>;
  return (
    <div className="container section">
      <h1>My orders</h1>
      {data.items.length === 0 ? <EmptyState title="No orders yet" message="When you place an order it will appear here." actionTo="/shop" actionLabel="Start shopping" /> : (
        <>
          <div className="list">
            {data.items.map((o) => (
              <Link key={o._id} to={`/orders/${o._id}`} className="card" style={{ textDecoration: 'none' }}>
                <div className="line__row" style={{ marginTop: 0 }}>
                  <strong>{o.orderNumber}</strong><StatusBadge value={o.orderStatus} />
                </div>
                <div className="line__row">
                  <span className="muted">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
                  <strong>{formatPrice(o.totalAmount)}</strong>
                </div>
              </Link>
            ))}
          </div>
          {data.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {data.totalPages}</span>
              <button className="btn btn--secondary btn--sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
