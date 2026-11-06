import { Link } from 'react-router-dom';
import { admin } from '../../api';
import { useAsync } from '../../hooks';
import { formatPrice } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import { ErrorState, PageLoader } from '../../components/States';

export default function Dashboard() {
  const { data: d, loading, error, reload } = useAsync(() => admin.dashboard(), []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const open = ['placed', 'confirmed', 'processing'].reduce((s, k) => s + (d.ordersByStatus[k] || 0), 0);
  return (
    <>
      <div className="stat-grid">
        <div className="stat"><span className="muted">Revenue</span><strong>{formatPrice(d.revenue)}</strong></div>
        <div className="stat"><span className="muted">Total orders</span><strong>{d.totalOrders}</strong></div>
        <div className="stat"><span className="muted">Open orders</span><strong>{open}</strong></div>
        <div className="stat"><span className="muted">Active products</span><strong>{d.activeProducts}</strong></div>
        <div className="stat"><span className="muted">Customers</span><strong>{d.customers}</strong></div>
      </div>

      <h2>Sales, last 14 days</h2>
      {(() => {
        const max = Math.max(1, ...d.salesByDay.map((x) => x.sales));
        const total = d.salesByDay.reduce((s, x) => s + x.sales, 0);
        return (
          <>
            <p className="muted">{formatPrice(total)} across {d.salesByDay.reduce((s, x) => s + x.orders, 0)} orders (excluding cancelled)</p>
            <div className="bars" role="img" aria-label={`Daily sales for the last 14 days, total ${formatPrice(total)}`}>
              {d.salesByDay.map((x) => (
                <div className="bars__col" key={x.date} title={`${x.date}: ${formatPrice(x.sales)} (${x.orders} orders)`}>
                  <div className="bars__bar" style={{ height: `${(x.sales / max) * 100}%` }} />
                  <span className="bars__lbl" aria-hidden="true">{x.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      <h2 style={{ marginTop: 24 }}>Top products</h2>
      {d.topProducts.length === 0 ? <p className="muted">No sales yet.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Product</th><th>Units</th><th>Sales (before discounts)</th></tr></thead>
          <tbody>{d.topProducts.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.units}</td><td>{formatPrice(t.revenue)}</td></tr>)}</tbody></table></div>
      )}

      <h2 style={{ marginTop: 24 }}>Low stock</h2>
      {d.lowStock.length === 0 ? <p className="muted">Everything is well stocked.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
          <tbody>{d.lowStock.map((x) => <tr key={x._id + x.sku}><td><Link to={`/admin/products/${x._id}`}>{x.name}</Link></td><td>{x.sku}</td><td>{x.stock}</td></tr>)}</tbody></table></div>
      )}

      <h2 style={{ marginTop: 24 }}>Recent orders</h2>
      {d.recentOrders.length === 0 ? <p className="muted">No orders yet.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Order</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{d.recentOrders.map((o) => <tr key={o._id}><td>{o.orderNumber}</td><td>{formatPrice(o.totalAmount)}</td><td><StatusBadge value={o.orderStatus} /></td></tr>)}</tbody></table></div>
      )}
    </>
  );
}
