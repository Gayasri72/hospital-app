"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { reportsService } from "@/lib/api/services/reports.service";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_VIEW_REPORTS } from "@/config/roles";

type Tab = "daily" | "monthly" | "doctor";

export default function ReportsPage() {
  const { can } = usePermissions();
  const hasAccess = can(CAN_VIEW_REPORTS);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const [tab, setTab] = useState<Tab>("daily");

  // Daily state
  const [dailyDate, setDailyDate] = useState(today);

  // Monthly state
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Doctor state
  const [doctorId, setDoctorId] = useState("");
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + "01");
  const [toDate, setToDate] = useState(today);

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ["reports", "daily", dailyDate],
    queryFn: () => reportsService.daily({ date: dailyDate }),
    enabled: tab === "daily" && hasAccess,
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ["reports", "monthly", year, month],
    queryFn: () => reportsService.monthly({ year, month }),
    enabled: tab === "monthly" && hasAccess,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", "all"],
    queryFn: () => doctorsService.list({ limit: 100 }).then((r) => r.data),
    enabled: tab === "doctor" && hasAccess,
  });

  const { data: doctorReport, isLoading: doctorLoading } = useQuery({
    queryKey: ["reports", "doctor", doctorId, fromDate, toDate],
    queryFn: () => reportsService.doctor({ doctor_id: doctorId, from: fromDate, to: toDate }),
    enabled: tab === "doctor" && hasAccess && !!doctorId,
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "monthly", label: "Monthly" },
    { key: "doctor", label: "Doctor Revenue" },
  ];

  if (!hasAccess) {
    return (
      <DashboardShell title="Reports">
        <EmptyState icon={BarChart3} title="Access Restricted" description="You don't have permission to view reports." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Reports">
      <PageHeader title="Reports & Analytics" description="View performance and revenue reports" />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Report */}
      {tab === "daily" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Date</span>
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
              className="h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          {dailyLoading ? <PageLoader /> : !daily ? (
            <EmptyState icon={BarChart3} title="No data" description="No data for the selected date." />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Net Revenue", value: formatCurrency(daily.net_revenue), color: "text-blue-600" },
                  { label: "Collected", value: formatCurrency(daily.total_collected), color: "text-green-700" },
                  { label: "Refunded", value: formatCurrency(daily.total_refunded), color: "text-red-600" },
                  { label: "Appointments Billed", value: daily.appointments_billed, color: "text-gray-900" },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Doctor Revenue</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(daily.doctor_revenue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Hospital Revenue</p>
                  <p className="text-xl font-bold text-indigo-600">{formatCurrency(daily.hospital_revenue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Fully Paid / Pending</p>
                  <p className="text-xl font-bold text-gray-900">
                    <span className="text-green-700">{daily.appointments_fully_paid}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-amber-600">{daily.appointments_pending}</span>
                  </p>
                </div>
              </div>
              {Object.keys(daily.by_method).length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">By Payment Method</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Transactions</th>
                        <th className="px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(daily.by_method).map(([method, v]) => (
                        <tr key={method} className="hover:bg-gray-50">
                          <td className="px-4 py-3 capitalize font-medium">{method}</td>
                          <td className="px-4 py-3 text-gray-600">{v.count}</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(v.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Monthly Report */}
      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Year</span>
            <input type="number" value={year} min={2020} max={2100} onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 w-24 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          {monthlyLoading ? <PageLoader /> : !monthly ? (
            <EmptyState icon={BarChart3} title="No data" description="No data for the selected period." />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Net Revenue", value: formatCurrency(monthly.net_revenue), color: "text-blue-600" },
                  { label: "Collected", value: formatCurrency(monthly.total_collected), color: "text-green-700" },
                  { label: "Refunded", value: formatCurrency(monthly.total_refunded), color: "text-red-600" },
                  { label: "Doctor Revenue", value: formatCurrency(monthly.doctor_revenue), color: "text-purple-600" },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              {monthly.by_day.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Daily Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Appointments</th>
                          <th className="px-4 py-3">Collected</th>
                          <th className="px-4 py-3">Refunded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthly.by_day.map((row) => (
                          <tr key={row.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{formatDate(row.date)}</td>
                            <td className="px-4 py-3 text-gray-600">{row.appointments_billed}</td>
                            <td className="px-4 py-3 text-green-700">{formatCurrency(row.collected)}</td>
                            <td className="px-4 py-3 text-red-600">{formatCurrency(row.refunded)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {monthly.top_doctors.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Top Doctors</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Specialization</th>
                        <th className="px-4 py-3">Appointments</th>
                        <th className="px-4 py-3">Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthly.top_doctors.map((doc) => (
                        <tr key={doc.doctor_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">Dr. {doc.name}</td>
                          <td className="px-4 py-3 text-gray-600">{doc.specialization}</td>
                          <td className="px-4 py-3 text-gray-600">{doc.appointments_completed}</td>
                          <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(doc.total_earned)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Doctor Revenue Report */}
      {tab === "doctor" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Doctor</span>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
                className="h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <span>to</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>

          {!doctorId ? (
            <EmptyState icon={BarChart3} title="Select a doctor" description="Choose a doctor to view their revenue report." />
          ) : doctorLoading ? <PageLoader /> : !doctorReport ? (
            <EmptyState icon={BarChart3} title="No data" description="No revenue data for the selected period." />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Earned", value: formatCurrency(doctorReport.total_earned), color: "text-blue-600" },
                  { label: "Appointments", value: doctorReport.total_appointments, color: "text-gray-900" },
                  { label: "Avg per Day", value: formatCurrency(doctorReport.average_per_day), color: "text-green-700" },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              {doctorReport.transactions.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Queue</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {doctorReport.transactions.map((tx) => (
                          <tr key={tx.appointment_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{tx.patient_name}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(tx.session_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{tx.queue_display}</td>
                            <td className="px-4 py-3 capitalize text-gray-600">{tx.payment_status}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(tx.doctor_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
