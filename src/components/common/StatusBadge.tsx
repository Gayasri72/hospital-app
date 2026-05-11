import { cn } from "@/lib/utils";
import type { AppointmentStatus, PaymentStatus, SessionStatus } from "@/types";

type Status = AppointmentStatus | PaymentStatus | SessionStatus | "active" | "inactive";

const STYLES: Record<Status, string> = {
  // Appointment
  booked: "bg-sky-100 text-sky-700",
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  arrived: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
  // Payment
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-purple-100 text-purple-700",
  // Session
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  full: "bg-orange-100 text-orange-700",
  // Generic
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
};

const LABELS: Record<Status, string> = {
  booked: "Booked",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
  refunded: "Refunded",
  open: "Open",
  closed: "Closed",
  full: "Full",
  active: "Active",
  inactive: "Inactive",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-gray-100 text-gray-600",
        className
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
