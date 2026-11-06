import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../api';
import { useTitle } from '../hooks';
import Field from '../components/Field';

export default function ForgotPassword() {
  useTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await auth.forgotPassword(email); setSent(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="container">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Reset your password</h1>
        {sent ? <div className="alert alert--ok" role="status">If that email is registered, we've sent a reset link. It is valid for 1 hour.</div> : (
          <>
            <p className="muted">Enter the email you registered with and we'll send you a link.</p>
            {error && <div className="alert alert--error" role="alert">{error}</div>}
            <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn btn--primary btn--block" disabled={busy || !email}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </>
        )}
        <p style={{ marginTop: 16 }}><Link to="/login">Back to log in</Link></p>
      </form>
    </div>
  );
}
