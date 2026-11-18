/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../lib/axios.js';
import { API_ENDPOINTS } from '../lib/constants.js';
import { useAuthStore } from '../stores/authStore.js';
import { queryClient } from '../lib/queryClient.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, accessToken, isAuthenticated, role, setUser, logout } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(() => Boolean(useAuthStore.getState().accessToken));

  const fetchCurrentUser = useCallback(async () => {
    if (!useAuthStore.getState().accessToken) {
      return null;
    }

    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      setUser(response.data);
      return response.data;
    } catch {
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        return;
      }

      try {
        const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
        if (isMounted) {
          setUser(response.data);
        }
      } catch {
        // Token validation or refresh failure handled by axios interceptor
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [setUser]);

  const handleLogout = useCallback(() => {
    logout();
    queryClient.clear();
  }, [logout]);

  const value = {
    user,
    role,
    accessToken,
    isAuthenticated,
    isInitializing,
    refetchUser: fetchCurrentUser,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
