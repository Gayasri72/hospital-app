"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, Phone, Mail, Stethoscope, Pencil, DollarSign, Calendar } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_MANAGE_DOCTORS } from "@/config/roles";

const selfEditSchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  specialization: z.string().min(1, "Specialization is required").max(255),
  qualifications: z.string().max(500).optional().or(z.literal("")),
  experience: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
});
type SelfEditValues = z.infer<typeof selfEditSchema>;

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        {label}
      </div>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_DOCTORS);
  const isSelf = user?.doctor_id === id;
  const canEdit = canManage || isSelf;

  const [editOpen, setEditOpen] = useState(false);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctors", id],
    queryFn: () => doctorsService.get(id),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SelfEditValues>({
    resolver: zodResolver(selfEditSchema),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SelfEditValues) => doctorsService.update(id, {
      name: data.name,
      specialization: data.specialization,
      qualifications: data.qualifications || undefined,
      experience: data.experience || undefined,
      bio: data.bio || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors", id] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Profile updated");
      setEditOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openEdit() {
    if (!doctor) return;
    reset({
      name: doctor.name,
      specialization: doctor.specialization,
      qualifications: doctor.profile?.qualifications ?? "",
      experience: doctor.profile?.experience ?? "",
      bio: doctor.profile?.bio ?? "",
    });
    setEditOpen(true);
  }

  return (
    <DashboardShell title="Doctor Profile">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {canEdit && doctor && (
          <Button size="sm" onClick={openEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" />Edit Profile
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !doctor ? (
        <p className="text-gray-500">Doctor not found.</p>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Hero */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-indigo-500 via-blue-600 to-blue-700" />
            <div className="px-6 pb-5">
              <div className="flex items-end justify-between -mt-8 mb-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-100 ring-4 ring-white shadow">
                  <Stethoscope className="h-8 w-8 text-indigo-600" />
                </div>
                <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${doctor.status === "active" ? "bg-green-100 text-green-700 ring-green-200" : "bg-gray-100 text-gray-500 ring-gray-200"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${doctor.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                  {doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Dr. {doctor.name}</h1>
              <p className="text-indigo-600 font-medium">{doctor.specialization}</p>
              {doctor.profile?.qualifications && (
                <p className="mt-0.5 text-sm text-gray-500">{doctor.profile.qualifications}</p>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</p>
              <InfoRow
                icon={Phone}
                label="Phone"
                value={doctor.profile?.contact_number ?? <span className="text-gray-400">—</span>}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={doctor.profile?.email ?? <span className="text-gray-400">—</span>}
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Practice</p>
              <InfoRow
                icon={DollarSign}
                label="Consultation Fee"
                value={
                  doctor.currentFee
                    ? formatCurrency(doctor.currentFee.consultation_fee)
                    : <span className="text-amber-600">Not set</span>
                }
              />
              {doctor.currentFee && (
                <InfoRow
                  icon={Calendar}
                  label="Fee since"
                  value={formatDate(doctor.currentFee.effective_from)}
                />
              )}
              <InfoRow
                icon={Calendar}
                label="Experience"
                value={doctor.profile?.experience ?? <span className="text-gray-400">—</span>}
              />
            </div>
          </div>

          {/* Bio */}
          {doctor.profile?.bio && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">About</p>
              <p className="text-sm text-gray-600 leading-relaxed">{doctor.profile.bio}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit dialog — fields doctors can update themselves */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Doctor Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
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
            <div>
              <Label>Qualifications</Label>
              <Input {...register("qualifications")} placeholder="e.g. MBBS, MD" className="mt-1" />
            </div>
            <div>
              <Label>Experience</Label>
              <Input {...register("experience")} placeholder="e.g. 10 years" className="mt-1" />
            </div>
            <div>
              <Label>Bio</Label>
              <textarea
                {...register("bio")}
                rows={3}
                placeholder="Brief professional summary…"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
