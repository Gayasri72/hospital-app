"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sessionsService } from "@/lib/api/services/sessions.service";
import { doctorsService } from "@/lib/api/services/doctors.service";
import { branchesService } from "@/lib/api/services/branches.service";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  sessionSchema,
  type SessionFormValues,
} from "@/lib/validators/session.schema";
import type { ChannelSession } from "@/types";

// ── Time helpers ─────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

function parse24h(v: string): { h: string; m: string; period: "AM" | "PM" } {
  if (!v) return { h: "8", m: "00", period: "AM" };
  const [hStr, mStr] = v.split(":");
  const h24 = parseInt(hStr!, 10);
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

// ── TimePicker ────────────────────────────────────────────────────────────────

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [h, setH] = useState(() => parse24h(value).h);
  const [m, setM] = useState(() => parse24h(value).m);
  const [period, setPeriod] = useState<"AM" | "PM">(
    () => parse24h(value).period,
  );

  useEffect(() => {
    const p = parse24h(value);
    setH(p.h);
    setM(p.m);
    setPeriod(p.period);
  }, [value]);

  const commit = (nh: string, nm: string, np: "AM" | "PM") =>
    onChange(to24h(nh, nm, np));

  const selectClass =
    "h-10 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all";

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* Hour Select */}
      <select
        value={h}
        onChange={(e) => {
          setH(e.target.value);
          commit(e.target.value, m, period);
        }}
        className={`${selectClass} min-w-fit flex-1 sm:flex-initial`}
      >
        {HOURS.map((hr) => (
          <option key={hr} value={hr}>
            {hr}
          </option>
        ))}
      </select>

      {/* Colon Separator */}
      <span className="text-gray-400 font-bold text-lg px-0.5 flex-shrink-0">
        :
      </span>

      {/* Minute Select */}
      <select
        value={m}
        onChange={(e) => {
          setM(e.target.value);
          commit(h, e.target.value, period);
        }}
        className={`${selectClass} min-w-fit flex-1 sm:flex-initial`}
      >
        {MINUTES.map((mn) => (
          <option key={mn} value={mn}>
            {mn}
          </option>
        ))}
      </select>

      {/* AM/PM Toggle */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white h-10 shadow-sm flex-shrink-0 ml-auto sm:ml-0">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPeriod(p);
              commit(h, m, p);
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border-r border-gray-300 last:border-r-0"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PatientStepper ────────────────────────────────────────────────────────────

function PatientStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const safe = isNaN(value) || value < 1 ? 1 : value > 100 ? 100 : value;

  const step = (delta: number) => {
    const next = Math.min(100, Math.max(1, safe + delta));
    onChange(next);
  };

  return (
    <div className="flex items-center gap-0 rounded-lg border border-gray-300 overflow-hidden bg-white h-10 w-fit">
      <button
        type="button"
        onClick={() => step(-1)}
        className="w-8 sm:w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors border-r border-gray-300 flex-shrink-0"
      >
        <ChevronDown className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
      </button>
      <input
        type="number"
        min={1}
        max={100}
        value={isNaN(value) ? "" : value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-12 sm:w-16 h-10 text-center text-sm font-semibold text-gray-900 focus:outline-none border-none bg-white"
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="w-8 sm:w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors border-l border-gray-300 flex-shrink-0"
      >
        <ChevronUp className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
      </button>
    </div>
  );
}

// ── FieldError ────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500 font-medium">{message}</p>;
}

// ── SessionFormModal ──────────────────────────────────────────────────────────

interface SessionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: ChannelSession;
}

export function SessionFormModal({
  open,
  onOpenChange,
  session,
}: SessionFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!session;

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", "all"],
    queryFn: () => doctorsService.list({ limit: 100 }).then((r) => r.data),
    enabled: open,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchesService.list,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { start_time: "08:00", end_time: "17:00" },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      session
        ? {
            doctor_id: session.doctor_id,
            branch_id: session.branch_id,
            session_date: session.session_date.slice(0, 10),
            start_time: session.start_time.slice(0, 5),
            end_time: session.end_time.slice(0, 5),
            max_patients: session.max_patients,
          }
        : {
            doctor_id: "",
            branch_id: "",
            session_date: new Date().toISOString().slice(0, 10),
            start_time: "08:00",
            end_time: "17:00",
          },
    );
  }, [open, session?.session_id, reset]);

  const createMutation = useMutation({
    mutationFn: sessionsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session created successfully");
      onOpenChange(false);
      reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SessionFormValues) =>
      sessionsService.update(session!.session_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session updated successfully");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const inputClass =
    "w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all";

  const selectClass =
    "w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col h-auto">
        <DialogTitle className="sr-only">
          {isEdit ? "Edit Session" : "Create Session"}
        </DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Session" : "Create Session"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
              {isEdit
                ? "Update session details"
                : "Schedule a new doctor session"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((v) =>
            isEdit ? updateMutation.mutate(v) : createMutation.mutate(v),
          )}
          className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4"
        >
          {/* Doctor & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Doctor <span className="text-red-500">*</span>
              </label>
              <select {...register("doctor_id")} className={selectClass}>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.doctor_id?.message} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
              </label>
              <select {...register("branch_id")} className={selectClass}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.branch_id?.message} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("session_date")}
              min={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
            <FieldError message={errors.session_date?.message} />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Start Time
                </p>
                <Controller
                  name="start_time"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  End Time
                </p>
                <Controller
                  name="end_time"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            <FieldError message={errors.start_time?.message} />
            <FieldError message={errors.end_time?.message} />
          </div>

          {/* Max Patients */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Max Patients <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 sm:gap-3">
              <Controller
                name="max_patients"
                control={control}
                render={({ field }) => (
                  <PatientStepper
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <span className="text-xs text-gray-500">patients</span>
            </div>
            <FieldError message={errors.max_patients?.message} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 sm:pt-3 border-t border-gray-100 mt-4 sm:mt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 sm:px-6 py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
            >
              {isSubmitting
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
