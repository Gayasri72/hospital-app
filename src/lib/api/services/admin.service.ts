import { apiClient } from "../client";
import type {
  ApiListResponse,
  ApiRole,
  ApiSuccess,
  CreateUserRequest,
  PaginatedResult,
  Permission,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
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

export const adminService = {
  // ── Permissions ────────────────────────────────────────────────────────────

  listPermissions: () =>
    apiClient
      .get<ApiSuccess<Permission[]>>("/admin/permissions")
      .then((r) => r.data.data),

  // ── Roles ──────────────────────────────────────────────────────────────────

  listRoles: () =>
    apiClient
      .get<ApiSuccess<ApiRole[]>>("/admin/roles")
      .then((r) => r.data.data),

  getRole: (id: number) =>
    apiClient
      .get<ApiSuccess<ApiRole>>(`/admin/roles/${id}`)
      .then((r) => r.data.data),

  createRole: (body: { name: string; permission_ids: number[] }) =>
    apiClient
      .post<ApiSuccess<ApiRole>>("/admin/roles", body)
      .then((r) => r.data.data),

  updateRole: (id: number, body: { name?: string; permission_ids?: number[] }) =>
    apiClient
      .put<ApiSuccess<ApiRole>>(`/admin/roles/${id}`, body)
      .then((r) => r.data.data),

  deleteRole: (id: number) =>
    apiClient
      .delete<ApiSuccess<null>>(`/admin/roles/${id}`)
      .then((r) => r.data),

  // ── Users ──────────────────────────────────────────────────────────────────

  listUsers: (params?: { search?: string; role_id?: number; status?: "ACTIVE" | "INACTIVE"; page?: number; limit?: number }) =>
    apiClient
      .get<ApiListResponse<User>>("/admin/users", { params })
      .then(fromList),

  getUser: (id: string) =>
    apiClient.get<ApiSuccess<User>>(`/admin/users/${id}`).then((r) => r.data.data),

  createUser: (body: CreateUserRequest) =>
    apiClient.post<ApiSuccess<User>>("/admin/users", body).then((r) => r.data.data),

  updateUser: (id: string, body: UpdateUserRequest) =>
    apiClient.put<ApiSuccess<User>>(`/admin/users/${id}`, body).then((r) => r.data.data),

  setUserStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    apiClient
      .patch<ApiSuccess<User>>(`/admin/users/${id}/status`, { status })
      .then((r) => r.data.data),

  resetPassword: (body: ResetPasswordRequest) =>
    apiClient
      .patch<ApiSuccess<null>>(`/admin/users/${body.userId}/password`, {
        new_password: body.newPassword,
      })
      .then((r) => r.data),
};
