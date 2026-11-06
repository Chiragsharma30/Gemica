import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addresses as addressApi, orders as ordersApi, coupons as couponApi } from '../api';
import { useAsync, useTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';
import { payForOrder } from '../utils/razorpay';
import Field, { fieldErrors } from '../components/Field';
import { EmptyState, PageLoader } from '../components/States';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function Checkout() {
  useTitle('Checkout');
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const saved = useAsync(() => addressApi.list(), []);
  const [choice, setChoice] = useState(null); // address id, or 'new'
  const [form, setForm] = useState(EMPTY);
  const [saveIt, setSaveIt] = useState(true);
  const [method, setMethod] = useState('cod');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(null); // { code, discount, shippingFee, totalAmount }
  const [couponMsg, setCouponMsg] = useState('');
  const key = useRef(crypto.randomUUID()); // one idempotency key per checkout attempt

  if (cart.loading || saved.loading) return <PageLoader />;
  if (cart.items.length === 0) return <div className="container"><EmptyState title="Your cart is empty" actionTo="/shop" actionLabel="Continue shopping" /></div>;

  const list = saved.data?.addresses || [];
  const selected = choice ?? (list.find((a) => a.isDefault)?._id || list[0]?._id || 'new');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const nameValue = form.fullName === '' && !form._touched ? user?.name || '' : form.fullName;

  const applyCoupon = async () => {
    setCouponMsg('');
    try { setApplied(await couponApi.validate(code)); }
    catch (err) { setApplied(null); setCouponMsg(err.message); }
  };

  const place = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    let order;
    try {
      let body = { paymentMethod: method };
      if (applied) body.couponCode = applied.code;
      const useForm = { ...form, fullName: nameValue };
      if (selected === 'new') {
        if (saveIt) {
          const r = await addressApi.create({ ...useForm, isDefault: list.length === 0 });
          body.addressId = r.addresses[r.addresses.length - 1]._id;
        } else body.address = useForm;
      } else body.addressId = selected;
      order = (await ordersApi.create(body, key.current)).order;
      await cart.refresh();
    } catch (err) {
      setError(err.message); setErrors(fieldErrors(err));
      if (/coupon/i.test(err.message)) setApplied(null);
      if (err.status === 409) await cart.refresh().catch(() => {});
      setBusy(false);
      return;
    }
    if (method === 'razorpay') {
      try { await payForOrder(order, user); toast.success('Payment received'); }
      catch (err) { toast.error(err.message); }
    }
    navigate(`/orders/${order._id}?placed=1`, { replace: true });
  };

  return (
    <div className="container section">
      <h1>Checkout</h1>
      {error && <div className="alert alert--error" role="alert">{error} {cart.hasIssues && <Link to="/cart">Review your cart</Link>}</div>}
      <form className="two-col" onSubmit={place} noValidate>
        <div>
          <section className="card" style={{ marginBottom: 16 }} aria-labelledby="addr-h">
            <h2 id="addr-h">Delivery address</h2>
            {list.map((a) => (
              <label className="radio-card" key={a._id}>
                <input type="radio" name="addr" checked={selected === a._id} onChange={() => setChoice(a._id)} />
                <span><strong>{a.fullName}</strong><br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}<br /><span className="muted">{a.phone}</span></span>
              </label>
            ))}
            <label className="radio-card">
              <input type="radio" name="addr" checked={selected === 'new'} onChange={() => setChoice('new')} />
              <span>Use a new address</span>
            </label>
            {selected === 'new' && (
              <div className="form-grid" style={{ marginTop: 16 }}>
                <Field label="Full name" value={nameValue} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value, _touched: true }))} error={errors.fullName || errors['address.fullName']} autoComplete="name" required />
                <Field label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone || errors['address.phone']} autoComplete="tel" inputMode="tel" required />
                <Field className="span-2" label="Address line 1" value={form.line1} onChange={set('line1')} error={errors.line1} autoComplete="address-line1" required />
                <Field className="span-2" label="Address line 2 (optional)" value={form.line2} onChange={set('line2')} autoComplete="address-line2" />
                <Field label="City" value={form.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" required />
                <Field label="State" value={form.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" required />
                <Field label="Pincode" value={form.pincode} onChange={set('pincode')} error={errors.pincode} inputMode="numeric" maxLength={6} autoComplete="postal-code" required />
                <label className="span-2"><input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} /> Save this address for next time</label>
              </div>
            )}
          </section>
          <section className="card" aria-labelledby="pay-h">
            <h2 id="pay-h">Payment</h2>
            <label className="radio-card"><input type="radio" name="pay" checked={method === 'cod'} onChange={() => setMethod('cod')} /><span><strong>Cash on delivery</strong><br /><span className="muted">Pay when your order arrives.</span></span></label>
            <label className="radio-card"><input type="radio" name="pay" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} /><span><strong>Pay online</strong><br /><span className="muted">Cards, UPI and netbanking via Razorpay.</span></span></label>
          </section>
        </div>
        <aside className="card sticky" aria-label="Order summary">
          <h2>Order summary</h2>
          {cart.items.map((i) => <div className="summary-row" key={i.id}><span>{i.name} × {i.quantity}</span><span>{formatPrice(i.unitPrice * i.quantity)}</span></div>)}
          <div className="summary-row" style={{ marginTop: 8 }}><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{(applied ? applied.shippingFee : cart.shippingFee) === 0 ? 'Free' : formatPrice(applied ? applied.shippingFee : cart.shippingFee)}</span></div>
          {applied && <div className="summary-row"><span>Coupon {applied.code}</span><span>−{formatPrice(applied.discount)}</span></div>}
          <div className="summary-row summary-row--total"><span>Total</span><span>{formatPrice(applied ? applied.totalAmount : cart.totalAmount)}</span></div>
          <div className="coupon">
            <input className="input" aria-label="Coupon code" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!applied} />
            {applied
              ? <button type="button" className="btn btn--secondary" onClick={() => { setApplied(null); setCode(''); }}>Remove</button>
              : <button type="button" className="btn btn--secondary" onClick={applyCoupon} disabled={!code.trim()}>Apply</button>}
          </div>
          {couponMsg && <p className="field__error" role="alert">{couponMsg}</p>}
          <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} disabled={busy || cart.hasIssues}>{busy ? 'Placing order…' : method === 'cod' ? 'Place order' : 'Place order & pay'}</button>
        </aside>
      </form>
    </div>
  );
}
