"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { 
  BarChart3, PieChart, Users, TrendingUp, Calendar, 
  Search, Download, Loader2, Building2, UserCircle, 
  CreditCard, LayoutPanelTop, Activity, Target
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

  const [revenueData, setRevenueData] = useState<any>(null);
  const [visitData, setVisitData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      const [total, byDoctor, byMethod] = await Promise.all([
        api.get("reports/revenue/", { params: { start_date: range.start, end_date: range.end } }),
        api.get("reports/revenue/by-doctor/", { params: { start_date: range.start, end_date: range.end } }),
        api.get("reports/revenue/by-payment-method/", { params: { start_date: range.start, end_date: range.end } })
      ]);
      setRevenueData({
        total: total.data.data,
        byDoctor: byDoctor.data.data,
        byMethod: byMethod.data.data
      });
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRevenue(), fetchAnalytics()]);
    setLoading(false);
  }, [fetchRevenue, fetchAnalytics]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Institutional performance and financial insights</p>
        </div>
        
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["revenue", "visits", "performance"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {t === "visits" ? "Patient Visits" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Filters (only for Revenue for now as per API) */}
      {tab === "revenue" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={range.start} onChange={(e) => setRange(r => ({ ...r, start: e.target.value }))}
              className="text-sm font-medium border-none bg-transparent focus:ring-0 p-0 w-32" />
            <span className="text-gray-300">to</span>
            <input type="date" value={range.end} onChange={(e) => setRange(r => ({ ...r, end: e.target.value }))}
              className="text-sm font-medium border-none bg-transparent focus:ring-0 p-0 w-32" />
          </div>
          <div className="h-4 w-px bg-gray-100 mx-2 hidden sm:block" />
          <button onClick={loadData} className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition">
            Apply Filters
          </button>
          <button className="ml-auto flex items-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      )}

      {/* Tab: Revenue */}
      {tab === "revenue" && revenueData && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-50 rounded-xl"><CreditCard className="w-5 h-5 text-green-600" /></div>
                <h3 className="font-bold text-gray-900">Total Revenue</h3>
              </div>
              <div className="text-3xl font-black text-gray-900">Rs {revenueData.total?.total_revenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-gray-400 mt-1">From {revenueData.total?.appointment_count || 0} appointments</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl"><Target className="w-5 h-5 text-blue-600" /></div>
                <h3 className="font-bold text-gray-900">Average/Appointment</h3>
              </div>
              <div className="text-3xl font-black text-gray-900">
                Rs {revenueData.total?.appointment_count > 0 ? Math.round(revenueData.total.total_revenue / revenueData.total.appointment_count).toLocaleString() : 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Net collection per patient</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
                <h3 className="font-bold text-gray-900">Projected Growth</h3>
              </div>
              <div className="text-3xl font-black text-gray-900">+14.2%</div>
              <p className="text-xs text-gray-400 mt-1">Compared to previous period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-400" /> Payment Methods
              </h3>
              <DonutChart 
                size={160}
                segments={revenueData.byMethod.map((m: any, i: number) => ({
                  label: m.payment_method,
                  value: m.total_revenue,
                  color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4]
                }))} 
              />
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-400" /> Top Revenue Contributors
              </h3>
              <div className="space-y-6">
                {revenueData.byDoctor.slice(0, 5).map((d: any) => (
                  <div key={d.doctor_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-bold text-gray-400">
                        {d.doctor_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{d.doctor_name}</div>
                        <div className="text-xs text-gray-400">{d.appointment_count} patients</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-gray-900">Rs {d.total_revenue.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase">Top Tier</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Patient Visits */}
      {tab === "visits" && visitData && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Patient Inflow Trends
              </h3>
              <select className="text-xs font-bold border-none bg-gray-50 rounded-lg px-3 py-1.5 focus:ring-0">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <BarChart 
              height={200}
              data={visitData.visits.map((v: any) => ({
                label: v.month || v.date,
                value: v.visit_count
              }))} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-400" /> Popular Specializations
              </h3>
              <ProgressList 
                items={visitData.specializations.map((s: any) => ({
                  label: s.specialization,
                  value: s.count,
                  total: Math.max(...visitData.specializations.map((x:any) => x.count)) * 1.2,
                  color: "bg-blue-600"
                }))} 
              />
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-2">Patient Loyalty</h4>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                68% of patients in this period are returning visitors, showing high institutional trust.
              </p>
              <button className="text-xs font-bold text-blue-600 hover:underline">View Retention Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Performance */}
      {tab === "performance" && performanceData && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-400" /> Doctor Efficiency Metrics
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Doctor</th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Appointments</th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg. Load/Session</th>
                    <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {performanceData.map((d: any) => (
                    <tr key={d.doctor_id} className="hover:bg-gray-50/50 transition">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {d.doctor_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{d.doctor_name}</div>
                            <div className="text-xs text-gray-400">{d.specialization}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-900">{d.appointment_count}</td>
                      <td className="px-8 py-5 text-sm text-gray-500">{(d.appointment_count / 4).toFixed(1)}</td>
                      <td className="px-8 py-5 text-right">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", 
                          d.appointment_count > 20 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                          {d.appointment_count > 20 ? "Exceeding" : "Optimal"}
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
