import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiBaseUrl } from '../utils/env.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (tokenOverride = null) => {
    const token = tokenOverride || localStorage.getItem('crm_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        if (data.user.tenant_id) {
          localStorage.setItem('crm_tenant_id', data.user.tenant_id);
        } else {
          localStorage.removeItem('crm_tenant_id');
        }
        window.dispatchEvent(new Event('auth-change'));
      } else {
        console.error("Token verification failed:", data.error);
        localStorage.removeItem('crm_token');
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (token) => {
    localStorage.setItem('crm_token', token);
    return fetchUser(token);
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_superadmin_token');
    localStorage.removeItem('crm_tenant_id');
    localStorage.removeItem('crm_active_role');
    localStorage.removeItem('crm_active_agent');
    localStorage.removeItem('crm_active_app');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    fetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
