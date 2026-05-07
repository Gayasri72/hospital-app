"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FileText, Plus, Loader2, X, Pill, ClipboardList,
  ChevronDown, ChevronUp, User, Calendar, Check,
  Stethoscope,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import dayjs from "dayjs";

interface Appointment {
  appointment_id: string;
  queue_number: number;
  status: string;
  patient: { patient_id: string; name: string; phone: string; age?: number };
  session: { date: string; start_time: string };
  medical_record?: MedicalRecord;
}

interface MedicalRecord {
  record_id: string;
  disease: string;
  note: string;
  prescriptions: Prescription[];
}

interface Prescription {
  id: string;
  medicine_name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const STATUS_STYLES: Record<string, string> = {
  Booked:    "bg-blue-100 text-blue-700",
  Confirmed: "bg-indigo-100 text-indigo-700",
  Arrived:   "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-gray-100 text-gray-600",
};

// ─── Medical Record Form ──────────────────────────────────
function MedicalRecordForm({ appointment, onSaved, onClose }: {
  appointment: Appointment;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    diagnosis: appointment.medical_record?.disease ?? "",
    notes:     appointment.medical_record?.note ?? "",
  });
  const [prescriptions, setPrescriptions] = useState<Omit<Prescription, "id">[]>(
    appointment.medical_record?.prescriptions?.map((p) => ({
      medicine_name: p.medicine_name, dose: p.dose, frequency: p.frequency, duration: p.duration, instructions: p.instructions,
    })) ?? [{ medicine_name: "", dose: "", frequency: "", duration: "", instructions: "" }]
  );
  const [loading, setLoading] = useState(false);
  const isEdit = !!appointment.medical_record;

