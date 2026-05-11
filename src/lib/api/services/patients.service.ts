import { apiClient } from "../client";
import type {
  ApiListResponse,
  ApiSuccess,
  CreatePatientRequest,
  Patient,
  PatientQueryParams,
  PaginatedResult,
  UpdatePatientRequest,
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

export const patientsService = {
  list: (params?: PatientQueryParams) =>
    apiClient
      .get<ApiListResponse<Patient>>("/patients", { params })
      .then(fromList),

  get: (id: string) =>
    apiClient.get<ApiSuccess<Patient>>(`/patients/${id}`).then((r) => r.data.data),

  create: (body: CreatePatientRequest) =>
    apiClient.post<ApiSuccess<Patient>>("/patients", body).then((r) => r.data.data),

  update: (id: string, body: UpdatePatientRequest) =>
    apiClient.put<ApiSuccess<Patient>>(`/patients/${id}`, body).then((r) => r.data.data),
};
