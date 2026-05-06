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
    
    // Create a base64 or absolute path for the logo. Since we're in a browser, /logo.png should work if served.
    // However, for maximum reliability in print, we'll use a futuristic CSS-based header if the image fails.
    
    win.document.write(`
      <html>
      <head>
        <title>Receipt - ${payment.payment_id.slice(0, 8).toUpperCase()}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Orbitron:wght@700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #0066ff;
            --accent: #00f2ff;
            --text: #1a1a1a;
            --muted: #666;
            --border: #e5e7eb;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            color: var(--text); 
            line-height: 1.5;
            padding: 40px;
            background: #fff;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            border: 1px solid var(--border);
            padding: 32px;
            position: relative;
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .brand-name {
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: var(--primary);
            letter-spacing: -0.5px;
          }
          .receipt-title {
            text-align: right;
          }
          .receipt-label {
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #ddd;
            text-transform: uppercase;
            line-height: 1;
          }
          .receipt-id {
            font-size: 12px;
            color: var(--muted);
            margin-top: 4px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
          }
          .info-box h4 {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .info-box p {
            font-size: 14px;
            font-weight: 600;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, var(--primary), var(--accent), transparent);
            margin: 24px 0;
            opacity: 0.3;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 32px;
          }
          .items-table th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--muted);
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
          }
          .items-table td {
            padding: 12px 0;
            font-size: 14px;
            border-bottom: 1px solid #f9fafb;
          }
          .total-section {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid var(--text);
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            font-weight: 700;
          }
          .total-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
          }
          .footer {
            margin-top: 40px;
            text-align: center;
          }
          .qr-placeholder {
            width: 80px;
            height: 80px;
            background: #f3f4f6;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
          }
          .thanks {
            font-size: 12px;
            color: var(--muted);
          }
          .paid-stamp {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            border: 4px solid rgba(0, 242, 255, 0.2);
            padding: 8px 24px;
            font-family: 'Orbitron', sans-serif;
            font-size: 64px;
            color: rgba(0, 242, 255, 0.1);
            pointer-events: none;
            text-transform: uppercase;
            z-index: 0;
          }
          @media print {
            body { padding: 0; }
            .container { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="paid-stamp">PAID</div>
          
          <div class="header">
            <div class="logo-container">
              <img src="/logo.png" class="logo-img" onerror="this.style.display='none'">
              <span class="brand-name">MediCore HMS</span>
            </div>
            <div class="receipt-title">
              <div class="receipt-label">Receipt</div>
              <div class="receipt-id">#${payment.payment_id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h4>Patient Details</h4>
              <p>${payment.appointment.patient.name}</p>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">ID: ${payment.appointment.patient.patient_id.slice(0, 6).toUpperCase()}</div>
            </div>
            <div class="info-box">
              <h4>Date & Time</h4>
              <p>${dayjs(payment.created_at).format("MMM D, YYYY")}</p>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${dayjs(payment.created_at).format("h:mm A")}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Consultation Fee</strong><br>
                  <span style="font-size: 12px; color: #666;">Dr. ${payment.appointment.doctor.name} (${payment.appointment.doctor.specialization})</span>
                </td>
                <td style="text-align: right;">Rs ${payment.doctor_fee?.toLocaleString() ?? "0"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Hospital Service Charges</strong><br>
                  <span style="font-size: 12px; color: #666;">Facility and administrative fees</span>
                </td>
                <td style="text-align: right;">Rs ${payment.hospital_charge?.toLocaleString() ?? "0"}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span class="total-label">Total Paid</span>
              <span class="total-value">Rs ${payment.total_amount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <div class="qr-placeholder">
              <div style="text-align: center;">
                <div style="font-weight: bold; margin-bottom: 2px;">VERIFY</div>
                ${payment.payment_id.slice(0, 4)}
              </div>
            </div>
            <p class="thanks">Thank you for choosing MediCore HMS</p>
            <p style="font-size: 10px; color: #999; margin-top: 8px;">Digital Receipt Generated on ${dayjs().format("YYYY-MM-DD HH:mm")}</p>
          </div>
        </div>
      </body>
      </html>`);
    win.document.close();
    // Wait for fonts/images to load before printing
    setTimeout(() => {
      win.print();
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm animate-slide-in overflow-hidden border border-white/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Receipt
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 active:scale-95">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-6">
          {/* Visual Preview for the Modal */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <img src="/logo.png" className="w-8 h-8 object-contain" alt="Logo" />
                <span className="font-bold text-blue-600 dark:text-blue-400 tracking-tight">MediCore HMS</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receipt No</div>
                <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">{payment.payment_id.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Patient</span>
                <span className="font-semibold text-gray-900 dark:text-white">{payment.appointment.patient.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dayjs(payment.created_at).format("MMM D, YYYY")}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Amount Paid</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rs {payment.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">The printed receipt will include full itemized breakdown and futuristic branding.</p>
          </div>
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
      const payload: Record<string, any> = {
        method: method.toLowerCase(), // Must be lowercase for backend validation
        amount: Number(payment.total_amount),
        hospital_id: user?.hospital_id,
        payment_id: payment.payment_id,
        date: dayjs().toISOString(),
      };
      
      // Only add branch_id if it exists
      if (user?.branch_id) {
        payload.branch_id = user.branch_id;
      }
      
      console.log("Sending payment payload:", payload);
      await api.post(`payments/${payment.payment_id}/transactions/`, payload);
      
      toast.success("Payment recorded successfully!");
      onPaid();
      onClose();
    } catch (err: any) {
      console.error("Payment error response:", err.response?.data);
      const errorData = err.response?.data;
      let msg = errorData?.message || errorData?.error || "Validation failed";
      
      // If there are specific field errors, show them
      if (errorData?.errors) {
        msg += ": " + JSON.stringify(errorData.errors);
      }
      
      toast.error(msg, { duration: 8000 });
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