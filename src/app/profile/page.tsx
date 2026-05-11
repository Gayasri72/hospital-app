"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Mail, Building2, Stethoscope, ShieldCheck,
  Calendar, Hash, BadgeCheck, Pencil,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils/format";

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Super Admin":    { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200" },
  "Hospital Admin": { bg: "bg-blue-100",   text: "text-blue-700",   ring: "ring-blue-200" },
  "Receptionist":   { bg: "bg-teal-100",   text: "text-teal-700",   ring: "ring-teal-200" },
  "Doctor":         { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" },
  "Accountant":     { bg: "bg-amber-100",  text: "text-amber-700",  ring: "ring-amber-200" },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        {label}
      </div>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled: isAuthenticated,
  });

  if (isLoading) return <DashboardShell title="My Profile"><PageLoader /></DashboardShell>;
  if (!profile) return <DashboardShell title="My Profile"><p className="text-sm text-gray-500">Unable to load profile.</p></DashboardShell>;

  const roleColor = ROLE_COLORS[profile.role.name] ?? { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-200" };
  const initials = profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isActive = profile.status === "ACTIVE";

  return (
    <DashboardShell title="My Profile">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Hero card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-3">
              <div className={`flex h-16 w-16 items-center justify-center rounded-xl ring-4 ring-white shadow ${roleColor.bg}`}>
                <span className={`text-xl font-bold ${roleColor.text}`}>{initials}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${roleColor.bg} ${roleColor.text} ${roleColor.ring}`}>
                  <ShieldCheck className="h-3 w-3" />{profile.role.name}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-red-50 text-red-600 ring-1 ring-red-200"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{profile.name}</h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Account</p>
            <InfoRow icon={Mail}       label="Email"        value={profile.email} />
            <InfoRow icon={ShieldCheck} label="Role"        value={profile.role.name} />
            <InfoRow icon={BadgeCheck} label="Status"       value={<span className={`font-semibold ${isActive ? "text-green-600" : "text-red-500"}`}>{isActive ? "Active" : "Inactive"}</span>} />
            <InfoRow icon={Calendar}   label="Member Since" value={formatDate(profile.created_at)} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">System</p>
            <InfoRow icon={Building2} label="Hospital"   value={profile.hospital?.name ?? <span className="text-gray-400">—</span>} />
            <InfoRow icon={Hash}      label="User ID"    value={<span className="font-mono text-xs text-gray-500">{profile.user_id.slice(0, 8)}…</span>} />
            {profile.hospital_id && (
              <InfoRow icon={Hash} label="Hospital ID" value={<span className="font-mono text-xs text-gray-500">{profile.hospital_id.slice(0, 8)}…</span>} />
            )}
          </div>
        </div>

        {/* Doctor profile */}
        {profile.doctor && (
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Doctor Profile</p>
              <Link href={`/doctors/${profile.doctor.doctor_id}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5">
                  <Pencil className="h-3 w-3" />Edit Profile
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                <Stethoscope className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Dr. {profile.doctor.name}</p>
                <p className="text-sm text-indigo-600">{profile.doctor.specialization}</p>
              </div>
              <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.doctor.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${profile.doctor.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                {profile.doctor.status.charAt(0).toUpperCase() + profile.doctor.status.slice(1)}
              </span>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
