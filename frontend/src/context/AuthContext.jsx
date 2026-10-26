import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser, googleLogin, getMe, updateProfile } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const res = await loginUser(email, password);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.data);
    return res;
  };

  const register = async (name, email, password, role) => {
    return registerUser(name, email, password, role);
  };

  const loginWithGoogle = async (credential) => {
    const res = await googleLogin(credential);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.data);
    return res;
  };

  const updateMyProfile = async (updates) => {
    const res = await updateProfile(updates);
    setUser(res.data);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        loginWithGoogle,
        updateMyProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
