import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionTimer from './SessionTimer';

function getRoleLabel(user) {
  if (!user) return null;
  if (user.isAdmin) return { label: 'ADMIN', cls: 'role-admin' };
  return { label: 'USER', cls: 'role-user' };
}

function NavBar({ darkMode, setDarkMode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const role = getRoleLabel(user);

  return (
    <header className="topbar">
      <div className="topbar__inner">

        {/* ---- Brand ---- */}
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="topbar-brand">
          <div className="topbar-brand__icon">✅</div>
          <div className="topbar-brand__text">
            <span className="topbar-brand__name">TaskManager</span>
            <span className="topbar-brand__version">v1.0</span>
          </div>
        </Link>

        {/* ---- Nav links (only when logged in) ---- */}
        {isAuthenticated && (
          <nav className="topbar-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `topbar-nav__item ${isActive ? 'topbar-nav__item--active' : ''}`}>
              <span className="topbar-nav__icon">⊞</span> Dashboard
            </NavLink>
            <NavLink to="/" className={({ isActive }) => `topbar-nav__item ${isActive ? 'topbar-nav__item--active' : ''}`} end>
              <span className="topbar-nav__icon">📁</span> Tasks &amp; Projects
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `topbar-nav__item ${isActive ? 'topbar-nav__item--active' : ''}`}>
              <span className="topbar-nav__icon">📊</span> Analytics <span className="topbar-nav__lazy">(Lazy)</span>
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => `topbar-nav__item ${isActive ? 'topbar-nav__item--active' : ''}`}>
              <span className="topbar-nav__icon">✉️</span> Contact
            </NavLink>
            {user?.isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `topbar-nav__item topbar-nav__item--admin ${isActive ? 'topbar-nav__item--active' : ''}`}>
                <span className="topbar-nav__icon">⚡</span> Admin
              </NavLink>
            )}
          </nav>
        )}

        {/* ---- Right side ---- */}
        <div className="topbar-actions">
          {isAuthenticated && user ? (
            <>
              {/* Session timer */}
              <SessionTimer onExpire={handleLogout} />

              {/* Role badge */}
              {role && (
                <span className={`topbar-role ${role.cls}`}>
                  {role.label}
                </span>
              )}

              {/* Username */}
              <NavLink to="/profile" className="topbar-username">
                <span className="topbar-avatar">
                  {(user.name?.[0] || 'U').toUpperCase()}
                </span>
                {user.name || 'Profile'}
              </NavLink>

              {/* Theme toggle */}
              <button
                className="topbar-theme-btn"
                onClick={() => setDarkMode((d) => !d)}
                aria-label="Toggle theme"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>

              {/* Logout */}
              <button className="topbar-logout" onClick={handleLogout}>
                ↪ Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="topbar-theme-btn"
                onClick={() => setDarkMode((d) => !d)}
                aria-label="Toggle theme"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <NavLink to="/login" className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                Login
              </NavLink>
              <NavLink to="/register" className="btn" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default NavBar;
