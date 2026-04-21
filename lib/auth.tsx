import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getSubscription, type Subscription } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  subscription: Subscription | null;
  loading: boolean;
  subscriptionLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const loadSubscription = useCallback(async (userId: string) => {
    setSubscriptionLoading(true);
    const sub = await getSubscription(userId);
    setSubscription(sub);
    setSubscriptionLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadSubscription(session.user.id);
      setLoading(false);
    });

    const { data: { subscription: listener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadSubscription(session.user.id);
      } else {
        setSubscription(null);
      }
    });

    return () => listener.unsubscribe();
  }, [loadSubscription]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSubscription = async () => {
    if (user) await loadSubscription(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, subscription, loading, subscriptionLoading, signUp, signIn, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
