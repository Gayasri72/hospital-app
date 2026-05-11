import { apiClient } from "../client";
import type {
  ApiListResponse,
  ApiSuccess,
  Appointment,
  AppointmentQueryParams,
  AppointmentReceiptData,
  CreateAppointmentRequest,
  PaginatedResult,
  UpdateAppointmentStatusRequest,
} from "@/types";

function fromList<T>(r: { data: ApiListResponse<T> }): PaginatedResult<T> {
  return {
    data: r.data.data,
    meta: {
      total: r.data.meta.total,
      page: r.data.meta.page,
      limit: r.data.meta.limit,
      totalPages: Math.ceil(r.data.meta.total / r.data.meta.limit),
    },
  };
}

export const appointmentsService = {
  list: (params?: AppointmentQueryParams) =>
    apiClient
      .get<ApiListResponse<Appointment>>("/appointments", { params })
      .then(fromList),

  get: (id: string) =>
    apiClient.get<ApiSuccess<Appointment>>(`/appointments/${id}`).then((r) => r.data.data),

  create: (body: CreateAppointmentRequest) =>
    apiClient.post<ApiSuccess<Appointment>>("/appointments", body).then((r) => r.data.data),

  // Status values: "confirmed" | "arrived" | "completed" | "cancelled" | "no_show"
  updateStatus: (id: string, body: UpdateAppointmentStatusRequest) =>
    apiClient
      .patch<ApiSuccess<Appointment>>(`/appointments/${id}/status`, body)
      .then((r) => r.data.data),

  today: () =>
    apiClient.get<ApiSuccess<Appointment[]>>("/appointments/today").then((r) => r.data.data),

  getReceiptData: (id: string) =>
    apiClient
      .get<ApiSuccess<AppointmentReceiptData>>(`/appointments/${id}/receipt-data`)
      .then((r) => r.data.data),
};
