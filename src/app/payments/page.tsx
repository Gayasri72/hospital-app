"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CreditCard, Search, Loader2, X, Printer,
  ChevronLeft, ChevronRight, Receipt, CheckCircle2,
  Banknote, Smartphone, Building2, Shield,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import dayjs from "dayjs";

interface Payment {
  payment_id: string;
  total_amount: number;
  status: "Pending" | "Paid" | "Refunded";
  created_at: string;
  appointment: {
    appointment_id: string;
    queue_number: number;
    patient: { patient_id: string; name: string; phone: string };
    doctor:  { doctor_id: string; name: string; specialization: string; consultation_fee: number };
    session: { date: string; start_time: string };
  };
  transactions: { method: string; amount: number; date: string }[];
  hospital_charge: number;
  doctor_fee: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  paid:     "bg-green-100 text-green-700",
  refunded: "bg-gray-100 text-gray-600",
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toLowerCase()] || "bg-gray-100 text-gray-600";
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  Cash:     <Banknote className="w-4 h-4" />,
  Card:     <CreditCard className="w-4 h-4" />,
  Online:   <Smartphone className="w-4 h-4" />,
  Insurance:<Shield className="w-4 h-4" />,
};

// ─── Receipt Modal ────────────────────────────────────────
function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void; }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #111; max-width: 400px; margin: 0 auto; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
        .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .total { font-weight: 700; font-size: 15px; }
        .badge { background:#dcfce7; color:#166534; padding: 2px 8px; border-radius: 12px; font-size:11px; font-weight:600; }
        @media print { @page { margin: 10mm; } }
      </style></head>
      <body>${content}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500" />Receipt</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div ref={printRef} className="p-5">
          <div className="text-center mb-4">
            <h1 className="font-bold text-gray-900 text-lg">MediCore HMS</h1>
            <p className="text-gray-500 text-xs">Hospital Appointment Receipt</p>
          </div>

          <div className="border-t border-dashed border-gray-200 my-3" />

          <div className="space-y-1.5 text-sm mb-3">
            <div className="flex justify-between"><span className="text-gray-500">Receipt #</span><span className="font-medium">{payment.payment_id.slice(0, 8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{dayjs(payment.created_at).format("MMM D, YYYY h:mm A")}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-medium">{payment.appointment.patient.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span className="font-medium">{payment.appointment.doctor.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Appointment</span><span className="font-medium">{dayjs(payment.appointment.session.date).format("MMM D, YYYY")}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-200 my-3" />

          <div className="space-y-1.5 text-sm mb-3">
            <div className="flex justify-between"><span className="text-gray-500">Doctor Fee</span><span>Rs {payment.doctor_fee?.toLocaleString() ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Hospital Charge</span><span>Rs {payment.hospital_charge?.toLocaleString() ?? "—"}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-200 my-3" />

          <div className="flex justify-between font-bold text-base">
            <span>Total Paid</span>
            <span className="text-blue-600">Rs {payment.total_amount.toLocaleString()}</span>
          </div>

          {payment.transactions && payment.transactions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Transaction History</h4>
              <div className="space-y-1">
                {payment.transactions.map((t, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-gray-500">{t.method} · {dayjs(t.date).format("MMM D")}</span>
                    <span className="font-semibold">Rs {t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-gray-200 my-3" />
          <div className="text-center text-xs text-gray-400">Thank you for visiting us!</div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Form Modal ───────────────────────────────────
function PaymentFormModal({ payment, onClose, onPaid }: {
  payment: Payment;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { user } = useAuthStore();
  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      // Try with both 'method' and 'payment_method' just in case
      const payload = {
        method: method,
        payment_method: method, 
        amount: Number(payment.total_amount),
        hospital_id: user?.hospital_id,
        branch_id: user?.branch_id,
        payment_id: payment.payment_id,
        date: dayjs().toISOString(),
      };
      
      console.log("Sending payment payload:", payload);
      await api.post(`payments/${payment.payment_id}/transactions/`, payload);
      
      toast.success("Payment recorded successfully!");
      onPaid();
      onClose();
    } catch (err: any) {
      console.error("Payment error response:", err.response?.data);
      const msg = err.response?.data?.message || err.response?.data?.error || "Check console for details";
      toast.error(`Validation failed: ${msg}`, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900">Process Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Patient</span><span className="font-medium text-gray-900">{payment.appointment.patient.name}</span></div>
            <div className="flex justify-between text-gray-600"><span>Doctor</span><span className="font-medium text-gray-900">{payment.appointment.doctor.name}</span></div>
            <div className="flex justify-between text-gray-600"><span>Doctor Fee</span><span>Rs {payment.doctor_fee?.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>Hospital Charge</span><span>Rs {payment.hospital_charge?.toLocaleString()}</span></div>
            <div className="pt-1 border-t border-gray-200 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-blue-600">Rs {payment.total_amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {["Cash", "Card", "Online", "Insurance"].map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    method === m ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700"
                                 : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  {METHOD_ICONS[m]} {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handlePay} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60
                         text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><CheckCircle2 className="w-4 h-4" />Confirm Payment</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function PaymentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [payTarget, setPayTarget]     = useState<Payment | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter.toLowerCase();
      
      const res = await api.get("payments", { params });
      
      // Normalize statuses for consistent UI
      const normalized = res.data.data.map((p: any) => ({
        ...p,
        status: p.status?.charAt(0).toUpperCase() + p.status?.slice(1).toLowerCase()
      }));

      setPayments(normalized);
      setMeta(res.data.meta ?? { total: res.data.data.length, page: 1, limit: 20 });
    } catch (err: any) {
      if (err?.response?.status === 422 && statusFilter) {
        // Fallback: If status filtering is not supported by backend, fetch all and filter client-side
        try {
          const res = await api.get("payments", { params: { page: 1, limit: 100 } });
          const allPayments = res.data.data as Payment[];
          const filtered = allPayments.filter(p => p.status === statusFilter);
          setPayments(filtered);
          setMeta({ total: filtered.length, page: 1, limit: 100 });
          return;
        } catch {}
      }
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { if (user) fetchPayments(); }, [user, fetchPayments]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(meta.total / meta.limit);
  if (authLoading) return null;

  const totalRevenue = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.total_amount, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Billing</h1>
          <p className="text-gray-500 text-sm mt-1">Process payments and generate receipts</p>
        </div>
        {/* Revenue badge */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-600" />
          <div>
            <div className="text-xs text-green-600 font-medium">Total Revenue</div>
            <div className="font-bold text-green-700">Rs {totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        {["", "Pending", "Paid", "Refunded"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              statusFilter === s ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                 : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200")}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-56"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-gray-400">
            <CreditCard className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push(`/patients/${p.appointment.patient.patient_id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left">
                        {p.appointment.patient.name}
                      </button>
                      <div className="text-xs text-gray-400">{p.appointment.patient.phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push(`/doctors/${p.appointment.doctor.doctor_id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left">
                        {p.appointment.doctor.name}
                      </button>
                      <div className="text-xs text-blue-600">{p.appointment.doctor.specialization}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-bold text-gray-900">Rs {p.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium", getStatusStyle(p.status))}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{dayjs(p.created_at).format("MMM D, YYYY")}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {p.status.toLowerCase() === "pending" && (
                          <button onClick={() => setPayTarget(p)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition shadow-sm hover:shadow-md">
                            Pay Now
                          </button>
                        )}
                        {p.status === "Paid" && (
                          <button onClick={() => setReceiptTarget(p)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5" /> Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">{(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}</p>
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

      {payTarget     && <PaymentFormModal payment={payTarget}     onClose={() => setPayTarget(null)}     onPaid={fetchPayments} />}
      {receiptTarget && <ReceiptModal     payment={receiptTarget} onClose={() => setReceiptTarget(null)} />}
    </div>
  );
}