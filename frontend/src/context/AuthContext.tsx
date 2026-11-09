import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, AuthResponse } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  seedUsers: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rosteriq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rosteriq_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('rosteriq_token');
      if (storedToken) {
        try {
          const res = await api.get<User>('/auth/me');
          setUser(res.data);
          localStorage.setItem('rosteriq_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session verification failed, clearing auth state.', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    verifyAuth();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      const { access_token, user: userData } = res.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('rosteriq_token', access_token);
      localStorage.setItem('rosteriq_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('rosteriq_token');
    localStorage.removeItem('rosteriq_user');
  };

  const seedUsers = async () => {
    await api.post('/auth/seed-users');
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        seedUsers,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
