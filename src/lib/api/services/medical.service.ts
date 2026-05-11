import { apiClient } from "../client";
import type {
  ApiSuccess,
  CreateMedicalRecordRequest,
  DoctorMedicalRecordItem,
  MedicalRecord,
  PatientMedicalHistoryItem,
  PaginatedResult,
} from "@/types";

// Medical list endpoints wrap paginated data as sendSuccess({ data: { data:[], total, page, limit } })
// so r.data.data = { data: T[], total, page, limit }
function fromMedicalList<T>(r: { data: ApiSuccess<{ data: T[]; total: number; page: number; limit: number }> }): PaginatedResult<T> {
  const inner = r.data.data;
  return {
    data: inner.data,
    meta: {
      total: inner.total,
      page: inner.page,
      limit: inner.limit,
      totalPages: Math.ceil(inner.total / inner.limit),
    },
  };
}

export const medicalService = {
  // GET /patients/:patient_id/medical-records
  listByPatient: (patientId: string, params?: { page?: number; limit?: number; from?: string; to?: string; doctor_id?: string }) =>
    apiClient
      .get<ApiSuccess<{ data: PatientMedicalHistoryItem[]; total: number; page: number; limit: number }>>(`/patients/${patientId}/medical-records`, { params })
      .then(fromMedicalList<PatientMedicalHistoryItem>),

  // GET /doctors/:doctor_id/medical-records
  listByDoctor: (doctorId: string, params?: { page?: number; limit?: number; from?: string; to?: string; patient_id?: string }) =>
    apiClient
      .get<ApiSuccess<{ data: DoctorMedicalRecordItem[]; total: number; page: number; limit: number }>>(`/doctors/${doctorId}/medical-records`, { params })
      .then(fromMedicalList<DoctorMedicalRecordItem>),

  // GET /medical-records/:id
  get: (id: string) =>
    apiClient.get<ApiSuccess<MedicalRecord>>(`/medical-records/${id}`).then((r) => r.data.data),

  // GET /medical-records/appointment/:appointment_id
  getByAppointment: (appointmentId: string) =>
    apiClient
      .get<ApiSuccess<MedicalRecord>>(`/medical-records/appointment/${appointmentId}`)
      .then((r) => r.data.data),

  // POST /medical-records
  create: (body: CreateMedicalRecordRequest) =>
    apiClient.post<ApiSuccess<MedicalRecord>>("/medical-records", body).then((r) => r.data.data),

  // PUT /medical-records/:id
  update: (id: string, body: Partial<CreateMedicalRecordRequest>) =>
    apiClient
      .put<ApiSuccess<MedicalRecord>>(`/medical-records/${id}`, body)
      .then((r) => r.data.data),
};
