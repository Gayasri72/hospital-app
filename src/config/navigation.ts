import type { Role } from "@/types";
import { ROUTES } from "./routes";
import {
  CAN_BOOK_APPOINTMENTS,
  CAN_MANAGE_DOCTORS,
  CAN_MANAGE_HOSPITALS,
  CAN_MANAGE_PAYMENTS,
  CAN_MANAGE_SESSIONS,
  CAN_MANAGE_USERS,
  CAN_VIEW_PATIENTS,
  CAN_VIEW_REPORTS,
} from "./roles";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  allowedRoles: Role[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: "LayoutDashboard",
    allowedRoles: ["Super Admin", "Hospital Admin", "Receptionist", "Doctor", "Accountant"],
  },
  {
    label: "Patients",
    href: ROUTES.PATIENTS,
    icon: "Users",
    allowedRoles: CAN_VIEW_PATIENTS,
  },
  {
    label: "Doctors",
    href: ROUTES.DOCTORS,
    icon: "Stethoscope",
    allowedRoles: [...CAN_MANAGE_DOCTORS, "Receptionist"],
  },
  {
    label: "Sessions",
    href: ROUTES.SESSIONS,
    icon: "CalendarDays",
    allowedRoles: [...CAN_MANAGE_SESSIONS, "Doctor", "Receptionist"],
  },
  {
    label: "Appointments",
    href: ROUTES.APPOINTMENTS,
    icon: "ClipboardList",
    allowedRoles: [...CAN_BOOK_APPOINTMENTS, "Doctor", "Accountant"],
  },
  {
    label: "Payments",
    href: ROUTES.PAYMENTS,
    icon: "CreditCard",
    allowedRoles: CAN_MANAGE_PAYMENTS,
  },
  {
    label: "Medical Records",
    href: ROUTES.MEDICAL_RECORDS,
    icon: "FileText",
    allowedRoles: ["Super Admin", "Hospital Admin", "Doctor"],
  },
  {
    label: "Reports",
    href: ROUTES.REPORTS,
    icon: "BarChart3",
    allowedRoles: CAN_VIEW_REPORTS,
  },
  {
    label: "Users",
    href: ROUTES.USERS,
    icon: "ShieldCheck",
    allowedRoles: CAN_MANAGE_USERS,
  },
  {
    label: "Roles",
    href: "/permissions/roles",
    icon: "KeyRound",
    allowedRoles: ["Super Admin"],
  },
  {
    label: "Hospitals",
    href: ROUTES.HOSPITALS,
    icon: "Building2",
    allowedRoles: CAN_MANAGE_HOSPITALS,
  },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}
