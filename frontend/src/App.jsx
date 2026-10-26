import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/navbar';
import Spinner from './components/spinner';

// Lazy-loaded pages — each is a separate chunk
const Dashboard      = lazy(() => import('./pages/dashboard'));
const Tasks          = lazy(() => import('./pages/tasks'));
const Projects       = lazy(() => import('./pages/projects'));
const Analytics      = lazy(() => import('./pages/analytics'));   // heavy: recharts inside
const Contact        = lazy(() => import('./pages/contact'));
const AdminDashboard = lazy(() => import('./pages/admindashboard'));
const Login          = lazy(() => import('./pages/login'));
const Register       = lazy(() => import('./pages/register'));
const ForgotPassword = lazy(() => import('./pages/forgotpassword'));
const ResetPassword  = lazy(() => import('./pages/resetpassword'));
const Profile        = lazy(() => import('./pages/profile'));
const NotFound       = lazy(() => import('./pages/notfound'));

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <AuthProvider>
      <div className="app">
        <NavBar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="app-content">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/dashboard"             element={<Dashboard />} />
              <Route path="/"                      element={<Tasks />} />
              <Route path="/projects"              element={<Projects />} />
              <Route path="/analytics"             element={<Analytics />} />
              <Route path="/contact"               element={<Contact />} />
              <Route path="/admin"                 element={<AdminDashboard />} />
              <Route path="/login"                 element={<Login />} />
              <Route path="/register"              element={<Register />} />
              <Route path="/forgot-password"       element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/profile"               element={<Profile />} />
              <Route path="*"                      element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Task Manager</p>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
