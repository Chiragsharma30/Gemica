import { useTitle } from '../hooks';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field, { fieldErrors } from '../components/Field';

export default function Login() {
  useTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(''); setErrors({});
    try {
      const user = await login({ email: f.get('email'), password: f.get('password') });
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) { setError(err.message); setErrors(fieldErrors(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Welcome back</h1>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Field label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required error={errors.password} />
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
        <p style={{ marginTop: 12 }}><Link to="/forgot-password">Forgot your password?</Link></p>
        <p className="muted" style={{ marginTop: 16 }}>New to Gemica? <Link to="/register" state={location.state}>Create an account</Link></p>
      </form>
    </div>
  );
}
