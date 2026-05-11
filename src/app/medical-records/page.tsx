"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Stethoscope } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { medicalService } from "@/lib/api/services/medical.service";
import { patientsService } from "@/lib/api/services/patients.service";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils/format";

// ── Doctor View ──────────────────────────────────────────────────────────────

function DoctorRecordsView({ doctorId }: { doctorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["medical-records", "doctor", doctorId],
    queryFn: () => medicalService.listByDoctor(doctorId, { limit: 50 }),
  });

  if (isLoading) return <PageLoader />;
  if (!data?.data.length) {
    return <EmptyState icon={FileText} title="No records yet" description="Medical records you create will appear here." />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Session Date</th>
            <th className="px-4 py-3">Diagnosis</th>
            <th className="px-4 py-3">Prescriptions</th>
            <th className="px-4 py-3">Follow-up</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.data.map((r) => (
            <tr key={r.record_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{r.patient_name}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(r.session_date)}</td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.diagnosis_preview}>
                {r.diagnosis_preview}
              </td>
              <td className="px-4 py-3 text-center">
                {r.prescription_count > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {r.prescription_count} Rx
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {r.follow_up_date ? formatDate(r.follow_up_date) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {data.meta.total} record{data.meta.total !== 1 ? "s" : ""} total
      </div>
    </div>
  );
}

// ── Admin / Patient View ─────────────────────────────────────────────────────

function AdminRecordsView() {
  const [patientId, setPatientId] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => patientsService.list({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["medical-records", "patient", patientId],
    queryFn: () => medicalService.listByPatient(patientId, { limit: 50 }),
    enabled: !!patientId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Patient</label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Select a patient…</option>
          {patients?.data.map((p) => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.name} — {p.nic}
            </option>
          ))}
        </select>
      </div>

      {!patientId ? (
        <EmptyState icon={FileText} title="Select a patient" description="Choose a patient above to view their medical history." />
      ) : isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState icon={FileText} title="No records found" description="This patient has no medical records yet." />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Prescriptions</th>
                <th className="px-4 py-3">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((r) => (
                <tr key={r.record_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.session_date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">Dr. {r.doctor_name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.specialization}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.diagnosis_preview}>
                    {r.diagnosis_preview}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.prescription_count > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {r.prescription_count} Rx
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.follow_up_date ? formatDate(r.follow_up_date) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            {data.meta.total} record{data.meta.total !== 1 ? "s" : ""} total
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const user = useAuthStore((s) => s.user);
  const isDoctor = user?.role === "Doctor";

  return (
    <DashboardShell title="Medical Records">
      <PageHeader
        title="Medical Records"
        description={isDoctor ? "Records from your consultations" : "Patient medical history"}
      />

      {isDoctor ? (
        user?.doctor_id ? (
          <DoctorRecordsView doctorId={user.doctor_id} />
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="Doctor profile not linked"
            description="Your user account is not linked to a doctor profile. Contact the administrator."
          />
        )
      ) : (
        <AdminRecordsView />
      )}
    </DashboardShell>
  );
}
