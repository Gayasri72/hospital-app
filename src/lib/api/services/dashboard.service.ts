import { apiClient } from "../client";
import type { DashboardData } from "@/types";

export const dashboardService = {
  // GET /dashboard — backend spreads data at root: { success: true, ...data }
  get: () =>
    apiClient
      .get<DashboardData & { success: boolean }>("/dashboard")
      .then((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { success: _s, ...rest } = r.data as unknown as Record<string, unknown>;
        return rest as unknown as DashboardData;
      }),
};
