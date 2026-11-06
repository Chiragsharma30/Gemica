import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addresses as api } from '../api';
import { useAsync, useTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../api';
import { useToast } from '../context/ToastContext';
import Field, { fieldErrors } from '../components/Field';
import { PageLoader } from '../components/States';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function Account() {
  useTitle('My account');
  const { user, logout, isAdmin, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(() => api.list(), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveName = async (e) => {
    e.preventDefault();
    try { await updateProfile(name); toast.success('Profile updated'); } catch (err) { toast.error(err.message); }
  };
  const savePassword = async (e) => {
    e.preventDefault(); setPwErrors({});
    try { await authApi.changePassword(pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed'); }
    catch (err) { setPwErrors({ currentPassword: /current/i.test(err.message) ? err.message : undefined, newPassword: fieldErrors(err).newPassword }); toast.error(err.message); }
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try { await api.create(form); setForm(EMPTY); toast.success('Address saved'); reload(); }
    catch (err) { setErrors(fieldErrors(err)); toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="container section">
      <h1>My account</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>{user.name}</strong><br /><span className="muted">{user.email}</span></p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn--secondary" to="/orders">My orders</Link>
          {isAdmin && <Link className="btn btn--secondary" to="/admin">Admin dashboard</Link>}
          <button className="btn btn--ghost" onClick={async () => { await logout(); navigate('/'); }}>Log out</button>
        </div>
      </div>
      <div className="two-col" style={{ marginBottom: 16 }}>
        <form className="card" onSubmit={saveName} aria-labelledby="prof-h" noValidate>
          <h2 id="prof-h">Profile</h2>
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="btn btn--primary" disabled={!name.trim() || name === user.name}>Save name</button>
        </form>
        <form className="card" onSubmit={savePassword} aria-labelledby="pw-h" noValidate>
          <h2 id="pw-h">Change password</h2>
          <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} error={pwErrors.currentPassword} required />
          <Field label="New password (min 8 characters)" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} error={pwErrors.newPassword} required />
          <button className="btn btn--primary" disabled={!pw.currentPassword || pw.newPassword.length < 8}>Change password</button>
        </form>
      </div>
      <div className="two-col">
        <section className="card" aria-labelledby="saved-h">
          <h2 id="saved-h">Saved addresses</h2>
          {loading ? <PageLoader /> : data.addresses.length === 0 ? <p className="muted">No saved addresses yet.</p> : data.addresses.map((a) => (
            <p key={a._id}><strong>{a.fullName}</strong> {a.isDefault && <span className="tag">Default</span>}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}<br /><span className="muted">{a.phone}</span></p>
          ))}
        </section>
        <form className="card" onSubmit={add} noValidate aria-labelledby="add-h">
          <h2 id="add-h">Add an address</h2>
          <Field label="Full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required />
          <Field label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" required />
          <Field label="Address line 1" value={form.line1} onChange={set('line1')} error={errors.line1} required />
          <Field label="Address line 2 (optional)" value={form.line2} onChange={set('line2')} />
          <Field label="City" value={form.city} onChange={set('city')} error={errors.city} required />
          <Field label="State" value={form.state} onChange={set('state')} error={errors.state} required />
          <Field label="Pincode" value={form.pincode} onChange={set('pincode')} error={errors.pincode} inputMode="numeric" maxLength={6} required />
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        </form>
      </div>
    </div>
  );
}
