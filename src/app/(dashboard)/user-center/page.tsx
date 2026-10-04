"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Plus, Trash2, Check, Loader2, User, Mail, Phone,
  Lock, Eye, EyeOff, Camera, Shield, KeyRound, Save, X, LogIn
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [type, setType] = useState<"success" | "error">("success");
  const toast = useCallback(({ title, variant }: { title: string; variant?: "success" | "error" }) => {
    setMsg(title);
    setType(variant || "success");
    setTimeout(() => setMsg(null), 3000);
  }, []);
  return {
    toast,
    ToastNode: msg ? (
      <div className={`fixed top-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm ${
        type === "error" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-card border-border text-foreground"
      }`}>
        {msg}
      </div>
    ) : null
  };
}

interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  company_name_en: string | null;
  social_credit_code: string | null;
  legal_person: string | null;
  contact: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  country: string | null;
  country_code: string | null;
  key_no: string | null;
  address: string | null;
  address_en: string | null;
  is_default: boolean;
}

interface BankAccount {
  id: string;
  user_id: string;
  account_name: string;
  account_name_en: string | null;
  bank_name: string;
  bank_name_en: string | null;
  account_number: string;
  swift_code: string | null;
  bank_address: string | null;
  bank_address_en: string | null;
  remark: string | null;
  is_default: boolean;
}

