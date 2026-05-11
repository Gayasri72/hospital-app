"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Phone, Mail, MapPin } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { patientsService } from "@/lib/api/services/patients.service";
import { appointmentsService } from "@/lib/api/services/appointments.service";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patients", id],
    queryFn: () => patientsService.get(id),
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments", { patient_id: id }],
    queryFn: () => appointmentsService.list({ patient_id: id, limit: 20 }),
    enabled: !!id,
  });

  return (
    <DashboardShell title="Patient Detail">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
      {isLoading ? <PageLoader /> : !patient ? (
        <p className="text-gray-500">Patient not found.</p>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Profile card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                <User className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
                <p className="text-sm text-gray-500">
                  NIC: {patient.nic}
                  {patient.profile?.gender && ` · ${patient.profile.gender}`}
                  {patient.profile?.age && ` · Age: ${patient.profile.age}`}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {patient.phone}
              </div>
              {patient.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {patient.email}
                </div>
              )}
              {patient.profile?.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {patient.profile.address}
                </div>
              )}
              {patient.profile?.emergency_contact && (
                <div className="text-sm">
                  <span className="text-gray-500">Emergency: </span>
                  <span>{patient.profile.emergency_contact}</span>
                </div>
              )}
            </div>
          </div>

          {/* Appointment history */}
          {appointments?.data.length ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Appointment History</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {appointments.data.map((appt, index) => (
                  <div key={appt.appointment_id || `row-${index}`} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {appt.doctor ? `Dr. ${appt.doctor.name}` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(appt.session?.session_date)}
                        {appt.queue_number ? ` · Queue #${appt.queue_number}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(appt.total_fee)}</span>
                      <StatusBadge status={appt.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardShell>
  );
}
