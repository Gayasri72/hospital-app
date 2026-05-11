"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, Pencil, KeyRound, UserX, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminService } from "@/lib/api/services/admin.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate } from "@/lib/utils/format";
import { createUserSchema, updateUserSchema, resetPasswordSchema, type CreateUserFormValues, type UpdateUserFormValues, type ResetPasswordFormValues } from "@/lib/validators/user.schema";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/store/auth.store";
import { CAN_MANAGE_USERS, CREATABLE_ROLES, ROLE_LABELS } from "@/config/roles";
import type { Role, User } from "@/types";

function UserFormModal({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user?: User }) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isEdit = !!user;
  const [showPassword, setShowPassword] = useState(false);

  const creatableRoleNames: Role[] = currentUser ? CREATABLE_ROLES[currentUser.role] : [];

  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminService.listRoles(),
    enabled: open,
  });

  const availableRoles = isEdit
    ? roles
    : roles.filter((r) => creatableRoleNames.includes(r.name as Role));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: user
      ? { name: user.name, email: user.email, role_id: String(user.role.role_id) }
      : {},
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormValues) =>
      adminService.createUser({ ...data, role_id: Number(data.role_id) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("User created"); onOpenChange(false); reset(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserFormValues) =>
      adminService.updateUser(user!.user_id, {
        name: data.name,
        email: data.email,
        ...(data.role_id ? { role_id: Number(data.role_id) } : {}),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("User updated"); onOpenChange(false); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => isEdit ? updateMutation.mutate(v as unknown as UpdateUserFormValues) : createMutation.mutate(v as unknown as CreateUserFormValues))} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input {...register("name")} className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{(errors as Record<string, {message?: string}>).name?.message}</p>}
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" {...register("email")} className="mt-1" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{(errors as Record<string, {message?: string}>).email?.message}</p>}
          </div>
          {!isEdit && (
            <div>
              <Label>Password *</Label>
              <div className="relative mt-1">
                <Input type={showPassword ? "text" : "password"} {...register("password" as keyof CreateUserFormValues)} className="pr-9" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(errors as Record<string, {message?: string}>).password && <p className="mt-1 text-xs text-red-600">{(errors as Record<string, {message?: string}>).password?.message}</p>}
            </div>
          )}
          <div>
            <Label>Role *</Label>
            <select {...register("role_id")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select role</option>
              {availableRoles.map((r) => (
                <option key={r.role_id} value={r.role_id}>{ROLE_LABELS[r.name as Role] ?? r.name}</option>
              ))}
            </select>
            {(errors as Record<string, {message?: string}>).role_id && <p className="mt-1 text-xs text-red-600">{(errors as Record<string, {message?: string}>).role_id?.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : isEdit ? "Save" : "Create User"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user?: User }) {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordFormValues) => adminService.resetPassword({ userId: user!.user_id, newPassword: data.newPassword }),
    onSuccess: () => { toast.success("Password reset successfully"); onOpenChange(false); reset(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => resetMutation.mutate(v))} className="space-y-4">
          <div>
            <Label>New Password *</Label>
            <div className="relative mt-1">
              <Input type={showNew ? "text" : "password"} {...register("newPassword")} className="pr-9" />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label>Confirm Password *</Label>
            <div className="relative mt-1">
              <Input type={showConfirm ? "text" : "password"} {...register("confirmPassword")} className="pr-9" />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Resetting…" : "Reset Password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { can } = usePermissions();
  const canManage = can(CAN_MANAGE_USERS);

  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | undefined>();
  const [resetTarget, setResetTarget] = useState<User | undefined>();
  const [deactivateTarget, setDeactivateTarget] = useState<User | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminService.listUsers({ limit: 100 }),
    enabled: canManage,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminService.setUserStatus(id, "INACTIVE"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("User deactivated"); setDeactivateTarget(undefined); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!canManage) {
    return (
      <DashboardShell title="Users">
        <EmptyState icon={ShieldCheck} title="Access Restricted" description="You don't have permission to manage users." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Users">
      <PageHeader
        title="User Management"
        description="Create and manage system users"
        actions={
          <Button onClick={() => { setEditTarget(undefined); setModalOpen(true); }} size="sm">
            <Plus className="mr-2 h-4 w-4" />Create User
          </Button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={ShieldCheck} title="No users found"
            action={<Button onClick={() => setModalOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Create User</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role.name as Role] ?? user.role.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={user.status === "ACTIVE" ? "active" : "inactive"} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditTarget(user); setModalOpen(true); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setResetTarget(user)}
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Reset password">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {user.status === "ACTIVE" && (
                          <button onClick={() => setDeactivateTarget(user)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Deactivate">
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal open={modalOpen} onOpenChange={setModalOpen} user={editTarget} />
      <ResetPasswordModal open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(undefined)} user={resetTarget} />
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(undefined)}
        title="Deactivate User"
        description={`Deactivate "${deactivateTarget?.name}"? They will lose access to the system.`}
        confirmLabel="Deactivate"
        isLoading={deactivateMutation.isPending}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.user_id)}
      />
    </DashboardShell>
  );
}
