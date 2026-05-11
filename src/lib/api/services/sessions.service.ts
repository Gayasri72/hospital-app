import { apiClient } from "../client";
import type {
  ApiListResponse,
  ApiSuccess,
  ChannelSession,
  CreateSessionRequest,
  PaginatedResult,
  SessionQueryParams,
  UpdateSessionRequest,
  UpdateSessionStatusRequest,
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

export const sessionsService = {
  list: (params?: SessionQueryParams) =>
    apiClient
      .get<ApiListResponse<ChannelSession>>("/sessions", { params })
      .then(fromList),

  get: (id: string) =>
    apiClient.get<ApiSuccess<ChannelSession>>(`/sessions/${id}`).then((r) => r.data.data),

  create: (body: CreateSessionRequest) =>
    apiClient.post<ApiSuccess<ChannelSession>>("/sessions", body).then((r) => r.data.data),

  update: (id: string, body: UpdateSessionRequest) =>
    apiClient.put<ApiSuccess<ChannelSession>>(`/sessions/${id}`, body).then((r) => r.data.data),

  // Status update: only "open", "closed", "cancelled" are accepted by backend
  updateStatus: (id: string, body: UpdateSessionStatusRequest) =>
    apiClient
      .patch<ApiSuccess<ChannelSession>>(`/sessions/${id}/status`, body)
      .then((r) => r.data.data),

  // Available sessions for appointment booking
  available: (params?: SessionQueryParams) =>
    apiClient
      .get<ApiListResponse<ChannelSession>>("/sessions/available", { params })
      .then(fromList),
};
