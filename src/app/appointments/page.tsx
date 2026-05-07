"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, Search, Loader2, X, Calendar, Clock,
  User, Stethoscope, Hash, ChevronLeft, ChevronRight, Filter,
  Eye, Pencil, Trash2, CreditCard
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import dayjs from "dayjs";

interface Appointment {
  appointment_id: string;
  queue_number: number;
  status: "Booked" | "Confirmed" | "Arrived" | "Completed" | "Cancelled" | "No Show";
  created_at: string;
  patient: { patient_id: string; name: string; phone: string };
  doctor: { doctor_id: string; name: string; specialization: string; consultation_fee?: number };
  session: { session_id: string; date: string; start_time: string; end_time: string };
}

interface Patient { patient_id: string; name: string; nic: string; phone: string; }
interface Doctor  { 
  doctor_id: string; 
  id?: string;
  name: string; 
  specialization: string; 
  consultation_fee?: number; 
}
interface Session {
  session_id: string; date: string; start_time: string;
  end_time: string; max_patients: number; booked_count: number; status: string;
  doctor: { name: string };
}

function getDeletedDoctorIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("doctor_deleted_ids") || "[]")); }
  catch { return new Set(); }
}
function getDeletedPatientIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("patient_deleted_ids") || "[]")); }
  catch { return new Set(); }
}

const STATUS_STYLES: Record<string, string> = {
  Booked:    "bg-blue-100 text-blue-700",
  Confirmed: "bg-indigo-100 text-indigo-700",
  Arrived:   "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-gray-100 text-gray-600",
};

const ALL_STATUSES = ["Booked", "Confirmed", "Arrived", "Completed", "Cancelled", "No Show"];

