import type { Role } from "@/types";

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  HOSPITAL_ADMIN: "Hospital Admin",
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  ACCOUNTANT: "Accountant",
} as const satisfies Record<string, Role>;

export const ROLE_LABELS: Record<Role, string> = {
  "Super Admin": "Super Admin",
  "Hospital Admin": "Hospital Admin",
  "Receptionist": "Receptionist",
  "Doctor": "Doctor",
  "Accountant": "Accountant",
};

export const CREATABLE_ROLES: Record<Role, Role[]> = {
  "Super Admin": ["Super Admin", "Hospital Admin", "Receptionist", "Doctor", "Accountant"],
  "Hospital Admin": ["Receptionist", "Doctor", "Accountant"],
  "Receptionist": [],
  "Doctor": [],
  "Accountant": [],
};

export const CAN_MANAGE_HOSPITALS: Role[] = ["Super Admin"];
export const CAN_MANAGE_USERS: Role[] = ["Super Admin", "Hospital Admin"];
export const CAN_MANAGE_SESSIONS: Role[] = ["Super Admin", "Hospital Admin"];
export const CAN_MANAGE_DOCTORS: Role[] = ["Super Admin", "Hospital Admin"];
export const CAN_VIEW_REPORTS: Role[] = ["Super Admin", "Hospital Admin", "Accountant"];
export const CAN_MANAGE_PAYMENTS: Role[] = ["Super Admin", "Hospital Admin", "Accountant"];
export const CAN_PROCESS_PAYMENTS: Role[] = ["Super Admin", "Hospital Admin", "Accountant", "Receptionist"];
export const CAN_BOOK_APPOINTMENTS: Role[] = ["Super Admin", "Hospital Admin", "Receptionist"];
export const CAN_COMPLETE_APPOINTMENTS: Role[] = ["Super Admin", "Hospital Admin", "Doctor"];
export const CAN_VIEW_PATIENTS: Role[] = ["Super Admin", "Hospital Admin", "Receptionist", "Doctor", "Accountant"];
export const CAN_MANAGE_PATIENTS: Role[] = ["Super Admin", "Hospital Admin", "Receptionist"];
export const CAN_VIEW_MEDICAL_RECORDS: Role[] = ["Super Admin", "Hospital Admin", "Doctor"];
export const CAN_WRITE_MEDICAL_RECORDS: Role[] = ["Doctor"];

export function hasRole(userRole: Role | null | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export function canCreateRole(userRole: Role, targetRole: Role): boolean {
  return CREATABLE_ROLES[userRole]?.includes(targetRole) ?? false;
}
