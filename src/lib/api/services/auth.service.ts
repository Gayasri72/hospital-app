import { apiClient } from "../client";
import type { ApiSuccess, LoginRequest, LoginResponse, ProfileUser } from "@/types";

export const authService = {
  login: (body: LoginRequest) =>
    apiClient.post<ApiSuccess<LoginResponse>>("/auth/login", body).then((r) => r.data.data),

  refresh: () =>
    apiClient.post<ApiSuccess<{ accessToken: string }>>("/auth/refresh").then((r) => r.data.data),

  logout: () =>
    apiClient.post<ApiSuccess<null>>("/auth/logout").then((r) => r.data),

  // Backend returns { data: { user: ProfileUser } }
  me: () =>
    apiClient.get<ApiSuccess<{ user: ProfileUser }>>("/auth/me").then((r) => r.data.data.user),
};
