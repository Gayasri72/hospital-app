"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, Loader2, Phone, Mail, MapPin, CreditCard,
  Calendar, User, Pencil, X, Check,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import dayjs from "dayjs";

interface Patient {
  patient_id: string;
  name: string;
  nic: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  created_at: string;
}

interface Appointment {
  appointment_id: string;
  status: string;
  created_at: string;
  doctor?: { name: string; specialization?: string };
  session?: { date: string; start_time: string };
}

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

const STATUS_STYLES: Record<string, string> = {
  Booked:    "bg-blue-100 text-blue-700",
  Confirmed: "bg-indigo-100 text-indigo-700",
  Arrived:   "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-gray-100 text-gray-600",
};

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.id as string;
  const isEditingInitial = searchParams?.get("edit") === "true";
  const { isLoading: authLoading } = useRequireAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isEditingInitial);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, aRes] = await Promise.all([
          api.get(`patients/${patientId}`),
          api.get(`patients/${patientId}/appointments`).catch(() => ({ data: { data: [] } })),
        ]);
        const p = pRes.data.data;
        setPatient(p);
        setEditForm(p);
        setAppointments(aRes.data.data);
      } catch (err) {
        toast.error(getErrorMessage(err));
        router.push("/patients");
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
  }, [patientId, authLoading, router]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put(`patients/${patientId}`, editForm);
      setPatient(res.data.data);
      setEditing(false);
      toast.success("Patient updated successfully");
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

  if (!patient) return null;

  function avatarColor(name: string) {
    const colours = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
      "bg-teal-100 text-teal-700", "bg-pink-100 text-pink-700"];
    return colours[name.charCodeAt(0) % colours.length];
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">ID: {patientId}</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                         text-white rounded-xl text-sm font-semibold transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-5 pb-5 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3 ${avatarColor(patient.name)}`}>
                {patient.name.charAt(0).toUpperCase()}
              </div>
              {editing ? (
                <input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="text-center font-bold text-gray-900 text-lg border border-blue-300 rounded-xl px-3 py-1 w-full focus:ring-2 focus:ring-blue-100" />
              ) : (
                <h2 className="font-bold text-gray-900 text-lg text-center">{patient.name}</h2>
              )}
              <span className="text-xs text-gray-500 mt-1">
                {patient.gender} · {patient.age} years
              </span>
              <span className="text-xs text-gray-400 mt-0.5">
                Registered {dayjs(patient.created_at).format("MMM D, YYYY")}
              </span>
            </div>

            {/* Info rows */}
            {editing ? (
              <div className="space-y-3">
                {[
                  { label: "NIC / Passport", field: "nic", type: "text" },
                  { label: "Age", field: "age", type: "number" },
                  { label: "Phone", field: "phone", type: "tel" },
                  { label: "Email", field: "email", type: "email" },
                  { label: "Address", field: "address", type: "text" },
                  { label: "Emergency Contact", field: "emergency_contact", type: "tel" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input type={type}
                      value={(editForm as Record<string, string | number>)[field] ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <InfoRow icon={<CreditCard className="w-4 h-4" />} label="NIC / Passport" value={patient.nic} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={patient.phone} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={patient.email} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={patient.address} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Emergency Contact" value={patient.emergency_contact} />
              </div>
            )}
          </div>
        </div>

        {/* Appointment & Payment History */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Appointment History</h3>
                <p className="text-xs text-gray-500 mt-0.5">{appointments.length} total appointments</p>
              </div>
              <button onClick={() => router.push("/appointments")} className="text-xs text-blue-600 font-medium hover:underline">View All</button>
            </div>

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No appointments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {appointments.slice(0, 5).map((apt) => (
                  <div key={apt.appointment_id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 rounded-xl p-2 text-gray-400"><User className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{apt.doctor?.name ?? "Doctor"}</div>
                        <div className="text-xs text-gray-400">
                          {apt.session?.date ? dayjs(apt.session.date).format("MMM D, YYYY") : "—"}
                          {apt.session?.start_time ? ` · ${apt.session.start_time}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_STYLES[apt.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {apt.status}
                      </span>
                      {apt.status === "Completed" && (
                         <button onClick={() => router.push(`/payments?search=${apt.appointment_id}`)}
                           className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition">
                           <CreditCard className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Recent Payments</h3>
              </div>
              <button onClick={() => router.push(`/payments?search=${patient.name}`)} className="text-xs text-blue-600 font-medium hover:underline">View Billing</button>
            </div>
            <div className="p-5 text-center text-gray-400">
              <p className="text-xs">Direct billing summary available on the Payments page.</p>
              <button onClick={() => router.push(`/payments?search=${patient.name}`)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                <CreditCard className="w-3.5 h-3.5" /> View Patient Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}