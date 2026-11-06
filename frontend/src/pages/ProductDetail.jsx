import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogue } from '../api';
import { imageUrl } from '../api/client';
import { useAsync, useTitle } from '../hooks';
import { pushRecent, getRecent } from '../utils/recentlyViewed';
import Stars from '../components/Stars';
import Reviews from '../components/Reviews';
import ProductRow from '../components/ProductRow';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';
import QuantityStepper from '../components/QuantityStepper';
import { HeartIcon } from '../components/Icons';
import { ErrorState, PageLoader } from '../components/States';

export default function ProductDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsync(() => catalogue.product(slug), [slug]);
  const { user } = useAuth();
  const cart = useCart();
  const wish = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const [img, setImg] = useState(0);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [needVariant, setNeedVariant] = useState(false);

  const product = data?.product;
  const related = useAsync(() => catalogue.related(slug), [slug]);
  const [recent, setRecent] = useState([]);
  const [ratingVersion, setRatingVersion] = useState(0);
  const fresh = useAsync(() => catalogue.product(slug), [slug, ratingVersion]);
  useTitle(product?.name);
  useEffect(() => {
    if (!product) return;
    setRecent(getRecent().filter((p) => p.id !== product.id));
    pushRecent(product);
  }, [product]);
  useEffect(() => {
    if (!product) return;
    setImg(0); setQty(1); setNeedVariant(false);
    setSku(product.variants.length === 1 && product.variants[0].stock > 0 ? product.variants[0].sku : '');
  }, [product]);

  if (loading) return <PageLoader />;
  if (error) {
    return error.status === 404
      ? <div className="container state"><h1>Product not found</h1><p className="muted">It may have been removed.</p><Link className="btn btn--primary" to="/shop">Back to shop</Link></div>
      : <div className="container"><ErrorState message={error.message} onRetry={reload} /></div>;
  }

  const variant = product.variants.find((v) => v.sku === sku);
  const price = variant ? variant.price : product.minPrice;
  const maxQty = variant ? Math.min(10, variant.stock) : 10;
  const images = product.images.length ? product.images : [''];
  const saved = wish.has(product.id);

  const onAdd = async () => {
    if (!variant) { setNeedVariant(true); return; }
    setBusy(true);
    try { await cart.add(product, variant, qty); toast.success('Added to your cart'); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const onWish = async () => {
    if (!user) return navigate('/login', { state: { from: `/product/${slug}` } });
    try { await wish.toggle(product.id); toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist'); } catch (e) { toast.error(e.message); }
    return undefined;
  };

  return (
    <div className="container section">
      <p className="muted"><Link to="/shop">Shop</Link> / {product.name}</p>
      <div className="pdp">
        <div className="gallery">
          <img className="gallery__main" src={imageUrl(images[img])} alt={`${product.name}, view ${img + 1}`} width="400" height="500" />
          {images.length > 1 && (
            <div className="gallery__thumbs">
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setImg(i)} aria-current={i === img} aria-label={`Show image ${i + 1}`}><img src={imageUrl(src)} alt="" width="72" /></button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1>{product.name}</h1>
          <Stars value={fresh.data?.product.ratingAvg ?? product.ratingAvg} count={fresh.data?.product.ratingCount ?? product.ratingCount} />
          <p className="price">{formatPrice(price)}</p>
          {product.material && <p className="muted">{product.material}</p>}
          <p>{product.description}</p>

          <fieldset style={{ border: 0, padding: 0, margin: '0 0 1rem' }}>
            <legend style={{ fontWeight: 500, marginBottom: 8 }}>{product.variants.length > 1 || product.variants[0]?.label !== 'Standard' ? 'Select an option' : 'Option'}</legend>
            <div className="chips">
              {product.variants.map((v) => (
                <button key={v.sku} type="button" className="chip" aria-pressed={sku === v.sku} disabled={v.stock < 1}
                  onClick={() => { setSku(v.sku); setNeedVariant(false); setQty(1); }}>{v.label}</button>
              ))}
            </div>
            {needVariant && <p className="field__error" role="alert">Please choose an option first.</p>}
          </fieldset>

          <p>
            {variant
              ? <span className={`tag ${variant.stock > 3 ? 'tag--ok' : variant.stock > 0 ? 'tag--warn' : 'tag--bad'}`}>{variant.stock > 3 ? 'In stock' : variant.stock > 0 ? `Only ${variant.stock} left` : 'Out of stock'}</span>
              : <span className={`tag ${product.inStock ? 'tag--ok' : 'tag--bad'}`}>{product.inStock ? 'In stock' : 'Out of stock'}</span>}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <QuantityStepper value={qty} max={maxQty} onChange={setQty} disabled={!variant} />
            <button className="btn btn--primary" onClick={onAdd} disabled={busy || !product.inStock}>{busy ? 'Adding…' : 'Add to cart'}</button>
            <button className="btn btn--secondary" onClick={onWish} aria-pressed={saved}><HeartIcon filled={saved} />{saved ? 'Saved' : 'Wishlist'}</button>
          </div>

          {Object.keys(product.specifications || {}).length > 0 && (
            <table className="specs"><caption className="sr-only">Specifications</caption><tbody>
              {Object.entries(product.specifications).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
            </tbody></table>
          )}
        </div>
      </div>
      <Reviews slug={slug} onChanged={() => setRatingVersion((v) => v + 1)} />
      <ProductRow title="You may also like" items={related.data?.items} />
      <ProductRow title="Recently viewed" items={recent} />
    </div>
  );
}
