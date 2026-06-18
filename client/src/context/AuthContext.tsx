import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

import type { UserProfile } from '../types/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (data: { user: UserProfile; token: string }) => void;
  logout: () => void;
  updateUserProfile: (updatedUser: UserProfile) => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedToken = token || localStorage.getItem('token');
    if (!storedToken) return;

    try {
      const { data } = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch {
      // Keep cached user if refresh fails
    }
  }, [token]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUserString = localStorage.getItem('user');
        if (storedToken && storedUserString) {
          const storedUser = JSON.parse(storedUserString);
          setToken(storedToken);
          setUser(storedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          try {
            const { data } = await axios.get('/api/users/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          } catch {
            // use cached user
          }
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = (data: { user: UserProfile; token: string }) => {
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setToken(data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUserProfile = (updatedUser: UserProfile) => {
    setUser((prevUser) => {
      const newUser = { ...prevUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser as UserProfile;
    });
  };

  const value = { user, token, login, logout, updateUserProfile, refreshUser, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
