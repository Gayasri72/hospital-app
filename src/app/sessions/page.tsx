"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, ChevronLeft, ChevronRight, Loader2, X,
  Clock, Users, Calendar, Eye, Pencil, Trash2, LayoutPanelTop
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import dayjs from "dayjs";

interface Session {
  session_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_patients: number;
  booked_count: number;
  status: string;
  doctor: { doctor_id: string; name: string; specialization: string; consultation_fee?: number };
}

interface Doctor { 
  doctor_id: string; 
  name: string; 
  specialization: string;
  consultation_fee?: number;
}

const STATUS_STYLES: Record<string, string> = {
  open:      "bg-green-100 text-green-700",
  full:      "bg-orange-100 text-orange-700",
  closed:    "bg-gray-100 text-gray-600",
  completed: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toLowerCase()] || "bg-gray-100 text-gray-600";
}

// ─── Create Session Modal ────────────────────────────────
function getDeletedDoctorIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("doctor_deleted_ids") || "[]")); }
  catch { return new Set(); }
}

function CreateSessionModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [branches, setBranches] = useState<{ branch_id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [form, setForm] = useState({
    doctor_id: "",
    branch_id: "",
    date: dayjs().format("YYYY-MM-DD"),
    start_time: "",
    end_time: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [doctorsRes, branchesRes] = await Promise.all([
          api.get("doctors", { params: { limit: 100 } }),
          api.get("branches"),
        ]);
        const deletedIds = getDeletedDoctorIds();
        const filtered = (doctorsRes.data.data as Doctor[]).filter(d => !deletedIds.has(d.doctor_id));
        setDoctors(filtered);
        const branchList = branchesRes.data.data ?? [];
        setBranches(branchList);
        if (branchList.length > 0) {
          setForm(f => ({ ...f, branch_id: branchList[0].branch_id }));
        }
      } catch (err) {
        toast.error("Failed to load form data");
      } finally {
        setDoctorsLoading(false);
        setBranchesLoading(false);
      }
    };
    initData();
  }, []);

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.branch_id) {
        toast.error("Please select a branch");
        setLoading(false);
        return;
      }

      // Normalize times to strict HH:mm 24-hour format expected by backend
      const to24h = (t: string) => {
        if (!t) return t;
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const [time, period] = t.split(" ");
        let [h, m] = time.split(":").map(Number);
        if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period?.toUpperCase() === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      // Build payload matching API requirements (§6.1)
      const payload = {
        doctor_id: String(form.doctor_id),
        branch_id: form.branch_id,
        session_date: form.date,
        start_time: to24h(form.start_time),
        end_time: to24h(form.end_time),
        slot_duration: 10,
      };

      await api.post("sessions", payload);
      toast.success("Session created successfully!");
      onSaved(); 
      onClose();
    } catch (err: any) {
      const errorData = err?.response?.data;
      let msg = errorData?.message || errorData?.error || err.message || "Validation failed";
      
      if (errorData?.errors) {
        msg = Object.entries(errorData.errors)
          .map(([field, error]) => `${field}: ${Array.isArray(error) ? error.join(", ") : error}`)
          .join("\n");
      }
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Session</h2>
            <p className="text-sm text-gray-500 mt-0.5">Schedule a new doctor channeling session</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doctor <span className="text-red-500">*</span></label>
            <select required value={form.doctor_id} onChange={(e) => set("doctor_id", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 transition-all font-medium"
              disabled={doctorsLoading}>
              <option value="">{doctorsLoading ? "Loading doctors…" : doctors.length === 0 ? "No doctors available" : "Select doctor"}</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.name} — {d.specialization} {d.consultation_fee ? `(Rs ${d.consultation_fee.toLocaleString()})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Branch <span className="text-red-500">*</span></label>
            <select required value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 transition-all font-medium"
              disabled={branchesLoading}>
              <option value="">{branchesLoading ? "Loading branches…" : branches.length === 0 ? "No branches found" : "Select branch"}</option>
              {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)}
              min={dayjs().format("YYYY-MM-DD")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time <span className="text-red-500">*</span></label>
              <input type="time" required value={form.start_time} onChange={(e) => set("start_time", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time <span className="text-red-500">*</span></label>
              <input type="time" required value={form.end_time} onChange={(e) => set("end_time", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 transition-all" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <>Create Session</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Session Modal ──────────────────────────────────
function EditSessionModal({ session, onClose, onSaved }: { 
  session: Session; 
  onClose: () => void; 
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: session.date || (session as any).session_date || dayjs().format("YYYY-MM-DD"),
    start_time: session.start_time,
    end_time: session.end_time,
    status: session.status || "Open",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const to24h = (t: string) => {
        if (!t) return t;
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const [time, period] = t.split(" ");
        let [h, m] = time.split(":").map(Number);
        if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period?.toUpperCase() === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      const payload = {
        session_date: form.date,
        start_time: to24h(form.start_time),
        end_time: to24h(form.end_time),
        status: form.status,
      };

      await api.patch(`sessions/${session.session_id}`, payload);
      toast.success("Session updated successfully!");
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Session</h2>
            <p className="text-sm text-gray-500 mt-0.5">Update session details for Dr. {session.doctor?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Session Date</label>
            <input type="date" required value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
              <input type="time" required value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
              <input type="time" required value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
              <option value="Open">Open</option>
              <option value="Full">Full</option>
              <option value="Closed">Closed</option>
              <option value="Completed">Completed</option>
            </select>
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

// ─── Calendar View ───────────────────────────────────────
function CalendarView({ sessions, onDayClick }: {
  sessions: Session[];
  onDayClick: (date: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));

  const daysInMonth = currentMonth.daysInMonth();
  const startDay = currentMonth.day(); 
  const today = dayjs().format("YYYY-MM-DD");

  const sessionsByDate = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const sessionDate = s.date || (s as any).session_date;
    if (!sessionDate) return acc;
    const d = dayjs(sessionDate).format("YYYY-MM-DD");
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = currentMonth.date(i + 1).format("YYYY-MM-DD");
    return { date, daySessions: sessionsByDate[date] ?? [] };
  });

  const blanks = Array.from({ length: startDay });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-gray-900">{currentMonth.format("MMMM YYYY")}</h3>
        <button onClick={() => setCurrentMonth((m) => m.add(1, "month"))}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {blanks.map((_: any, i: number) => <div key={`blank-${i}`} className="border-r border-b border-gray-50 h-20" />)}
        {days.map(({ date, daySessions }) => {
          const isToday = date === today;
          const hasSessions = daySessions.length > 0;
          return (
            <div key={date}
              onClick={() => hasSessions && onDayClick(date)}
              className={cn(
                "border-r border-b border-gray-50 h-20 p-1.5 transition-colors",
                hasSessions ? "cursor-pointer hover:bg-blue-50/50" : "",
                isToday ? "bg-blue-50" : ""
              )}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1",
                isToday ? "bg-blue-600 text-white" : "text-gray-600")}>
                {dayjs(date).date()}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 2).map((s) => (
                  <div key={s.session_id}
                    className={cn("text-[10px] px-1 py-0.5 rounded truncate font-bold leading-tight", getStatusStyle(s.status))}>
                    {s.doctor.name}
                  </div>
                ))}
                {daySessions.length > 2 && (
                  <div className="text-xs text-gray-400 px-1">+{daySessions.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────
function SessionCard({ session, user, onEdit, onRefresh }: { 
  session: Session; 
  user: any;
  onEdit: (s: Session) => void;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const pct = Math.round((session.booked_count / session.max_patients) * 100);
  const doctorId = session.doctor?.doctor_id;

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    try {
      await api.delete(`sessions/${id}`);
      toast.success("Session deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 group hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <button
            onClick={() => doctorId && router.push(`/doctors/${doctorId}`)}
            className={cn("font-semibold text-gray-900 text-left", doctorId && "hover:text-blue-600 hover:underline transition-colors cursor-pointer")}>
            {session.doctor.name}
          </button>
          <div className="text-sm text-blue-600 flex items-center gap-1">
            {session.doctor.specialization}
            {(session as any).consultation_fee ? (
              <span className="text-gray-400 font-medium">· Rs {(session as any).consultation_fee.toLocaleString()}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium capitalize", getStatusStyle(session.status))}>
            {session.status}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => router.push(`/sessions/${session.session_id}/queue`)}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="View Queue">
              <Eye className="w-4 h-4" />
            </button>
            {user?.role !== "Accountant" && (
              <>
                <button onClick={() => onEdit(session)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(session.session_id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => doctorId ? router.push(`/doctors/${doctorId}`) : toast.success("Doctor profile")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Doctor Profile">
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {dayjs(session.date).format("ddd, MMM D YYYY")}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {session.start_time} – {session.end_time}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          {session.booked_count} / {session.max_patients} patients
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-orange-400" : "bg-green-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct}% full</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function SessionsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("sessions", { params: { limit: 100 } });
      const feeCache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
      const mapped = (res.data.data || []).map((s: any) => ({
        ...s,
        date: s.session_date || s.date,
        doctor: s.doctor || { 
          name: s.doctor_name || "Unknown Doctor", 
          specialization: s.specialization || "General",
          doctor_id: s.doctor_id
        },
        consultation_fee: feeCache[s.doctor_id || s.doctor?.doctor_id] ?? s.consultation_fee ?? s.doctor?.consultation_fee ?? 0
      }));
      setSessions(mapped);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchSessions(); }, [user, fetchSessions]);
  if (authLoading) return null;

  const displayedSessions = selectedDate
    ? sessions.filter((s) => s.date.startsWith(selectedDate))
    : sessions;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage doctor channeling sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(["calendar", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                  view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                {v}
              </button>
            ))}
          </div>
          {user?.role !== "Accountant" && (
            <button onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> New Session
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-5">
          <CalendarView sessions={sessions} onDayClick={(d) => setSelectedDate(selectedDate === d ? null : d)} />
          {selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Sessions on {dayjs(selectedDate).format("MMMM D, YYYY")}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              </div>
              {displayedSessions.length === 0 ? (
                <p className="text-sm text-gray-400">No sessions on this day.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedSessions.map((s) => <SessionCard key={s.session_id} session={s} user={user} onEdit={setEditTarget} onRefresh={fetchSessions} />)}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 bg-white rounded-2xl border border-gray-100 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No sessions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <SessionCard key={s.session_id} session={s} user={user} onEdit={setEditTarget} onRefresh={fetchSessions} />
            ))}
          </div>
        )
      )}

      {modalOpen && (
        <CreateSessionModal user={user} onClose={() => setModalOpen(false)} onSaved={fetchSessions} />
      )}
      {editTarget && (
        <EditSessionModal session={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchSessions} />
      )}
    </div>
  );
}