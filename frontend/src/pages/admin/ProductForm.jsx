import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { admin, catalogue } from '../../api';
import { imageUrl as imgSrc } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Field from '../../components/Field';
import { isHttpsUrl } from '../../utils/url';
import { PageLoader } from '../../components/States';

const blankVariant = () => ({ sku: '', label: 'Standard', price: '', stock: '', isActive: true });
const blank = { name: '', category: '', material: '', description: '', images: [], variants: [blankVariant()], isActive: true };

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { catalogue.categories().then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    admin.product(id)
      .then(({ product }) => setForm({
        name: product.name, category: product.category, material: product.material || '', description: product.description || '',
        images: product.images || [], isActive: product.isActive,
        variants: product.variants.map((v) => ({ sku: v.sku, label: v.label, price: v.price, stock: v.stock, isActive: v.isActive })),
      }))
      .catch((e) => { toast.error(e.message); navigate('/admin/products'); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVariant = (i, k, v) => setForm((f) => ({ ...f, variants: f.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  // Uploads each chosen photo in turn (JPG/PNG/WebP, max 2 MB each).
  const upload = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try { const { url } = await admin.upload(file); setForm((f) => ({ ...f, images: [...f.images, url] })); }
      catch (err) { toast.error(`${file.name}: ${err.message}`); }
    }
    setUploading(false);
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!isHttpsUrl(url)) { toast.error('Enter a full image link starting with https://'); return; }
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setImageUrl('');
  };
  const makeMain = (i) => setForm((f) => ({ ...f, images: [f.images[i], ...f.images.filter((_, j) => j !== i)] }));

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { category } = await admin.createCategory(newCat.trim());
      setCats((c) => [...c, { id: category._id, name: category.name, slug: category.slug }]);
      setForm((f) => ({ ...f, category: category._id }));
      setNewCat('');
    } catch (err) { toast.error(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors([]);
    const body = {
      ...form,
      variants: form.variants.map((v) => ({ ...v, price: Number(v.price), stock: Number(v.stock) })),
    };
    try {
      if (id) await admin.updateProduct(id, body); else await admin.createProduct(body);
      toast.success(id ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) { setErrors(err.errors?.map((x) => `${x.path}: ${x.message}`) || [err.message]); window.scrollTo({ top: 0 }); }
    finally { setBusy(false); }
  };

  if (loading) return <PageLoader />;
  return (
    <form onSubmit={submit} noValidate>
      <div className="section-head"><h2>{id ? 'Edit product' : 'New product'}</h2><Link to="/admin/products">Back to products</Link></div>
      {errors.length > 0 && <div className="alert alert--error" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <Field className="span-2" label="Name" value={form.name} onChange={set('name')} required maxLength={150} />
          <Field label="Category" as="select" value={form.category} onChange={set('category')} required>
            <option value="">Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Field>
          <div className="field"><label htmlFor="newcat">Or add a new category</label>
            <div style={{ display: 'flex', gap: 8 }}><input id="newcat" className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button type="button" className="btn btn--secondary" onClick={addCategory}>Add</button></div></div>
          <Field className="span-2" label="Material" value={form.material} onChange={set('material')} />
          <Field className="span-2" label="Description" as="textarea" value={form.description} onChange={set('description')} maxLength={5000} />
        </div>
        <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Visible to customers</label>
      </section>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="img-h">
        <h3 id="img-h">Photos</h3>
        <p className="muted" style={{ marginTop: 0 }}>The first photo is the main picture shown in the shop. JPG, PNG or WebP, up to 2 MB each.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} disabled={uploading} aria-label="Upload photos (JPG, PNG or WebP, max 2 MB each)" />
        {uploading && <p className="muted" role="status">Uploading…</p>}
        <div className="coupon" style={{ maxWidth: 520 }}>
          <input className="input" style={{ textTransform: 'none' }} type="url" aria-label="Add a photo by link" placeholder="…or paste an image link (https://…)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button type="button" className="btn btn--secondary" onClick={addImageUrl} disabled={!imageUrl.trim()}>Add</button>
        </div>
        <div className="thumb-row">
          {form.images.map((src, i) => (
            <div key={src + i} style={{ textAlign: 'center' }}>
              <img src={imgSrc(src)} alt={`Product photo ${i + 1}${i === 0 ? ' (main)' : ''}`} />
              <div>{i === 0 ? <span className="tag tag--ok">Main</span> : <button type="button" className="btn btn--ghost btn--sm" onClick={() => makeMain(i)}>Make main</button>}</div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} aria-label={`Remove photo ${i + 1}`}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="var-h">
        <h3 id="var-h">Variants &amp; stock</h3>
        {form.variants.map((v, i) => (
          <div className="variant-row" key={i}>
            <Field label="SKU" value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} required />
            <Field label="Label (e.g. Size 7)" value={v.label} onChange={(e) => setVariant(i, 'label', e.target.value)} required />
            <Field label="Price (₹)" type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} required />
            <Field label="Stock" type="number" min="0" step="1" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} required />
            <button type="button" className="btn btn--ghost" disabled={form.variants.length === 1} onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))} aria-label={`Remove variant ${i + 1}`}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn--secondary" onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, blankVariant()] }))}>Add variant</button>
      </section>
      <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create product'}</button>
    </form>
  );
}
