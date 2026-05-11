import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, pattern);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function formatTime(time: string): string {
  // Accepts "HH:mm:ss" or "HH:mm"
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

export function formatCurrency(amount: string | number | null | undefined, currency = "Rs"): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return `${currency} ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
