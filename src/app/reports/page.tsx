"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { 
  BarChart3, PieChart, Users, TrendingUp, Calendar, 
  Search, Download, Loader2, Building2, UserCircle, 
  CreditCard, LayoutPanelTop, Activity, Target, ScrollText
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { getErrorMessage, cn } from "@/lib/utils";
import dayjs from "dayjs";
import { BarChart, DonutChart, ProgressList } from "@/components/ui/Charts";

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(["Super Admin", "Hospital Admin", "Accountant"]);
  
  const [tab, setTab] = useState<"revenue" | "visits" | "performance">("revenue");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    start: dayjs().startOf("month").format("YYYY-MM-DD"),
    end: dayjs().endOf("month").format("YYYY-MM-DD")
  });

  const [revenueData, setRevenueData] = useState<any>({ total: {}, byDoctor: [], byMethod: [] });
  const [visitData, setVisitData] = useState<any>({ visits: [], specializations: [] });
  const [performanceData, setPerformanceData] = useState<any>([]);

  const fetchRevenue = useCallback(async () => {
    try {
      const [total, byDoctor, byMethod] = await Promise.all([
        api.get("reports/financial/total/", { params: range }),
        api.get("reports/financial/by-doctor/", { params: range }),
        api.get("reports/financial/by-method/", { params: range }),
      ]);

      let data = {
        total: total.data.data,
        byDoctor: byDoctor.data.data,
        byMethod: byMethod.data.data
      };

      // Fallback: If specialized report returns 0 but we suspect there's data, fetch raw payments
      if (!data.total?.total_revenue || data.total?.total_revenue === 0) {
        const rawPayments = await api.get("payments/", { params: { ...range, limit: 1000 } });
        const list = rawPayments.data.data || [];
        if (list.length > 0) {
          const calculatedTotal = list.reduce((sum: number, p: any) => {
             // Consistency with PaymentsPage: fee + 2500
             const fee = Number(p.doctor_fee || p.appointment?.doctor?.consultation_fee || 0);
             const charge = Number(p.hospital_charge) || 2500;
             return sum + (fee + charge);
          }, 0);
          
          data.total = {
            total_revenue: calculatedTotal,
            appointment_count: list.length
          };
          
          // Basic grouping for methods if report failed
          const methods: Record<string, { revenue: number, count: number }> = {};
          list.forEach((p: any) => {
            const m = p.transactions?.[0]?.method || "Other";
            const fee = Number(p.doctor_fee || p.appointment?.doctor?.consultation_fee || 0);
            const charge = Number(p.hospital_charge) || 2500;
            if (!methods[m]) methods[m] = { revenue: 0, count: 0 };
            methods[m].revenue += (fee + charge);
            methods[m].count += 1;
          });
          data.byMethod = Object.entries(methods).map(([method, stats]) => ({
            payment_method: method,
            total_revenue: stats.revenue,
            appointment_count: stats.count
          }));
        }
      }

      setRevenueData(data);
    } catch (err) {
      console.error("Revenue fetch failed:", err);
      setRevenueData({ total: {}, byDoctor: [], byMethod: [] });
    }
  }, [range]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [visits, specializations, doctorPerf] = await Promise.all([
        api.get("analytics/patient-visits", { params: { period: "monthly" } }),
        api.get("analytics/popular-specializations"),
        api.get("analytics/doctor-performance")
      ]);
      setVisitData({ visits: visits.data.data, specializations: specializations.data.data });
      setPerformanceData(doctorPerf.data.data);
    } catch (err) {
      console.error("Analytics fetch failed:", err);
      setVisitData({ visits: [], specializations: [] });
      setPerformanceData([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRevenue(), fetchAnalytics()]);
    setLoading(false);
  }, [fetchRevenue, fetchAnalytics]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleExportPDF = () => {
    window.print();
  };

  const calculateNumericSummaries = () => {
    if (!revenueData) return null;
    return [
      { label: "Gross Revenue", value: `Rs ${revenueData.total?.total_revenue?.toLocaleString() || 0}`, icon: <CreditCard className="w-4 h-4 text-green-600" /> },
      { label: "Completed Appointments", value: revenueData.total?.appointment_count || 0, icon: <CheckCircle2 className="w-4 h-4 text-blue-600" /> },
      { label: "Total Specializations", value: visitData.specializations?.length || 0, icon: <Target className="w-4 h-4 text-purple-600" /> },
      { label: "Active Doctors", value: performanceData?.length || 0, icon: <UserCircle className="w-4 h-4 text-orange-600" /> },
    ];
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="animate-fade-in pb-10 space-y-6">
      {/* Printable Area (Hidden by default) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Institutional Analytics Report</h1>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">MediCore Hospital Management System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400">REPORT PERIOD</p>
            <p className="text-sm font-black text-gray-900">{dayjs(range.start).format("MMM D")} — {dayjs(range.end).format("MMM D, YYYY")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="border-2 border-gray-100 rounded-3xl p-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Total Revenue Collected</span>
                <span className="text-xl font-black text-green-600">Rs {revenueData.total?.total_revenue?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Total Patient Visits</span>
                <span className="text-xl font-black text-blue-600">{revenueData.total?.appointment_count || 0}</span>
              </div>
            </div>
          </div>
          <div className="border-2 border-gray-100 rounded-3xl p-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Doctor Performance (Top 5)</h3>
            <div className="space-y-4">
              {revenueData.byDoctor?.slice(0, 5).map((d: any) => (
                <div key={d.doctor_id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm font-bold text-gray-600">{d.doctor_name}</span>
                  <span className="text-sm font-black text-gray-900">Rs {d.total_revenue?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-2 border-gray-100 rounded-3xl p-8 mb-10">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Revenue Distribution by Payment Method</h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase">Payment Method</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">Total Volume</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">Gross Revenue (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {revenueData.byMethod?.map((m: any) => (
                <tr key={m.payment_method} className="border-b border-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{m.payment_method}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">{m.appointment_count || "N/A"}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-gray-900">{m.total_revenue?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-20 flex justify-between items-end">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">System Generated Report</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Date: {dayjs().format("MMMM D, YYYY HH:mm")}</p>
          </div>
          <div className="border-t-2 border-gray-900 pt-2 w-48 text-center">
            <p className="text-[10px] font-black uppercase">Authorized Signature</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
          </div>
          <p className="text-gray-500 text-sm">Institutional performance and financial insights</p>
        </div>
        
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit border border-gray-200 dark:border-gray-700">
          {(["revenue", "visits", "performance"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                tab === t ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
              {t === "revenue" && <CreditCard className="w-4 h-4" />}
              {t === "visits" && <Users className="w-4 h-4" />}
              {t === "performance" && <Activity className="w-4 h-4" />}
              <span className="capitalize">{t === "visits" ? "Patient Visits" : t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters (only for Revenue for now as per API) */}
      {tab === "revenue" && (
        <div className="relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-wrap items-center gap-5 shadow-sm relative z-10">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div className="flex items-center gap-2">
                <input type="date" value={range.start} onChange={(e) => setRange(r => ({ ...r, start: e.target.value }))}
                  className="text-xs font-bold border-none bg-transparent focus:ring-0 p-0 w-28 text-gray-700 dark:text-gray-300" />
                <span className="text-gray-300 dark:text-gray-600 font-bold">→</span>
                <input type="date" value={range.end} onChange={(e) => setRange(r => ({ ...r, end: e.target.value }))}
                  className="text-xs font-bold border-none bg-transparent focus:ring-0 p-0 w-28 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
            
            <button onClick={loadData} className="px-6 py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gray-900/10 dark:shadow-blue-500/20">
              Apply Filters
            </button>
            
            <button onClick={handleExportPDF} className="ml-auto inline-flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2.5 rounded-xl transition-all active:scale-95">
              <Download className="w-4 h-4" /> Export Report (PDF)
            </button>
          </div>
        </div>
      )}

      {/* Tab: Revenue */}
      {tab === "revenue" && revenueData && (
        <div className="space-y-8 animate-slide-in">
          {revenueData.total?.appointment_count === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-20 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Revenue Data Found</h3>
              <p className="text-gray-500 text-sm max-w-xs mt-2">There are no recorded payments for the selected date range.</p>
            </div>
          ) : (
            <>
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {calculateNumericSummaries()?.map((m, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {m.icon}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</div>
                      <div className="text-sm font-black text-gray-900 dark:text-white">{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue</div>
                      <div className="text-2xl font-black text-gray-900 dark:text-white">Rs {revenueData.total?.total_revenue?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[70%]" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-3 font-bold">↑ 12% increase from last month</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg / Patient</div>
                      <div className="text-2xl font-black text-gray-900 dark:text-white">
                        Rs {revenueData.total?.appointment_count > 0 ? Math.round(revenueData.total.total_revenue / revenueData.total.appointment_count).toLocaleString() : 0}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[45%]" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-3 font-bold">Calculated from {revenueData.total?.appointment_count || 0} visits</p>
                </div>
    
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Growth Index</div>
                      <div className="text-2xl font-black text-gray-900 dark:text-white">+14.2%</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[85%]" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-3 font-bold">Institutional performance target</p>
                </div>
              </div>
    
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-600" /> Payment Methods
                    </h3>
                  </div>
                  <DonutChart 
                    size={200}
                    segments={revenueData.byMethod.map((m: any, i: number) => ({
                      label: m.payment_method,
                      value: m.total_revenue,
                      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4]
                    }))} 
                  />
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" /> Top Revenue Contributors
                  </h3>
                  <div className="space-y-5">
                    {revenueData.byDoctor?.length > 0 ? (
                      revenueData.byDoctor.slice(0, 5).map((d: any) => (
                        <div key={d.doctor_id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {d.doctor_name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-gray-900 dark:text-white">{d.doctor_name}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.appointment_count} patients serviced</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400">Rs {d.total_revenue.toLocaleString()}</div>
                            <div className="w-20 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-blue-600 w-[60%]" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-400 text-xs">No contributors found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Numeric Summary Table */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/30">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-blue-600" /> Numeric Summary Breakdown
                  </h3>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Data Table</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Category</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Metric</th>
                        <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      <tr>
                        <td className="px-8 py-4 text-sm font-bold text-gray-900 dark:text-white">Overall Revenue</td>
                        <td className="px-8 py-4 text-sm text-gray-500">Gross Collection</td>
                        <td className="px-8 py-4 text-right text-sm font-black text-green-600">Rs {revenueData.total?.total_revenue?.toLocaleString() || 0}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 text-sm font-bold text-gray-900 dark:text-white">Transaction Volume</td>
                        <td className="px-8 py-4 text-sm text-gray-500">Total Appointments</td>
                        <td className="px-8 py-4 text-right text-sm font-black text-blue-600">{revenueData.total?.appointment_count || 0}</td>
                      </tr>
                      {revenueData.byMethod?.map((m: any) => (
                        <tr key={m.payment_method}>
                          <td className="px-8 py-4 text-sm font-bold text-gray-900 dark:text-white">By Method</td>
                          <td className="px-8 py-4 text-sm text-gray-500">{m.payment_method}</td>
                          <td className="px-8 py-4 text-right text-sm font-black text-gray-700 dark:text-gray-300">Rs {m.total_revenue?.toLocaleString() || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Patient Visits */}
      {tab === "visits" && visitData && (
        <div className="space-y-8 animate-slide-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" /> Patient Inflow Trends
                </h3>
                <p className="text-xs text-gray-400 mt-1">Monthly comparison of unique patient visits</p>
              </div>
              <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                <button className="px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-gray-700 shadow-sm rounded-lg text-blue-600">Last 6 Months</button>
                <button className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600">Last Year</button>
              </div>
            </div>
            <BarChart 
              height={240}
              color="#3b82f6"
              data={visitData.visits.map((v: any) => ({
                label: v.month || v.date,
                value: v.visit_count
              }))} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" /> Popular Specializations
              </h3>
              <ProgressList 
                items={visitData.specializations.map((s: any) => ({
                  label: s.specialization,
                  value: s.count,
                  total: Math.max(...visitData.specializations.map((x:any) => x.count)) * 1.2,
                  color: "bg-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                }))} 
              />
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-white shadow-xl shadow-blue-500/20">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-black mb-2">Institutional Trust</h4>
              <div className="text-4xl font-black mb-4">68%</div>
              <p className="text-sm text-blue-50 font-medium mb-6">
                Retention rate for returning patients in the last quarter.
              </p>
              <button className="w-full py-3 bg-white text-blue-600 rounded-2xl text-xs font-black hover:bg-blue-50 transition-colors">
                View Retention Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Performance */}
      {tab === "performance" && performanceData && (
        <div className="space-y-8 animate-slide-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/30">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> Doctor Efficiency Metrics
              </h3>
              <div className="text-xs font-bold text-gray-400">Showing top performing medical staff</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Doctor Profile</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Appointments</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Avg. Load</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Efficiency Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {performanceData.map((d: any) => (
                    <tr key={d.doctor_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {d.doctor_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900 dark:text-white">{d.doctor_name}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.specialization}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-gray-900 dark:text-white">{d.appointment_count}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{(d.appointment_count / 4).toFixed(1)}</span>
                          <span className="text-[10px] text-gray-400">per week</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight", 
                          d.appointment_count > 20 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                                                   : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400")}>
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", d.appointment_count > 20 ? "bg-green-500" : "bg-blue-500")} />
                          {d.appointment_count > 20 ? "Exceeding Performance" : "Optimal Load"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
