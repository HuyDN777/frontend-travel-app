import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '@/lib/api';
import type { AuthRes, LoginReq, RegisterReq } from '@/types/api';

type Session = {
  userId: number;
  username: string;
  role: string;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (payload: LoginReq) => Promise<void>;
  signUp: (payload: RegisterReq) => Promise<void>;
  signOut: () => Promise<void>;
};

const SESSION_KEY = 'travel_session';
const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(res: AuthRes): Session {
  return {
    userId: res.userId,
    username: res.username,
    role: res.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setSession(JSON.parse(raw) as Session);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const persist = useCallback(async (next: Session | null) => {
    if (next) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const signIn = useCallback(async (payload: LoginReq) => {
    const auth = await apiRequest<AuthRes>('/api/v1/auth/login', { method: 'POST', body: payload });
    const next = toSession(auth);
    setSession(next);
    await persist(next);
  }, [persist]);

  const signUp = useCallback(async (payload: RegisterReq) => {
    const auth = await apiRequest<AuthRes>('/api/v1/auth/register', { method: 'POST', body: payload });
    const next = toSession(auth);
    setSession(next);
    await persist(next);
  }, [persist]);

  const signOut = useCallback(async () => {
    setSession(null);
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signUp, signOut }),
    [session, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
