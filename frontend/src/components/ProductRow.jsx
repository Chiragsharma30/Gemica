import ProductCard from './ProductCard';

export default function ProductRow({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="strip" aria-label={title}>
      <h2>{title}</h2>
      <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  );
}
