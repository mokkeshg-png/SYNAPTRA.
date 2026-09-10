import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Notification } from "@/types";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface NotificationValue {
  items: Notification[];
  unread: number;
  markRead: (id: string) => void;
  markAll: () => void;
  reload: () => Promise<void>;
}

const NotificationContext = createContext<NotificationValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    const data = await fetchNotifications(user.id);
    setItems(data);
  }, [user]);

  // Initial load
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // Realtime subscription — listen for new notifications for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase!
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          const notif: Notification = {
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.read,
            createdAt: n.created_at,
          };
          setItems((prev) => [notif, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [user, load]);

  const markRead = useCallback(
    (id: string) => {
      if (!user) return;
      markNotificationRead(user.id, id).catch(() => {});
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [user]
  );

  const markAll = useCallback(() => {
    if (!user) return;
    markAllNotificationsRead(user.id).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ items, unread, markRead, markAll, reload: load }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
