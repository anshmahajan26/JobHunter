import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('jobpilot_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        }
      } catch (err) {
        localStorage.removeItem('jobpilot_token');
        localStorage.removeItem('jobpilot_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('jobpilot_token', res.data.token);
      localStorage.setItem('jobpilot_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
  };

  const register = async (name, email, password, role = 'user', adminSecret = '') => {
    const res = await api.post('/auth/register', { name, email, password, role, adminSecret });
    if (res.data.success) {
      localStorage.setItem('jobpilot_token', res.data.token);
      localStorage.setItem('jobpilot_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('jobpilot_token');
    localStorage.removeItem('jobpilot_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

