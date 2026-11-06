import { useTitle } from '../hooks';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { EmptyState, PageLoader } from '../components/States';

export default function Wishlist() {
  useTitle('Wishlist');
  const { items, loading } = useWishlist();
  if (loading) return <PageLoader />;
  return (
    <div className="container section">
      <h1>Your wishlist</h1>
      {items.length === 0
        ? <EmptyState title="Nothing saved yet" message="Tap the heart on any piece to save it here." actionTo="/shop" actionLabel="Explore jewellery" />
        : <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </div>
  );
}
