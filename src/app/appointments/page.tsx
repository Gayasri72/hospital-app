"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, ClipboardList } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { appointmentsService } from "@/lib/api/services/appointments.service";
import { sessionsService } from "@/lib/api/services/sessions.service";
import { patientsService } from "@/lib/api/services/patients.service";
import { paymentsService } from "@/lib/api/services/payments.service";
import { getErrorMessage, getApiErrorCode } from "@/lib/utils/errors";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils/format";
import { createAppointmentSchema, paymentTransactionSchema, type CreateAppointmentFormValues, type PaymentTransactionFormValues } from "@/lib/validators/appointment.schema";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_BOOK_APPOINTMENTS, CAN_PROCESS_PAYMENTS } from "@/config/roles";
import type { Appointment, AppointmentStatus, Payment } from "@/types";

// Backend initial status is "booked"; status changes: confirmed → arrived → completed
const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "cancelled"],
  confirmed: ["arrived", "cancelled"],
  arrived: ["completed", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

function CreateAppointmentModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions", "available", filterDate],
    queryFn: () => sessionsService.list({ date: filterDate, status: "open", limit: 50 }),
    enabled: open,
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => patientsService.list({ limit: 100 }),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
  });

  const createMutation = useMutation({
    mutationFn: appointmentsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked successfully");
      onOpenChange(false);
      reset();
    },
    onError: (err) => {
      const code = getApiErrorCode(err);
      if (code === "FEE_NOT_CONFIGURED") {
        toast.error("Doctor fee not configured. Please set the doctor's consultation fee before booking.");
      } else {
        toast.error(getErrorMessage(err));
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div>
            <Label>Session Date</Label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <Label>Session *</Label>
            <select {...register("session_id")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select session</option>
              {sessionsData?.data.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.doctor ? `Dr. ${s.doctor.name}` : "Doctor"}{" "}
                  — {formatDate(s.session_date)} {formatTime(s.start_time)}
                  {" "}({s.booked_count} / {s.max_patients} booked)
                </option>
              ))}
            </select>
            {errors.session_id && <p className="mt-1 text-xs text-red-600">{errors.session_id.message}</p>}
          </div>
          <div>
            <Label>Patient *</Label>
            <select {...register("patient_id")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select patient</option>
              {patientsData?.data.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.name} ({p.nic})
                </option>
              ))}
            </select>
            {errors.patient_id && <p className="mt-1 text-xs text-red-600">{errors.patient_id.message}</p>}
          </div>
          <div>
            <Label>Notes</Label>
            <textarea {...register("notes")} rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Booking…" : "Book Appointment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentModal({ open, onOpenChange, payment }: { open: boolean; onOpenChange: (open: boolean) => void; payment?: Payment }) {
  const qc = useQueryClient();
  const METHODS = ["cash", "card", "online", "insurance"] as const;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PaymentTransactionFormValues>({
    resolver: zodResolver(paymentTransactionSchema),
  });

  const addTxMutation = useMutation({
    mutationFn: (data: PaymentTransactionFormValues) => paymentsService.addTransaction(payment!.payment_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Payment recorded");
      onOpenChange(false);
      reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!payment) return null;

  const balance = parseFloat(payment.total_amount) - parseFloat(payment.amount_paid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-medium">{formatCurrency(payment.total_amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium">{formatCurrency(payment.amount_paid)}</span></div>
          <div className="flex justify-between border-t pt-1"><span className="text-gray-700 font-medium">Balance</span><span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(balance)}</span></div>
        </div>
        <form onSubmit={handleSubmit((v) => addTxMutation.mutate(v))} className="space-y-4">
          <div>
            <Label>Amount (Rs) *</Label>
            <input type="number" step="0.01" max={balance} {...register("amount", { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div>
            <Label>Method *</Label>
            <select {...register("method")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select method</option>
              {METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            {errors.method && <p className="mt-1 text-xs text-red-600">{errors.method.message}</p>}
          </div>
          <div>
            <Label>Reference</Label>
            <input {...register("reference")} placeholder="Transaction ref, cheque #…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Add Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AppointmentsPage() {
  const { can } = usePermissions();
  const canBook = can(CAN_BOOK_APPOINTMENTS);
  const canPay = can(CAN_PROCESS_PAYMENTS);

  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; payment?: Payment }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", { date: filterDate, status: filterStatus, page }],
    queryFn: () => appointmentsService.list({
      date: filterDate,
      status: filterStatus || undefined,
      page,
      limit: 20,
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsService.updateStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Status updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (appointmentId: string) => paymentsService.create({ appointment_id: appointmentId }),
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setPaymentModal({ open: true, payment });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const STATUSES: Array<AppointmentStatus | ""> = ["", "booked", "confirmed", "arrived", "completed", "cancelled", "no_show"];

  return (
    <DashboardShell title="Appointments">
      <PageHeader
        title="Appointments"
        description="Book and manage patient appointments"
        actions={
          <div className="flex items-center gap-2">
            <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as AppointmentStatus | ""); setPage(1); }}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none">
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>)}
            </select>
            {canBook && (
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />Book
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={ClipboardList} title="No appointments found"
            action={canBook ? <Button onClick={() => setCreateOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Book Appointment</Button> : undefined} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((appt, index) => {
                    const nextStatuses = ALLOWED_STATUS_TRANSITIONS[appt.status] ?? [];
                    const balance = appt.payment
                      ? parseFloat(appt.payment.total_amount) - parseFloat(appt.payment.amount_paid)
                      : 0;
                    return (
                      <tr key={appt.appointment_id || `row-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{appt.queue_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {appt.patient?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {appt.doctor ? `Dr. ${appt.doctor.name}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{formatDate(appt.session?.session_date)}</div>
                          {appt.session?.start_time && <div className="text-xs text-gray-400">{formatTime(appt.session.start_time)}</div>}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(appt.total_fee)}</td>
                        <td className="px-4 py-3">
                          {appt.payment ? (
                            <div>
                              <StatusBadge status={appt.payment.status} />
                              {balance > 0 && (
                                <p className="text-xs text-red-500 mt-0.5">Bal: {formatCurrency(balance)}</p>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">No payment</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canPay && appt.status === "completed" && !appt.payment && (
                              <Button variant="default" size="sm"
                                disabled={createPaymentMutation.isPending}
                                onClick={() => createPaymentMutation.mutate(appt.appointment_id)}>
                                Pay
                              </Button>
                            )}
                            {canPay && appt.payment && balance > 0 && (
                              <Button variant="outline" size="sm"
                                onClick={() => setPaymentModal({ open: true, payment: appt.payment! })}>
                                Pay
                              </Button>
                            )}
                            {nextStatuses.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) updateStatusMutation.mutate({ id: appt.appointment_id, status: e.target.value as AppointmentStatus });
                                  e.target.value = "";
                                }}
                                defaultValue=""
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="" disabled>Change status</option>
                                {nextStatuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Showing {data.data.length} of {data.meta.total} appointments</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="flex items-center px-2 text-sm text-gray-600">{page} / {data.meta.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateAppointmentModal open={createOpen} onOpenChange={setCreateOpen} />
      <PaymentModal open={paymentModal.open} onOpenChange={(open) => setPaymentModal({ open })} payment={paymentModal.payment} />
    </DashboardShell>
  );
}
