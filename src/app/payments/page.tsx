"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CreditCard, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { paymentsService } from "@/lib/api/services/payments.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { usePermissions } from "@/hooks/usePermissions";
import { CAN_MANAGE_PAYMENTS } from "@/config/roles";
import { useState } from "react";
import type { PaymentStatus } from "@/types";

export default function PaymentsPage() {
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_PAYMENTS);

  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { status: filterStatus, page }],
    queryFn: () => paymentsService.list({ status: filterStatus || undefined, page, limit: 20 }),
  });

  const recalcMutation = useMutation({
    mutationFn: (id: string) => paymentsService.recalculate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); toast.success("Payment recalculated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const STATUSES: Array<PaymentStatus | ""> = ["", "pending", "partial", "paid", "refunded"];

  return (
    <DashboardShell title="Payments">
      <PageHeader
        title="Payments"
        description="View and manage payment records"
        actions={
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as PaymentStatus | ""); setPage(1); }}
            className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none">
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All statuses"}</option>)}
          </select>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={CreditCard} title="No payments found" description="Payments will appear here once appointments are completed." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Queue #</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((payment, index) => {
                    const balance = parseFloat(payment.total_amount) - parseFloat(payment.amount_paid);
                    return (
                      <tr key={payment.payment_id || `row-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {payment.appointment?.queue_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {payment.appointment?.patient?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(payment.total_amount)}</td>
                        <td className="px-4 py-3 text-green-700">{formatCurrency(payment.amount_paid)}</td>
                        <td className={`px-4 py-3 font-medium ${balance > 0 ? "text-red-600" : "text-gray-500"}`}>
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(payment.updated_at)}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => recalcMutation.mutate(payment.payment_id)}
                              disabled={recalcMutation.isPending}
                              title="Recalculate from appointment fee snapshot"
                              className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Showing {data.data.length} of {data.meta.total} payments</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="flex items-center px-2 text-sm text-gray-600">{page} / {data.meta.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
