import { useState } from 'react';
import { admin } from '../../api';
import { useAsync, useTitle } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatPrice } from '../../utils/format';
import Field, { fieldErrors } from '../../components/Field';
import { ErrorState, PageLoader } from '../../components/States';

const BLANK = { code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expiresAt: '' };

export default function Coupons() {
  useTitle('Coupons');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => admin.coupons(), []);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    const body = { code: form.code, type: form.type, value: Number(form.value) };
    if (form.minOrder) body.minOrder = Number(form.minOrder);
    if (form.maxDiscount) body.maxDiscount = Number(form.maxDiscount);
    if (form.usageLimit) body.usageLimit = Number(form.usageLimit);
    if (form.expiresAt) body.expiresAt = new Date(`${form.expiresAt}T23:59:59`).toISOString();
    try { await admin.createCoupon(body); toast.success('Coupon created'); setForm(BLANK); reload(); }
    catch (err) { setErrors(fieldErrors(err)); toast.error(err.message); } finally { setBusy(false); }
  };

  const toggle = async (c) => {
    try { await admin.updateCoupon(c._id, { isActive: !c.isActive }); reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <h2>Coupons</h2>
      <form className="card" onSubmit={create} noValidate style={{ marginBottom: 16 }} aria-label="New coupon">
        <h3>New coupon</h3>
        <div className="form-grid">
          <Field label="Code" value={form.code} onChange={set('code')} error={errors.code} placeholder="WELCOME10" required />
          <Field label="Type" as="select" value={form.type} onChange={set('type')}><option value="percent">Percent off</option><option value="flat">Flat amount off (₹)</option></Field>
          <Field label={form.type === 'percent' ? 'Percent (1–100)' : 'Amount (₹)'} type="number" min="0" value={form.value} onChange={set('value')} error={errors.value} required />
          <Field label="Minimum order (₹, optional)" type="number" min="0" value={form.minOrder} onChange={set('minOrder')} />
          {form.type === 'percent' && <Field label="Maximum discount (₹, optional)" type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} />}
          <Field label="Total uses allowed (blank = unlimited)" type="number" min="0" value={form.usageLimit} onChange={set('usageLimit')} />
          <Field label="Expires on (optional)" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
        </div>
        <button className="btn btn--primary" disabled={busy || !form.code || !form.value}>{busy ? 'Creating…' : 'Create coupon'}</button>
      </form>
      {loading ? <PageLoader /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.coupons.length === 0 ? <p className="muted">No coupons yet.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>Expires</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{data.coupons.map((c) => (
            <tr key={c._id}>
              <td><strong>{c.code}</strong></td>
              <td>{c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount)})` : ''}` : `${formatPrice(c.value)} off`}{c.minOrder ? <><br /><span className="muted">min {formatPrice(c.minOrder)}</span></> : null}</td>
              <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
              <td>{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
              <td><span className={`tag ${c.isActive ? 'tag--ok' : 'tag--bad'}`}>{c.isActive ? 'Active' : 'Disabled'}</span></td>
              <td><button className="btn btn--ghost btn--sm" onClick={() => toggle(c)}>{c.isActive ? 'Disable' : 'Enable'}</button></td>
            </tr>))}
          </tbody></table></div>
      )}
    </>
  );
}
