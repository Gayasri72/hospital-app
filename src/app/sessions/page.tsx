"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import Link from "next/link";
import { Plus, CalendarDays, Monitor } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sessionsService } from "@/lib/api/services/sessions.service";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { branchesService } from "@/lib/api/services/branches.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate, formatTime } from "@/lib/utils/format";
import { sessionSchema, type SessionFormValues } from "@/lib/validators/session.schema";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_MANAGE_SESSIONS } from "@/config/roles";
import type { ChannelSession } from "@/types";

// Only these statuses can be set via the API
const STATUS_CHANGE_OPTIONS = ["open", "closed", "cancelled"] as const;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function parse24h(v: string): { h: string; m: string; period: "AM" | "PM" } {
  if (!v) return { h: "8", m: "00", period: "AM" };
  const [hStr, mStr] = v.split(":");
  const h24 = parseInt(hStr, 10);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { h: String(h12), m: mStr ?? "00", period };
}

function to24h(h: string, m: string, period: "AM" | "PM"): string {
  let h24 = parseInt(h, 10);
  if (period === "AM" && h24 === 12) h24 = 0;
  if (period === "PM" && h24 !== 12) h24 += 12;
  return `${String(h24).padStart(2, "0")}:${m}`;
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, setH] = useState(() => parse24h(value).h);
  const [m, setM] = useState(() => parse24h(value).m);
  const [period, setPeriod] = useState<"AM" | "PM">(() => parse24h(value).period);

  // Sync local state when value resets externally (e.g. form reset)
  useEffect(() => {
    const parsed = parse24h(value);
    setH(parsed.h);
    setM(parsed.m);
    setPeriod(parsed.period);
  }, [value]);

  const commit = (newH: string, newM: string, newPeriod: "AM" | "PM") => {
    onChange(to24h(newH, newM, newPeriod));
  };

  const selectClass =
    "rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <select
        value={h}
        onChange={(e) => { setH(e.target.value); commit(e.target.value, m, period); }}
        className={`${selectClass} w-16`}
      >
        {HOURS.map((hr) => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-gray-400 font-medium select-none">:</span>
      <select
        value={m}
        onChange={(e) => { setM(e.target.value); commit(h, e.target.value, period); }}
        className={`${selectClass} w-16`}
      >
        {MINUTES.map((mn) => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <div className="flex rounded-md border border-input overflow-hidden shrink-0">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setPeriod(p); commit(h, m, p); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function SessionFormModal({
  open, onOpenChange, session,
}: { open: boolean; onOpenChange: (open: boolean) => void; session?: ChannelSession }) {
  const qc = useQueryClient();
  const isEdit = !!session;

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors", "all"],
    queryFn: () => doctorsService.list({ limit: 100 }),
    enabled: open,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchesService.list,
    enabled: open,
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: session
      ? {
          doctor_id: session.doctor_id,
          branch_id: session.branch_id,
          session_date: session.session_date.slice(0, 10),
          start_time: session.start_time.slice(0, 5),
          end_time: session.end_time.slice(0, 5),
          max_patients: session.max_patients,
        }
      : { start_time: "08:00", end_time: "12:00" },
  });

  const createMutation = useMutation({
    mutationFn: sessionsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session created"); onOpenChange(false); reset(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SessionFormValues) => sessionsService.update(session!.session_id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session updated"); onOpenChange(false); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Session" : "Create Session"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => isEdit ? updateMutation.mutate(v) : createMutation.mutate(v))} className="space-y-4">
          <div>
            <Label>Doctor *</Label>
            <select {...register("doctor_id")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select doctor</option>
              {doctorsData?.data.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  Dr. {d.name} — {d.specialization}
                </option>
              ))}
            </select>
            {errors.doctor_id && <p className="mt-1 text-xs text-red-600">{errors.doctor_id.message}</p>}
          </div>
          <div>
            <Label>Branch *</Label>
            <select {...register("branch_id")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}{b.location ? ` — ${b.location}` : ""}
                </option>
              ))}
            </select>
            {errors.branch_id && <p className="mt-1 text-xs text-red-600">{errors.branch_id.message}</p>}
          </div>
          <div>
            <Label>Session Date *</Label>
            <Input type="date" {...register("session_date")} className="mt-1" />
            {errors.session_date && <p className="mt-1 text-xs text-red-600">{errors.session_date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => <TimePicker value={field.value ?? ""} onChange={field.onChange} />}
              />
              {errors.start_time && <p className="mt-1 text-xs text-red-600">{errors.start_time.message}</p>}
            </div>
            <div>
              <Label>End Time *</Label>
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => <TimePicker value={field.value ?? ""} onChange={field.onChange} />}
              />
              {errors.end_time && <p className="mt-1 text-xs text-red-600">{errors.end_time.message}</p>}
            </div>
          </div>
          <div>
            <Label>Max Patients *</Label>
            <Input type="number" min={1} max={100} {...register("max_patients", { valueAsNumber: true })} className="mt-1" />
            {errors.max_patients && <p className="mt-1 text-xs text-red-600">{errors.max_patients.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SessionsPage() {
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_SESSIONS);

  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChannelSession | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", { date: filterDate }],
    queryFn: () => sessionsService.list({ date: filterDate, limit: 50 }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "closed" | "cancelled" }) =>
      sessionsService.updateStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Status updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <DashboardShell title="Sessions">
      <PageHeader
        title="Channel Sessions"
        description="Manage doctor channeling sessions"
        actions={
          <div className="flex items-center gap-3">
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40" />
            {canManage && (
              <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" />New Session
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={CalendarDays} title="No sessions found"
            description={`No sessions scheduled for ${formatDate(filterDate)}.`}
            action={canManage ? (
              <Button onClick={() => setModalOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />New Session</Button>
            ) : undefined} />
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
                  <tr key={session.session_id || `row-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {session.doctor ? `Dr. ${session.doctor.name}` : "—"}
                      {session.doctor && (
                        <p className="text-xs text-gray-500">{session.doctor.specialization}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(session.session_date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatTime(session.start_time)} – {formatTime(session.end_time)}
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
                            <Button variant="outline" size="sm" className="gap-1">
                              <Monitor className="h-3.5 w-3.5" />Queue
                            </Button>
                          </Link>
                        )}
                        {canManage && session.status !== "cancelled" && session.status !== "closed" && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateStatusMutation.mutate({
                                  id: session.session_id,
                                  status: e.target.value as "open" | "closed" | "cancelled",
                                });
                                e.target.value = "";
                              }
                            }}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                          >
                            <option value="" disabled>Change status</option>
                            {STATUS_CHANGE_OPTIONS.filter((s) => s !== session.status).map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        )}
                        {canManage && session.status === "scheduled" && (
                          <Button variant="ghost" size="sm"
                            onClick={() => { setEditTarget(session); setModalOpen(true); }}>
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

      <SessionFormModal open={modalOpen} onOpenChange={setModalOpen} session={editTarget} />
    </DashboardShell>
  );
}
