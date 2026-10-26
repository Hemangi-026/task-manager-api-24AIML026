import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section className="auth-page">
        <h1>Check your email</h1>
        <p className="subtitle">
          If <strong>{email}</strong> is registered, a password reset link is on its way.
          The link expires in 10 minutes.
        </p>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <h1>Forgot password</h1>
      <p className="subtitle">Enter your email and we'll send you a reset link.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login">Back to login</Link>
      </p>
    </section>
  );
}

export default ForgotPassword;
