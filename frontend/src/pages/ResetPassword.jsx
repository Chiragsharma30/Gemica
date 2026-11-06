import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../api';
import { useTitle } from '../hooks';
import { useToast } from '../context/ToastContext';
import Field, { fieldErrors } from '../components/Field';

export default function ResetPassword() {
  useTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!token) {
    return <div className="container"><div className="card auth-card"><h1>Link not valid</h1><p className="muted">This reset link is missing its token.</p><Link className="btn btn--primary" to="/forgot-password">Request a new link</Link></div></div>;
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setErrors({});
    try { await auth.resetPassword({ token, password }); toast.success('Password updated. Please log in.'); navigate('/login', { replace: true }); }
    catch (err) { setError(err.message); setErrors(fieldErrors(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Choose a new password</h1>
        {error && <div className="alert alert--error" role="alert">{error} {/expired|invalid/.test(error) && <Link to="/forgot-password">Request a new link</Link>}</div>}
        <Field label="New password (min 8 characters)" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
        <button className="btn btn--primary btn--block" disabled={busy || password.length < 8}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
