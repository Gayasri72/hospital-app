"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { medicalService } from "@/lib/api/services/medical.service";
import { appointmentsService } from "@/lib/api/services/appointments.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate } from "@/lib/utils/format";

const prescriptionSchema = z.object({
  medicine_name: z.string().min(2, "Medicine name must be at least 2 characters"),
  dosage: z.string().min(1, "Required"),
  frequency: z.string().min(1, "Required"),
  duration: z.string().min(1, "Required"),
  instructions: z.string().optional(),
});

const schema = z.object({
  appointment_id: z.string().min(1, "Select an appointment"),
  diagnosis: z.string().min(5, "Diagnosis must be at least 5 characters"),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  prescriptions: z.array(prescriptionSchema),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
}

export function MedicalRecordFormModal({ open, onOpenChange, doctorId }: Props) {
  const qc = useQueryClient();

  const { data: appointments } = useQuery({
    queryKey: ["appointments", { doctor_id: doctorId, status: "completed" }],
    queryFn: () => appointmentsService.list({ doctor_id: doctorId, status: "completed", limit: 100 }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      appointment_id: "",
      diagnosis: "",
      notes: "",
      follow_up_date: "",
      prescriptions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "prescriptions" });

  useEffect(() => {
    if (!open) return;
    reset({
      appointment_id: "",
      diagnosis: "",
      notes: "",
      follow_up_date: "",
      prescriptions: [],
    });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      medicalService.create({
        appointment_id: values.appointment_id,
        diagnosis: values.diagnosis,
        notes: values.notes || undefined,
        follow_up_date: values.follow_up_date || undefined,
        prescriptions: values.prescriptions.length > 0
        ? values.prescriptions.map((p) => ({ ...p, instructions: p.instructions ?? null }))
        : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-records", "doctor", doctorId] });
      toast.success("Medical record saved");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write Medical Record</DialogTitle>
          <DialogDescription>
            Select a completed appointment and fill in the diagnosis, notes, and prescriptions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          {/* Appointment */}
          <div className="space-y-1">
            <Label>Appointment <span className="text-red-500">*</span></Label>
            <select
              {...register("appointment_id")}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select completed appointment…</option>
              {appointments?.data.map((appt) => (
                <option key={appt.appointment_id} value={appt.appointment_id}>
                  {appt.patient?.name ?? "Unknown"} —{" "}
                  {appt.session ? formatDate(appt.session.session_date) : "—"}{" "}
                  (Q#{appt.queue_number})
                </option>
              ))}
            </select>
            {errors.appointment_id && (
              <p className="text-xs text-red-500">{errors.appointment_id.message}</p>
            )}
          </div>

          {/* Diagnosis */}
          <div className="space-y-1">
            <Label>Diagnosis <span className="text-red-500">*</span></Label>
            <textarea
              {...register("diagnosis")}
              rows={3}
              placeholder="Enter diagnosis…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            {errors.diagnosis && (
              <p className="text-xs text-red-500">{errors.diagnosis.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>
              Notes{" "}
              <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Additional notes…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Follow-up date */}
          <div className="space-y-1">
            <Label>
              Follow-up Date{" "}
              <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Input type="date" {...register("follow_up_date")} className="w-44" />
          </div>

          {/* Prescriptions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prescriptions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    medicine_name: "",
                    dosage: "",
                    frequency: "",
                    duration: "",
                    instructions: "",
                  })
                }
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Medicine
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="py-3 text-center text-xs text-gray-400 rounded-lg border border-dashed border-gray-200">
                No prescriptions added
              </p>
            )}

            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Medicine {idx + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(idx)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Medicine Name *</Label>
                    <Input
                      {...register(`prescriptions.${idx}.medicine_name`)}
                      placeholder="e.g. Paracetamol"
                    />
                    {errors.prescriptions?.[idx]?.medicine_name && (
                      <p className="text-xs text-red-500">
                        {errors.prescriptions[idx].medicine_name?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage *</Label>
                    <Input
                      {...register(`prescriptions.${idx}.dosage`)}
                      placeholder="e.g. 500mg"
                    />
                    {errors.prescriptions?.[idx]?.dosage && (
                      <p className="text-xs text-red-500">
                        {errors.prescriptions[idx].dosage?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency *</Label>
                    <Input
                      {...register(`prescriptions.${idx}.frequency`)}
                      placeholder="e.g. Twice daily"
                    />
                    {errors.prescriptions?.[idx]?.frequency && (
                      <p className="text-xs text-red-500">
                        {errors.prescriptions[idx].frequency?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration *</Label>
                    <Input
                      {...register(`prescriptions.${idx}.duration`)}
                      placeholder="e.g. 5 days"
                    />
                    {errors.prescriptions?.[idx]?.duration && (
                      <p className="text-xs text-red-500">
                        {errors.prescriptions[idx].duration?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Instructions{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    {...register(`prescriptions.${idx}.instructions`)}
                    placeholder="e.g. Take after meals"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
