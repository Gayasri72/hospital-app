import { apiClient } from "../client";
import type {
  AddPaymentTransactionRequest,
  ApiListResponse,
  ApiSuccess,
  CreatePaymentRequest,
  Payment,
  PaymentQueryParams,
  PaginatedResult,
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

export const paymentsService = {
  list: (params?: PaymentQueryParams) =>
    apiClient
      .get<ApiListResponse<Payment>>("/payments", { params })
      .then(fromList),

  get: (id: string) =>
    apiClient.get<ApiSuccess<Payment>>(`/payments/${id}`).then((r) => r.data.data),

  getByAppointment: (appointmentId: string) =>
    apiClient
      .get<ApiSuccess<Payment>>(`/payments/appointment/${appointmentId}`)
      .then((r) => r.data.data),

  create: (body: CreatePaymentRequest) =>
    apiClient.post<ApiSuccess<Payment>>("/payments", body).then((r) => r.data.data),

  addTransaction: (id: string, body: AddPaymentTransactionRequest) =>
    apiClient
      .post<ApiSuccess<Payment>>(`/payments/${id}/transactions`, body)
      .then((r) => r.data.data),

  recalculate: (id: string) =>
    apiClient
      .post<ApiSuccess<Payment>>(`/payments/${id}/recalculate`)
      .then((r) => r.data.data),
};
