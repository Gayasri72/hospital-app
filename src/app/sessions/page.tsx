"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Link from "next/link";
import { Plus, CalendarDays, Monitor } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionFormModal } from "@/components/sessions/SessionFormModal";
import { sessionsService } from "@/lib/api/services/sessions.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate, formatTime } from "@/lib/utils/format";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_MANAGE_SESSIONS, ROLES } from "@/config/roles";
import { useAuthStore } from "@/store/auth.store";
import type { ChannelSession } from "@/types";

// Only these statuses can be set via the API
const STATUS_CHANGE_OPTIONS = ["open", "closed", "cancelled"] as const;

export default function SessionsPage() {
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_SESSIONS);
  const user = useAuthStore((s) => s.user);
  const isDoctor = user?.role === ROLES.DOCTOR;
  // Doctors only see their own sessions
  const doctorIdFilter = isDoctor ? user?.doctor_id : undefined;

  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChannelSession | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", { date: filterDate, doctor_id: doctorIdFilter }],
    queryFn: () =>
      sessionsService.list({
        date: filterDate,
        doctor_id: doctorIdFilter,
        limit: 50,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "open" | "closed" | "cancelled";
    }) => sessionsService.updateStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <DashboardShell title="Sessions">
      <PageHeader
        title="Channel Sessions"
        description={
          isDoctor
            ? "Your scheduled channeling sessions"
            : "Manage doctor channeling sessions"
        }
        actions={
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40"
            />
            {canManage && (
              <Button
                onClick={() => {
                  setEditTarget(undefined);
                  setModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !data?.data.length ? (
          <EmptyState
            icon={CalendarDays}
            title="No sessions found"
            description={`No sessions scheduled for ${formatDate(filterDate)}.`}
            action={
              canManage ? (
                <Button onClick={() => setModalOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Session
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((session, index) => (
                  <tr
                    key={session.session_id || `row-${index}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {session.doctor ? `Dr. ${session.doctor.name}` : "—"}
                      {session.doctor && (
                        <p className="text-xs text-gray-500">
                          {session.doctor.specialization}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(session.session_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatTime(session.start_time)} –{" "}
                      {formatTime(session.end_time)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {session.booked_count} / {session.max_patients}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {session.status === "open" && (
                          <Link href={`/sessions/${session.session_id}/queue`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                            >
                              <Monitor className="h-3.5 w-3.5" />
                              Queue
                            </Button>
                          </Link>
                        )}
                        {canManage &&
                          session.status !== "cancelled" &&
                          session.status !== "closed" && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateStatusMutation.mutate({
                                    id: session.session_id,
                                    status: e.target.value as
                                      | "open"
                                      | "closed"
                                      | "cancelled",
                                  });
                                  e.target.value = "";
                                }
                              }}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="" disabled>
                                Change status
                              </option>
                              {STATUS_CHANGE_OPTIONS.filter(
                                (s) => s !== session.status,
                              ).map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                          )}
                        {canManage && session.status === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTarget(session);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SessionFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        session={editTarget}
      />
    </DashboardShell>
  );
}
