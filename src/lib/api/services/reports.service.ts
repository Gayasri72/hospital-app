import { apiClient } from "../client";
import type {
  ApiSuccess,
  DailyRevenueReport,
  DoctorRevenueReport,
  MonthlyRevenueReport,
  ReportQueryParams,
} from "@/types";

export const reportsService = {
  // GET /reports/revenue/daily?date=YYYY-MM-DD
  daily: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiSuccess<DailyRevenueReport>>("/reports/revenue/daily", { params })
      .then((r) => r.data.data),

  // GET /reports/revenue/monthly?year=YYYY&month=M
  monthly: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiSuccess<MonthlyRevenueReport>>("/reports/revenue/monthly", { params })
      .then((r) => r.data.data),

  // GET /reports/revenue/doctor?doctor_id=UUID&from=YYYY-MM-DD&to=YYYY-MM-DD
  doctor: (params: ReportQueryParams) =>
    apiClient
      .get<ApiSuccess<DoctorRevenueReport>>("/reports/revenue/doctor", { params })
      .then((r) => r.data.data),

  // GET /reports/revenue/summary
  summary: () =>
    apiClient
      .get<ApiSuccess<unknown>>("/reports/revenue/summary")
      .then((r) => r.data.data),
};
