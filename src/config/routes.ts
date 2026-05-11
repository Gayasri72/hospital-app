export const ROUTES = {
  // Public
  LOGIN: "/login",

  // Dashboard
  DASHBOARD: "/dashboard",

  // Patients
  PATIENTS: "/patients",

  // Doctors
  DOCTORS: "/doctors",

  // Sessions
  SESSIONS: "/sessions",

  // Appointments
  APPOINTMENTS: "/appointments",

  // Payments
  PAYMENTS: "/payments",

  // Reports
  REPORTS: "/reports",

  // Medical Records
  MEDICAL_RECORDS: "/medical-records",

  // Admin
  USERS: "/permissions/users",
  HOSPITALS: "/admin/hospitals",

  // Profile
  PROFILE: "/profile",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

// Routes that require authentication
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.PATIENTS,
  ROUTES.DOCTORS,
  ROUTES.SESSIONS,
  ROUTES.APPOINTMENTS,
  ROUTES.PAYMENTS,
  ROUTES.REPORTS,
  ROUTES.MEDICAL_RECORDS,
  ROUTES.USERS,
  ROUTES.HOSPITALS,
];

// Auth routes (redirect to dashboard if already authenticated)
export const AUTH_ROUTES = [ROUTES.LOGIN];
