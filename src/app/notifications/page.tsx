"use client";

import { useState } from "react";
import { Bell, Calendar, Clock, Check, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  msg: string;
  type: "appointment" | "reminder" | "alert" | string;
  status: "read" | "unread";
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  appointment: { icon: <Calendar className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-100" },
  reminder: { icon: <Clock className="w-4 h-4" />, color: "text-orange-600", bg: "bg-orange-100" },
  alert: { icon: <Bell className="w-4 h-4" />, color: "text-red-600", bg: "bg-red-100" },
};

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", msg: "Appointment confirmed for Dr. Silva at 6:00 PM", type: "appointment", status: "unread", created_at: new Date().toISOString() },
  { id: "2", msg: "Reminder: Patient has an appointment in 1 hour", type: "reminder", status: "unread", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", msg: "Appointment cancelled by patient", type: "alert", status: "read", created_at: new Date(Date.now() - 86400000).toISOString() },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const displayed = notifications.filter((n) => {
    if (filter === "unread") return n.status === "unread";
    if (filter === "read") return n.status === "read";
    return true;
  });

  function markRead(id: string) {
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, status: "read" } : x));
  }

  function markAllRead() {
    setNotifications((n) => n.map((x) => ({ ...x, status: "read" })));
    toast.success("All marked as read");
  }

  function deleteNotification(id: string) {
    setNotifications((n) => n.filter((x) => x.id !== id));
  }

  return (
    <DashboardShell title="Notifications">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
        actions={
          unreadCount > 0 ? (
            <button onClick={markAllRead}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              <Check className="w-4 h-4" /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-5">
        {(["all", "unread", "read"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden max-w-2xl">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayed.map((n) => {
              const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.alert;
              return (
                <div key={n.id}
                  className={cn("flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group",
                    n.status === "unread" && "bg-blue-50/40")}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", config.bg, config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-relaxed", n.status === "unread" ? "font-semibold text-gray-900" : "text-gray-600")}>
                      {n.msg}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                      {n.status === "unread" && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">New</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {n.status === "unread" && (
                      <button onClick={() => markRead(n.id)} title="Mark as read"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 transition">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
