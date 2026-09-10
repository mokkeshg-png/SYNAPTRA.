import { useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  UserPlus,
  Briefcase,
  GraduationCap,
  MessageSquare,
  CheckCheck
} from "lucide-react";

export function Notifications() {
  const { items, unread, markRead, markAll } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filteredItems = items.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "read") return item.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "join_request":
      case "application":
        return <UserPlus className="h-5 w-5 text-indigo-600" />;
      case "application_accepted":
      case "application_approved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "project_invitation":
        return <Briefcase className="h-5 w-5 text-purple-600" />;
      case "mentorship_request":
        return <GraduationCap className="h-5 w-5 text-amber-600" />;
      case "discussion_reply":
        return <MessageSquare className="h-5 w-5 text-sky-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Notifications Center
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Stay updated with project invites, applications, team activity, and campus announcements.
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll()}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-navy text-white"
                : "bg-surface text-ink-500 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === "unread"
                ? "bg-navy text-white"
                : "bg-surface text-ink-500 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            Unread ({unread})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === "read"
                ? "bg-navy text-white"
                : "bg-surface text-ink-500 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            Read ({items.length - unread})
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-surface-2 p-4 text-ink-400">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-ink">No notifications</h3>
          <p className="mt-1 text-xs text-ink-500">
            {filter === "unread"
              ? "You have no unread notifications right now."
              : "You're all caught up! Important updates will appear here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((n) => (
            <Card
              key={n.id}
              className={`flex flex-col sm:flex-row items-start justify-between gap-4 p-4 transition-colors ${
                !n.read ? "border-l-4 border-l-navy bg-navy-50/20" : "opacity-90"
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="rounded-lg bg-surface-2 p-2.5 mt-0.5 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-ink">{n.title}</h4>
                    {!n.read && (
                      <Badge tone="navy" className="text-[10px] px-1.5 py-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-600 leading-relaxed">{n.message}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {n.link && (
                  <Link
                    to={n.link}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                    }}
                  >
                    <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs">
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead(n.id)}
                    className="text-xs text-ink-500 hover:text-ink"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
