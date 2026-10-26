import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleButton from '../components/googlebutton';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <h1>Log In</h1>
      <p className="subtitle">Log in to view and create tasks.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log In'}
        </button>

        <Link to="/forgot-password" className="auth-forgot-link">
          Forgot password?
        </Link>
      </form>

      <div className="auth-divider"><span>or</span></div>

      <GoogleButton />

      <p className="auth-switch">
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </section>
  );
}

export default Login;