// ─── Create Appointment Modal ─────────────────────────────
function CreateAppointmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void; }) {
  const [step, setStep] = useState(1); // 1=patient, 2=doctor, 3=session
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors]   = useState<Doctor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch,  setDoctorSearch]  = useState("");

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor,  setSelectedDoctor]  = useState<Doctor | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Load patients
  useEffect(() => {
    api.get("patients", { params: { search: patientSearch, limit: 20 } })
      .then((r) => {
        const deletedIds = getDeletedPatientIds();
        setPatients(r.data.data.filter((p: Patient) => !deletedIds.has(p.patient_id)));
      }).catch(() => {});
  }, [patientSearch]);

  // Load doctors
  useEffect(() => {
    if (step >= 2) {
      api.get("doctors", { params: { search: doctorSearch, limit: 20 } })
        .then((r) => {
          const deletedIds = getDeletedDoctorIds();
          const feeCache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
          const filtered = r.data.data
            .filter((d: any) => !deletedIds.has(d.doctor_id))
            .map((d: any) => ({
              ...d,
              consultation_fee: feeCache[d.doctor_id] ?? d.consultation_fee ?? 0
            }));
          setDoctors(filtered);
        }).catch(() => {});
    }
  }, [step, doctorSearch]);

  // Load sessions for selected doctor
  const [sessionsLoading, setSessionsLoading] = useState(false);
  useEffect(() => {
    if (step === 3 && selectedDoctor) {
      setSessionsLoading(true);
      // Fetch sessions using exact same params as main Sessions page
      api.get("sessions", {
        params: { limit: 100 }
      }).then((r) => {
        const allSessions = r.data.data || [];
        // Filter by doctor (extremely robust matching)
        const filtered = allSessions.filter((s: any) => {
          const docId = s.doctor_id || s.doctor?.doctor_id || s.doctor?.id || s.id;
          const selectedId = selectedDoctor.doctor_id || selectedDoctor.id;
          
          if (docId && selectedId && String(docId) === String(selectedId)) return true;
          
          // Fallback: match by doctor name (stripping "Dr. " prefix if needed)
          const normalize = (n: string) => n?.toLowerCase().replace(/^dr\.\s*/, "").trim();
          const docName = normalize(s.doctor_name || s.doctor?.name);
          const selectedName = normalize(selectedDoctor.name);
          
          if (docName && selectedName && docName === selectedName) return true;
          
          return false;
        }).map((s: any) => ({
          ...s,
          date: s.session_date || s.date // Ensure date field is present for rendering
        }));
        setSessions(filtered);
      }).catch(() => {
        setSessions([]);
      }).finally(() => {
        setSessionsLoading(false);
      });
    }
  }, [step, selectedDoctor]);

  async function handleCreate() {
    if (!selectedPatient || !selectedDoctor || !selectedSession) return;
    setLoading(true);
    try {
      await api.post("appointments/", {
        patient_id: selectedPatient.patient_id,
        doctor_id:  selectedDoctor.doctor_id,
        session_id: selectedSession.session_id,
      });
      toast.success(`Appointment booked! Queue #${selectedSession.booked_count + 1}`);
      onSaved(); onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    step >= s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                    {s}
                  </div>
                  {s < 3 && <div className={cn("w-8 h-0.5", step > s ? "bg-blue-600" : "bg-gray-100")} />}
                </div>
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {step === 1 ? "Select Patient" : step === 2 ? "Select Doctor" : "Select Session"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Step 1: Patient */}
          {step === 1 && (
            <>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search patient by name or NIC…"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              {patients.map((p) => (
                <button key={p.patient_id} onClick={() => { setSelectedPatient(p); setStep(2); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.nic} · {p.phone}</div>
                  </div>
                </button>
              ))}
              {patients.length === 0 && (
                <p className="text-sm text-center text-gray-400 py-4">No patients found</p>
              )}
            </>
          )}

          {/* Step 2: Doctor */}
          {step === 2 && (
            <>
              {selectedPatient && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">{selectedPatient.name}</span>
                  <button onClick={() => { setSelectedPatient(null); setStep(1); }} className="ml-auto text-green-500 hover:text-green-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctor by name or specialization…"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              {doctors.map((d) => (
                <button key={d.doctor_id} onClick={() => { setSelectedDoctor(d); setStep(3); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm flex-shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-blue-600">{d.specialization}</div>
                      <div className="text-xs font-bold text-gray-700">
                        {d.consultation_fee ? `Rs ${d.consultation_fee.toLocaleString()}` : "Fee not set"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Step 3: Session */}
          {step === 3 && (
            <>
              {selectedDoctor && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">{selectedDoctor.name}</span>
                  <button onClick={() => { setSelectedDoctor(null); setStep(2); }} className="ml-auto text-green-500 hover:text-green-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {sessionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs text-gray-400 font-medium font-sans">Connecting to sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-center text-gray-400 py-4">No open sessions available for this doctor</p>
              ) : sessions.map((s) => {
                const isFull = s.booked_count >= s.max_patients;
                return (
                  <button key={s.session_id} disabled={isFull}
                    onClick={() => setSelectedSession(selectedSession?.session_id === s.session_id ? null : s)}
                    className={cn("w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                      selectedSession?.session_id === s.session_id
                        ? "border-blue-400 bg-blue-50"
                        : isFull ? "border-gray-100 opacity-50 cursor-not-allowed"
                        : "border-gray-100 hover:border-blue-300 hover:bg-blue-50")}>
                    <div className="bg-blue-50 rounded-lg p-2 flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {dayjs(s.date).format("ddd, MMM D YYYY")}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.start_time} – {s.end_time} · {s.booked_count}/{s.max_patients} booked
                      </div>
                    </div>
                    {isFull && <span className="text-xs text-orange-600 font-medium">Full</span>}
                    {selectedSession?.session_id === s.session_id && (
                      <span className="text-xs text-blue-600 font-medium">Selected</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer — only show confirm on step 3 */}
        {step === 3 && selectedSession && (
          <div className="p-6 border-t border-gray-100 flex-shrink-0">
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Patient</span><span className="font-medium text-gray-900">{selectedPatient?.name}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Doctor</span><span className="font-medium text-gray-900">{selectedDoctor?.name}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Date</span><span className="font-medium text-gray-900">{dayjs(selectedSession.date).format("MMM D, YYYY")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Time</span><span className="font-medium text-gray-900">{selectedSession.start_time} – {selectedSession.end_time}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Consultation Fee</span><span className="font-bold text-teal-600">Rs {selectedDoctor?.consultation_fee?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Queue #</span><span className="font-bold text-blue-600">#{selectedSession.booked_count + 1}</span>
              </div>
            </div>
            <button onClick={handleCreate} disabled={loading}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                         text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Booking…</> : <>Confirm Appointment</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Appointment Modal ────────────────────────────────
function EditAppointmentModal({ appointment, onClose, onSaved }: { 
  appointment: Appointment; 
  onClose: () => void; 
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(appointment.status);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`appointments/${appointment.appointment_id}/status`, { status });
      toast.success("Appointment updated successfully");
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Appointment</h2>
            <p className="text-sm text-gray-500 mt-0.5">#{appointment.appointment_id} · {appointment.patient.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="bg-blue-50/50 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span className="font-semibold text-gray-900">{appointment.doctor.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-900">{dayjs(appointment.session.date).format("MMM D, YYYY")}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-semibold text-gray-900">{appointment.session.start_time}</span></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // Show all by default
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter.toLowerCase();
      if (dateFilter) params.date = dateFilter;
      
      const res = await api.get("appointments/", { params });
      
      const feeCache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
      const normalized = res.data.data.map((a: any) => {
        // Find matching status from our list to ensure correct styling
        const statusMatch = ALL_STATUSES.find(s => s.toLowerCase() === a.status?.toLowerCase()) || a.status;
        return { 
          ...a, 
          status: statusMatch,
          doctor: {
            ...a.doctor,
            consultation_fee: feeCache[a.doctor?.doctor_id] ?? a.doctor?.consultation_fee ?? 0
          }
        };
      });

      setAppointments(normalized);
      setMeta(res.data.meta ?? { total: res.data.data.length, page: 1, limit: 20 });
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, page]);

  useEffect(() => { if (user) fetchAppointments(); }, [user, fetchAppointments]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateFilter]);

  const totalPages = Math.ceil(meta.total / meta.limit);
  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await api.delete(`appointments/${id}`);
      toast.success("Appointment deleted");
      fetchAppointments();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setAppointments(prev => prev.filter(a => a.appointment_id !== id));
        toast.success("Appointment deleted (Mocked)");
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  }

  async function handleStatusChange(id: string, newStatus: string, apt: Appointment) {
    try {
      await api.patch(`appointments/${id}/status/`, { status: newStatus.toLowerCase() });
      toast.success(`Status updated to ${newStatus}`);
      
      // Auto-create payment if completed
      if (newStatus === "Completed" && apt.status !== "Completed") {
        try {
          const feeCache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
          const doctorFee = Number(feeCache[apt.doctor.doctor_id]) || 0;
          await api.post("payments/", {
            appointment_id: id,
            doctor_fee: doctorFee,
            total_amount: doctorFee + 2500
          });
          toast.success("Payment invoice automatically generated!");
        } catch (paymentErr) {
          console.error("Failed to generate payment:", paymentErr);
          toast.error("Status updated, but payment generation failed.");
        }
      }
      fetchAppointments();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setAppointments(prev => prev.map(a => a.appointment_id === id ? { ...a, status: newStatus as any } : a));
        toast.success(`Status updated to ${newStatus} (Mocked)`);
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  }

  if (authLoading) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {dateFilter ? `${dayjs(dateFilter).format("MMMM D, YYYY")}` : "All appointments"}
            {meta.total > 0 ? ` · ${meta.total} total` : ""}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                     text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setStatusFilter("")}
          className={cn("px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
            statusFilter === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "" : s)}
            className={cn("px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
              statusFilter === s ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {s}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-600
                     focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
        {dateFilter && (
          <button onClick={() => setDateFilter("")}
            className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Clear date
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-56">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No appointments found</p>
            <button onClick={() => { setSearch(""); setStatusFilter(""); }}
              className="text-xs text-blue-500 hover:underline mt-1">Clear filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Queue</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((apt) => (
                  <tr key={apt.appointment_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
                        #{apt.queue_number}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push(`/patients/${apt.patient.patient_id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left transition-colors">
                        {apt.patient.name}
                      </button>
                      <div className="text-xs text-gray-400">{apt.patient.phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push(`/doctors/${apt.doctor.doctor_id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left transition-colors">
                        {apt.doctor.name}
                      </button>
                      <div className="text-xs text-blue-600 flex items-center gap-1">
                        <span className="cursor-pointer hover:underline" onClick={() => router.push(`/doctors/${apt.doctor.doctor_id}`)}>
                          {apt.doctor.specialization}
                        </span>
                        {apt.doctor.consultation_fee ? (
                          <span className="text-gray-400">· Rs {apt.doctor.consultation_fee.toLocaleString()}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {dayjs(apt.session.date).format("MMM D, YYYY")}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {apt.session.start_time}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <select 
                        value={apt.status} 
                        onChange={(e) => handleStatusChange(apt.appointment_id, e.target.value, apt)}
                        className={cn("text-xs px-2.5 py-1 rounded-lg font-medium outline-none border-none cursor-pointer", STATUS_STYLES[apt.status] ?? "bg-gray-100 text-gray-600")}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {apt.status === "Completed" && (
                          <button onClick={() => router.push(`/payments?search=${apt.appointment_id}`)}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition" title="View/Process Payment">
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => router.push(`/patients/${apt.patient.patient_id}`)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="View Patient">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditTarget(apt)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(apt.appointment_id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <CreateAppointmentModal onClose={() => setModalOpen(false)} onSaved={fetchAppointments} />}
      {editTarget && <EditAppointmentModal appointment={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchAppointments} />}
    </div>
  );
}