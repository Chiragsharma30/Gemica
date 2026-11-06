import { useTitle } from '../hooks';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field, { fieldErrors } from '../components/Field';

export default function Register() {
  useTitle('Create account');
  const { register } = useAuth();
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
      await register({ name: f.get('name'), email: f.get('email'), password: f.get('password') });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) { setError(err.message); setErrors(fieldErrors(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Field label="Full name" name="name" autoComplete="name" required error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Field label="Password (min 8 characters)" name="password" type="password" autoComplete="new-password" minLength={8} required error={errors.password} />
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted" style={{ marginTop: 16 }}>Already registered? <Link to="/login" state={location.state}>Log in</Link></p>
      </form>
    </div>
  );
}
