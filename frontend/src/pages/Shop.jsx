import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogue } from '../api';
import { useAsync, useTitle } from '../hooks';
import ProductCard from '../components/ProductCard';
import Field from '../components/Field';
import { EmptyState, ErrorState, GridSkeleton } from '../components/States';

const SORTS = [['newest', 'Newest'], ['popular', 'Most popular'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']];

export default function Shop() {
  useTitle('Shop');
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const get = (k, d = '') => params.get(k) ?? d;
  const page = Math.max(1, Number(get('page', 1)) || 1);

  const query = { category: get('category'), minPrice: get('minPrice'), maxPrice: get('maxPrice'), sort: get('sort', 'newest'), q: get('q'), page, limit: 12 };
  const { data, loading, error, reload } = useAsync(() => catalogue.products(query), [params.toString()]);
  const cats = useAsync(() => catalogue.categories(), []);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: undefined, ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const onApply = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update({ category: f.get('category'), minPrice: f.get('minPrice'), maxPrice: f.get('maxPrice'), q: f.get('q') });
    setShowFilters(false);
  };

  return (
    <div className="container section">
      <h1>{get('category') ? get('category').replace(/^./, (c) => c.toUpperCase()) : 'All jewellery'}</h1>
      <div className="shop">
        <aside>
          <button className="btn btn--secondary filters-toggle" aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>Filters</button>
          <form className={`filters ${showFilters ? 'open' : ''}`} onSubmit={onApply} key={params.toString()} aria-label="Filters">
            <Field label="Search" name="q" type="search" defaultValue={get('q')} maxLength={100} />
            <Field label="Category" as="select" name="category" defaultValue={get('category')}>
              <option value="">All categories</option>
              {(cats.data?.categories || []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </Field>
            <Field label="Min price (₹)" name="minPrice" type="number" min="0" inputMode="numeric" defaultValue={get('minPrice')} />
            <Field label="Max price (₹)" name="maxPrice" type="number" min="0" inputMode="numeric" defaultValue={get('maxPrice')} />
            <button className="btn btn--primary btn--block" type="submit">Apply filters</button>
            <button className="btn btn--ghost" type="button" onClick={() => { setParams({}); setShowFilters(false); }}>Clear all</button>
          </form>
        </aside>

        <section aria-label="Products">
          <div className="toolbar">
            <span className="muted" aria-live="polite">{data ? `${data.total} item${data.total === 1 ? '' : 's'}` : ' '}</span>
            <div style={{ minWidth: 200 }}>
              <Field label="Sort by" as="select" value={get('sort', 'newest')} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Field>
            </div>
          </div>
          {loading ? <GridSkeleton /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.items.length === 0 ? (
            <EmptyState title="No jewellery found" message="Try removing a filter or searching for something else." actionTo="/shop" actionLabel="Clear filters" />
          ) : (
            <>
              <div className="product-grid">{data.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              {data.totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  <button className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button>
                  <span>Page {page} of {data.totalPages}</span>
                  <button className="btn btn--secondary btn--sm" disabled={page >= data.totalPages} onClick={() => update({ page: String(page + 1) })}>Next</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
