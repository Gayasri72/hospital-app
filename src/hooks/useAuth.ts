"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types";

export function useAuth() {
  return useAuthStore();
}

export function useInitAuth() {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hms_session");
      if (raw) {
        const { user, token } = JSON.parse(raw);
        if (user && token) {
          setAuth(user, token);
          return;
        }
      }
    } catch {}
    clearAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useRequireAuth(allowedRoles?: Role[]) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  return { user, isLoading };
}
