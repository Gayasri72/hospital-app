"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminService } from "@/lib/api/services/admin.service";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ApiRole, Permission } from "@/types";

// ── Role Form Modal ──────────────────────────────────────────────────────────

function RoleFormModal({
  open,
  onOpenChange,
  role,
  permissions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role?: ApiRole;
  permissions: Permission[];
}) {
  const qc = useQueryClient();
  const isEdit = !!role;
  const isSystem = role?.is_system_role ?? false;

  const [name, setName] = useState(role?.name ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(role?.permissions.map((p) => p.permission_id) ?? [])
  );
  const [submitting, setSubmitting] = useState(false);

  function handleOpen(v: boolean) {
    if (v) {
      setName(role?.name ?? "");
      setSelectedIds(new Set(role?.permissions.map((p) => p.permission_id) ?? []));
    }
    onOpenChange(v);
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSystem && !name.trim()) { toast.error("Role name is required"); return; }
    if (selectedIds.size === 0) { toast.error("Select at least one permission"); return; }
    setSubmitting(true);
    try {
      if (isEdit) {
        // For system roles, only send permission_ids — backend blocks name changes
        const body = isSystem
          ? { permission_ids: [...selectedIds] }
          : { name: name.trim(), permission_ids: [...selectedIds] };
        await adminService.updateRole(role.role_id, body);
        toast.success("Role updated");
      } else {
        await adminService.createRole({ name: name.trim(), permission_ids: [...selectedIds] });
        toast.success("Role created");
      }
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Group full permissions by module for the checklist
  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const mod = p.module ?? "General";
    (acc[mod] ??= []).push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Create Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Role Name {!isSystem && "*"}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nurse, Lab Technician"
              className="mt-1"
              readOnly={isSystem}
              disabled={isSystem}
            />
            {isSystem && (
              <p className="mt-1 text-xs text-amber-600">System role names cannot be changed.</p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Permissions *</Label>
            <div className="space-y-4 rounded-lg border border-gray-200 p-3">
              {Object.entries(byModule).map(([mod, perms]) => (
                <div key={mod}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">{mod}</p>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <label key={p.permission_id} className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.permission_id)}
                          onChange={() => toggle(p.permission_id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-gray-400">{p.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {selectedIds.size} permission{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiRole | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ApiRole | undefined>();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminService.listRoles(),
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => adminService.listPermissions(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role deleted");
      setDeleteTarget(undefined);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(role: ApiRole) {
    setEditTarget(role);
    setModalOpen(true);
  }

  const isLoading = rolesLoading || permsLoading;

  return (
    <DashboardShell title="Roles">
      <PageHeader
        title="Role Management"
        description="Create roles and assign permissions"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Role
          </Button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : roles.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No roles found"
            action={<Button onClick={openCreate} size="sm"><Plus className="mr-2 h-4 w-4" />Create Role</Button>}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {roles.map((role) => {
              const permCount = role.permissions?.length ?? 0;
              const userCount = role.user_count ?? 0;
              const isSystem = role.is_system_role;
              return (
                <div key={role.role_id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <KeyRound className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{role.name}</p>
                        {isSystem && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {permCount} permission{permCount !== 1 ? "s" : ""} · {userCount} user{userCount !== 1 ? "s" : ""}
                      </p>
                      {permCount > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(role.permissions ?? []).slice(0, 6).map((p) => (
                            <span key={p.permission_id}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {p.name}
                            </span>
                          ))}
                          {permCount > 6 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              +{permCount - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <button
                      onClick={() => openEdit(role)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title={isSystem ? "Edit permissions (name is locked)" : "Edit role"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(role)}
                      disabled={isSystem || userCount > 0}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      title={isSystem ? "System roles cannot be deleted" : userCount > 0 ? "Cannot delete a role with assigned users" : "Delete role"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RoleFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        role={editTarget}
        permissions={permissions}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(undefined)}
        title="Delete Role"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.role_id)}
      />
    </DashboardShell>
  );
}
