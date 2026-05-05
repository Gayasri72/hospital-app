"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Loader2, Phone, CreditCard, ChevronRight as Arrow, Users,
  Eye, Pencil, Trash2,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import dayjs from "dayjs";

interface Patient {
  patient_id: string;
  name: string;
  nic: string;
  phone: string;
  email?: string;
  created_at: string;
}

const DELETED_KEY = "patient_deleted_ids";
function getDeletedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || "[]")); }
  catch { return new Set(); }
}
function markDeleted(id: string) {
  const ids = getDeletedIds();
  ids.add(id);
  localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
}

export default function PatientsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get("patients/", { params });
      const deletedIds = getDeletedIds();
      setPatients(res.data.data.filter((p: Patient) => !deletedIds.has(p.patient_id)));
      setMeta(res.data.meta ?? { total: res.data.data.length, page: 1, limit: 20 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { if (user) fetchPatients(); }, [user, fetchPatients]);
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(meta.total / meta.limit);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;
    try {
      await api.delete(`patients/${id}`);
      markDeleted(id);
      toast.success("Patient deleted");
      fetchPatients();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        markDeleted(id);
        setPatients(prev => prev.filter(p => p.patient_id !== id));
        toast.success("Patient deleted (Mocked)");
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  }

  if (authLoading) return null;

  function avatarColor(name: string) {
    const colours = [
      "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
      "bg-teal-100 text-teal-700", "bg-pink-100 text-pink-700",
      "bg-orange-100 text-orange-700", "bg-green-100 text-green-700",
    ];
    return colours[name.charCodeAt(0) % colours.length];
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {meta.total > 0 ? `${meta.total} patients registered` : "Manage patient registrations"}
          </p>
        </div>
        <button
          onClick={() => router.push("/patients/register")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                     text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Register Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, NIC, or phone…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                     placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-56">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-gray-400">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No patients found</p>
            {search ? (
              <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:underline mt-1">Clear search</button>
            ) : (
              <button onClick={() => router.push("/patients/register")} className="text-xs text-blue-500 hover:underline mt-1">
                Register the first patient
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NIC / Passport</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr
                    key={p.patient_id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${avatarColor(p.name)}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                          {p.email && <div className="text-xs text-gray-400">{p.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />{p.nic}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{p.phone}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{dayjs(p.created_at).format("MMM D, YYYY")}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/patients/${p.patient_id}`)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => router.push(`/patients/${p.patient_id}?edit=true`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.patient_id)}
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
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total} patients
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 font-medium px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}