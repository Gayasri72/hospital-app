import { apiClient } from "../client";
import type { ApiSuccess, Branch } from "@/types";

export const branchesService = {
  list: () =>
    apiClient.get<ApiSuccess<Branch[]>>("/branches").then((r) => r.data.data),
};
