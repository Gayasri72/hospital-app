"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Building2, MapPin, DollarSign, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/api/services/auth.service";
import { branchesService } from "@/lib/api/services/branches.service";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/store/auth.store";
import type { Branch } from "@/types";

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  location: z.string().max(1000).optional(),
});
type BranchFormValues = z.infer<typeof branchSchema>;

function BranchModal({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}) {
  const qc = useQueryClient();
  const isEdit = !!branch;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: "", location: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset(branch
      ? { name: branch.name, location: branch.location ?? "" }
      : { name: "", location: "" }
    );
  }, [open, branch?.branch_id]);

  const createMutation = useMutation({
    mutationFn: (data: BranchFormValues) =>
      branchesService.create({ name: data.name, location: data.location || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch created");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: BranchFormValues) =>
      branchesService.update(branch!.branch_id, {
        name: data.name,
        location: data.location || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: BranchFormValues) =>
    isEdit ? updateMutation.mutate(data) : createMutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Branch Name *</Label>
            <Input {...register("name")} placeholder="e.g. Main Branch" className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Location</Label>
            <Input {...register("location")} placeholder="e.g. 123 Main St, Colombo" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBranchDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => branchesService.delete(branch!.branch_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{branch?.name}</span>?
          Sessions linked to this branch will lose their branch association.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const hospitalChargeSchema = z.object({
  charge_amount: z.number({ error: "Amount must be a number" }).min(0, "Amount must be 0 or greater"),
  effective_from: z.string().optional(),
});
type HospitalChargeFormValues = z.infer<typeof hospitalChargeSchema>;

function SetHospitalChargeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HospitalChargeFormValues>({
    resolver: zodResolver(hospitalChargeSchema),
    defaultValues: { charge_amount: 0, effective_from: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!open) return;
    reset({ charge_amount: 0, effective_from: new Date().toISOString().slice(0, 10) });
  }, [open]);

  const mutation = useMutation({
    mutationFn: (data: HospitalChargeFormValues) => {
      const today = new Date().toISOString().slice(0, 10);
      const effective_from = data.effective_from === today || !data.effective_from
        ? new Date().toISOString()
        : data.effective_from;
      return doctorsService.setHospitalCharge({ charge_amount: data.charge_amount, effective_from });
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["hospitalCharge"] });
      toast.success("Hospital charge updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Set Hospital Charge</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <p className="text-xs text-gray-500">
            This is the hospital&apos;s service fee added on top of the doctor&apos;s consultation fee for every appointment.
          </p>
          <div>
            <Label>Charge Amount (Rs) *</Label>
            <Input type="number" step="0.01" min="0" {...register("charge_amount", { valueAsNumber: true })} className="mt-1" />
            {errors.charge_amount && <p className="mt-1 text-xs text-red-600">{errors.charge_amount.message}</p>}
          </div>
          <div>
            <Label>Effective From</Label>
            <Input type="date" {...register("effective_from")} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Set Charge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function HospitalsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Branch | undefined>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled: isAuthenticated,
  });

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesService.list(),
    enabled: isAuthenticated,
  });

  const { data: hospitalCharge } = useQuery({
    queryKey: ["hospitalCharge"],
    queryFn: () => doctorsService.getHospitalCharge(),
    enabled: isAuthenticated,
  });

  const isLoading = profileLoading || branchesLoading;

  return (
    <DashboardShell title="Hospital">
      <PageHeader
        title="Hospital"
        description="Manage your hospital details and branches"
        actions={
          <Button
            size="sm"
            onClick={() => { setEditTarget(undefined); setBranchModalOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" />Add Branch
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* Hospital info card */}
          {profile?.hospital && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Hospital</p>
                  <h2 className="text-lg font-bold text-gray-900">{profile.hospital.name}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Hospital ID</p>
                  <p className="font-mono text-xs text-gray-600">{profile.hospital.hospital_id.slice(0, 8)}…</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Branches</p>
                  <p className="font-medium text-gray-800">{branches?.length ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Hospital charge */}
          <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${!hospitalCharge ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white shadow-sm"}`}>
            <div className="flex items-center gap-3 min-w-0">
              {!hospitalCharge
                ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                : <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${!hospitalCharge ? "text-amber-800" : "text-gray-800"}`}>
                  Hospital Service Charge
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {hospitalCharge
                    ? `${formatCurrency(hospitalCharge.charge_amount)} · effective ${formatDate(hospitalCharge.effective_from)}`
                    : "Not configured — appointments cannot be booked until this is set"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={hospitalCharge ? "outline" : "default"}
              onClick={() => setChargeModalOpen(true)}
              className="shrink-0"
            >
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              {hospitalCharge ? "Update Charge" : "Set Charge"}
            </Button>
          </div>

          {/* Branches */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Branches</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditTarget(undefined); setBranchModalOpen(true); }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Branch
              </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {!branches?.length ? (
                <EmptyState
                  icon={Building2}
                  title="No branches yet"
                  description="Add your first branch to start creating sessions."
                  action={
                    <Button size="sm" onClick={() => setBranchModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />Add Branch
                    </Button>
                  }
                />
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Branch Name</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branches.map((branch) => (
                      <tr key={branch.branch_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{branch.name}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {branch.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                              {branch.location}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditTarget(branch); setBranchModalOpen(true); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(branch); setDeleteModalOpen(true); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <BranchModal open={branchModalOpen} onOpenChange={setBranchModalOpen} branch={editTarget} />
      <DeleteBranchDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen} branch={deleteTarget} />
      <SetHospitalChargeModal open={chargeModalOpen} onOpenChange={setChargeModalOpen} />
    </DashboardShell>
  );
}
