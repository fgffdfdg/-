"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/lib/org";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CreateOrgPage() {
  const router = useRouter();
  const { refreshOrganization } = useOrg();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    industry: "",
    contact_email: "",
  });

  const sanitizeSlug = useCallback((raw: string) => {
    return raw
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  }, []);

  const handleSlugChange = useCallback((name: string) => {
    return sanitizeSlug(name);
  }, [sanitizeSlug]);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("请输入组织名称");
      return;
    }

    const slug = form.slug || handleSlugChange(form.name);
    if (!slug || slug.length < 3) {
      toast.error("组织标识至少需要3个字符");
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("未登录");

      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          industry: form.industry || null,
          contact_email: form.contact_email || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("组织创建成功");
      await refreshOrganization();
      router.push("/settings/organization");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }, [form, handleSlugChange, refreshOrganization, router]);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">创建你的组织</h1>
        <p className="text-sm text-muted-foreground mt-2">
          创建一个组织来管理团队成员和业务数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>组织信息</CardTitle>
          <CardDescription>填写企业基本信息，创建后可随时修改</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">组织名称 *</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: f.slug || handleSlugChange(name),
                }));
              }}
              placeholder="例如：深圳前海汽车出口有限公司"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">组织标识</Label>
            <Input
              id="org-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: sanitizeSlug(e.target.value) }))}
              placeholder="自动生成，可手动修改"
            />
            <p className="text-xs text-muted-foreground">
              用于 URL 标识，输入会自动转换为小写字母、数字和连字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-industry">行业类型</Label>
            <select
              id="org-industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">请选择</option>
              <option value="used_car_export">二手车出口</option>
              <option value="foreign_trade">外贸公司</option>
              <option value="logistics">物流服务</option>
              <option value="customs_broker">报关行</option>
              <option value="other">其他</option>
            </select>
          </div>

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

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            创建组织
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
