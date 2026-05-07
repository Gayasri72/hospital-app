"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Hospital, LayoutDashboard, UserCircle, Calendar,
  CreditCard, BarChart3, LogOut, ChevronRight, Menu,
  ShieldCheck, Stethoscope, ClipboardList,
  Bell, FileText, X, Check, Clock, Trash2, PieChart, ScrollText,
} from "lucide-react";
import { useInitAuth, useAuth } from "@/hooks/useAuth";
import { useThemeStore } from "@/store/themeStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Role } from "@/types";
import dayjs from "dayjs";

// ─── Types ────────────────────────────────────────────────
interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
  roles?: Role[];
  children?: { label: string; href: string; roles?: Role[] }[];
}

interface Notification {
  id: string;
  msg: string;
  type: string;
  status: "read" | "unread";
  created_at: string;
}

// ─── Nav Config ───────────────────────────────────────────
const NAV: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",       icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Patients",     href: "/patients",        icon: <UserCircle className="w-4 h-4" /> },
  { label: "Doctors",      href: "/doctors",         icon: <Stethoscope className="w-4 h-4" />, roles: ["Super Admin","Hospital Admin","Receptionist"] },
  { label: "Sessions",     href: "/sessions",        icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Appointments", href: "/appointments",    icon: <Calendar className="w-4 h-4" /> },
  { label: "Payments",     href: "/payments",        icon: <CreditCard className="w-4 h-4" /> },
  { label: "Reports",      href: "/reports",         icon: <PieChart className="w-4 h-4" />, roles: ["Super Admin","Hospital Admin","Accountant"] },
  {
    label: "Permissions", href: "/permissions", icon: <ShieldCheck className="w-4 h-4" />,
    roles: ["Super Admin","Hospital Admin","Receptionist"],
    children: [
      { label: "Users & Roles", href: "/permissions/users",     roles: ["Super Admin","Hospital Admin","Receptionist"] },
    ],
  },
];

// ─── NavLink ──────────────────────────────────────────────
function NavLink({ item, userRole, pathname, onClose }: {
  item: NavItem; userRole: Role; pathname: string; onClose: () => void;
}) {
  const [open, setOpen] = useState(!!item.children?.some((c) => pathname.startsWith(c.href)));

  useEffect(() => {
    if (item.children?.some((c) => pathname.startsWith(c.href))) {
      setOpen(true);
    }
  }, [pathname, item.children]);

  if (item.roles && !item.roles.includes(userRole)) return null;

  const isActive = item.children
    ? item.children.some((c) => pathname.startsWith(c.href))
    : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  const visibleChildren = item.children?.filter((c) => !c.roles || c.roles.includes(userRole));
  if (item.children && visibleChildren?.length === 0) return null;

  const activeClass = "bg-blue-50 text-blue-700";
  const inactiveClass = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

  return (
    <div>
      {item.children ? (
        <>
          <button onClick={() => setOpen((o) => !o)}
            className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
              isActive ? activeClass : inactiveClass)}>
            <span className={isActive ? "text-blue-600" : "text-gray-400"}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isActive ? "text-blue-600" : "text-gray-400", open && "rotate-90")} />
          </button>
          {open && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              {visibleChildren?.map((child) => (
                <Link key={child.href} href={child.href} onClick={onClose}
                  className={cn("block px-3 py-1.5 rounded-lg text-sm transition-colors",
                    pathname === child.href ? "text-blue-600 font-medium bg-blue-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}>
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <Link href={item.href} onClick={onClose}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive ? activeClass : inactiveClass)}>
          <span className={isActive ? "text-blue-600" : "text-gray-400"}>{item.icon}</span>
          {item.label}
        </Link>
      )}
    </div>
  );
}

