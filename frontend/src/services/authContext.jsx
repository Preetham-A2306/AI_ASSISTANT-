import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getStoredAuth, setStoredAuth, clearStoredAuth } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const { token } = getStoredAuth();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest('/auth/me');
        if (res.ok && res.user) {
          setStoredAuth(token, res.user);
          setAuthState({ token, user: res.user });
        } else {
          clearStoredAuth();
          setAuthState({ token: null, user: null });
        }
      } catch {
        clearStoredAuth();
        setAuthState({ token: null, user: null });
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async ({ role, employeeId, password, department }) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, employeeId, password, department })
    });

    if (data.token && data.user) {
      setStoredAuth(data.token, data.user);
      setAuthState({ token: data.token, user: data.user });
      return data.user;
    }
    throw new Error('Authentication failed: Missing token or user data.');
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network failure on logout
    } finally {
      clearStoredAuth();
      setAuthState({ token: null, user: null });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        role: authState.user?.role || null,
        isAuthenticated: Boolean(authState.token && authState.user),
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
