/**
 * AuthContext.tsx
 * Provides authentication state to the whole app.
 * Wrap the root layout with <AuthProvider> to use useAuth() anywhere.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isLoggedIn, logout as authLogout, refreshAccessToken } from '@/services/authService';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading:       boolean;
  signIn:          () => void;
  signOut:         () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading:       true,
  signIn:          () => {},
  signOut:         async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      const newToken = await refreshAccessToken();
      if (!newToken) {
        await authLogout();
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    })();
  }, []);

  const signIn = useCallback(() => setIsAuthenticated(true), []);

  const signOut = useCallback(async () => {
    await authLogout();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
