import { apiClient } from "../client";
import type {
  ApiListResponse,
  ApiSuccess,
  CreateDoctorRequest,
  Doctor,
  DoctorFee,
  DoctorQueryParams,
  PaginatedResult,
  SetDoctorFeeRequest,
  UpdateDoctorRequest,
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

export const doctorsService = {
  list: (params?: DoctorQueryParams) =>
    apiClient
      .get<ApiListResponse<Doctor>>("/doctors", { params })
      .then(fromList),

  get: (id: string) =>
    apiClient.get<ApiSuccess<Doctor>>(`/doctors/${id}`).then((r) => r.data.data),

  create: (body: CreateDoctorRequest) =>
    apiClient.post<ApiSuccess<Doctor>>("/doctors", body).then((r) => r.data.data),

  update: (id: string, body: UpdateDoctorRequest) =>
    apiClient.put<ApiSuccess<Doctor>>(`/doctors/${id}`, body).then((r) => r.data.data),

  // POST /doctors/:id/fees — body: { consultation_fee, effective_from? }
  setFee: (id: string, body: SetDoctorFeeRequest) =>
    apiClient.post<ApiSuccess<DoctorFee>>(`/doctors/${id}/fees`, body).then((r) => r.data.data),

  getFeeHistory: (id: string) =>
    apiClient.get<ApiSuccess<DoctorFee[]>>(`/doctors/${id}/fees`).then((r) => r.data.data),
};
