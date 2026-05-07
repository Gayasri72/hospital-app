"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Stethoscope, Building2, MapPin } from "lucide-react";

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

interface Hospital { hospital_id: string; name: string; }
interface Branch { branch_id: string; name: string; }

export default function AddDoctorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, isLoading: authLoading } = useRequireAuth(["Super Admin", "Hospital Admin"]);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    contact_number: "",
    email: "",
    qualifications: "",
    experience: "",
    bio: "",
    consultation_fee: "",
    effective_from: dayjs().format("YYYY-MM-DD"),
  });

  // No longer fetching hospitals or branches as per simplified management flow
  useEffect(() => {}, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Build payload per API docs §5.1
      const payload: Record<string, any> = {
        name: form.name,
        specialization: form.specialization,
        consultation_fee: Number(form.consultation_fee),
        effective_from: form.effective_from,
      };
      if (form.contact_number) payload.contact_number = form.contact_number;
      if (form.email) payload.email = form.email;
      if (form.qualifications) payload.qualifications = form.qualifications;
      if (form.experience) payload.experience = form.experience;
      if (form.bio) payload.bio = form.bio;

      const res = await api.post("doctors/", payload);
      
      // Cache the fee locally if we have a doctor_id back
      const newDoc = res.data.data;
      if (newDoc?.doctor_id) {
        cacheFee(newDoc.doctor_id, Number(form.consultation_fee));
      }

      toast.success("Doctor added successfully!");
      router.push("/doctors");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Doctor</h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new doctor profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-500" /> Doctor Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Dr. Amara Silva"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization <span className="text-red-500">*</span></label>
              <input type="text" required value={form.specialization} onChange={(e) => set("specialization", e.target.value)}
                placeholder="e.g. Cardiology"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
              <input type="tel" value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="e.g. doctor@hospital.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Consultation Fee (Rs) <span className="text-red-500">*</span></label>
              <input type="number" required min={0} value={form.consultation_fee} onChange={(e) => set("consultation_fee", e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Effective From <span className="text-red-500">*</span></label>
              <input type="date" required value={form.effective_from} onChange={(e) => set("effective_from", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Qualifications</label>
              <input type="text" value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)}
                placeholder="e.g. MBBS, MD (Cardiology)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience</label>
              <input type="text" value={form.experience} onChange={(e) => set("experience", e.target.value)}
                placeholder="e.g. 12 years"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)}
                placeholder="Brief professional summary"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                       text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <><Stethoscope className="w-4 h-4" />Add Doctor</>}
          </button>
        </div>
      </form>
    </div>
  );
}