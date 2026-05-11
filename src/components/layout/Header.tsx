"use client";

import { Menu, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { authService } from "@/lib/api/services/auth.service";
import { ROLE_LABELS } from "@/config/roles";
import { ROUTES } from "@/config/routes";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, clearAuth } = useAuthStore();
  const { toggleSidebar } = useUiStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authService.logout();
    } catch {
      // Proceed with local logout even if API call fails
    }
    clearAuth();
    router.replace("/login");
    toast.success("Logged out successfully");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={ROUTES.PROFILE} title="My Profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
              <User className="h-4 w-4" />
            </Link>
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
