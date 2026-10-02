import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
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

  // 사용 중에 운영자가 계정을 정지하면 다음 요청에서 403(suspended)이 오므로 안내 후 로그아웃
  useEffect(() => {
    const id = client.interceptors.response.use(undefined, async (error) => {
      if (error?.response?.status === 403 && error.response.data?.suspended) {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          await logout();
          Alert.alert('이용 정지', error.response.data.message);
        }
      }
      return Promise.reject(error);
    });
    return () => client.interceptors.response.eject(id);
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
