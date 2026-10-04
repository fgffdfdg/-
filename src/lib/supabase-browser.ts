import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: {
      url: string;
      anonKey: string;
    };
  }
}

const SUPABASE_CONFIG_READY_EVENT = 'supabase-config-ready';

let browserClient: SupabaseClient | null = null;

function waitForConfig(maxWait = 3000): Promise<boolean> {
  if (window.__SUPABASE_CONFIG__?.url && window.__SUPABASE_CONFIG__?.anonKey) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const handler = () => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener(SUPABASE_CONFIG_READY_EVENT, handler);
        resolve(true);
      }
    };

    window.addEventListener(SUPABASE_CONFIG_READY_EVENT, handler);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener(SUPABASE_CONFIG_READY_EVENT, handler);
        resolve(window.__SUPABASE_CONFIG__?.url && window.__SUPABASE_CONFIG__?.anonKey ? true : false);
      }
    }, maxWait);
  });
}

function isConfigReady(): boolean {
  return !!(window.__SUPABASE_CONFIG__?.url && window.__SUPABASE_CONFIG__?.anonKey);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient === null) {
    const config = window.__SUPABASE_CONFIG__;

    if (!config || !config.url || !config.anonKey) {
      throw new Error(
        'Supabase config not found. Make sure SupabaseConfigProvider is included in your layout.tsx and use useSupabaseConfig() to wait for config to be ready.'
      );
    }

    browserClient = createClient(config.url, config.anonKey, {
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

async function getSupabaseBrowserClientWithRetry(maxRetries = 3, retryInterval = 500): Promise<SupabaseClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return getSupabaseBrowserClient();
    } catch {
      if (i < maxRetries - 1) {
        await sleep(retryInterval);
      }
    }
  }
  return getSupabaseBrowserClient();
}

async function getSupabaseBrowserClientAsync(): Promise<SupabaseClient> {
  if (browserClient !== null) {
    return browserClient;
  }

  const ready = await waitForConfig();
  if (!ready) {
    throw new Error(
      'Supabase config not found after waiting. Make sure SupabaseConfigProvider is included in your layout.tsx'
    );
  }

  return getSupabaseBrowserClient();
}

// Auth hook for client components
export function useAuth() {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { data: { user: u } } = await supabase.auth.getUser();
        const sessionResult = await supabase.auth.getSession();
        const session = sessionResult.data.session;
        if (!cancelled && u) {
          setUser(u);
          setToken(session?.access_token ?? '');
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.auth.signOut();
      setUser(null);
      setToken('');
    } catch {
      // ignore
    }
  };

  return { user, token, loading, signOut };
}

export { getSupabaseBrowserClient, getSupabaseBrowserClientWithRetry, getSupabaseBrowserClientAsync, waitForConfig, isConfigReady };
