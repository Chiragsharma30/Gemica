import { useState } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../../api';
import { useAsync } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/format';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';

export default function Products() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => admin.products({ page, limit: 20, q: term }), [page, term]);

  const toggle = async (p) => {
    try {
      if (p.isActive) { if (!window.confirm(`Archive "${p.name}"? It will be hidden from customers.`)) return; await admin.archiveProduct(p._id); }
      else await admin.updateProduct(p._id, { isActive: true });
      toast.success(p.isActive ? 'Product archived' : 'Product restored');
      reload();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <div className="section-head">
        <h2>Products</h2>
        <Link className="btn btn--primary" to="/admin/products/new">Add product</Link>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }} style={{ display: 'flex', gap: 8, marginBottom: 16 }} role="search">
        <input className="input" type="search" aria-label="Search products" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn--secondary">Search</button>
      </form>
      {loading ? <PageLoader /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No products" actionTo="/admin/products/new" actionLabel="Add your first product" /> : (
        <>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Name</th><th>From</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data.items.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{formatPrice(p.minPrice)}</td>
                <td>{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                <td><span className={`tag ${p.isActive ? 'tag--ok' : 'tag--bad'}`}>{p.isActive ? 'Active' : 'Archived'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link className="btn btn--secondary btn--sm" to={`/admin/products/${p._id}`}>Edit</Link>{' '}
                  <button className="btn btn--ghost btn--sm" onClick={() => toggle(p)}>{p.isActive ? 'Archive' : 'Restore'}</button>
                </td>
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
