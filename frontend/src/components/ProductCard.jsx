import { Link, useNavigate } from 'react-router-dom';
import { imageUrl } from '../api/client';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { HeartIcon } from './Icons';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const wish = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const saved = wish.has(product.id);

  const onWish = async () => {
    if (!user) return navigate('/login', { state: { from: '/wishlist' } });
    try { await wish.toggle(product.id); toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist'); }
    catch (e) { toast.error(e.message); }
    return undefined;
  };

  return (
    <article className="product-card">
      <Link className="product-card__link" to={`/product/${product.slug}`}>
        <img className="product-card__img" src={imageUrl(product.image)} alt={product.name} loading="lazy" width="400" height="500" />
        <div className="product-card__body">
          <h3 className="product-card__title">{product.name}</h3>
          <div className="product-card__price">{formatPrice(product.minPrice)}</div>
          <span className={`tag ${product.inStock ? 'tag--ok' : 'tag--bad'}`}>{product.inStock ? 'In stock' : 'Out of stock'}</span>
        </div>
      </Link>
      <button className="icon-btn product-card__wish" onClick={onWish} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
        <HeartIcon filled={saved} />
      </button>
    </article>
  );
}
