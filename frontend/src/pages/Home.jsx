import { Link } from 'react-router-dom';
import { catalogue } from '../api';
import { useAsync, useTitle } from '../hooks';
import { getRecent } from '../utils/recentlyViewed';
import ProductRow from '../components/ProductRow';
import ProductCard from '../components/ProductCard';
import { ErrorState, GridSkeleton } from '../components/States';

const CATS = [
  ['Rings', 'rings', '/images/rings-1.svg'],
  ['Necklaces', 'necklaces', '/images/necklaces-1.svg'],
  ['Earrings', 'earrings', '/images/earrings-1.svg'],
  ['Bracelets', 'bracelets', '/images/bracelets-1.svg'],
];

export default function Home() {
  useTitle('');
  const { data, loading, error, reload } = useAsync(() => catalogue.products({ sort: 'popular', limit: 8 }), []);
  return (
    <>
      <section className="container hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">New season</p>
          <h1 id="hero-title">Jewellery that feels like you</h1>
          <p className="muted" style={{ maxWidth: 480 }}>Timeless pieces in gold tones and crystal, designed for everyday elegance and easy gifting.</p>
          <Link className="btn btn--primary" to="/shop">Shop the collection</Link>
        </div>
        <img className="hero__img" src="/images/hero.svg" alt="A gold ring with a faceted stone" width="800" height="600" />
      </section>

      <section className="container section" aria-labelledby="cats-title">
        <div className="section-head"><h2 id="cats-title">Shop by category</h2></div>
        <div className="cat-grid">
          {CATS.map(([name, slug, img]) => (
            <Link key={slug} className="cat-tile" to={`/shop?category=${slug}`}>
              <img src={img} alt="" loading="lazy" /><span>{name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="best-title">
        <div className="section-head"><h2 id="best-title">Bestsellers</h2><Link to="/shop">View all</Link></div>
        {loading ? <GridSkeleton count={4} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : (
          <div className="product-grid">{data.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </section>

      <div className="container"><ProductRow title="Recently viewed" items={getRecent()} /></div>

      <section className="container section">
        <div className="promise">
          <div><h3>Free shipping</h3><p className="muted">On orders above ₹1,999</p></div>
          <div><h3>Pay your way</h3><p className="muted">Cards, UPI or cash on delivery</p></div>
          <div><h3>Skin-friendly</h3><p className="muted">Nickel-safe, long-wear finishes</p></div>
        </div>
      </section>
    </>
  );
}
