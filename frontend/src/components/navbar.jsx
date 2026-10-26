import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavBar({ darkMode, setDarkMode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-icon">✅</span>
        Task Manager
      </Link>

      <div className="navbar-links">
        {/* Always visible */}
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
          Tasks
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Projects
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Contact
        </NavLink>

        {/* Admin only */}
        {isAuthenticated && user?.isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => isActive ? 'nav-link nav-admin active' : 'nav-link nav-admin'}
          >
            ⚡ Admin
          </NavLink>
        )}

        {/* Auth links */}
        {isAuthenticated ? (
          <>
            <NavLink
              to="/profile"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-avatar">
                {(user?.name?.[0] || 'U').toUpperCase()}
              </span>
              {user?.name || 'Profile'}
            </NavLink>
            <button className="nav-link nav-link--button nav-logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) => isActive ? 'nav-link active nav-register' : 'nav-link nav-register'}
            >
              Register
            </NavLink>
          </>
        )}

        {/* Dark/Light toggle */}
        <button
          className="theme-toggle"
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
