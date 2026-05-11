import { apiClient } from "../client";
import type { ApiSuccess, Branch } from "@/types";

export const branchesService = {
  list: () =>
    apiClient.get<ApiSuccess<Branch[]>>("/branches").then((r) => r.data.data),

  create: (body: { name: string; location?: string }) =>
    apiClient.post<ApiSuccess<Branch>>("/branches", body).then((r) => r.data.data),

  update: (id: string, body: { name?: string; location?: string | null }) =>
    apiClient.put<ApiSuccess<Branch>>(`/branches/${id}`, body).then((r) => r.data.data),

  delete: (id: string) =>
    apiClient.delete<ApiSuccess<null>>(`/branches/${id}`).then((r) => r.data),
};
