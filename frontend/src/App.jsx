import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/navbar';
import Spinner from './components/spinner';

// Lazy-load all pages — each becomes its own chunk
const Tasks        = lazy(() => import('./pages/tasks'));
const Login        = lazy(() => import('./pages/login'));
const Register     = lazy(() => import('./pages/register'));
const ForgotPassword = lazy(() => import('./pages/forgotpassword'));
const ResetPassword  = lazy(() => import('./pages/resetpassword'));
const Profile      = lazy(() => import('./pages/profile'));
const NotFound     = lazy(() => import('./pages/notfound'));

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <NavBar />
        <main className="app-content">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"                      element={<Tasks />} />
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
