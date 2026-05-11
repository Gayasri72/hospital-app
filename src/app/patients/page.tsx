"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, User, Stethoscope, Eye, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patientsService } from "@/lib/api/services/patients.service";
import { appointmentsService } from "@/lib/api/services/appointments.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { patientSchema, type PatientFormValues } from "@/lib/validators/patient.schema";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/store/auth.store";
import { CAN_MANAGE_PATIENTS, CAN_DELETE_PATIENTS } from "@/config/roles";
import type { Patient } from "@/types";

const GENDERS = ["Male", "Female", "Other"] as const;

function PatientFormModal({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
}) {
  const qc = useQueryClient();
  const isEdit = !!patient;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient
      ? {
          name: patient.name,
          nic: patient.nic,
          phone: patient.phone,
          email: patient.email ?? "",
          gender: patient.profile?.gender ?? "",
          age: patient.profile?.age ?? undefined,
          address: patient.profile?.address ?? "",
          emergency_contact: patient.profile?.emergency_contact ?? "",
        }
      : {},
  });

  const createMutation = useMutation({
    mutationFn: patientsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient created successfully");
      onOpenChange(false);
      reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: PatientFormValues) => patientsService.update(patient!.patient_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient updated successfully");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function onSubmit(values: PatientFormValues) {
    const payload = {
      ...values,
      email: values.email || undefined,
      age: values.age || undefined,
      gender: values.gender || undefined,
      address: values.address || undefined,
      emergency_contact: values.emergency_contact || undefined,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Patient" : "Add New Patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" {...register("name")} className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nic">NIC *</Label>
              <Input id="nic" {...register("nic")} className="mt-1" disabled={isEdit} />
              {errors.nic && <p className="mt-1 text-xs text-red-600">{errors.nic.message}</p>}
              {isEdit && <p className="mt-1 text-xs text-gray-400">NIC cannot be changed</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone")} className="mt-1" />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" {...register("gender")}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="150"
                {...register("age", { valueAsNumber: true })}
                className="mt-1"
              />
              {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} className="mt-1" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <textarea id="address" {...register("address")} rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <Label htmlFor="emergency_contact">Emergency Contact Phone</Label>
            <Input id="emergency_contact" {...register("emergency_contact")} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PatientDetailModal({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", { patient_id: patient?.patient_id }],
    queryFn: () => appointmentsService.list({ patient_id: patient!.patient_id, limit: 20 }),
    enabled: open && !!patient,
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient.name}</DialogTitle>
          <DialogDescription>Patient profile and appointment history</DialogDescription>
        </DialogHeader>

        {/* Patient info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
          {[
            ["NIC", patient.nic],
            ["Phone", patient.phone],
            ["Email", patient.email || "—"],
            ["Gender", patient.profile?.gender || "—"],
            ["Age", patient.profile?.age?.toString() || "—"],
            ["Address", patient.profile?.address || "—"],
            ["Emergency Contact", patient.profile?.emergency_contact || "—"],
            ["Registered", formatDate(patient.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Appointment history */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Appointment History</h3>
          {isLoading ? (
            <p className="py-4 text-center text-sm text-gray-400">Loading…</p>
          ) : !appointments?.data.length ? (
            <p className="py-4 text-center text-sm text-gray-400">No appointments found.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Doctor</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.data.map((a) => (
                    <tr key={a.appointment_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{a.queue_number}</td>
                      <td className="px-3 py-2 text-gray-700">{a.doctor ? `Dr. ${a.doctor.name}` : "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{formatDate(a.session?.session_date)}</td>
                      <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(a.total_fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  patient,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!patient) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Patient</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{patient.name}</span> (NIC: {patient.nic})?
          This will only succeed if the patient has no appointment records.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Deleting…" : "Delete Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DoctorPatientsView({ doctorId }: { doctorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["appointments", "doctor-patients", doctorId],
    queryFn: () => appointmentsService.list({ doctor_id: doctorId, limit: 100 }),
  });

  const patients = useMemo(() => {
    if (!data?.data) return [];
    const seen = new Map<string, { name: string; phone: string; nic?: string; lastDate?: string; status: string }>();
    for (const appt of data.data) {
      if (!appt.patient) continue;
      const existing = seen.get(appt.patient_id);
      const apptDate = appt.session?.session_date;
      if (!existing || (apptDate && (!existing.lastDate || apptDate > existing.lastDate))) {
        seen.set(appt.patient_id, {
          name: appt.patient.name,
          phone: appt.patient.phone,
          nic: appt.patient.nic,
          lastDate: apptDate,
          status: appt.status,
        });
      }
    }
    return [...seen.entries()].map(([id, info]) => ({ patient_id: id, ...info }));
  }, [data]);

  if (isLoading) return <PageLoader />;

  if (!patients.length) {
    return (
      <EmptyState
        icon={User}
        title="No patients yet"
        description="Patients who book appointments with you will appear here."
      />
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">NIC</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patients.map((p) => (
              <tr key={p.patient_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.nic ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {p.lastDate ? formatDate(p.lastDate) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {patients.length} patient{patients.length !== 1 ? "s" : ""} (from recent appointments)
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const user = useAuthStore((s) => s.user);
  const isDoctor = user?.role === "Doctor";
  const qc = useQueryClient();

  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_PATIENTS);
  const canDelete = can(CAN_DELETE_PATIENTS);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Patient | undefined>();
  const [viewTarget, setViewTarget] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", { search: debouncedSearch, page }],
    queryFn: () => patientsService.list({ search: debouncedSearch, page, limit: 15 }),
    enabled: !isDoctor,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isDoctor) {
    return (
      <DashboardShell title="Patients">
        <PageHeader title="My Patients" description="Patients who have booked appointments with you" />
        {user?.doctor_id ? (
          <DoctorPatientsView doctorId={user.doctor_id} />
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="Doctor profile not linked"
            description="Your user account is not linked to a doctor profile. Ask the administrator to re-create your login via the Doctors page."
          />
        )}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Patients">
      <PageHeader
        title="Patients"
        description="Manage patient records"
        actions={
          canManage ? (
            <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }} size="sm">
              <Plus className="mr-2 h-4 w-4" />Add Patient
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, NIC, or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !data?.data.length ? (
          <EmptyState
            icon={User}
            title="No patients found"
            description={search ? "Try adjusting your search." : "Add your first patient to get started."}
            action={canManage ? <Button onClick={() => setModalOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Add Patient</Button> : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">NIC</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((patient, index) => (
                    <tr key={patient.patient_id || `row-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{patient.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{patient.nic}</td>
                      <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{patient.profile?.gender ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{patient.profile?.age ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewTarget(patient)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => { setEditTarget(patient); setModalOpen(true); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(patient)}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Showing {data.data.length} of {data.meta.total} patients</p>
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

      <PatientFormModal open={modalOpen} onOpenChange={setModalOpen} patient={editTarget} />
      <PatientDetailModal open={!!viewTarget} onOpenChange={(o) => { if (!o) setViewTarget(null); }} patient={viewTarget} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        patient={deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.patient_id)}
        isPending={deleteMutation.isPending}
      />
    </DashboardShell>
  );
}
