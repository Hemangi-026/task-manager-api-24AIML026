import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = ['Teacher', 'Colleague', 'Client', 'Friend', 'Recruiter', 'Visitor', 'Other'];

function Profile() {
  const { user, updateMyProfile } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateMyProfile({ name, role });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <section className="auth-page">
      <h1>My Profile</h1>
      <p className="subtitle">
        Signed in as {user.email} ({user.authProvider === 'google' ? 'Google account' : 'Email account'})
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="role">How do you know the owner?</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {error && <p className="auth-error">{error}</p>}
        {saved && <p className="auth-success">Profile updated.</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

export default Profile;
