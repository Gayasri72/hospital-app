// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role =
  | "Super Admin"
  | "Hospital Admin"
  | "Receptionist"
  | "Doctor"
  | "Accountant";

// Backend default status is "booked"; "scheduled" does not exist
export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "completed"
  | "cancelled"
  | "no_show";

// "full" is auto-set by backend when booked_count >= max_patients
export type SessionStatus = "scheduled" | "open" | "full" | "closed" | "cancelled";

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";

export type PaymentMethod = "cash" | "card" | "online" | "insurance";

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
}

// Paginated list responses: { success, message, data: T[], meta: { total, page, limit } }
export interface ApiListResponse<T = unknown> {
  success: true;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// Services transform ApiListResponse into this shape for the UI.
export interface PaginatedResult<T = unknown> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  hospital_id: string | null;
  doctor_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}

// Full profile returned by GET /auth/me
export interface ProfileUser {
  user_id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  hospital_id: string | null;
  created_at: string;
  role: { role_id: number; name: string };
  hospital: { hospital_id: string; name: string } | null;
  doctor: { doctor_id: string; name: string; specialization: string; status: string } | null;
}

// ─── Hospital & Branch ────────────────────────────────────────────────────────

export interface Hospital {
  hospital_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface Branch {
  branch_id: string;
  hospital_id: string;
  name: string;
  location: string | null;
  created_at: string;
}

// ─── User (admin module) ──────────────────────────────────────────────────────

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: { role_id: number; name: string };
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role_id?: number;
}

export interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export interface Patient {
  patient_id: string;
  hospital_id: string;
  name: string;
  nic: string;
  phone: string;
  email: string | null;
  created_at: string;
  profile: PatientProfile | null;
}

export interface PatientProfile {
  patient_id: string;
  address: string | null;
  emergency_contact: string | null;
  gender: string | null;
  age: number | null;
}

export interface CreatePatientRequest {
  name: string;
  nic: string;
  phone: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  gender?: string;
  age?: number;
}

export type UpdatePatientRequest = Partial<Omit<CreatePatientRequest, "nic">>;

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface Doctor {
  doctor_id: string;
  hospital_id: string;
  user_id: string | null;
  name: string;
  specialization: string;
  status: string;
  created_at: string;
  profile: DoctorProfile | null;
  currentFee: DoctorFee | null;
  has_login?: boolean;
}

export interface DoctorProfile {
  doctor_id: string;
  contact_number: string | null;
  email: string | null;
  qualifications: string | null;
  experience: string | null;
  bio: string | null;
}

export interface DoctorFee {
  fee_id: string;
  doctor_id: string;
  hospital_id: string;
  consultation_fee: string;
  effective_from: string;
  created_at: string;
}

export interface HospitalCharge {
  charge_id: string;
  hospital_id: string;
  charge_amount: string;
  effective_from: string;
  created_at: string;
}

export interface SetHospitalChargeRequest {
  charge_amount: number;
  effective_from?: string;
}

export interface CreateDoctorRequest {
  name: string;
  specialization: string;
  contact_number?: string;
  email?: string;
  qualifications?: string;
  experience?: string;
  bio?: string;
  consultation_fee: number;
  effective_from?: string;
  create_login?: boolean;
  login_email?: string;
  login_password?: string;
}

export interface UpdateDoctorRequest {
  name?: string;
  specialization?: string;
  contact_number?: string;
  email?: string;
  qualifications?: string;
  experience?: string;
  bio?: string;
  status?: "active" | "inactive";
}

export interface SetDoctorFeeRequest {
  consultation_fee: number;
  effective_from?: string;
}

// ─── Channel Session ──────────────────────────────────────────────────────────

export interface ChannelSession {
  session_id: string;
  doctor_id: string;
  branch_id: string;
  hospital_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  booked_count: number;
  status: SessionStatus;
  created_at: string;
  doctor?: { name: string; specialization: string };
  branch?: { name: string; location: string | null };
  slots?: SessionSlot[];
}

export interface SessionSlot {
  slot_id: string;
  session_id: string;
  slot_number: number;
  slot_time: string;
  is_booked: boolean;
}

export interface CreateSessionRequest {
  doctor_id: string;
  branch_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_patients: number;
  slot_duration?: number;
}

export type UpdateSessionRequest = Partial<CreateSessionRequest>;

