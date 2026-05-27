import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const { data } = await client.get('/api/auth/me');
        setUser(data.user);
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await client.post('/api/auth/login', { email, password });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await client.post('/api/auth/register', { name, email, password });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
