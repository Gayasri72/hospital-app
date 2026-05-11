"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { dashboardService } from "@/lib/api/services/dashboard.service";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils/format";
import type { HospitalDashboard, DoctorDashboard } from "@/types";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function HospitalDashboardView({ data }: { data: HospitalDashboard }) {
  return (
    <div className="space-y-6">
      {/* Today's stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Today's Appointments" value={data.today.total_appointments} icon={CalendarDays} color="bg-blue-500" />
        <StatCard title="Waiting" value={data.today.waiting} icon={Clock} color="bg-amber-500" />
        <StatCard title="In Clinic" value={data.today.in_clinic} icon={Users} color="bg-indigo-500" />
        <StatCard title="Completed" value={data.today.completed} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Cancelled" value={data.today.cancelled} icon={XCircle} color="bg-red-500" />
        <StatCard title="Today's Revenue" value={formatCurrency(data.today.revenue_collected)} icon={TrendingUp} color="bg-emerald-500" />
      </div>

      {/* This month stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{data.this_month.total_appointments}</p>
          <p className="text-xs text-gray-400 mt-1">appointments</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">New Patients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{data.this_month.new_patients}</p>
          <p className="text-xs text-gray-400 mt-1">this month</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month Revenue</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(data.this_month.revenue_collected)}</p>
          <p className="text-xs text-red-500 mt-1">Pending: {formatCurrency(data.this_month.revenue_pending)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Cancellation Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{Number(data.this_month.cancellation_rate).toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.this_month.completed} completed</p>
        </div>
      </div>

      {/* Recent appointments */}
      {data.recent_appointments?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Appointments</h2>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Doctor</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recent_appointments.map((appt) => (
                    <tr key={appt.appointment_id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{appt.queue_number}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{appt.patient_name || "—"}</td>
                      <td className="py-3 pr-4 text-gray-600">{appt.doctor_name ? `Dr. ${appt.doctor_name}` : "—"}</td>
                      <td className="py-3 pr-4 text-gray-600">{formatDate(appt.session_date)}</td>
                      <td className="py-3 pr-4"><StatusBadge status={appt.status} /></td>
                      <td className="py-3 font-medium text-gray-900">{formatCurrency(appt.total_fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active sessions */}
      {data.active_sessions_today?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Active Sessions Today</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.active_sessions_today.map((session) => (
                <div key={session.session_id} className="rounded-lg border border-gray-100 p-3">
                  <p className="font-medium text-gray-900">Dr. {session.doctor_name}</p>
                  <p className="text-xs text-gray-500">{session.specialization}</p>
                  <p className="text-xs text-gray-400 mt-1">{session.branch_name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-600">{formatTime(session.start_time)} — {formatTime(session.end_time)}</span>
                    <span className="text-xs font-medium text-blue-600">{session.booked_count}/{session.max_patients}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorDashboardView({ data }: { data: DoctorDashboard }) {
  if (data.missing_profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800 font-medium">Doctor profile not configured yet.</p>
        <p className="text-amber-600 text-sm mt-1">Please contact your administrator to link your doctor profile.</p>
      </div>
    );
  }

  const today = data.personal_stats.today;
  const month = data.personal_stats.this_month;

  return (
    <div className="space-y-6">
      {/* Next patient */}
      {data.next_appointment && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Next Patient</p>
            <p className="mt-0.5 text-base font-bold text-gray-900">{data.next_appointment.patient_name}</p>
            <p className="text-xs text-gray-500">
              Queue #{data.next_appointment.queue_display}
              {data.next_appointment.patient_age ? ` · ${data.next_appointment.patient_age} yrs` : ""}
              {data.next_appointment.patient_gender ? ` · ${data.next_appointment.patient_gender}` : ""}
            </p>
          </div>
          <StatusBadge status={data.next_appointment.status as never} />
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard title="Today Total" value={today.total_appointments} icon={CalendarDays} color="bg-blue-500" />
        <StatCard title="Waiting" value={today.waiting} icon={Clock} color="bg-amber-500" />
        <StatCard title="In Clinic" value={today.in_clinic} icon={Users} color="bg-indigo-500" />
        <StatCard title="Completed" value={today.completed} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="No Show" value={today.no_show} icon={XCircle} color="bg-red-400" />
      </div>

      {/* This month */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month Appointments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{month.total_appointments}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{month.completed}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{Number(month.completion_rate).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Medical Records</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{month.medical_records_written}</p>
        </div>
      </div>

      {/* Today's sessions */}
      {data.my_sessions_today.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">My Sessions Today</h2>
          </div>
          <div className="p-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.my_sessions_today.map((s) => (
              <div key={s.session_id} className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500">{s.branch_name}</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {formatTime(s.start_time)} — {formatTime(s.end_time)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.booked_count} / {s.max_patients} booked</span>
                  <StatusBadge status={s.status as never} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardService.get,
    retry: false,
  });

  return (
    <DashboardShell title="Dashboard">
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load dashboard data.</p>
          <p className="text-red-500 text-sm mt-1">Please check your connection and try again.</p>
        </div>
      ) : "today" in data ? (
        <HospitalDashboardView data={data as HospitalDashboard} />
      ) : (
        <DoctorDashboardView data={data as DoctorDashboard} />
      )}
    </DashboardShell>
  );
}
