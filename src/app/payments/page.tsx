"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CreditCard, Search, Loader2, X, Printer,
  ChevronLeft, ChevronRight, Receipt, CheckCircle2,
  Banknote, Smartphone, Building2, Shield, RefreshCw
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

// ─── helpers ──────────────────────────────────────────────
function getCachedFee(doctorId: string): number {
  try {
    const cache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
    return Number(cache[doctorId]) || 0;
  } catch { return 0; }
}

// ─── Receipt Modal ────────────────────────────────────────
function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void; }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const patientName = payment?.appointment?.patient?.name ?? "N/A";
  const patientId = payment?.appointment?.patient?.patient_id?.slice(0, 6).toUpperCase() ?? "N/A";
  const doctorName = payment?.appointment?.doctor?.name ?? "N/A";
  const specialization = payment?.appointment?.doctor?.specialization ?? "General";
  const paymentDate = payment?.created_at ? dayjs(payment.created_at).format("MMM D, YYYY") : dayjs().format("MMM D, YYYY");
  const paymentTime = payment?.created_at ? dayjs(payment.created_at).format("h:mm A") : dayjs().format("h:mm A");
  const receiptId = payment?.payment_id?.slice(0, 8).toUpperCase() ?? "N/A";
  const totalAmount = payment?.total_amount?.toLocaleString() ?? "0";
  
  // Fallback chain: payment field -> appointment field -> local cache -> 0
  const feeValue = payment?.doctor_fee || 
                   payment?.appointment?.doctor?.consultation_fee || 
                   (payment?.appointment?.doctor?.doctor_id ? getCachedFee(payment.appointment.doctor.doctor_id) : 0);
  
  const doctorFee = feeValue.toLocaleString();
  const hospitalCharge = (payment?.hospital_charge || 0).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
            overflow: visible !important;
          }
          /* Show only the print container and its contents */
          #print-receipt-container, #print-receipt-container * {
            visibility: visible !important;
          }
          /* Position the print container at the very top left */
          #print-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 99999 !important;
            display: block !important;
          }
          /* Fix for background colors in some browsers */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ` }} />

      {/* Hidden Print Container (Only visible during window.print()) */}
      <div id="print-receipt-container" className="hidden">
        <div style={{
          fontFamily: "'Inter', sans-serif",
          color: "#1a1a1a",
          padding: "40px",
          background: "white",
          maxWidth: "500px",
          margin: "0 auto",
          border: "1px solid #e5e7eb",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Futuristic Stamp */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-15deg)",
            border: "4px solid rgba(0, 102, 255, 0.1)",
            padding: "10px 30px",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "64px",
            color: "rgba(0, 102, 255, 0.05)",
            textTransform: "uppercase",
            zIndex: 0,
            pointerEvents: "none"
          }}>PAID</div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <img src="/logo.png" style={{ width: "50px", height: "50px", objectFit: "contain" }} alt="Logo" />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "22px", fontWeight: "bold", color: "#0066ff" }}>MediCore HMS</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "28px", fontWeight: "bold", color: "#eee", textTransform: "uppercase", lineHeight: 1 }}>Receipt</div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>#{receiptId}</div>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "40px", position: "relative", zIndex: 1 }}>
            <div>
              <h4 style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#888", marginBottom: "10px" }}>Patient</h4>
              <p style={{ fontSize: "15px", fontWeight: "bold" }}>{patientName}</p>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>ID: {patientId}</div>
            </div>
            <div>
              <h4 style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#888", marginBottom: "10px" }}>Date & Time</h4>
              <p style={{ fontSize: "15px", fontWeight: "bold" }}>{paymentDate}</p>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{paymentTime}</div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px", position: "relative", zIndex: 1 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "#888", paddingBottom: "15px" }}>Description</th>
                <th style={{ textAlign: "right", fontSize: "11px", textTransform: "uppercase", color: "#888", paddingBottom: "15px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "20px 0", fontSize: "14px" }}>
                  <strong>Consultation Fee</strong><br />
                  <span style={{ fontSize: "12px", color: "#666" }}>Dr. {doctorName} ({specialization})</span>
                </td>
                <td style={{ textAlign: "right", padding: "20px 0", fontSize: "15px", fontWeight: "bold" }}>Rs {doctorFee}</td>
              </tr>
              <tr>
                <td style={{ padding: "0 0 20px 0", fontSize: "14px" }}>
                  <strong>Hospital Charges</strong><br />
                  <span style={{ fontSize: "12px", color: "#666" }}>Facility and administrative fees</span>
                </td>
                <td style={{ textAlign: "right", padding: "0 0 20px 0", fontSize: "15px", fontWeight: "bold" }}>Rs {hospitalCharge}</td>
              </tr>
            </tbody>
          </table>

          {/* Total */}
          <div style={{ paddingTop: "30px", borderTop: "2px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "18px", fontWeight: "bold" }}>Total Paid</span>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#0066ff" }}>Rs {totalAmount}</span>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "50px", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "80px", height: "80px", background: "#f9f9f9", border: "1px solid #eee", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#ccc" }}>
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontWeight: "bold", color: "#999" }}>VERIFY</div>
                {payment?.payment_id?.slice(0, 4) ?? "----"}
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#666" }}>Thank you for choosing MediCore HMS</p>
            <p style={{ fontSize: "10px", color: "#aaa", marginTop: "10px" }}>Digital Receipt ID: {receiptId}</p>
          </div>
        </div>
      </div>

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
                <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">{receiptId}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Patient</span>
                <span className="font-semibold text-gray-900 dark:text-white">{patientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">{paymentDate}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Amount Paid</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rs {totalAmount}</span>
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
  
  // Fallback chain for initial state
  const initialFee = payment.doctor_fee || 
                     (payment.appointment?.doctor?.doctor_id ? getCachedFee(payment.appointment.doctor.doctor_id) : 0) ||
                     payment.appointment?.doctor?.consultation_fee || 0;

  const [doctorFee, setDoctorFee] = useState(initialFee);
  const [hospitalCharge, setHospitalCharge] = useState(2500);
  const [loading, setLoading] = useState(false);
  const totalAmount = Number(doctorFee) + Number(hospitalCharge);

  // Auto-fetch fee if missing
  useEffect(() => {
    const docId = payment.appointment?.doctor?.doctor_id;
    if (doctorFee === 0 && docId) {
      api.get(`doctors/${docId}/`).then(res => {
        const fee = res.data.data?.consultation_fee;
        if (fee) {
          setDoctorFee(fee);
          // Sync with cache
          const cache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
          cache[docId] = fee;
          localStorage.setItem("doctor_fees_cache", JSON.stringify(cache));
        }
      }).catch(() => {});
    }
  }, [payment.appointment?.doctor?.doctor_id, doctorFee]);

  async function handlePay() {
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        method: method.toLowerCase(), 
        amount: totalAmount,
        hospital_id: user?.hospital_id,
        payment_id: payment.payment_id,
        doctor_fee: Number(doctorFee),
        hospital_charge: Number(hospitalCharge),
        date: dayjs().toISOString(),
      };
      
      // Only add branch_id if it exists
      if (user?.branch_id) {
        payload.branch_id = user.branch_id;
      }
      
      // 1. Optional: Try to update the payment record's amounts (if the endpoint exists)
      // This is a "best effort" to sync the record before the transaction.
      // We ignore failures here because the transaction step below handles recovery.
      try {
        const updateData = {
          doctor_fee: Number(doctorFee),
          hospital_charge: Number(hospitalCharge),
          total_amount: totalAmount
        };
        // Try multiple endpoint patterns
        await api.put(`payments/${payment.payment_id}`, updateData).catch(async () => {
          await api.patch(`payments/${payment.payment_id}`, updateData).catch(async () => {
            await api.post(`payments/${payment.payment_id}/update`, updateData).catch(() => {});
          });
        });
      } catch (err) {}

      // 1. Process the transaction directly
      try {
        await api.post(`payments/${payment.payment_id}/transactions`, payload);
      } catch (transErr: any) {
        const isBalanceError = transErr.response?.data?.code === 'AMOUNT_EXCEEDS_BALANCE' || 
                              transErr.response?.data?.message?.includes('exceeds remaining balance');
        
        if (isBalanceError && payment.appointment?.appointment_id) {
          console.log("Balance mismatch detected. Attempting to re-create payment record with current fees...");
          try {
            // A. Re-create the payment record with the CORRECT amounts from the start
            // This ensures the backend initializes the balance correctly.
            const newPaymentRes = await api.post("payments", {
              appointment_id: payment.appointment.appointment_id,
              doctor_fee: Number(doctorFee),
              hospital_charge: Number(hospitalCharge),
              total_amount: totalAmount
            });
            const newPaymentId = newPaymentRes.data.data.payment_id;
            
            // B. Retry the transaction with the NEW payment ID
            payload.payment_id = newPaymentId;
            await api.post(`payments/${newPaymentId}/transactions`, payload);
            
            toast.success("Payment recorded (record synchronized)!");
            onPaid();
            onClose();
            return;
          } catch (hackErr) {
            console.error("Re-creation hack failed:", hackErr);
            throw transErr; // Throw original error if hack fails
          }
        } else {
          throw transErr;
        }
      }
      
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

  async function handleRecalculate() {
    setLoading(true);
    try {
      const res = await api.post(`payments/${payment.payment_id}/recalculate`);
      const data = res.data.data;
      if (data) {
        setDoctorFee(data.doctor_amount || doctorFee);
        setHospitalCharge(data.hospital_amount || hospitalCharge);
      }
      toast.success(res.data.message || "Totals recalculated!");
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-900">Process Payment</h2>
            <button onClick={handleRecalculate} disabled={loading}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition border border-blue-100" title="Recalculate Fees">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Patient</span>
              <span className="font-medium text-gray-900 dark:text-white">{payment.appointment.patient.name}</span>
            </div>
            
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Consultation Fee (Rs)</label>
                <input type="number" value={doctorFee} onChange={(e) => setDoctorFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hospital Charges (Rs)</label>
                <input type="number" value={hospitalCharge} onChange={(e) => setHospitalCharge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-bold text-lg">
              <span className="text-gray-900 dark:text-white">Total Amount</span>
              <span className="text-blue-600 dark:text-blue-400">Rs {totalAmount.toLocaleString()}</span>
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
  const [recalculating, setRecalculating] = useState<string | null>(null);

  const handleRecalculate = async (id: string) => {
    setRecalculating(id);
    try {
      const res = await api.post(`payments/${id}/recalculate`);
      toast.success(res.data.message || "Totals recalculated!");
      fetchPayments();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setRecalculating(null);
    }
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter.toLowerCase();
      
      const res = await api.get("payments", { params });
      
      // Normalize statuses and merge cached fees
      const feeCache = JSON.parse(localStorage.getItem("doctor_fees_cache") || "{}");
      const normalized = res.data.data.map((p: any) => {
        const doctorId = p.appointment?.doctor?.doctor_id || 
                         p.appointment?.doctor?.id || 
                         p.appointment?.doctor_id || 
                         p.doctor_id ||
                         p.appointment?.doctor_name; // Last resort search by name in cache
        
        let cachedFee = 0;
        if (doctorId && feeCache[doctorId]) {
          cachedFee = Number(feeCache[doctorId]);
        } else if (p.appointment?.doctor?.name && feeCache[p.appointment.doctor.name]) {
          cachedFee = Number(feeCache[p.appointment.doctor.name]);
        }
        
        const status = p.status?.charAt(0).toUpperCase() + p.status?.slice(1).toLowerCase();
        
        // For Pending payments, prioritize the LATEST fee (from cache or doctor profile)
        // For Paid/Refunded, use the recorded fee
        const currentFee = (status === "Pending") 
          ? (cachedFee || p.appointment?.doctor?.consultation_fee || p.doctor_fee || 0)
          : (p.doctor_fee || p.appointment?.doctor?.consultation_fee || 0);
        
        const hospitalCharge = Number(p.hospital_charge) || 2500; // Updated default to 2500
        
        return {
          ...p,
          status,
          doctor_fee: currentFee,
          hospital_charge: hospitalCharge,
          total_amount: currentFee + hospitalCharge // Always show sum of fee + charge
        };
      });

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

  const totalRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + Number(p.total_amount || 0), 0);

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
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleRecalculate(p.payment_id)}
                              disabled={recalculating === p.payment_id}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100"
                              title="Recalculate totals">
                              <RefreshCw className={cn("w-3.5 h-3.5", recalculating === p.payment_id && "animate-spin")} />
                            </button>
                            <button onClick={() => setPayTarget(p)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition shadow-sm hover:shadow-md">
                              Pay Now
                            </button>
                          </div>
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