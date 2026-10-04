"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/lib/org";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/lib/org/types";

const industryOptions = [
  { value: "used_car_export", label: "二手车出口" },
  { value: "foreign_trade", label: "外贸公司" },
  { value: "logistics", label: "物流服务" },
  { value: "customs_broker", label: "报关行" },
  { value: "other", label: "其他" },
];

export default function OrganizationSettingsPage() {
  const { organization, refreshOrganization } = useOrg();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || "",
        industry: organization.industry || "",
        contact_email: organization.contact_email || "",
        contact_phone: organization.contact_phone || "",
      });
    }
  }, [organization]);

  const handleSave = useCallback(async () => {
    if (!organization) return;
    if (!form.name.trim()) {
      toast.error("组织名称不能为空");
      return;
    }

    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          industry: form.industry || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshOrganization();
      toast.success("保存成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [organization, form, refreshOrganization, toast]);

  if (!organization) return null;

  const planLabels: Record<string, string> = {
    free: "免费版",
    basic: "基础版",
    pro: "专业版",
    enterprise: "企业版",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            基本信息
          </CardTitle>
          <CardDescription>管理企业的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">组织名称 *</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="输入企业名称"
              />
            </div>
            <div className="space-y-2">
              <Label>组织标识</Label>
              <Input value={organization.slug} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">标识创建后不可修改</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-industry">行业类型</Label>
              <select
                id="org-industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">请选择</option>
                {industryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>当前套餐</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{planLabels[organization.plan_type] || organization.plan_type}</Badge>
                <span className="text-xs text-muted-foreground">
                  最多 {organization.max_members} 名成员
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-email">联系邮箱</Label>
              <Input
                id="org-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                placeholder="company@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">联系电话</Label>
              <Input
                id="org-phone"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="021-12345678"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存修改
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
