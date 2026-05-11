"use client";

import { useAuthStore } from "@/store/auth.store";
import { hasRole, canCreateRole, type CAN_MANAGE_HOSPITALS } from "@/config/roles";
import type { Role } from "@/types";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;

  return {
    role,
    can: (allowed: Role[]) => hasRole(role, allowed),
    canCreate: (targetRole: Role) =>
      role ? canCreateRole(role, targetRole) : false,
  };
}
