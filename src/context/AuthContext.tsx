import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Profile, User } from "@/types";
import {
  currentProfile,
  currentUser,
  initStore,
  login as storeLogin,
  logout as storeLogout,
  subscribeStore,
} from "@/lib/store";

interface AuthValue {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    initStore().then(() => setReady(true));
    const unsubscribe = subscribeStore(() => setTick((n) => n + 1));
    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const user = ready ? currentUser() : null;
    const profile = ready ? currentProfile() : null;
    return {
      ready,
      user,
      profile,
      login: storeLogin,
      logout: storeLogout,
      refresh: () => setTick((n) => n + 1),
    };
  }, [ready, tick]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