// Status update only allows open/closed/cancelled (not scheduled/full)
export interface UpdateSessionStatusRequest {
  status: "open" | "closed" | "cancelled";
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment {
  appointment_id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  session_id: string | null;
  slot_id: string | null;
  queue_number: number;
  status: AppointmentStatus;
  doctor_fee: string;
  hospital_charge: string;
  total_fee: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: { name: string; phone: string; nic?: string };
  doctor?: { name: string; specialization: string };
  session?: {
    session_date: string;
    start_time: string;
    branch?: { name: string };
  };
  slot?: { slot_time: string; slot_number?: number };
  payment?: Payment;
}

export interface CreateAppointmentRequest {
  session_id: string;
  patient_id: string;
  notes?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentReceiptData {
  appointment: Appointment;
  patient: { name: string; nic: string; phone: string };
  doctor: { name: string; specialization: string };
  session: { session_date: string; start_time: string; branch: { name: string } };
  payment?: Payment;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  payment_id: string;
  appointment_id: string;
  hospital_id: string;
  total_amount: string;
  doctor_amount: string;
  hospital_amount: string;
  amount_paid: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  appointment?: {
    appointment_id: string;
    queue_number: number;
    patient?: { name: string; phone: string };
    doctor?: { name: string; specialization: string };
    session?: { session_date: string; branch?: { name: string } };
  };
  transactions?: PaymentTransaction[];
}

export interface PaymentTransaction {
  transaction_id: string;
  payment_id: string;
  hospital_id: string;
  amount: string;
  method: PaymentMethod;
  direction: "credit" | "debit";
  reference: string | null;
  note: string | null;
  processed_by: string;
  created_at: string;
}

export interface CreatePaymentRequest {
  appointment_id: string;
}

export interface AddPaymentTransactionRequest {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
}

// ─── Medical Records ──────────────────────────────────────────────────────────

export interface MedicalRecord {
  record_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  diagnosis: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

// Returned by GET /patients/:id/medical-records
export interface PatientMedicalHistoryItem {
  record_id: string;
  session_date: string;
  doctor_name: string;
  specialization: string;
  branch_name: string;
  diagnosis_preview: string;
  prescription_count: number;
  follow_up_date: string | null;
  created_at: string;
}

// Returned by GET /doctors/:id/medical-records
export interface DoctorMedicalRecordItem {
  record_id: string;
  patient_name: string;
  session_date: string;
  diagnosis_preview: string;
  prescription_count: number;
  follow_up_date: string | null;
  created_at: string;
}

export interface Prescription {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface CreateMedicalRecordRequest {
  appointment_id: string;
  diagnosis: string;
  notes?: string | null;
  follow_up_date?: string | null;
  prescriptions?: Prescription[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

// Non-doctor users get hospital dashboard
export interface HospitalDashboard {
  generated_at: string;
  today: {
    date: string;
    total_appointments: number;
    waiting: number;
    in_clinic: number;
    completed: number;
    cancelled: number;
    no_show: number;
    revenue_collected: string | number;
    sessions_open: number;
    sessions_full: number;
  };
  this_month: {
    total_appointments: number;
    completed: number;
    cancellation_rate: number;
    new_patients: number;
    revenue_collected: string | number;
    revenue_pending: string | number;
  };
  active_sessions_today: ActiveSession[];
  top_doctors_this_month: TopDoctor[];
  monthly_trend: MonthlyTrendItem[];
  recent_appointments: RecentAppointment[];
}

export interface ActiveSession {
  session_id: string;
  doctor_name: string;
  specialization: string;
  branch_name: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  max_patients: number;
  status: string;
}

export interface TopDoctor {
  doctor_id: string;
  name: string;
  specialization: string;
  appointments_completed: number;
  revenue_generated: string | number;
}

export interface MonthlyTrendItem {
  month: string;
  appointments: number;
  revenue: string | number;
}

export interface RecentAppointment {
  appointment_id: string;
  queue_number: number;
  status: AppointmentStatus;
  patient_name: string;
  doctor_name: string;
  session_date: string;
  total_fee: string | number;
}

// Doctor dashboard
export interface DoctorDashboard {
  generated_at: string;
  personal_stats: {
    appointments_today: number;
    pending_appointments: number;
    completed_appointments: number;
  };
  my_sessions_today: unknown[];
  next_appointment: unknown | null;
  missing_profile?: boolean;
}

export type DashboardData = HospitalDashboard | DoctorDashboard;

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface DailyRevenueReport {
  date: string;
  total_collected: number;
  total_refunded: number;
  net_revenue: number;
  doctor_revenue: number;
  hospital_revenue: number;
  by_method: Record<string, { count: number; amount: number }>;
  appointments_billed: number;
  appointments_fully_paid: number;
  appointments_pending: number;
}

export interface MonthlyRevenueReport {
  year: number;
  month: number;
  total_collected: number;
  total_refunded: number;
  net_revenue: number;
  doctor_revenue: number;
  hospital_revenue: number;
  by_day: { date: string; collected: number; refunded: number; appointments_billed: number }[];
  by_method: Record<string, { count: number; amount: number }>;
  top_doctors: { doctor_id: string; name: string; specialization: string; appointments_completed: number; total_earned: number }[];
}

export interface DoctorRevenueReport {
  period: { from: string; to: string };
  total_appointments: number;
  total_earned: number;
  average_per_day: number;
  by_day: { date: string; appointments: number; earned: number }[];
  transactions: {
    appointment_id: string;
    patient_name: string;
    session_date: string;
    queue_display: string;
    doctor_amount: number;
    payment_status: string;
  }[];
}

// ─── Permissions / RBAC ───────────────────────────────────────────────────────

export interface Permission {
  permission_id: number;
  name: string;
  description: string | null;
  module: string | null;
}

// Shape returned by GET /admin/roles and GET /admin/roles/:id
export interface ApiRole {
  role_id: number;
  name: string;
  is_system_role: boolean;
  user_count: number;
  permissions: { permission_id: number; name: string }[];
}

// Keep alias so any other references compile
export type RoleWithPermissions = ApiRole;

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PatientQueryParams extends PaginationParams {
  search?: string;
}

export interface DoctorQueryParams extends PaginationParams {
  search?: string;
  specialization?: string;
  status?: "active" | "inactive";
}

export interface SessionQueryParams extends PaginationParams {
  doctor_id?: string;
  branch_id?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
}

export interface AppointmentQueryParams extends PaginationParams {
  status?: AppointmentStatus;
  doctor_id?: string;
  patient_id?: string;
  session_id?: string;
  date?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  status?: PaymentStatus;
  date?: string;
  from?: string;
  to?: string;
  doctor_id?: string;
  method?: PaymentMethod;
}

export interface ReportQueryParams {
  date?: string;
  year?: number;
  month?: number;
  doctor_id?: string;
  from?: string;
  to?: string;
}
