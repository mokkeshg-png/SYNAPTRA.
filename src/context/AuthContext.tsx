import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchProfile, touchLastActive } from "@/lib/supabase-db";
import type { Profile } from "@/types";

interface AuthValue {
  ready: boolean;
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  /** Re-fetch profile from Supabase (call after saving profile changes) */
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<SupabaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const p = await fetchProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  // Bootstrap: restore session, then listen for changes
  useEffect(() => {
    let ignore = false;

    supabase!.auth.getSession().then(async ({ data }) => {
      if (ignore) return;
      const s = data.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadProfile(s.user.id);
        touchLastActive(s.user.id).catch(() => {});
      }
      setReady(true);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (_event, s) => {
      if (ignore) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadProfile(s.user.id);
        touchLastActive(s.user.id).catch(() => {});
      } else {
        setProfile(null);
      }
      setReady(true);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    if (user?.id) await loadProfile(user.id);
  }, [user, loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const u = data.user!;
    setSession(data.session);
    setUser(u);
    await loadProfile(u.id);
    touchLastActive(u.id).catch(() => {});
    return u;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase!.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, session, user, profile, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