export default function UserCenterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast, ToastNode } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company state
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_name_en: "",
    social_credit_code: "",
    legal_person: "",
    contact: "",
    contact_phone: "",
    contact_email: "",
    country: "",
    country_code: "",
    key_no: "",
    address: "",
    address_en: "",
  });

  // Bank accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    account_name: "", account_name_en: "", bank_name: "", bank_name_en: "",
    account_number: "", swift_code: "", bank_address: "", bank_address_en: "", remark: "",
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();

      // Load user metadata
      const meta = user.user_metadata || {};
      setDisplayName(meta.display_name || meta.name || "");
      setPhone(user.phone || meta.phone || "");
      setEmail(user.email || meta.email || "");
      setAvatarUrl(meta.avatar_url || "");

      // Load company profiles
      const { data: companyData } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      setCompanies(companyData || []);

      // Load bank accounts
      const { data: accountData } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      setAccounts(accountData || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fill edit forms when data loads while in edit mode
  useEffect(() => {
    if (editingCompanyId && companies.length > 0) {
      const editing = companies.find(c => c.id === editingCompanyId);
      if (editing) {
        setCompanyForm({
          company_name: editing.company_name || "",
          company_name_en: editing.company_name_en || "",
          social_credit_code: editing.social_credit_code || "",
          legal_person: editing.legal_person || "",
          contact: editing.contact || "",
          contact_phone: editing.contact_phone || "",
          contact_email: editing.contact_email || "",
          country: editing.country || "",
          country_code: editing.country_code || "",
          key_no: editing.key_no || "",
          address: editing.address || "",
          address_en: editing.address_en || "",
        });
      }
    }
  }, [editingCompanyId, companies]);

  useEffect(() => {
    if (editingId && accounts.length > 0) {
      const editing = accounts.find(a => a.id === editingId);
      if (editing) {
        setForm({
          account_name: editing.account_name || "",
          account_name_en: editing.account_name_en || "",
          bank_name: editing.bank_name || "",
          bank_name_en: editing.bank_name_en || "",
          account_number: editing.account_number || "",
          swift_code: editing.swift_code || "",
          bank_address: editing.bank_address || "",
          bank_address_en: editing.bank_address_en || "",
          remark: editing.remark || "",
        });
      }
    }
  }, [editingId, accounts]);

  useEffect(() => { loadData(); }, [loadData]);

  // ========== Account functions ==========

  const saveAccountInfo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          name: displayName,
          phone: phone,
          avatar_url: avatarUrl,
        }
      });
      if (error) throw error;

      // Also update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          console.error("Email update failed:", emailError);
          toast({ title: "个人信息已保存，但邮箱修改需要验证", variant: "error" });
          setSaving(false);
          return;
        }
      }

      toast({ title: "个人信息已保存" });
    } catch (error) {
      console.error("Failed to save account:", error);
      toast({ title: "保存失败，请重试", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "图片大小不能超过2MB", variant: "error" });
      return;
    }

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-files")
        .getPublicUrl(path);

      setAvatarUrl(publicUrl);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      toast({ title: "头像已更新" });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast({ title: "头像上传失败", variant: "error" });
    }
  };

  const changePassword = async () => {
    if (!passwordForm.new || !passwordForm.confirm) {
      toast({ title: "请填写完整的密码信息", variant: "error" });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "两次输入的新密码不一致", variant: "error" });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "新密码至少6位", variant: "error" });
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      // Supabase requires the user to be logged in to change password
      // The updatePassword method sends a password reset email
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) throw error;

      toast({ title: "密码修改成功" });
      setShowPasswordDialog(false);
      setPasswordForm({ new: "", confirm: "" });
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({ title: "密码修改失败，请重试", variant: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  // ========== Company functions ==========

  const saveCompany = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();

      if (editingCompanyId) {
        const { error } = await supabase
          .from("company_profiles")
          .update({ ...companyForm, updated_at: new Date().toISOString() })
          .eq("id", editingCompanyId);
        if (error) throw error;
        setEditingCompanyId(null);
        setShowCompanyForm(false);
      } else {
        const isFirst = companies.length === 0;
        const { error } = await supabase
          .from("company_profiles")
          .insert({ user_id: user.id, ...companyForm, is_default: isFirst });
        if (error) throw error;
      }

      resetCompanyForm();
      toast({ title: "公司信息已保存" });
      loadData();
    } catch (error) {
      console.error("Failed to save company:", error);
      toast({ title: "保存失败，请重试", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({ company_name: "", company_name_en: "", social_credit_code: "", legal_person: "", contact: "", contact_phone: "", contact_email: "", country: "", country_code: "", key_no: "", address: "", address_en: "" });
    setEditingCompanyId(null);
    setShowCompanyForm(false);
  };

  const editCompany = (c: CompanyProfile) => {
    setEditingCompanyId(c.id);
    setCompanyForm({
      company_name: c.company_name || "", company_name_en: c.company_name_en || "",
      social_credit_code: c.social_credit_code || "", legal_person: c.legal_person || "",
      contact: c.contact || "", contact_phone: c.contact_phone || "", contact_email: c.contact_email || "",
      country: c.country || "", country_code: c.country_code || "", key_no: c.key_no || "",
      address: c.address || "", address_en: c.address_en || "",
    });
    setShowCompanyForm(true);
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("确定要删除这个公司信息吗？")) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase.from("company_profiles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "公司已删除" });
      loadData();
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast({ title: "删除失败", variant: "error" });
    }
  };

  const setDefaultCompany = async (id: string) => {
    if (!user) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.from("company_profiles").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("company_profiles").update({ is_default: true }).eq("id", id);
      if (error) throw error;
      toast({ title: "已设为默认公司" });
      loadData();
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  // ========== Bank account functions ==========

  const saveAccount = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      if (editingId) {
        const { error } = await supabase.from("bank_accounts").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
      } else {
        const isFirst = accounts.length === 0;
        const { error } = await supabase.from("bank_accounts").insert({ user_id: user.id, ...form, is_default: isFirst });
        if (error) throw error;
      }
      resetForm();
      toast({ title: "账户信息已保存" });
      loadData();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast({ title: "保存失败，请重试", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ account_name: "", account_name_en: "", bank_name: "", bank_name_en: "", account_number: "", swift_code: "", bank_address: "", bank_address_en: "", remark: "" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const editAccount = (a: BankAccount) => {
    setEditingId(a.id);
    setForm({
      account_name: a.account_name || "", account_name_en: a.account_name_en || "",
      bank_name: a.bank_name || "", bank_name_en: a.bank_name_en || "",
      account_number: a.account_number || "", swift_code: a.swift_code || "",
      bank_address: a.bank_address || "", bank_address_en: a.bank_address_en || "",
      remark: a.remark || "",
    });
    setShowAddForm(true);
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("确定要删除这个收款账户吗？")) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "账户已删除" });
      loadData();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast({ title: "删除失败", variant: "error" });
    }
  };

  const setDefaultAccount = async (id: string) => {
    if (!user) return;
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.from("bank_accounts").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("bank_accounts").update({ is_default: true }).eq("id", id);
      if (error) throw error;
      toast({ title: "已设为默认账户" });
      loadData();
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center shadow-md">
                <LogIn className="w-7 h-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              登录后管理您的信息
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              登录后可享受以下服务
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-foreground">云端保存您的查询记录，换设备不丢失</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-foreground">管理您的客户信息和公司资料</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-foreground">生成并下载单证文件</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-foreground">多设备数据同步，随时查看</span>
              </div>
            </div>
            <Button
              className="w-full bg-navy hover:bg-navy/90"
              onClick={() => router.push("/login?redirect=/user-center")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const maskedEmail = user.email ? user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "";
  const maskedPhone = user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "";

  return (
    <div className="space-y-5">
      {ToastNode}
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">用户中心</h1>
        <p className="text-sm text-muted-foreground mt-1">管理您的账号信息、公司和收款账户</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="account">账号安全</TabsTrigger>
          <TabsTrigger value="company">公司信息</TabsTrigger>
          <TabsTrigger value="accounts">收款账户</TabsTrigger>
        </TabsList>

        {/* ========== Account Tab ========== */}
        <TabsContent value="account" className="space-y-5">
          {/* Avatar & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-navy" />
                个人信息
              </CardTitle>
              <CardDescription>管理您的头像、昵称和联系方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">头像</p>
                  <p className="text-xs text-muted-foreground mt-0.5">点击更换头像，支持 JPG/PNG，不超过 2MB</p>
                </div>
              </div>

              <Separator />

              {/* Display Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    昵称
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="请输入昵称"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    手机号
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    className="h-11"
                  />
                  {user.phone && (
                    <p className="text-xs text-muted-foreground">当前绑定: {maskedPhone}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  邮箱
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="h-11"
                />
                {user.email && (
                  <p className="text-xs text-muted-foreground">当前绑定: {maskedEmail}</p>
                )}
              </div>

              <Button onClick={saveAccountInfo} disabled={saving} className="h-10 px-6">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存修改
              </Button>
            </CardContent>
          </Card>

          {/* Password & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-navy" />
                账号安全
              </CardTitle>
              <CardDescription>管理您的登录密码和安全设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Password Row */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">登录密码</p>
                    <p className="text-xs text-muted-foreground">定期修改密码可以提高账号安全性</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                  修改密码
                </Button>
              </div>

              {/* Account Info Row */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">绑定邮箱</p>
                    <p className="text-xs text-muted-foreground">{maskedEmail || "未绑定"}</p>
                  </div>
                </div>
                <Badge variant="outline">{user.email_confirmed_at ? "已验证" : "未验证"}</Badge>
              </div>

              {/* Phone Row */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">绑定手机</p>
                    <p className="text-xs text-muted-foreground">{maskedPhone || "未绑定"}</p>
                  </div>
                </div>
                <Badge variant="outline">{user.phone ? "已绑定" : "未绑定"}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Company Tab ========== */}
        <TabsContent value="company" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">我的公司</h2>
              <p className="text-sm text-muted-foreground">管理您的公司信息，用于合同、发票、许可证等单证的企业档案</p>
            </div>
            <Button onClick={() => { resetCompanyForm(); setShowCompanyForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              添加公司
            </Button>
          </div>

          {companies.length === 0 && !showCompanyForm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">还没有添加公司信息</p>
                <Button onClick={() => setShowCompanyForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一家公司
                </Button>
              </CardContent>
            </Card>
          )}

          {companies.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">{c.company_name || "未命名公司"}</span>
                      {c.is_default && <Badge variant="default">默认</Badge>}
                    </div>
                    {c.company_name_en && <p className="text-sm text-muted-foreground mb-1">{c.company_name_en}</p>}
                    {c.address && <p className="text-sm text-muted-foreground">{c.address}</p>}
                    {c.contact && <p className="text-sm text-muted-foreground">联系人: {c.contact}</p>}
                    {c.contact_phone && <p className="text-sm text-muted-foreground">电话: {c.contact_phone}</p>}
                    {c.country && <p className="text-sm text-muted-foreground">国家: {c.country} {c.key_no && `| 电子钥匙: ${c.key_no}`}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!c.is_default && (
                      <Button variant="outline" size="sm" onClick={() => setDefaultCompany(c.id)}>
                        <Check className="mr-1 h-3 w-3" />
                        设为默认
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => editCompany(c)}>编辑</Button>
                    <Button variant="outline" size="sm" onClick={() => deleteCompany(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {showCompanyForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingCompanyId ? "编辑公司" : "添加公司"}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetCompanyForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>公司名（中文）</Label>
                    <Input value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} placeholder="请输入公司中文名称" />
                  </div>
                  <div className="space-y-2">
                    <Label>公司名（英文）</Label>
                    <Input value={companyForm.company_name_en} onChange={(e) => setCompanyForm({ ...companyForm, company_name_en: e.target.value })} placeholder="Company Name (English)" />
                  </div>
                  <div className="space-y-2">
                    <Label>统一社会信用代码</Label>
                    <Input value={companyForm.social_credit_code} onChange={(e) => setCompanyForm({ ...companyForm, social_credit_code: e.target.value })} placeholder="18位统一社会信用代码" />
                  </div>
                  <div className="space-y-2">
                    <Label>法人代表</Label>
                    <Input value={companyForm.legal_person} onChange={(e) => setCompanyForm({ ...companyForm, legal_person: e.target.value })} placeholder="请输入法人代表姓名" />
                  </div>
                  <div className="space-y-2">
                    <Label>联系人</Label>
                    <Input value={companyForm.contact} onChange={(e) => setCompanyForm({ ...companyForm, contact: e.target.value })} placeholder="常用联系人姓名" />
                  </div>
                  <div className="space-y-2">
                    <Label>联系电话</Label>
                    <Input value={companyForm.contact_phone} onChange={(e) => setCompanyForm({ ...companyForm, contact_phone: e.target.value })} placeholder="公司联系电话" />
                  </div>
                  <div className="space-y-2">
                    <Label>联系邮箱</Label>
                    <Input value={companyForm.contact_email} onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })} placeholder="company@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>国家</Label>
                    <Input value={companyForm.country} onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })} placeholder="如：中国" />
                  </div>
                  <div className="space-y-2">
                    <Label>国家代码</Label>
                    <Input value={companyForm.country_code} onChange={(e) => setCompanyForm({ ...companyForm, country_code: e.target.value })} placeholder="如：CN" />
                  </div>
                  <div className="space-y-2">
                    <Label>电子钥匙编号</Label>
                    <Input value={companyForm.key_no} onChange={(e) => setCompanyForm({ ...companyForm, key_no: e.target.value })} placeholder="商务部电子钥匙编号（许可证用）" />
                  </div>
                  <div className="space-y-2">
                    <Label>公司地址（中文）</Label>
                    <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} placeholder="公司详细地址" />
                  </div>
                  <div className="space-y-2">
                    <Label>公司地址（英文）</Label>
                    <Input value={companyForm.address_en} onChange={(e) => setCompanyForm({ ...companyForm, address_en: e.target.value })} placeholder="Company Address (English)" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveCompany} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingCompanyId ? "保存修改" : "添加公司"}
                  </Button>
                  <Button variant="outline" onClick={resetCompanyForm}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== Bank Accounts Tab ========== */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">收款账户</h2>
              <p className="text-sm text-muted-foreground">管理您的银行收款账户信息</p>
            </div>
            <Button onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              添加账户
            </Button>
          </div>

          {accounts.length === 0 && !showAddForm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">还没有添加收款账户</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一个账户
                </Button>
              </CardContent>
            </Card>
          )}

          {accounts.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{a.account_name}</span>
                      {a.is_default && <Badge variant="default">默认</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.bank_name} | {a.account_number}</p>
                    {a.swift_code && <p className="text-sm text-muted-foreground">SWIFT: {a.swift_code}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!a.is_default && (
                      <Button variant="outline" size="sm" onClick={() => setDefaultAccount(a.id)}>
                        <Check className="mr-1 h-3 w-3" />
                        设为默认
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => editAccount(a)}>编辑</Button>
                    <Button variant="outline" size="sm" onClick={() => deleteAccount(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {showAddForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? "编辑账户" : "添加收款账户"}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>账户名称（中文）</Label>
                    <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="公司账户名" />
                  </div>
                  <div className="space-y-2">
                    <Label>账户名称（英文）</Label>
                    <Input value={form.account_name_en} onChange={(e) => setForm({ ...form, account_name_en: e.target.value })} placeholder="Account Name (English)" />
                  </div>
                  <div className="space-y-2">
                    <Label>银行名称（中文）</Label>
                    <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="开户银行" />
                  </div>
                  <div className="space-y-2">
                    <Label>银行名称（英文）</Label>
                    <Input value={form.bank_name_en} onChange={(e) => setForm({ ...form, bank_name_en: e.target.value })} placeholder="Bank Name (English)" />
                  </div>
                  <div className="space-y-2">
                    <Label>银行账号</Label>
                    <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="银行账号" />
                  </div>
                  <div className="space-y-2">
                    <Label>SWIFT Code</Label>
                    <Input value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} placeholder="国际汇款代码" />
                  </div>
                  <div className="space-y-2">
                    <Label>银行地址（中文）</Label>
                    <Input value={form.bank_address} onChange={(e) => setForm({ ...form, bank_address: e.target.value })} placeholder="开户行地址" />
                  </div>
                  <div className="space-y-2">
                    <Label>银行地址（英文）</Label>
                    <Input value={form.bank_address_en} onChange={(e) => setForm({ ...form, bank_address_en: e.target.value })} placeholder="Bank Address (English)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注信息" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveAccount} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingId ? "保存修改" : "添加账户"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-navy" />
              修改登录密码
            </DialogTitle>
            <DialogDescription>请输入新密码，密码至少6位</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>新密码</Label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  placeholder="请输入新密码（至少6位）"
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  placeholder="请再次输入新密码"
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={changePassword} disabled={changingPassword} className="flex-1 h-10">
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                确认修改
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>取消</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
