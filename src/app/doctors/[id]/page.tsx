"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, Loader2, Phone, Mail, Stethoscope, CreditCard,
  Pencil, X, Check, CheckCircle2, XCircle, Calendar, Clock, Users, Trash2
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import dayjs from "dayjs";

interface Doctor {
  doctor_id: string;
  name: string;
  specialization: string;
  phone: string;
  email?: string;
  consultation_fee: number;
  status: "Active" | "Inactive";
  profile?: {
    contact_number?: string;
    email?: string;
    qualifications?: string;
    experience?: string;
    bio?: string;
  };
}

interface Availability {
  availability_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Exception {
  exception_id: string;
  exception_date: string;
  reason?: string;
}

interface Session {
  session_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_patients: number;
  booked_count: number;
  status: string;
}

interface Appointment {
  appointment_id: string;
  queue_number: number;
  status: string;
  patient: { patient_id: string; name: string; phone: string };
  session: { date: string; start_time: string };
}

// ── localStorage helpers ────────────────────────────────────
const FEE_CACHE_KEY = "doctor_fees_cache";
function getCachedFees(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(FEE_CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function cacheFee(doctorId: string, fee: number) {
  const cache = getCachedFees();
  cache[doctorId] = fee;
  localStorage.setItem(FEE_CACHE_KEY, JSON.stringify(cache));
}
export function getCachedFee(doctorId: string): number {
  return getCachedFees()[doctorId] ?? 0;
}

const SESSION_STATUS: Record<string, string> = {
  Open:      "bg-green-100 text-green-700",
  Full:      "bg-orange-100 text-orange-700",
  Closed:    "bg-gray-100 text-gray-600",
  Completed: "bg-blue-100 text-blue-700",
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

export default function DoctorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const doctorId = params.id as string;
  const isEditingInitial = searchParams?.get("edit") === "true";

  const { isLoading: authLoading } = useRequireAuth();

  const [activeTab, setActiveTab] = useState<"profile" | "sessions" | "appointments" | "availability" | "exceptions">("profile");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isEditingInitial);
  const [editForm, setEditForm] = useState<Partial<Doctor>>({});
  const [saving, setSaving] = useState(false);

  // Load doctor profile
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`doctors/${doctorId}`);
        const d = res.data.data;
        const cachedFee = getCachedFee(doctorId);
        const merged = { 
          ...d, 
          phone: d.contact_number || d.phone, // Map backend field to frontend
          status: d.status?.toLowerCase() === "active" ? "Active" : "Inactive",
          consultation_fee: cachedFee || d.consultation_fee || 0 
        };
        setDoctor(merged);
        setEditForm(merged);
      } catch (err) {
        toast.error(getErrorMessage(err));
        router.push("/doctors");
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
  }, [doctorId, authLoading, router]);

  // Load sessions when Sessions tab is clicked
  useEffect(() => {
    if (activeTab !== "sessions") return;
    setSessionsLoading(true);
    api.get("sessions", { params: { doctor_id: doctorId, limit: 50 } })
      .then(r => setSessions(r.data.data))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [activeTab, doctorId]);

  // Load appointments when Appointments tab is clicked
  useEffect(() => {
    if (activeTab !== "appointments") return;
    setAppointmentsLoading(true);
    api.get("appointments", { params: { doctor_id: doctorId, limit: 50 } })
      .then(r => setAppointments(r.data.data))
      .catch(() => setAppointments([]))
      .finally(() => setAppointmentsLoading(false));
  }, [activeTab, doctorId]);

  // Load availability when Availability tab is clicked
  useEffect(() => {
    if (activeTab !== "availability") return;
    setAvailabilityLoading(true);
    api.get(`doctors/${doctorId}/availability`)
      .then(r => setAvailability(r.data.data))
      .catch(() => setAvailability([]))
      .finally(() => setAvailabilityLoading(false));
  }, [activeTab, doctorId]);

  // Load exceptions when Exceptions tab is clicked
  useEffect(() => {
    if (activeTab !== "exceptions") return;
    setExceptionsLoading(true);
    api.get(`doctors/${doctorId}/exceptions`)
      .then(r => setExceptions(r.data.data))
      .catch(() => setExceptions([]))
      .finally(() => setExceptionsLoading(false));
  }, [activeTab, doctorId]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        specialization: editForm.specialization,
        status: editForm.status?.toLowerCase(),
        consultation_fee: Number(editForm.consultation_fee),
        contact_number: editForm.phone, // Backend expects contact_number
        email: editForm.email,
        qualifications: editForm.profile?.qualifications,
        experience: editForm.profile?.experience,
        bio: editForm.profile?.bio,
        effective_from: dayjs().format("YYYY-MM-DD") // Backend often requires this for fee-related updates
      };
      
      const res = await api.put(`doctors/${doctorId}`, payload);
      cacheFee(doctorId, payload.consultation_fee);
      
      // Re-fetch to confirm update
      const updatedRes = await api.get(`doctors/${doctorId}`);
      const updatedDoc = updatedRes.data.data;
      const merged = { 
        ...updatedDoc, 
        phone: updatedDoc.contact_number || updatedDoc.phone,
        status: updatedDoc.status?.toLowerCase() === "active" ? "Active" : "Inactive",
        consultation_fee: payload.consultation_fee // Prioritize what we just saved
      };
      
      setDoctor(merged);
      setEditForm(merged);
      setEditing(false);
      toast.success("Doctor profile updated successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">ID: {doctorId}</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(["profile", "sessions", "appointments", "availability", "exceptions"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all",
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {tab === "appointments" ? "Appointments" : 
             tab === "sessions" ? "Sessions" : 
             tab === "availability" ? "Schedule" : 
             tab === "exceptions" ? "Leaves" : "Profile"}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                <Stethoscope className="w-10 h-10" />
              </div>
              {!editing && (
                <span className={cn("text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5",
                  doctor.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {doctor.status === "Active" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span className="capitalize">{doctor.status}</span>
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                    <input type="text" value={editForm.name ?? ""} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Specialization</label>
                    <input type="text" value={editForm.specialization ?? ""} onChange={(e) => setEditForm(f => ({ ...f, specialization: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select value={editForm.status ?? "Active"} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                    <input type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Consultation Fee (Rs)</label>
                    <input type="number" min={0} value={editForm.consultation_fee ?? 0}
                      onChange={(e) => setEditForm(f => ({ ...f, consultation_fee: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Qualifications</label>
                    <input type="text" value={editForm.profile?.qualifications ?? ""} 
                      onChange={(e) => setEditForm(f => ({ ...f, profile: { ...f.profile, qualifications: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Experience</label>
                    <input type="text" value={editForm.profile?.experience ?? ""} 
                      onChange={(e) => setEditForm(f => ({ ...f, profile: { ...f.profile, experience: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Bio</label>
                    <textarea rows={2} value={editForm.profile?.bio ?? ""} 
                      onChange={(e) => setEditForm(f => ({ ...f, profile: { ...f.profile, bio: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={doctor.phone} />
                    <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={doctor.email || "—"} />
                    <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Consultation Fee"
                      value={doctor.consultation_fee > 0 ? `Rs ${doctor.consultation_fee.toLocaleString()}` : "Not set"} />
                  </div>
                  {(doctor.profile?.qualifications || doctor.profile?.experience || doctor.profile?.bio) && (
                    <div className="mt-6 pt-6 border-t border-gray-50 space-y-4">
                      {doctor.profile?.qualifications && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Qualifications</div>
                          <div className="text-sm text-gray-700">{doctor.profile.qualifications}</div>
                        </div>
                      )}
                      {doctor.profile?.experience && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Experience</div>
                          <div className="text-sm text-gray-700">{doctor.profile.experience}</div>
                        </div>
                      )}
                      {doctor.profile?.bio && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Professional Bio</div>
                          <div className="text-sm text-gray-700 leading-relaxed italic">"{doctor.profile.bio}"</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sessions Tab ── */}
      {activeTab === "sessions" && (
        <div>
          {sessionsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 text-gray-400">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No sessions found for this doctor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map(s => {
                const pct = Math.round((s.booked_count / s.max_patients) * 100);
                return (
                  <div key={s.session_id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{dayjs(s.date).format("ddd, MMM D YYYY")}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{s.start_time} – {s.end_time}</p>
                      </div>
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", SESSION_STATUS[s.status] ?? "bg-gray-100 text-gray-600")}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {s.booked_count} / {s.max_patients} patients booked
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-orange-400" : "bg-green-400")}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% full</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ── Appointments Tab ── */}
      {activeTab === "appointments" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {appointmentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No appointments found for this doctor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Queue</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map(apt => (
                    <tr key={apt.appointment_id} className="hover:bg-gray-50/50 transition-colors group">
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
                        <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium capitalize", {
                          "bg-blue-100 text-blue-700": apt.status === "booked",
                          "bg-indigo-100 text-indigo-700": apt.status === "confirmed",
                          "bg-yellow-100 text-yellow-700": apt.status === "arrived",
                          "bg-green-100 text-green-700": apt.status === "completed",
                          "bg-red-100 text-red-700": apt.status === "cancelled",
                          "bg-gray-100 text-gray-600": apt.status === "no show",
                        })}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {apt.status === "completed" && (
                          <button onClick={() => router.push(`/payments?search=${apt.appointment_id}`)}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition" title="View Payment">
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Availability Tab ── */}
      {activeTab === "availability" && (
        <AvailabilityTab 
          doctorId={doctorId} 
          availability={availability} 
          loading={availabilityLoading} 
          onUpdated={() => {
            api.get(`doctors/${doctorId}/availability`).then(r => setAvailability(r.data.data));
          }}
        />
      )}

      {/* ── Exceptions Tab ── */}
      {activeTab === "exceptions" && (
        <ExceptionsTab 
          doctorId={doctorId} 
          exceptions={exceptions} 
          loading={exceptionsLoading} 
          onUpdated={() => {
            api.get(`doctors/${doctorId}/exceptions`).then(r => setExceptions(r.data.data));
          }}
        />
      )}

      {activeTab === "profile" && (
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 text-sm">Financial Summary</h4>
            <p className="text-blue-700 text-xs mt-1">View all payments and earnings related to this doctor.</p>
          </div>
          <button onClick={() => router.push(`/payments?search=${doctor.name}`)}
            className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
            View Earnings
          </button>
        </div>
      )}
    </div>
  );
}
// ── Availability Tab Component ──────────────────────────────────────────────
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function AvailabilityTab({ doctorId, availability, loading, onUpdated }: { 
  doctorId: string; 
  availability: Availability[]; 
  loading: boolean;
  onUpdated: () => void;
}) {
  const [managing, setManaging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<{ day_of_week: string; start_time: string; end_time: string; active: boolean }[]>(
    DAYS.map(d => ({ day_of_week: d, start_time: "17:00", end_time: "20:00", active: false }))
  );

  useEffect(() => {
    if (managing) {
      setSchedule(DAYS.map(d => {
        const existing = availability.find(a => a.day_of_week === d);
        return {
          day_of_week: d,
          start_time: existing?.start_time || "17:00",
          end_time: existing?.end_time || "20:00",
          active: !!existing
        };
      }));
    }
  }, [managing, availability]);

  async function handleSave() {
    setSaving(true);
    try {
      const activeSchedule = schedule.filter(s => s.active).map(({ day_of_week, start_time, end_time }) => ({
        day_of_week, start_time, end_time
      }));
      await api.post(`doctors/${doctorId}/availability`, { schedule: activeSchedule });
      toast.success("Schedule updated successfully");
      setManaging(false);
      onUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Weekly Schedule</h3>
          <p className="text-sm text-gray-500 mt-0.5">Define typical working hours for each day of the week</p>
        </div>
        <button onClick={() => setManaging(true)}
          className="px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition">
          Manage Schedule
        </button>
      </div>

      <div className="space-y-3">
        {DAYS.map(day => {
          const slot = availability.find(a => a.day_of_week === day);
          return (
            <div key={day} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-50 bg-gray-50/30">
              <span className="font-medium text-gray-700">{day}</span>
              {slot ? (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {slot.start_time} – {slot.end_time}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Unavailable</span>
              )}
            </div>
          );
        })}
      </div>

      {managing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Manage Weekly Schedule</h3>
              <button onClick={() => setManaging(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {schedule.map((s, idx) => (
                <div key={s.day_of_week} className="flex items-center gap-4">
                  <div className="w-28">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={s.active} 
                        onChange={e => {
                          const next = [...schedule];
                          next[idx].active = e.target.checked;
                          setSchedule(next);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className={cn("text-sm font-medium", s.active ? "text-gray-900" : "text-gray-400")}>{s.day_of_week}</span>
                    </label>
                  </div>
                  {s.active && (
                    <div className="flex-1 flex items-center gap-2">
                      <input type="time" value={s.start_time} 
                        onChange={e => {
                          const next = [...schedule];
                          next[idx].start_time = e.target.value;
                          setSchedule(next);
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={s.end_time} 
                        onChange={e => {
                          const next = [...schedule];
                          next[idx].end_time = e.target.value;
                          setSchedule(next);
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button onClick={() => setManaging(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exceptions Tab Component ──────────────────────────────────────────────
function ExceptionsTab({ doctorId, exceptions, loading, onUpdated }: {
  doctorId: string;
  exceptions: Exception[];
  loading: boolean;
  onUpdated: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", reason: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`doctors/${doctorId}/exceptions`, {
        exception_date: form.date,
        reason: form.reason
      });
      toast.success("Leave added successfully");
      setAdding(false);
      setForm({ date: "", reason: "" });
      onUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this leave?")) return;
    try {
      await api.delete(`doctors/${doctorId}/exceptions/${id}`);
      toast.success("Leave removed");
      onUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const futureExceptions = exceptions.filter(e => dayjs(e.exception_date).isAfter(dayjs().subtract(1, 'day')));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Planned Leaves</h3>
            <p className="text-sm text-gray-500 mt-0.5">Manage doctor holidays and unavailability</p>
          </div>
          <button onClick={() => setAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
            Add Leave
          </button>
        </div>

        {futureExceptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No future leaves planned</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {futureExceptions.map(ex => (
              <div key={ex.exception_id} className="p-4 rounded-xl border border-gray-100 bg-white group hover:border-blue-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{dayjs(ex.exception_date).format("dddd, MMM D, YYYY")}</div>
                    <div className="text-xs text-gray-500 mt-1">{ex.reason || "No reason provided"}</div>
                  </div>
                  <button onClick={() => handleDelete(ex.exception_id)} 
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add Planned Leave</h3>
              <button type="button" onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Date</label>
                <input type="date" required value={form.date} 
                  min={dayjs().format("YYYY-MM-DD")}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Reason (Optional)</label>
                <input type="text" value={form.reason} 
                  placeholder="e.g. Personal Holiday"
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button type="button" onClick={() => setAdding(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition">
                {saving ? "Adding..." : "Add Leave"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
