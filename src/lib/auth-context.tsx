'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';

interface AuthContextType {
  user: User | null;
  token: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: '',
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = await getSupabaseBrowserClientAsync();
        const { data: { session } } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user) {
          setUser(session.user);
          setToken(session.access_token ?? '');
        }

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event: string, newSession: { user: User; access_token: string } | null) => {
            if (cancelled) return;
            if (newSession?.user) {
              setUser(newSession.user);
              setToken(newSession.access_token ?? '');
            } else {
              setUser(null);
              setToken('');
            }
          }
        );

        // Cleanup subscription on unmount
        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken('');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context;
}
