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
import { Users, Plus, Loader2, MoreHorizontal, UserX, UserCheck, Shield, Copy, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/org/permissions";
import type { MemberWithProfile, OrganizationRole } from "@/lib/org/types";

export default function MembersPage() {
  const { organization, refreshOrganization } = useOrg();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!organization) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [membersRes, rolesRes] = await Promise.all([
        fetch(`/api/organizations/${organization.id}/members`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/organizations/${organization.id}/roles`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const membersData = await membersRes.json();
      const rolesData = await rolesRes.json();

      if (membersData.success) setMembers(membersData.data);
      if (rolesData.success) {
        setRoles(rolesData.data);
        const defaultRole = rolesData.data.find((r: OrganizationRole) => r.is_default);
        if (defaultRole && !inviteRoleId) setInviteRoleId(defaultRole.id);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [organization, inviteRoleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = useCallback(async () => {
    if (!organization || !inviteEmail || !inviteRoleId) return;

    setInviting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role_id: inviteRoleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteUrl(data.data.invite_url);
      setInviteEmail("");
      toast.success("邀请已创建");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "邀请失败");
    } finally {
      setInviting(false);
    }
  }, [organization, inviteEmail, inviteRoleId]);

  const handleCopyUrl = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  }, [inviteUrl]);

  const handleMemberAction = useCallback(async (memberId: string, action: string, roleId?: string) => {
    if (!organization) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const body: Record<string, string> = { action };
      if (roleId) body.role_id = roleId;

      const res = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(action === "suspend" ? "已停用" : action === "activate" ? "已激活" : "角色已更新");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
    setActionMenuId(null);
  }, [organization, fetchData]);

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.user?.email?.toLowerCase().includes(q) ||
           m.role?.name?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              团队成员
            </CardTitle>
            <CardDescription>
              共 {members.length} 名成员 / 上限 {organization?.max_members} 人
            </CardDescription>
          </div>
          <Button onClick={() => { setInviteOpen(true); setInviteUrl(null); }}>
            <Plus className="h-4 w-4 mr-2" />
            邀请成员
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索成员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {(member.user?.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user?.email || "未知用户"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.joined_at ? `加入于 ${new Date(member.joined_at).toLocaleDateString("zh-CN")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(member.role?.name || "")}>
                    {getRoleDisplayName(member.role?.name || "")}
                  </Badge>
                  {member.status === "suspended" && (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      已停用
                    </Badge>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === member.id ? null : member.id)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {actionMenuId === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                        {member.status === "active" && member.role?.name !== "owner" && (
                          <>
                            <button
                              onClick={() => handleMemberAction(member.id, "suspend")}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              停用成员
                            </button>
                            <button
                              onClick={() => {
                                const nextRole = roles.find((r) => r.id !== member.role_id && r.is_system);
                                if (nextRole) handleMemberAction(member.id, "change_role", nextRole.id);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              切换角色
                            </button>
                          </>
                        )}
                        {member.status === "suspended" && (
                          <button
                            onClick={() => handleMemberAction(member.id, "activate")}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            重新激活
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "没有找到匹配的成员" : "暂无成员"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteUrl(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>
              通过邀请链接邀请新成员加入组织
            </DialogDescription>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">邀请链接已生成</p>
                <div className="flex items-center gap-2">
                  <Input value={inviteUrl} readOnly className="text-xs bg-background" />
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  将链接发送给被邀请人，链接 72 小时后过期
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setInviteUrl(null)}>
                继续邀请
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">邮箱地址</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>分配角色</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.filter((r) => r.is_system).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setInviteRoleId(role.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        inviteRoleId === role.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{getRoleDisplayName(role.name)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                生成邀请链接
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
