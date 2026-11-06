import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogue } from '../api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import Stars from './Stars';
import Field from './Field';

export default function Reviews({ slug, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const { data, loading } = useAsync(() => catalogue.reviews(slug, { limit: 10 }), [slug, version]);
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState({ title: '', comment: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    setBusy(true); setError('');
    try {
      await catalogue.addReview(slug, { rating, ...form });
      toast.success('Thanks for your review');
      setForm({ title: '', comment: '' }); setRating(0);
      setVersion((v) => v + 1);
      if (onChanged) onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="strip" aria-labelledby="reviews-h">
      <h2 id="reviews-h">Customer reviews</h2>
      {data && <Stars value={data.ratingAvg} count={data.ratingCount} />}
      {loading && !data ? <p className="muted">Loading reviews…</p> : data?.items.length === 0 && <p className="muted">Be the first to review this piece.</p>}
      {data?.items.map((r) => (
        <article className="review" key={r.id}>
          <div className="review__meta"><Stars value={r.rating} /><strong>{r.author}</strong><span>{formatDate(r.createdAt)}</span>{r.verifiedPurchase && <span className="tag tag--ok">Verified purchase</span>}</div>
          {r.title && <h3 style={{ marginTop: 8 }}>{r.title}</h3>}
          <p style={{ marginTop: 4 }}>{r.comment}</p>
        </article>
      ))}

      <div className="card" style={{ marginTop: 24, maxWidth: 560 }}>
        <h3>Write a review</h3>
        {!user ? <p className="muted"><Link to="/login" state={{ from: `/product/${slug}` }}>Log in</Link> to review products you have received.</p> : (
          <form onSubmit={submit} noValidate>
            {error && <div className="alert alert--error" role="alert">{error}</div>}
            <fieldset className="star-input">
              <legend>Your rating</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={n <= rating ? 'on' : ''}>
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} /><span aria-hidden="true">★</span>
                </label>
              ))}
            </fieldset>
            <Field label="Title (optional)" value={form.title} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Field label="Your review" as="textarea" value={form.comment} maxLength={1000} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} required />
            <button className="btn btn--primary" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button>
          </form>
        )}
      </div>
    </section>
  );
}
