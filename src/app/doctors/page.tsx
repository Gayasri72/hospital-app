"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Stethoscope, DollarSign } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { doctorSchema, doctorFeeSchema, type DoctorFormValues, type DoctorFeeFormValues } from "@/lib/validators/doctor.schema";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_MANAGE_DOCTORS } from "@/config/roles";
import type { Doctor } from "@/types";

function DoctorFormModal({
  open, onOpenChange, doctor,
}: { open: boolean; onOpenChange: (open: boolean) => void; doctor?: Doctor }) {
  const qc = useQueryClient();
  const isEdit = !!doctor;

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { consultation_fee: 0, create_login: false },
  });

  useEffect(() => {
    if (!open) return;
    reset(doctor ? {
      name: doctor.name,
      specialization: doctor.specialization,
      contact_number: doctor.profile?.contact_number ?? "",
      email: doctor.profile?.email ?? "",
      qualifications: doctor.profile?.qualifications ?? "",
      experience: doctor.profile?.experience ?? "",
      bio: doctor.profile?.bio ?? "",
      consultation_fee: doctor.currentFee ? parseFloat(doctor.currentFee.consultation_fee) : 0,
      create_login: false,
    } : { consultation_fee: 0, create_login: false, name: "", specialization: "", contact_number: "", email: "", qualifications: "", experience: "", bio: "" });
  }, [open, doctor?.doctor_id]);

  const createLogin = watch("create_login");
  const profileEmail = watch("email");

  const createMutation = useMutation({
    mutationFn: doctorsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctors"] }); toast.success("Doctor created"); onOpenChange(false); reset(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: DoctorFormValues) => doctorsService.update(doctor!.doctor_id, {
      name: data.name,
      specialization: data.specialization,
      contact_number: data.contact_number || undefined,
      email: data.email || undefined,
      qualifications: data.qualifications || undefined,
      experience: data.experience || undefined,
      bio: data.bio || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctors"] }); toast.success("Doctor updated"); onOpenChange(false); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => isEdit ? updateMutation.mutate(v as unknown as DoctorFormValues) : createMutation.mutate(v as unknown as DoctorFormValues))} className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input {...register("name")} className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Specialization *</Label>
            <Input {...register("specialization")} className="mt-1" />
            {errors.specialization && <p className="mt-1 text-xs text-red-600">{errors.specialization.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Number</Label>
              <Input {...register("contact_number")} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" {...register("email")} className="mt-1" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>
          <div>
            <Label>Qualifications</Label>
            <Input {...register("qualifications")} className="mt-1" />
          </div>
          <div>
            <Label>Experience</Label>
            <Input {...register("experience")} placeholder="e.g. 10 years" className="mt-1" />
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Consultation Fee (Rs) *</Label>
                <Input type="number" step="0.01" min="0" {...register("consultation_fee", { valueAsNumber: true })} className="mt-1" />
                {errors.consultation_fee && <p className="mt-1 text-xs text-red-600">{errors.consultation_fee.message}</p>}
              </div>
              <div>
                <Label>Effective From</Label>
                <Input type="date" {...register("effective_from")} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label>Bio</Label>
            <textarea {...register("bio")} rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {!isEdit && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("create_login")}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Create login account</p>
                  <p className="text-xs text-gray-500">Allow this doctor to log in to the system</p>
                </div>
              </label>
              {createLogin && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label>Login Email *</Label>
                    <Input
                      type="email"
                      {...register("login_email")}
                      className="mt-1"
                      placeholder={profileEmail || "doctor@example.com"}
                    />
                    {errors.login_email && <p className="mt-1 text-xs text-red-600">{errors.login_email.message}</p>}
                  </div>
                  <div>
                    <Label>Password * <span className="text-xs font-normal text-gray-400">(min 6 characters)</span></Label>
                    <Input type="password" {...register("login_password")} className="mt-1" />
                    {errors.login_password && <p className="mt-1 text-xs text-red-600">{errors.login_password.message}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SetFeeModal({ open, onOpenChange, doctor }: { open: boolean; onOpenChange: (open: boolean) => void; doctor?: Doctor }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DoctorFeeFormValues>({
    resolver: zodResolver(doctorFeeSchema),
    defaultValues: { consultation_fee: 0, effective_from: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      consultation_fee: doctor?.currentFee ? parseFloat(doctor.currentFee.consultation_fee) : 0,
      effective_from: new Date().toISOString().slice(0, 10),
    });
  }, [open, doctor?.doctor_id]);

  const setFeeMutation = useMutation({
    mutationFn: (data: DoctorFeeFormValues) => {
      const today = new Date().toISOString().slice(0, 10);
      // When the user picks today, send the full current datetime so the backend
      // stores it with the exact current time — not midnight. This ensures the new
      // fee sorts AFTER the initial 0-fee record (which was also created with a
      // full datetime, not midnight) in the ORDER BY effective_from DESC query.
      const effective_from = data.effective_from === today
        ? new Date().toISOString()
        : data.effective_from;
      return doctorsService.setFee(doctor!.doctor_id, {
        consultation_fee: data.consultation_fee,
        effective_from,
      });
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["doctors"] });
      toast.success("Fee updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Set Consultation Fee</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => setFeeMutation.mutate(v))} className="space-y-4">
          <div>
            <Label>Fee Amount (Rs) *</Label>
            <Input type="number" step="0.01" min="0" {...register("consultation_fee", { valueAsNumber: true })} className="mt-1" />
            {errors.consultation_fee && <p className="mt-1 text-xs text-red-600">{errors.consultation_fee.message}</p>}
          </div>
          <div>
            <Label>Effective From *</Label>
            <Input type="date" {...register("effective_from")} className="mt-1" />
            {errors.effective_from && <p className="mt-1 text-xs text-red-600">{errors.effective_from.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Set Fee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DoctorsPage() {
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_DOCTORS);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const [modalOpen, setModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Doctor | undefined>();
  const [feeTarget, setFeeTarget] = useState<Doctor | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", { search: debouncedSearch, page }],
    queryFn: () => doctorsService.list({ search: debouncedSearch, page, limit: 15 }),
  });

  return (
    <DashboardShell title="Doctors">
      <PageHeader
        title="Doctors"
        description="Manage doctor profiles and fees"
        actions={canManage ? (
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }} size="sm">
            <Plus className="mr-2 h-4 w-4" />Add Doctor
          </Button>
        ) : undefined}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Search doctors…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={Stethoscope} title="No doctors found"
            description={search ? "Try adjusting your search." : "Add your first doctor to get started."}
            action={canManage ? <Button onClick={() => setModalOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Add Doctor</Button> : undefined} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Current Fee</th>
                    <th className="px-4 py-3">Fee Since</th>
                    {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((doctor, index) => (
                    <tr key={doctor.doctor_id || `row-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">Dr. {doctor.name}</td>
                      <td className="px-4 py-3 text-gray-600">{doctor.specialization}</td>
                      <td className="px-4 py-3 text-gray-600">{doctor.profile?.contact_number ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {doctor.currentFee
                          ? formatCurrency(doctor.currentFee.consultation_fee)
                          : <span className="text-amber-600 text-xs">Not set</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {doctor.currentFee ? formatDate(doctor.currentFee.effective_from) : "—"}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setFeeTarget(doctor); setFeeModalOpen(true); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Set fee">
                              <DollarSign className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setEditTarget(doctor); setModalOpen(true); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Showing {data.data.length} of {data.meta.total} doctors</p>
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

      <DoctorFormModal open={modalOpen} onOpenChange={setModalOpen} doctor={editTarget} />
      <SetFeeModal open={feeModalOpen} onOpenChange={setFeeModalOpen} doctor={feeTarget} />
    </DashboardShell>
  );
}
