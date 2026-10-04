"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClientAsync } from "./supabase-browser";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signInWithCode: (phone: string, code: string) => Promise<{ error: string | null }>;
  signUp: (phone: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: { data?: Record<string, unknown> }) => Promise<{ error: string | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const supabase = await getSupabaseBrowserClientAsync();
      
      // 获取当前 session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
        });
      }

      // 监听 auth 状态变化
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (mounted) {
            setState({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
            });
          }
        }
      );

      return () => subscription.unsubscribe();
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    const supabase = await getSupabaseBrowserClientAsync();
    const { error } = await supabase.auth.signInWithPassword({
      email: `${phone}@exportdrive.local`,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithCode = useCallback(async (phone: string, code: string) => {
    const supabase = await getSupabaseBrowserClientAsync();
    const { error } = await supabase.auth.verifyOtp({
      phone: `+86${phone}`,
      token: code,
      type: "sms",
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (phone: string, password: string, displayName?: string) => {
    const supabase = await getSupabaseBrowserClientAsync();
    const { error } = await supabase.auth.signUp({
      phone: `+86${phone}`,
      password,
      options: {
        data: {
          display_name: displayName || "",
          phone: phone,
        },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseBrowserClientAsync();
    await supabase.auth.signOut();
  }, []);

  const updateUser = useCallback(async (updates: { data?: Record<string, unknown> }) => {
    const supabase = await getSupabaseBrowserClientAsync();
    const { error } = await supabase.auth.updateUser(updates);
    return { error: error?.message ?? null };
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = await getSupabaseBrowserClientAsync();
    await supabase.auth.refreshSession();
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signInWithCode,
    signUp,
    signOut,
    updateUser,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// 便捷 hook：检查是否登录
export function useRequireAuth(trigger: boolean = false) {
  const { user } = useAuth();
  return { isAuthenticated: !!user, user };
}
