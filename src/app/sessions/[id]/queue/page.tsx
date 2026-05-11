"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { sessionsService } from "@/lib/api/services/sessions.service";
import { appointmentsService } from "@/lib/api/services/appointments.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatTime } from "@/lib/utils/format";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_COMPLETE_APPOINTMENTS, ROLES } from "@/config/roles";
import { useAuthStore } from "@/store/auth.store";
import type { AppointmentStatus } from "@/types";

// Doctors check patients in/out of the consultation room — they cannot mark
// "arrived" because that is a physical front-desk check-in by the receptionist.
const NEXT_STATUS_DEFAULT: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  booked: "confirmed",
  confirmed: "arrived",
  arrived: "completed",
};

const NEXT_STATUS_DOCTOR: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  booked: "confirmed",
  // confirmed → arrived is intentionally omitted: receptionist's job
  arrived: "completed",
};

export default function SessionQueuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const canAct = can(CAN_COMPLETE_APPOINTMENTS);
  const user = useAuthStore((s) => s.user);
  const nextStatusMap = user?.role === ROLES.DOCTOR ? NEXT_STATUS_DOCTOR : NEXT_STATUS_DEFAULT;

  // Track which specific appointment is being updated to avoid disabling all buttons
  const [pendingApptId, setPendingApptId] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => sessionsService.get(id),
  });

  const { data: appointments, isLoading: apptLoading } = useQuery({
    queryKey: ["appointments", { session_id: id }],
    queryFn: () => appointmentsService.list({ session_id: id, limit: 100 }),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: string; status: AppointmentStatus }) =>
      appointmentsService.updateStatus(apptId, { status }),
    onMutate: ({ apptId }) => setPendingApptId(apptId),
    onSuccess: () => {
      setPendingApptId(null);
      qc.invalidateQueries({ queryKey: ["appointments", { session_id: id }] });
    },
    onError: (err) => {
      setPendingApptId(null);
      toast.error(getErrorMessage(err));
    },
  });

  return (
    <DashboardShell title="Session Queue">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Sessions
        </Button>
      </div>

      {sessionLoading ? <PageLoader /> : session && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {session.doctor ? `Dr. ${session.doctor.name}` : "Session Queue"}
              </h1>
              <p className="text-sm text-gray-500">
                {session.doctor?.specialization} · {formatTime(session.start_time)} – {formatTime(session.end_time)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {appointments?.data.filter((a) => a.status === "arrived").length ?? 0}
              </p>
              <p className="text-xs text-gray-500">Arrived</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {apptLoading ? <PageLoader /> : !appointments?.data.length ? (
          <p className="py-10 text-center text-sm text-gray-400">No appointments in this session</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Queue #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                {canAct && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.data
                .sort((a, b) => a.queue_number - b.queue_number)
                .map((appt, index) => {
                  const next = nextStatusMap[appt.status];
                  const isPending = pendingApptId === appt.appointment_id;
                  return (
                    <tr key={appt.appointment_id || `row-${index}`}
                      className={appt.status === "arrived" ? "bg-amber-50" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 text-xl font-bold text-gray-800">{appt.queue_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {appt.patient?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>
                      {canAct && (
                        <td className="px-4 py-3 text-right">
                          {next && (
                            <Button size="sm"
                              variant={appt.status === "arrived" ? "default" : "outline"}
                              disabled={isPending}
                              onClick={() => updateStatusMutation.mutate({ apptId: appt.appointment_id, status: next })}>
                              {isPending ? "…" : `Mark ${next}`}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
