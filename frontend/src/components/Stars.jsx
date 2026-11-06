// Read-only star rating. Text alternative included for screen readers.
export default function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="rating-line">
      <span className="stars" aria-hidden="true">{'★'.repeat(full)}<span className="stars--empty">{'★'.repeat(5 - full)}</span></span>
      <span className="sr-only">{value ? `${value} out of 5 stars` : 'No ratings yet'}</span>
      {count !== undefined && <span className="muted">{count ? `${value.toFixed(1)} (${count})` : 'No reviews yet'}</span>}
    </span>
  );
}