// ─── Notification Dropdown ────────────────────────────────
function NotificationDropdown({ onClose, onCountChange }: {
  onClose: () => void;
  onCountChange: (n: number) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get("notifications", { params: { limit: 10 } });
      const data = res.data.data ?? [];
      setNotifications(data);
      onCountChange(data.filter((n: Notification) => n.status === "unread").length);
    } catch {
      // Mock notifications if API not ready
      const mock: Notification[] = [
        { id: "1", msg: "Appointment confirmed for Dr. Silva at 6:00 PM", type: "appointment", status: "unread", created_at: new Date().toISOString() },
        { id: "2", msg: "Reminder: Patient has appointment in 1 hour", type: "reminder", status: "unread", created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: "3", msg: "Appointment cancelled by patient #APT-00123", type: "alert", status: "read", created_at: new Date(Date.now() - 86400000).toISOString() },
      ];
      setNotifications(mock);
      onCountChange(mock.filter((n) => n.status === "unread").length);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: "read" } : n));
    onCountChange(notifications.filter((n) => n.id !== id && n.status === "unread").length);
    await api.patch(`notifications/${id}`, { status: "read" }).catch(() => {});
  }

  async function deleteOne(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    onCountChange(notifications.filter((n) => n.id !== id && n.status === "unread").length);
    await api.delete(`notifications/${id}`).catch(() => {});
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000)    return "Just now";
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dayjs(date).format("MMM D");
  }

  const typeIcon: Record<string, React.ReactNode> = {
    appointment: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
    reminder:    <Clock    className="w-3.5 h-3.5 text-orange-500" />,
    alert:       <Bell     className="w-3.5 h-3.5 text-red-500" />,
  };

  return (
    <div ref={ref}
      className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-[100] overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <span className="text-sm font-semibold text-gray-900">Notifications</span>
        <div className="flex items-center gap-2">
          <Link href="/notifications" onClick={onClose}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-gray-400">
            <Bell className="w-5 h-5 mb-1 opacity-40" />
            <p className="text-xs">No notifications</p>
          </div>
        ) : notifications.map((n) => (
          <div key={n.id}
            className={cn("flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition group",
              n.status === "unread" && "bg-blue-50/30")}>
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              {typeIcon[n.type] ?? <Bell className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs leading-relaxed", n.status === "unread" ? "text-gray-900 font-medium" : "text-gray-600")}>
                {n.msg}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
              {n.status === "unread" && (
                <button onClick={() => markRead(n.id)} title="Mark read"
                  className="p-1 rounded text-gray-400 hover:text-green-600 transition">
                  <Check className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => deleteOne(n.id)} title="Delete"
                className="p-1 rounded text-gray-400 hover:text-red-600 transition">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            {n.status === "unread" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Header Actions (Bell) ───────────────────
function HeaderActions() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {/* Notification bell */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((o) => !o)}
          title="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500
                     hover:bg-gray-100 hover:text-gray-900 transition-all relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1
                             bg-red-500 text-white text-[10px] font-bold rounded-full
                             flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <NotificationDropdown
            onClose={() => setNotifOpen(false)}
            onCountChange={setUnreadCount}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────
function Sidebar({ userRole, userName, onClose }: {
  userRole: Role; userName: string; onClose: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    try { await api.post("auth/logout"); } catch { /* ignore */ }
    logout();
    router.replace("/login");
    toast.success("Signed out");
  }

  const roleColors: Record<Role, string> = {
    "Super Admin":    "bg-purple-100 text-purple-700",
    "Hospital Admin": "bg-blue-100 text-blue-700",
    "Manager":        "bg-indigo-100 text-indigo-700",
    "Receptionist":   "bg-green-100 text-green-700",
    "Doctor":         "bg-teal-100 text-teal-700",
    "Accountant":     "bg-orange-100 text-orange-700",
    "Nurse":          "bg-rose-100 text-rose-700",
  };

  const groups = [
    { label: "Overview",        items: NAV.slice(0, 1) },
    { label: "Core Operations", items: NAV.slice(1, 6) },
    { label: "Finance",         items: NAV.slice(6, 7) },
    { label: "Insights",        items: NAV.slice(7, 8) },
    { label: "Admin",           items: NAV.slice(8, 9) },
  ];

  return (
    <aside className="h-full flex flex-col bg-white border-r border-gray-100">
      {/* Logo + header actions */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-xl p-2 flex-shrink-0">
              <Hospital className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">MediCore HMS</div>
              <div className="text-gray-400 text-xs">Management System</div>
            </div>
          </div>
          {/* Bell always visible in sidebar header */}
          <HeaderActions />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {groups.map((group) => {
          const visible = group.items.filter((item) => !item.roles || item.roles.includes(userRole));
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 py-2 mt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
              </div>
              {visible.map((item) => (
                <NavLink key={item.href} item={item} userRole={userRole} pathname={pathname} onClose={onClose} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
            <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", roleColors[userRole])}>
              {userRole}
            </span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="w-4 h-4" />Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Top Bar ───────────────────────────────────────
function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      <button onClick={onMenuClick}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 flex-1">
        <div className="bg-blue-600 rounded-lg p-1.5"><Hospital className="w-4 h-4 text-white" /></div>
        <span className="font-semibold text-gray-900 text-sm">MediCore HMS</span>
      </div>
      <HeaderActions />
    </header>
  );
}

// ─── Main AppShell ────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  useInitAuth();
  const { user, isLoading } = useAuth();
  const { init } = useThemeStore();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[240px] flex-shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar userRole={user.role} userName={user.name} onClose={() => {}} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-[240px] animate-slide-in">
            <Sidebar userRole={user.role} userName={user.name}
              onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-[240px] min-h-screen flex flex-col">
        <MobileTopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 p-6 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}