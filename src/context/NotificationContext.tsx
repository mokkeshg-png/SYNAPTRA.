import { createContext, useContext, useMemo } from "react";
import type { Notification } from "@/types";
import { getState, markAllRead, markNotificationRead } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";

interface NotificationValue {
  items: Notification[];
  unread: number;
  markRead: (id: string) => void;
  markAll: () => void;
}

const NotificationContext = createContext<NotificationValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const value = useMemo(() => {
    const items = ready && user ? getState().notifications.filter((n) => n.userId === user.id) : [];
    return {
      items,
      unread: items.filter((n) => !n.read).length,
      markRead: (id: string) => user && markNotificationRead(user.id, id),
      markAll: () => user && markAllRead(user.id),
    };
  }, [user, ready, user && getState().notifications.length]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
