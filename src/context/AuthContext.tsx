import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { discardSession } from '../tasks/runSession';
import { clearLocalRunData } from '../storage/runStorage';

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
  register: (name: string, email: string, password: string, agreements: Agreements) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export interface Agreements {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeAge: boolean;
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

  async function register(name: string, email: string, password: string, agreements: Agreements) {
    const { data } = await client.post('/api/auth/register', { name, email, password, ...agreements });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function logout() {
    await discardSession().catch(() => {});
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  }

  // 서버에서 계정을 영구 삭제한 뒤 기기에 남은 토큰·임시 기록도 지운다
  async function deleteAccount(password: string) {
    await client.delete('/api/users/me', { data: { password } });
    await clearLocalRunData().catch(() => {});
    await logout();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
