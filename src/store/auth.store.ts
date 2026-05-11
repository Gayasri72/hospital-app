"use client";

import { create } from "zustand";
import type { AuthUser } from "@/types";
import { setAccessToken } from "@/lib/api/client";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

const SESSION_KEY = "hms_session";

function saveSession(user: AuthUser, token: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
  } catch {}
}

function loadSession(): { user: AuthUser; token: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    setAccessToken(token);
    saveSession(user, token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    setAccessToken(null);
    clearSession();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
