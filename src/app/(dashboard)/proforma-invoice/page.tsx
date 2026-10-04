"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { CompanyInfo } from "@/components/documents/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  FilePlus2,
  FolderOpen,
  Save,
  Printer,
  Car,
  Package,
  Building2,
  User,
  Ship,
  CreditCard,
  Landmark,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useVinAutoFill } from "@/lib/vehicle-linkage";
import InvoiceItemCard from "@/components/proforma-invoice/invoice-item-card";
import {
  type InvoiceData,
  type InvoiceItem,
  createDefaultInvoice,
  createVehicleItem,
  createProductItem,
  generateInvoiceNo,
  todayStr,
  invoiceDataToApiPayload,
  apiRecordToInvoiceData,
  itemTitle,
  calculateItemsTotal,
} from "@/lib/proforma-invoice/helpers";

const CompanyProfilePicker = dynamic(
  () => import("@/components/documents/company-profile-picker"),
  { ssr: false, loading: () => null }
);

function getAuthHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** 常用收款信息条目（云端保存，形式发票内一键复用） */
interface PaymentAccountItem {
  id: string;
  title: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProformaInvoicePage() {
  const { user, token } = useAuth();
  const { currentOrgId } = useOrg();
  const [data, setData] = useState<InvoiceData>(() => createDefaultInvoice());
  const [savedInvoices, setSavedInvoices] = useState<
    Array<{ id: string; invoice_no: string; created_at: string }>
  >([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lookingUpVin, setLookingUpVin] = useState<number | null>(null);
  const { lookupByVin } = useVinAutoFill("proforma-invoice");

  // ── 常用收款信息（保存与复用）──
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountItem[]>([]);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);

  // ── 未保存改动跟踪（脏状态），避免误操作丢失编辑内容 ──
  const dirtyRef = useRef(false);
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);
  const clearDirty = useCallback(() => {
    dirtyRef.current = false;
  }, []);
  const confirmDiscardIfDirty = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("当前发票有未保存的修改，继续将丢失这些修改。确定继续吗？");
  }, []);

  // 脏状态下离开/刷新页面时给出浏览器原生警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // 新建发票时自动按时间生成发票编号与默认日期（客户端挂载后执行，避免 hydration 不一致）
  useEffect(() => {
    setData((prev) => {
      if (prev.id) return prev; // 已加载的已有发票不覆盖
      return {
        ...prev,
        invoice_no: prev.invoice_no || generateInvoiceNo(),
        invoice_date: prev.invoice_date || todayStr(),
      };
    });
  }, []);

  // 卖方 / 买方与 CompanyInfo 的映射（供企业档案选择器复用）
  const sellerToCompanyInfo = (d: InvoiceData): CompanyInfo => ({
    name: d.seller_name_en || d.seller_name,
    address: d.seller_address_en || d.seller_address,
    country: "China",
    contact: "",
    phone: d.seller_phone,
    email: d.seller_email,
  });

  const applySellerFromProfile = (info: CompanyInfo) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      seller_name: info.name,
      seller_name_en: info.name,
      seller_address: info.address,
      seller_address_en: info.address,
      seller_phone: info.phone,
      seller_email: info.email,
    }));
  };

  const buyerToCompanyInfo = (d: InvoiceData): CompanyInfo => ({
    name: d.buyer_name_en || d.buyer_name,
    address: d.buyer_address_en || d.buyer_address,
    country: "",
    contact: "",
    phone: d.buyer_phone,
    email: d.buyer_email,
  });

  const applyBuyerFromProfile = (info: CompanyInfo) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      buyer_name: info.name,
      buyer_name_en: info.name,
      buyer_address: info.address,
      buyer_address_en: info.address,
      buyer_phone: info.phone,
      buyer_email: info.email,
    }));
  };

  // ── 已保存发票列表（服务端按「所有者或同组织」隔离，确保自己保存的都能读回）──
  const loadSavedInvoices = useCallback(async () => {
    if (!user) return;
    try {
      const qs = currentOrgId ? `?organization_id=${currentOrgId}` : "";
      const res = await fetch(`/api/proforma-invoices${qs}`, {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      const records = (json.data ?? []) as Array<Record<string, unknown>>;
      setSavedInvoices(
        records.map((r) => ({
          id: r.id as string,
          invoice_no:
            ((r.order_info as Record<string, string>)?.invoice_no) ??
            (r.title as string) ??
            "未命名",
          created_at: r.created_at as string,
        }))
      );
    } catch {
      // 静默失败：用户看到空列表即可
    }
  }, [user, token, currentOrgId]);

  useEffect(() => {
    if (user) {
      loadSavedInvoices();
    }
  }, [user, loadSavedInvoices]);

  // ── 常用收款信息：加载 / 保存 / 应用 / 更新 / 删除 ──
  const loadPaymentAccounts = useCallback(async () => {
    if (!user) return;
    try {
      const qs = currentOrgId ? `?organization_id=${currentOrgId}` : "";
      const res = await fetch(`/api/payment-accounts${qs}`, {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error("加载失败");
      const json = (await res.json()) as { data?: PaymentAccountItem[] };
      const accounts = json.data ?? [];
      setPaymentAccounts(accounts);

      // 新发票且未填写时，自动应用默认收款信息（不置脏，用户可自由清空/替换）
      if (accounts.length > 0) {
        setData((prev) => {
          if (prev.id || prev.payment_info.trim()) return prev;
          const def = accounts.find((a) => a.is_default);
          return def ? { ...prev, payment_info: def.content } : prev;
        });
      }
    } catch {
      // 静默失败：用户看到空列表即可
    }
  }, [user, token, currentOrgId]);

  useEffect(() => {
    if (user) {
      loadPaymentAccounts();
    }
  }, [user, loadPaymentAccounts]);

  /** 将表单当前收款信息保存为常用条目 */
  const savePaymentAccount = async () => {
    const content = data.payment_info.trim();
    if (!content) {
      setMessage("请先在收款信息栏粘贴或输入内容");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    const title = window
      .prompt("为这组收款信息起个名称（如：中行广州美元户 / XX 公司账户）", "")
      ?.trim();
    if (!title) return;
    setPaymentBusy(true);
    try {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ title, content, organization_id: currentOrgId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "保存失败");
      }
      await loadPaymentAccounts();
      toast.success("收款信息已保存，后续可一键复用");
    } catch (err) {
      setMessage("保存失败：" + (err instanceof Error ? err.message : "未知错误"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setPaymentBusy(false);
    }
  };

  /** 应用已保存的收款信息到表单 */
  const applyPaymentAccount = (account: PaymentAccountItem) => {
    markDirty();
    setData((prev) => ({ ...prev, payment_info: account.content }));
    setShowPaymentPicker(false);
    toast.success(`已应用收款信息「${account.title}」`);
  };

  /** 用表单当前内容覆盖某条已保存的收款信息 */
  const updatePaymentAccount = async (account: PaymentAccountItem) => {
    const content = data.payment_info.trim();
    if (!content) {
      setMessage("请先在收款信息栏粘贴或输入内容");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (!window.confirm(`确定用当前编辑的内容覆盖「${account.title}」吗？`)) return;
    setPaymentBusy(true);
    try {
      const res = await fetch(`/api/payment-accounts/${account.id}`, {
        method: "PUT",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "更新失败");
      }
      await loadPaymentAccounts();
      toast.success("收款信息已更新");
    } catch (err) {
      setMessage("更新失败：" + (err instanceof Error ? err.message : "未知错误"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setPaymentBusy(false);
    }
  };

  const deletePaymentAccount = async (account: PaymentAccountItem) => {
    if (!window.confirm(`确定删除收款信息「${account.title}」吗？`)) return;
    setPaymentBusy(true);
    try {
      const res = await fetch(`/api/payment-accounts/${account.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "删除失败");
      }
      setPaymentAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success("已删除");
    } catch (err) {
      setMessage("删除失败：" + (err instanceof Error ? err.message : "未知错误"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setPaymentBusy(false);
    }
  };

  // ── 表单字段更新 ──
  const updateField = (field: keyof InvoiceData, value: string | boolean) => {
    markDirty();
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    markDirty();
    setData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value } as InvoiceItem;
      return { ...prev, items };
    });

    // VIN 输满 17 位时自动从车型档案带出信息
    if (field === "vin" && typeof value === "string") {
      const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (clean.length >= 17) {
        handleVinLookup(index, clean);
      }
    }
  };

  const addVehicleItem = () => {
    markDirty();
    setData((prev) => ({ ...prev, items: [...prev.items, createVehicleItem()] }));
  };

  const addProductItem = () => {
    markDirty();
    setData((prev) => ({ ...prev, items: [...prev.items, createProductItem()] }));
  };

  const removeItem = (index: number) => {
    if (data.items.length <= 1) {
      setMessage("至少需要保留一个条目");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    markDirty();
    setData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // ── VIN 档案查询并填充 ──
  const handleVinLookup = useCallback(
    async (index: number, vin: string) => {
      const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanVin.length < 8) return;

      setLookingUpVin(index);
      try {
        const result = await lookupByVin(cleanVin);
        const { _fromArchive, ...fill } = result;
        if (!_fromArchive) {
          setLookingUpVin(null);
          return;
        }

        markDirty();
        setData((prev) => {
          const items = [...prev.items];
          const existing = items[index];
          if (!existing) return prev;
          items[index] = {
            ...existing,
            ...fill,
            vin: cleanVin,
            qty: existing.qty,
            price: existing.price,
            remarks: existing.remarks,
          } as InvoiceItem;
          return { ...prev, items };
        });
        const brand = (fill.brand as string) ?? "";
        const model = (fill.model as string) ?? "";
        toast.success(`已从车辆档案自动填充 ${brand} ${model}`.trim());
      } catch {
        // 静默处理
      } finally {
        setLookingUpVin(null);
      }
    },
    [lookupByVin]
  );

  // 从档案候选中选中某个 VIN：写入 VIN 并触发完整填充
  const handleSelectVin = useCallback(
    (index: number, vin: string) => {
      markDirty();
      setData((prev) => {
        const items = [...prev.items];
        if (!items[index]) return prev;
        items[index] = { ...items[index], vin };
        return { ...prev, items };
      });
      handleVinLookup(index, vin);
    },
    [handleVinLookup, markDirty]
  );

  // ── 保存 / 加载 / 删除 / 新建 ──
  const saveInvoice = async () => {
    if (!user) {
      setMessage("请先登录后再保存");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setSaving(true);
    setMessage("");

    const payload = invoiceDataToApiPayload(data);
    const orgQs = currentOrgId ? `?organization_id=${currentOrgId}` : "";

    try {
      let res: Response;
      if (data.id) {
        res = await fetch(`/api/proforma-invoices/${data.id}${orgQs}`, {
          method: "PUT",
          headers: getAuthHeaders(token),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/proforma-invoices", {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({ ...payload, organization_id: currentOrgId }),
        });
      }

      if (!res.ok) {
        const status = res.status;
        const err = await res.json().catch(() => ({}));
        // 更新的记录已不存在（如在其他地方被删除）：清除本地 id，下次保存将转为新建，避免卡死
        if (data.id && status === 404) {
          setData((prev) => ({ ...prev, id: undefined }));
        }
        throw new Error((err as { error?: string }).error ?? "保存失败");
      }

      const json = await res.json();
      const saved = (json as { data: Record<string, unknown> }).data;
      if (!data.id && saved?.id) {
        setData((prev) => ({ ...prev, id: saved.id as string }));
      }

      clearDirty();
      setMessage("保存成功！");
      loadSavedInvoices();
    } catch (err) {
      setMessage("保存失败：" + (err instanceof Error ? err.message : "未知错误"));
    }

    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const loadInvoice = async (id: string) => {
    // 加载会覆盖当前表单，若有未保存修改需先确认
    if (!confirmDiscardIfDirty()) return;
    try {
      const orgQs = currentOrgId ? `?organization_id=${currentOrgId}` : "";
      const res = await fetch(`/api/proforma-invoices/${id}${orgQs}`, {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      const record = (json as { data: Record<string, unknown> }).data;
      if (record) {
        setData(apiRecordToInvoiceData(record));
        clearDirty();
        setShowLoadModal(false);
        setMessage("已加载发票");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("加载失败");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // 内部重置：生成一张全新发票（不做脏状态确认）
  const resetToNewInvoice = () => {
    setData({
      ...createDefaultInvoice(),
      invoice_no: generateInvoiceNo(),
      invoice_date: todayStr(),
    });
    clearDirty();
    setMessage("");
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("确定要删除这张发票吗？")) return;
    try {
      const orgQs = currentOrgId ? `?organization_id=${currentOrgId}` : "";
      const res = await fetch(`/api/proforma-invoices/${id}${orgQs}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error("删除失败");
      loadSavedInvoices();
      if (data.id === id) {
        // 删除的正是当前发票，直接重置（用户已明确删除意图，无需脏状态确认）
        resetToNewInvoice();
      }
    } catch {
      setMessage("删除失败");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // 「新建」按钮：若有未保存修改需先确认
  const startNewInvoice = () => {
    if (!confirmDiscardIfDirty()) return;
    resetToNewInvoice();
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = calculateItemsTotal(data.items);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">形式发票制作</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proforma Invoice Generator - 制作标准化形式发票并导出PDF
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startNewInvoice}>
            <FilePlus2 className="mr-2 h-3.5 w-3.5" />
            新建
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLoadModal(true)}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" />
            加载
          </Button>
          <Button size="sm" onClick={saveInvoice} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button size="sm" onClick={handlePrint} variant="secondary">
            <Printer className="mr-2 h-3.5 w-3.5" />
            导出PDF
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg border text-sm print:hidden ${
            message.includes("失败")
              ? "bg-destructive/5 border-destructive/20 text-destructive"
              : "bg-success/5 border-success/20 text-success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
        {/* ── 左侧表单 ── */}
        <div className="space-y-6 print:hidden">
          {/* 发票信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                发票信息 / Invoice Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>发票编号 / Invoice No.</Label>
                  <Input value={data.invoice_no} readOnly className="font-mono bg-muted/50" />
                  <p className="text-xs text-muted-foreground mt-1">系统按时间自动生成</p>
                </div>
                <div>
                  <Label>发票日期 / Invoice Date</Label>
                  <Input
                    type="date"
                    value={data.invoice_date}
                    onChange={(e) => updateField("invoice_date", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 卖方信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  卖方信息 / Seller
                </CardTitle>
                <CompanyProfilePicker
                  size="sm"
                  current={sellerToCompanyInfo(data)}
                  onPick={applySellerFromProfile}
                  label="选择档案"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>公司名（中文）</Label>
                  <Input
                    value={data.seller_name}
                    onChange={(e) => updateField("seller_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Company Name (English)</Label>
                  <Input
                    value={data.seller_name_en}
                    onChange={(e) => updateField("seller_name_en", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>地址（中文）</Label>
                  <Textarea
                    value={data.seller_address}
                    onChange={(e) => updateField("seller_address", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Address (English)</Label>
                  <Textarea
                    value={data.seller_address_en}
                    onChange={(e) => updateField("seller_address_en", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>电话 / Phone</Label>
                  <Input
                    value={data.seller_phone}
                    onChange={(e) => updateField("seller_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>传真 / Fax</Label>
                  <Input
                    value={data.seller_fax}
                    onChange={(e) => updateField("seller_fax", e.target.value)}
                  />
                </div>
                <div>
                  <Label>邮箱 / Email</Label>
                  <Input
                    value={data.seller_email}
                    onChange={(e) => updateField("seller_email", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 买方信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  买方信息 / Buyer
                </CardTitle>
                <CompanyProfilePicker
                  size="sm"
                  current={buyerToCompanyInfo(data)}
                  onPick={applyBuyerFromProfile}
                  label="选择客户"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>公司名（中文）</Label>
                  <Input
                    value={data.buyer_name}
                    onChange={(e) => updateField("buyer_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Company Name (English)</Label>
                  <Input
                    value={data.buyer_name_en}
                    onChange={(e) => updateField("buyer_name_en", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>地址（中文）</Label>
                  <Textarea
                    value={data.buyer_address}
                    onChange={(e) => updateField("buyer_address", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Address (English)</Label>
                  <Textarea
                    value={data.buyer_address_en}
                    onChange={(e) => updateField("buyer_address_en", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>电话 / Phone</Label>
                  <Input
                    value={data.buyer_phone}
                    onChange={(e) => updateField("buyer_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>传真 / Fax</Label>
                  <Input
                    value={data.buyer_fax}
                    onChange={(e) => updateField("buyer_fax", e.target.value)}
                  />
                </div>
                <div>
                  <Label>邮箱 / Email</Label>
                  <Input
                    value={data.buyer_email}
                    onChange={(e) => updateField("buyer_email", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 收货人信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                收货人信息 / Consignee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>名称（中文）</Label>
                  <Input
                    value={data.consignee_name}
                    onChange={(e) => updateField("consignee_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Name (English)</Label>
                  <Input
                    value={data.consignee_name_en}
                    onChange={(e) => updateField("consignee_name_en", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>地址（中文）</Label>
                  <Textarea
                    value={data.consignee_address}
                    onChange={(e) => updateField("consignee_address", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Address (English)</Label>
                  <Textarea
                    value={data.consignee_address_en}
                    onChange={(e) => updateField("consignee_address_en", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>电话 / Phone</Label>
                  <Input
                    value={data.consignee_phone}
                    onChange={(e) => updateField("consignee_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>邮箱 / Email</Label>
                  <Input
                    value={data.consignee_email}
                    onChange={(e) => updateField("consignee_email", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 运输信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                运输信息 / Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>起运港（中文）</Label>
                  <Input
                    value={data.port_of_loading}
                    onChange={(e) => updateField("port_of_loading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Port of Loading (English)</Label>
                  <Input
                    value={data.port_of_loading_en}
                    onChange={(e) => updateField("port_of_loading_en", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>目的港（中文）</Label>
                  <Input
                    value={data.port_of_discharge}
                    onChange={(e) => updateField("port_of_discharge", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Port of Discharge (English)</Label>
                  <Input
                    value={data.port_of_discharge_en}
                    onChange={(e) => updateField("port_of_discharge_en", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>运输方式 / Transport Mode</Label>
                  <Select
                    value={data.transport_mode}
                    onValueChange={(v) => updateField("transport_mode", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ro-Ro">滚装船 Ro-Ro</SelectItem>
                      <SelectItem value="Container">集装箱 Container</SelectItem>
                      <SelectItem value="Bulk">散货船 Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>装运日期 / Shipment Date</Label>
                  <Input
                    value={data.shipment_date}
                    onChange={(e) => updateField("shipment_date", e.target.value)}
                    placeholder="Within 30 days"
                  />
                </div>
                <div>
                  <Label>贸易术语 / Incoterm</Label>
                  <Select value={data.incoterm} onValueChange={(v) => updateField("incoterm", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB</SelectItem>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="CFR">CFR</SelectItem>
                      <SelectItem value="EXW">EXW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 清单（车辆 + 产品） */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  货物清单 / Items ({data.items.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addVehicleItem}>
                    <Car className="mr-1 h-4 w-4" />
                    添加车辆
                  </Button>
                  <Button size="sm" variant="outline" onClick={addProductItem}>
                    <Package className="mr-1 h-4 w-4" />
                    添加产品
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.items.map((item, index) => (
                <InvoiceItemCard
                  key={index}
                  item={item}
                  index={index}
                  lookingUp={lookingUpVin === index}
                  onChange={updateItem}
                  onRemove={removeItem}
                  onSelectVin={handleSelectVin}
                />
              ))}
            </CardContent>
          </Card>

          {/* 付款条款 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                付款条款 / Payment Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>付款方式 / Payment</Label>
                  <Select
                    value={data.payment_terms}
                    onValueChange={(v) => updateField("payment_terms", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T/T">T/T 电汇</SelectItem>
                      <SelectItem value="L/C">L/C 信用证</SelectItem>
                      <SelectItem value="D/P">D/P 付款交单</SelectItem>
                      <SelectItem value="D/A">D/A 承兑交单</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>货币 / Currency</Label>
                  <Select value={data.currency} onValueChange={(v) => updateField("currency", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD 美元</SelectItem>
                      <SelectItem value="EUR">EUR 欧元</SelectItem>
                      <SelectItem value="CNY">CNY 人民币</SelectItem>
                      <SelectItem value="CHF">CHF 瑞士法郎</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.partial_shipment}
                    onChange={(e) => updateField("partial_shipment", e.target.checked)}
                    className="rounded"
                  />
                  <span>允许分批装运 / Partial Shipment Allowed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.transshipment}
                    onChange={(e) => updateField("transshipment", e.target.checked)}
                    className="rounded"
                  />
                  <span>允许转运 / Transshipment Allowed</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* 收款信息（整段粘贴，支持保存复用） */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  收款信息 / Payment Info
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPaymentPicker(true)}
                  >
                    <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                    常用收款信息
                    {paymentAccounts.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                        {paymentAccounts.length}
                      </span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={savePaymentAccount}
                    disabled={paymentBusy}
                  >
                    {paymentBusy ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    存为常用
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>收款信息（支持一次性粘贴整段内容）</Label>
                <Textarea
                  value={data.payment_info}
                  onChange={(e) => updateField("payment_info", e.target.value)}
                  rows={7}
                  placeholder={"直接粘贴整段收款信息，无需分栏填写，例如：\n收款人：XX IMPORT & EXPORT CO., LTD.\n开户行：BANK OF CHINA, GUANGZHOU BRANCH\n账号：1234 5678 9012 3456 789\nSWIFT CODE：BKCHCNBJ110\n（任意格式均可，会原样显示在发票上）"}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  银行名、账号、SWIFT、收款人等整段粘贴即可；保存后可在其他发票中一键复用
                </p>
              </div>
              {paymentAccounts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">快速填入：</span>
                  {paymentAccounts.slice(0, 3).map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => applyPaymentAccount(account)}
                      className="text-xs px-2 py-1 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
                      title={account.content}
                    >
                      {account.title}
                      {account.is_default ? "（默认）" : ""}
                    </button>
                  ))}
                  {paymentAccounts.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentPicker(true)}
                      className="text-xs px-2 py-1 rounded-md text-primary hover:underline"
                    >
                      更多 {paymentAccounts.length - 3} 条 →
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader>
              <CardTitle>备注 / Remarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>中文备注</Label>
                <Textarea
                  value={data.remarks}
                  onChange={(e) => updateField("remarks", e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label>English Remarks</Label>
                <Textarea
                  value={data.remarks_en}
                  onChange={(e) => updateField("remarks_en", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 右侧 A4 预览 ── */}
        <div className="lg:sticky lg:top-24 lg:self-start print:static print:col-span-full print:w-full">
          <Card>
            <CardHeader className="print:hidden">
              <CardTitle>A4 预览 / Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px] border rounded-lg p-4 bg-muted/40 print:h-auto print:border-none print:p-0 print:bg-transparent print:static print:overflow-visible">
                <div
                  className="a4-preview bg-white p-8 min-h-[1000px] shadow-lg print:shadow-none print:p-0 text-foreground"
                  style={{ width: "210mm", maxWidth: "100%" }}
                >
                  {/* 标题 */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">形式发票</h1>
                    <h2 className="text-xl font-semibold">PROFORMA INVOICE</h2>
                  </div>

                  {/* 发票信息 */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                      <p>
                        <strong>发票编号 / Invoice No.:</strong> {data.invoice_no || "-"}
                      </p>
                      <p>
                        <strong>日期 / Date:</strong> {data.invoice_date || "-"}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>贸易术语 / Incoterm:</strong> {data.incoterm || "-"}
                      </p>
                      <p>
                        <strong>货币 / Currency:</strong> {data.currency || "-"}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* 买卖双方 */}
                  <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                    <div>
                      <h3 className="font-bold mb-2">卖方 / Seller:</h3>
                      <p>{data.seller_name}</p>
                      <p>{data.seller_name_en}</p>
                      <p className="mt-1">{data.seller_address}</p>
                      <p>{data.seller_address_en}</p>
                      <p className="mt-1">Tel: {data.seller_phone}</p>
                      <p>Email: {data.seller_email}</p>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">买方 / Buyer:</h3>
                      <p>{data.buyer_name}</p>
                      <p>{data.buyer_name_en}</p>
                      <p className="mt-1">{data.buyer_address}</p>
                      <p>{data.buyer_address_en}</p>
                      <p className="mt-1">Tel: {data.buyer_phone}</p>
                      <p>Email: {data.buyer_email}</p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* 运输信息 */}
                  <div className="mb-6 text-sm">
                    <h3 className="font-bold mb-2">运输信息 / Shipping Details:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <p>
                        <strong>起运港:</strong> {data.port_of_loading} / {data.port_of_loading_en}
                      </p>
                      <p>
                        <strong>目的港:</strong> {data.port_of_discharge} / {data.port_of_discharge_en}
                      </p>
                      <p>
                        <strong>运输方式:</strong> {data.transport_mode}
                      </p>
                      <p>
                        <strong>装运日期:</strong> {data.shipment_date || "-"}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* 货物清单表格（车辆 + 产品） */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-2">货物清单 / Goods List:</h3>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2">序号</th>
                          <th className="border p-2">项目 / Description</th>
                          <th className="border p-2">VIN</th>
                          <th className="border p-2">数量</th>
                          <th className="border p-2">单价</th>
                          <th className="border p-2">金额</th>
                          <th className="border p-2">备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((it, i) => (
                          <tr key={i}>
                            <td className="border p-2 text-center">{i + 1}</td>
                            <td className="border p-2">{itemTitle(it) || "-"}</td>
                            <td className="border p-2 font-mono text-xs">
                              {it.item_type === "vehicle" ? it.vin : "-"}
                            </td>
                            <td className="border p-2 text-center">
                              {it.qty}
                              {it.item_type === "product" && it.unit ? ` ${it.unit}` : ""}
                            </td>
                            <td className="border p-2 text-right">
                              {data.currency} {it.price}
                            </td>
                            <td className="border p-2 text-right">
                              {data.currency} {((parseFloat(it.price) || 0) * it.qty).toFixed(2)}
                            </td>
                            <td className="border p-2">{it.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-bold">
                          <td colSpan={5} className="border p-2 text-right">
                            总计 / Total:
                          </td>
                          <td className="border p-2 text-right">
                            {data.currency} {totalAmount.toFixed(2)}
                          </td>
                          <td className="border p-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <Separator className="my-4" />

                  {/* 付款条款 */}
                  <div className="mb-6 text-sm">
                    <h3 className="font-bold mb-2">付款条款 / Payment Terms:</h3>
                    <p>付款方式：{data.payment_terms}</p>
                    <p>分批装运：{data.partial_shipment ? "允许" : "不允许"}</p>
                    <p>转运：{data.transshipment ? "允许" : "不允许"}</p>
                  </div>

                  {/* 收款信息（整段原样展示） */}
                  {data.payment_info.trim() && (
                    <>
                      <Separator className="my-4" />
                      <div className="text-sm">
                        <h3 className="font-bold mb-2">收款信息 / Payment Information:</h3>
                        <p className="whitespace-pre-line leading-6">{data.payment_info}</p>
                      </div>
                    </>
                  )}

                  {/* 备注 */}
                  {(data.remarks || data.remarks_en) && (
                    <>
                      <Separator className="my-4" />
                      <div className="text-sm">
                        <h3 className="font-bold mb-2">备注 / Remarks:</h3>
                        <p>{data.remarks}</p>
                        <p>{data.remarks_en}</p>
                      </div>
                    </>
                  )}

                  {/* 签名栏 */}
                  <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
                    <div>
                      <div className="border-t pt-2">
                        <p>卖方签名 / Seller Signature:</p>
                        <p className="mt-8">_________________</p>
                      </div>
                    </div>
                    <div>
                      <div className="border-t pt-2">
                        <p>买方签名 / Buyer Signature:</p>
                        <p className="mt-8">_________________</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 加载已保存发票弹窗 */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">加载已保存的发票</h2>
            </div>
            <ScrollArea className="h-[60vh] p-6">
              {savedInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无已保存的发票</p>
              ) : (
                <div className="space-y-2">
                  {savedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium font-mono">{inv.invoice_no || "未命名发票"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(inv.created_at).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => loadInvoice(inv.id)}>
                          加载
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteInvoice(inv.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-6 border-t">
              <Button onClick={() => setShowLoadModal(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}

      {/* 常用收款信息选择弹窗 */}
      {showPaymentPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">常用收款信息</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  选择一条填入发票，或用当前编辑的内容更新已有条目
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowPaymentPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[55vh] p-6">
              {paymentAccounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无已保存的收款信息。在收款信息栏粘贴内容后，点击「存为常用」即可。
                </p>
              ) : (
                <div className="space-y-2">
                  {paymentAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2">
                            {account.title}
                            {account.is_default && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                默认
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                            {account.content}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" onClick={() => applyPaymentAccount(account)}>
                            填入
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={paymentBusy}
                            onClick={() => updatePaymentAccount(account)}
                            title="将当前编辑框中的内容覆盖到此条目"
                          >
                            更新
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={paymentBusy}
                            onClick={() => deletePaymentAccount(account)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Print Styles：覆盖全局报关单横向 @page，A4 纵向居中打印（与合规声明模块同模式） */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          /* 隐藏页面其余内容，只保留发票纸张 */
          body * {
            visibility: hidden;
          }
          .a4-preview,
          .a4-preview * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* 解除 Radix ScrollArea 视口的裁剪与收缩，避免绝对定位纸张被裁掉 */
          [data-radix-scroll-area-viewport] {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* 纸张脱离应用外壳（侧边栏/容器 padding），铺满 @page 可打印区 → 水平居中、多页各自带边距 */
          .a4-preview {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #2C3E50;
            /* 固化浅色主题变量，暗色模式下打印仍是深字白纸 */
            --background: #ffffff;
            --foreground: #2C3E50;
            --muted-foreground: #7F8C8D;
            --card: #ffffff;
            --card-foreground: #2C3E50;
            --border: #E2E8F0;
          }
          /* 表格行不在分页处被切断 */
          .a4-preview tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
