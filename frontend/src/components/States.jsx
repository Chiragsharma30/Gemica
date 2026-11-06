import { Link } from 'react-router-dom';

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />;
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/6' }} />)}
    </div>
  );
}

export function PageLoader() {
  return <div className="state"><Spinner /></div>;
}

export function EmptyState({ title, message, actionTo, actionLabel }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {message && <p className="muted">{message}</p>}
      {actionTo && <Link className="btn btn--primary" to={actionTo}>{actionLabel}</Link>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" role="alert">
      <h2>Something went wrong</h2>
      <p className="muted">{message || 'Please try again.'}</p>
      {onRetry && <button className="btn btn--secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}
