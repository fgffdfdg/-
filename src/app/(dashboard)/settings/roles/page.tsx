"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/lib/org";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  getRoleDisplayName,
  getRoleBadgeColor,
  createEmptyPermissions,
  MODULE_DEFINITIONS,
  isSystemRole,
} from "@/lib/org/permissions";
import type { OrganizationRole, PermissionConfig, ModuleName } from "@/lib/org/types";

export default function RolesPage() {
  const { organization } = useOrg();
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPermissions, setEditPermissions] = useState<PermissionConfig>(createEmptyPermissions());
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!organization) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/organizations/${organization.id}/roles`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openEdit = useCallback((role: OrganizationRole) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditDesc(role.description || "");
    setEditPermissions(role.permissions as unknown as PermissionConfig);
    setEditDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || !editingRole) return;
    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch(`/api/organizations/${organization.id}/roles/${editingRole.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          permissions: editPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("角色已更新");
      setEditDialogOpen(false);
      await fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [organization, editingRole, editName, editDesc, editPermissions, fetchRoles]);

  const handleCreate = useCallback(async () => {
    if (!organization || !editName) return;
    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch(`/api/organizations/${organization.id}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          permissions: editPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("角色已创建");
      setCreateOpen(false);
      await fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }, [organization, editName, editDesc, editPermissions, fetchRoles]);

  const handleDelete = useCallback(async (roleId: string) => {
    if (!organization) return;
    if (!confirm("确定要删除该角色吗？")) return;

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch(`/api/organizations/${organization.id}/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("角色已删除");
      await fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }, [organization, fetchRoles]);

  const toggleModulePermission = useCallback(
    (moduleKey: string, permKey: string) => {
      setEditPermissions((prev) => {
        const mod = prev.modules[moduleKey] || { view: false };
        return {
          ...prev,
          modules: {
            ...prev.modules,
            [moduleKey]: { ...mod, [permKey]: !mod[permKey as keyof typeof mod] },
          },
        };
      });
    },
    []
  );

  const toggleAdminPermission = useCallback((key: string) => {
    setEditPermissions((prev) => ({
      ...prev,
      admin: { ...prev.admin, [key]: !prev.admin[key as keyof typeof prev.admin] },
    }));
  }, []);

  const toggleDataPermission = useCallback((key: string) => {
    setEditPermissions((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: !prev.data[key as keyof typeof prev.data] },
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  return (
    <div className="space-y-6">
      {/* System Roles */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">系统预设角色</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemRoles.map((role) => (
            <Card key={role.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={getRoleBadgeColor(role.name)}>{getRoleDisplayName(role.name)}</Badge>
                    <p className="text-sm text-muted-foreground mt-2">{role.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(role.permissions as unknown as PermissionConfig).map(([key, val]) => {
                    if (key === "modules") {
                      const enabledModules = Object.entries(val as Record<string, { view: boolean }>)
                        .filter(([, v]) => v.view)
                        .map(([k]) => MODULE_DEFINITIONS[k as ModuleName]?.label || k);
                      return (
                        <span key={key} className="text-xs text-muted-foreground">
                          {enabledModules.length} 个模块
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">自定义角色</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingRole(null);
              setEditName("");
              setEditDesc("");
              setEditPermissions(createEmptyPermissions());
              setCreateOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            新建角色
          </Button>
        </div>

        {customRoles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">暂无自定义角色</p>
              <p className="text-xs text-muted-foreground mt-1">创建自定义角色以满足特殊权限需求</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {customRoles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen || createOpen} onOpenChange={(open) => { setEditDialogOpen(open); setCreateOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "编辑角色" : "新建角色"}</DialogTitle>
            <DialogDescription>
              {editingRole && isSystemRole(editingRole.name)
                ? "系统预设角色的名称不可修改"
                : "配置角色的权限范围"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色名称</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editingRole?.is_system && isSystemRole(editingRole.name)}
                  placeholder="输入角色名称"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="角色描述"
                />
              </div>
            </div>

            {/* Module Permissions */}
            <div>
              <Label className="text-sm font-medium">功能模块权限</Label>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px] gap-2 text-xs text-muted-foreground px-2 py-1">
                  <span>模块</span>
                  <span className="text-center">查看</span>
                  <span className="text-center">创建</span>
                  <span className="text-center">编辑</span>
                  <span className="text-center">删除</span>
                  <span className="text-center">导出</span>
                </div>
                {Object.entries(MODULE_DEFINITIONS).map(([key, def]) => {
                  const perm = editPermissions.modules[key] || { view: false };
                  const hasCrud = perm.create !== undefined;
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_60px_60px_60px_60px_60px] gap-2 items-center px-2 py-1.5 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm">{def.label}</span>
                      <div className="flex justify-center">
                        <Switch
                          checked={perm.view || false}
                          onCheckedChange={() => toggleModulePermission(key, "view")}
                        />
                      </div>
                      {hasCrud ? (
                        <>
                          <div className="flex justify-center">
                            <Switch
                              checked={perm.create || false}
                              onCheckedChange={() => toggleModulePermission(key, "create")}
                              disabled={!perm.view}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Switch
                              checked={perm.edit || false}
                              onCheckedChange={() => toggleModulePermission(key, "edit")}
                              disabled={!perm.view}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Switch
                              checked={perm.delete || false}
                              onCheckedChange={() => toggleModulePermission(key, "delete")}
                              disabled={!perm.view}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Switch
                              checked={perm.export || false}
                              onCheckedChange={() => toggleModulePermission(key, "export")}
                              disabled={!perm.view}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="col-span-4 text-xs text-muted-foreground text-center">仅查看</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Permissions */}
            <div>
              <Label className="text-sm font-medium">管理权限</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { key: "manage_members", label: "管理成员" },
                  { key: "manage_roles", label: "管理角色" },
                  { key: "manage_settings", label: "管理设置" },
                  { key: "view_analytics", label: "查看统计" },
                  { key: "manage_billing", label: "管理计费" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={editPermissions.admin[key as keyof typeof editPermissions.admin]}
                      onCheckedChange={() => toggleAdminPermission(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Data Permissions */}
            <div>
              <Label className="text-sm font-medium">数据权限</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { key: "can_export", label: "导出数据" },
                  { key: "can_import", label: "导入数据" },
                  { key: "can_share", label: "分享数据" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={editPermissions.data[key as keyof typeof editPermissions.data]}
                      onCheckedChange={() => toggleDataPermission(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setEditDialogOpen(false); setCreateOpen(false); }}
              >
                取消
              </Button>
              <Button onClick={createOpen ? handleCreate : handleSave} disabled={saving || !editName}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {createOpen ? "创建" : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