  function addPrescription() {
    setPrescriptions((p) => [...p, { medicine_name: "", dose: "", frequency: "", duration: "", instructions: "" }]);
  }
  function removePrescription(i: number) {
    setPrescriptions((p) => p.filter((_, idx) => idx !== i));
  }
  function updatePrescription(i: number, field: string, value: string) {
    setPrescriptions((p) => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        appointment_id: appointment.appointment_id,
        prescriptions: prescriptions.filter((p) => p.medicine_name?.trim()),
      };
      if (isEdit) {
        await api.put(`medical-records/${appointment.medical_record!.record_id}/`, payload);
      } else {
        await api.post("medical-records/", payload);
        // Mark appointment as completed
        await api.patch(`appointments/${appointment.appointment_id}/status/`, { status: "Completed" }).catch(() => {});
      }
      toast.success(isEdit ? "Record updated!" : "Medical record saved!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl animate-slide-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Medical Record" : "Add Medical Record"}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Patient: {appointment.patient.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Disease */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Diagnosis / Disease <span className="text-red-500">*</span></label>
            <input type="text" required value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              placeholder="e.g. Hypertension, Type 2 Diabetes"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Clinical Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add examination findings, observations, instructions…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" />
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-500" /> Prescriptions
              </label>
              <button type="button" onClick={addPrescription}
                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
                <Plus className="w-3.5 h-3.5" /> Add medicine
              </button>
            </div>
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="col-span-4">
                    <label className="text-xs text-gray-500 mb-1 block">Medicine</label>
                    <input type="text" value={p.medicine_name} onChange={(e) => updatePrescription(i, "medicine_name", e.target.value)}
                      placeholder="e.g. Metformin"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
                    <input type="text" value={p.dose} onChange={(e) => updatePrescription(i, "dose", e.target.value)}
                      placeholder="500mg"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                    <input type="text" value={p.frequency} onChange={(e) => updatePrescription(i, "frequency", e.target.value)}
                      placeholder="3x daily"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Instructions</label>
                    <input type="text" value={p.instructions} onChange={(e) => updatePrescription(i, "instructions", e.target.value)}
                      placeholder="After meals"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                    <input type="text" value={p.duration} onChange={(e) => updatePrescription(i, "duration", e.target.value)}
                      placeholder="5 days"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    {prescriptions.length > 1 && (
                      <button type="button" onClick={() => removePrescription(i)}
                        className="p-1 text-gray-400 hover:text-red-500 transition">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                         text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Check className="w-4 h-4" />Save Record</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Appointment Row ──────────────────────────────────────
function AppointmentRow({ apt, onRecord, onRefresh }: {
  apt: Appointment;
  onRecord: (a: Appointment) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasRecord = !!apt.medical_record;

  async function updateStatus(status: string) {
    try {
      await api.patch(`appointments/${apt.appointment_id}/status/`, { status });
      toast.success(`Status updated to ${status}`);
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
        onClick={() => setExpanded((e) => !e)}>
        {/* Queue number */}
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm flex-shrink-0">
          #{apt.queue_number}
        </div>
        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{apt.patient.name}</div>
          <div className="text-xs text-gray-500">{apt.patient.phone} {apt.patient.age ? `· ${apt.patient.age} yrs` : ""}</div>
        </div>
        {/* Status */}
        <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0", STATUS_STYLES[apt.status] ?? "bg-gray-100 text-gray-600")}>
          {apt.status}
        </span>
        {/* Record indicator */}
        {hasRecord && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-medium flex-shrink-0">
            Record ✓
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 animate-fade-in">
          {/* Status actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["Arrived", "Completed", "No Show", "Cancelled"].map((s) => (
              <button key={s} onClick={() => updateStatus(s)} disabled={apt.status === s}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  apt.status === s ? "opacity-40 cursor-not-allowed " + (STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600")
                                   : "border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                → {s}
              </button>
            ))}
          </div>

          {/* Medical record preview */}
          {hasRecord && apt.medical_record && (
            <div className="bg-blue-50/60 dark:bg-blue-900/10 rounded-xl p-3 mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">Diagnosis</div>
              <div className="text-sm text-gray-900 font-medium">{apt.medical_record.disease}</div>
              {apt.medical_record.note && (
                <div className="text-xs text-gray-500 mt-1">{apt.medical_record.note}</div>
              )}
              {apt.medical_record.prescriptions?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Prescriptions</div>
                  {apt.medical_record.prescriptions.map((p, i) => (
                    <div key={i} className="text-xs text-gray-600">
                      • {p.medicine_name} {p.dose} — {p.instructions}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => onRecord(apt)}
            className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
              hasRecord ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                        : "bg-blue-600 hover:bg-blue-700 text-white")}>
            <FileText className="w-4 h-4" />
            {hasRecord ? "Edit Record" : "Add Medical Record"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function MedicalRecordsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(["Super Admin", "Hospital Admin", "Doctor"]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
  const [recordTarget, setRecordTarget] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (dateFilter) params.date = dateFilter;
      // If doctor, only fetch their appointments
      const res = await api.get("appointments/", { params });
      setAppointments(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { if (user) fetchAppointments(); }, [user, fetchAppointments]);
  if (authLoading) return null;

  const stats = {
    total:     appointments.length,
    arrived:   appointments.filter((a) => a.status === "Arrived").length,
    completed: appointments.filter((a) => a.status === "Completed").length,
    withRecord:appointments.filter((a) => a.medical_record).length,
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-500 text-sm mt-1">Doctor portal — manage appointments and patient records</p>
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-600
                     focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Today",  value: stats.total,      color: "text-gray-900",  bg: "bg-white dark:bg-gray-900" },
          { label: "Arrived",      value: stats.arrived,    color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "Completed",    value: stats.completed,  color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Records Added",value: stats.withRecord, color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border border-gray-100 dark:border-gray-800 p-4", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Appointments list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-400">
          <Stethoscope className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No appointments for this date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentRow key={apt.appointment_id} apt={apt}
              onRecord={(a) => setRecordTarget(a)}
              onRefresh={fetchAppointments} />
          ))}
        </div>
      )}

      {recordTarget && (
        <MedicalRecordForm appointment={recordTarget}
          onClose={() => setRecordTarget(null)}
          onSaved={fetchAppointments} />
      )}
    </div>
  );
}