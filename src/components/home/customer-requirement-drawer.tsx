"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Check,
  ChevronDown,
  User,
  Building2,
  Globe,
  Car,
  Hash,
  Coins,
  Calendar,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  saveTempProject,
  saveRequirementOnly,
  createEmptyProject,
  type CustomerRequirement,
  type TempProject,
} from "@/lib/temp-project";

// ============================================================
// 类型
// ============================================================

interface CustomerOption {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  country?: string;
}

interface RequirementFormData {
  customerName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  destinationCountry: string;
  vehicleRequirements: string;
  quantity: number | "";
  budgetRange: string;
  expectedDelivery: string;
  otherRequirements: string;
}

const EMPTY_FORM: RequirementFormData = {
  customerName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  destinationCountry: "",
  vehicleRequirements: "",
  quantity: "",
  budgetRange: "",
  expectedDelivery: "",
  otherRequirements: "",
};

// ============================================================
// 子组件
// ============================================================

/** 表单骨架屏 */
function FormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** 错误状态 */
function ErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">客户需求暂时无法加载，请重试</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        网络连接可能不稳定，请检查后重试。已填写的内容将保留。
      </p>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Button>
        <Button size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          重新加载
        </Button>
      </div>
    </div>
  );
}

/** 成功反馈 */
function SuccessFeedback({
  project,
  onClose,
  onViewProject,
  onMatchVehicles,
}: {
  project: TempProject;
  onClose: () => void;
  onViewProject: () => void;
  onMatchVehicles: () => void;
}) {
  const isTemporary = project.type === "temporary";

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
        <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {isTemporary ? "已创建临时出口项目" : "已创建出口项目"}
      </h3>
      <p className="text-sm text-muted-foreground mb-2">
        {isTemporary
          ? "登录后可转为正式出口项目，与团队协作并跨设备同步。"
          : "已自动生成首批待办，开始推进项目吧。"}
      </p>
      <p className="text-sm font-medium text-foreground mb-1">
        客户需求已保存到 {project.requirement.customerName || "未命名客户"}
        {project.requirement.destinationCountry ? `－${project.requirement.destinationCountry}` : ""}
      </p>
      {project.requirement.vehicleRequirements && (
        <p className="text-xs text-muted-foreground mb-6 line-clamp-1">
          {project.requirement.vehicleRequirements}
        </p>
      )}
      {!project.requirement.vehicleRequirements && <div className="mb-6" />}
      <div className="flex flex-wrap gap-2.5 justify-center">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          关闭
        </Button>
        <Button size="sm" onClick={onMatchVehicles} className="gap-1.5 bg-navy hover:bg-navy-light text-white">
          <Car className="w-4 h-4" />
          开始匹配车源
        </Button>
        <Button size="sm" onClick={onViewProject} className="gap-1.5">
          <FileText className="w-4 h-4" />
          查看项目
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

interface CustomerRequirementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerRequirementDrawer({ open, onOpenChange }: CustomerRequirementDrawerProps) {
  const router = useRouter();
  const { user, token } = useAuth();

  // 表单状态
  const [form, setForm] = useState<RequirementFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 客户选择
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // 加载状态
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadStartedRef = useRef(false);

  // 结果
  const [result, setResult] = useState<TempProject | null>(null);

  const isLoggedIn = !!user;

  // 清除定时器
  const clearTimers = useCallback(() => {
    if (skeletonTimerRef.current) {
      clearTimeout(skeletonTimerRef.current);
      skeletonTimerRef.current = null;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setCustomers([]);
      return;
    }

    setCustomersLoading(true);
    setCustomersError(false);
    setShowSkeleton(false);
    setLoadError(false);
    loadStartedRef.current = true;

    // 骨架屏：350ms 后显示
    skeletonTimerRef.current = setTimeout(() => setShowSkeleton(true), 350);
    // 超时错误：8s 后显示
    errorTimerRef.current = setTimeout(() => {
      setLoadError(true);
      setCustomersLoading(false);
    }, 8000);

    try {
      const res = await fetch("/api/customers?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      clearTimers();
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setCustomers(data.customers || data.data || []);
    } catch {
      clearTimers();
      setCustomersError(true);
    } finally {
      setCustomersLoading(false);
      setShowSkeleton(false);
    }
  }, [isLoggedIn, token, clearTimers]);

  // 打开时加载客户列表
  useEffect(() => {
    if (open && isLoggedIn) {
      loadCustomers();
    }
    if (!open) {
      clearTimers();
      setShowSkeleton(false);
      setLoadError(false);
      loadStartedRef.current = false;
    }
  }, [open, isLoggedIn, loadCustomers, clearTimers]);

  // 清理定时器
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // 重置表单
  useEffect(() => {
    if (!open) {
      // 延迟重置，避免关闭动画时看到空表单
      const t = setTimeout(() => {
        setForm(EMPTY_FORM);
        setResult(null);
        setShowCustomerDropdown(false);
        setShowQuickCreate(false);
        setCustomerSearch("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 过滤客户
  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.company_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.contact_name?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  // 选择已有客户
  const handleSelectCustomer = (c: CustomerOption) => {
    setForm((prev) => ({
      ...prev,
      customerName: c.company_name || "",
      contactName: c.contact_name || "",
      contactPhone: c.contact_phone || "",
      contactEmail: c.contact_email || "",
      destinationCountry: prev.destinationCountry || c.country || "",
    }));
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  // 更新表单字段
  const updateField = (field: keyof RequirementFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 构建需求数据
  const buildRequirement = (): CustomerRequirement => ({
    customerName: form.customerName,
    contactName: form.contactName || undefined,
    contactPhone: form.contactPhone || undefined,
    contactEmail: form.contactEmail || undefined,
    destinationCountry: form.destinationCountry,
    vehicleRequirements: form.vehicleRequirements,
    quantity: typeof form.quantity === "number" ? form.quantity : Number(form.quantity) || 0,
    budgetRange: form.budgetRange,
    expectedDelivery: form.expectedDelivery,
    otherRequirements: form.otherRequirements,
  });

  // 保存并创建项目
  const handleSaveAndCreate = async () => {
    setSaving(true);
    // 模拟短暂延迟，让用户感知保存动作
    await new Promise((r) => setTimeout(r, 400));
    const req = buildRequirement();
    const project = saveTempProject(req, user?.id);
    setResult(project);
    setSaving(false);
  };

  // 仅保存需求
  const handleSaveOnly = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const req = buildRequirement();
    const project = saveRequirementOnly(req, user?.id);
    setResult(project);
    setSaving(false);
  };

  // 创建空项目
  const handleCreateEmpty = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 200));
    const project = createEmptyProject(user?.id);
    setResult(project);
    setSaving(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // 通用输入样式
  const inputClass =
    "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // 渲染主要内容
  const renderContent = () => {
    // 成功反馈
    if (result) {
      return (
        <SuccessFeedback
          project={result}
          onClose={handleClose}
          onViewProject={() => {
            handleClose();
            router.push(`/projects/temp/${result.id}`);
          }}
          onMatchVehicles={() => {
            handleClose();
            router.push(`/vehicle-sourcing?projectId=${encodeURIComponent(result.id)}&country=${encodeURIComponent(result.requirement.destinationCountry)}&vehicleReq=${encodeURIComponent(result.requirement.vehicleRequirements)}`);
          }}
        />
      );
    }

    // 错误状态
    if (loadError) {
      return (
        <ErrorState
          onRetry={() => {
            setLoadError(false);
            loadCustomers();
          }}
          onBack={handleClose}
        />
      );
    }

    // 骨架屏
    if (showSkeleton && customersLoading) {
      return <FormSkeleton />;
    }

    return (
      <div className="space-y-5">
        {/* 客户 / 买家 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            客户 / 买家 <span className="text-red-500">*</span>
          </Label>
          {isLoggedIn && !customersError && (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerDropdown(!showCustomerDropdown);
                    setShowQuickCreate(false);
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-navy/30 transition-colors"
                >
                  {form.customerName ? (
                    <span className="text-foreground flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {form.customerName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      选择已有客户...
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {showCustomerDropdown && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    {/* 搜索 */}
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="搜索客户名称或联系人..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>

                    {/* 列表 */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          {customersLoading ? "加载中..." : "没有匹配的客户"}
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-2.5 border-b border-border/50 last:border-0 transition-colors"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/[0.08]">
                              <Building2 className="w-3.5 h-3.5 text-navy" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{c.company_name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[c.contact_name, c.country].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            {form.customerName === c.company_name && (
                              <Check className="w-4 h-4 text-navy shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {/* 快速新建 */}
                    <div className="border-t border-border p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setShowQuickCreate(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-navy hover:bg-navy/[0.06] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        快速新建客户
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 点击外部关闭下拉 */}
              {showCustomerDropdown && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCustomerDropdown(false)}
                />
              )}
            </>
          )}

          {/* 快速新建客户（匿名用户或登录用户选择快速新建） */}
          {(!isLoggedIn || showQuickCreate || customersError) && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <Input
                placeholder="客户 / 公司名称"
                value={form.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                className={inputClass}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="联系人姓名"
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  className={inputClass}
                />
                <Input
                  placeholder="联系电话"
                  value={form.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <Input
                placeholder="联系邮箱"
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                className={inputClass}
              />
              {isLoggedIn && showQuickCreate && (
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← 返回选择已有客户
                </button>
              )}
            </div>
          )}
        </div>

        {/* 目的国家或地区 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            目的国家或地区
          </Label>
          <Input
            placeholder="例如：阿联酋、沙特阿拉伯、约旦..."
            value={form.destinationCountry}
            onChange={(e) => updateField("destinationCountry", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 车辆要求 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-muted-foreground" />
            车型 / 品牌 / 车龄等车辆要求
          </Label>
          <Textarea
            placeholder="例如：丰田 Land Cruiser，2020年后，自动挡，白色优先..."
            value={form.vehicleRequirements}
            onChange={(e) => updateField("vehicleRequirements", e.target.value)}
            className="min-h-[80px] resize-none rounded-lg"
            rows={3}
          />
        </div>

        {/* 数量 + 预算 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              数量
            </Label>
            <Input
              type="number"
              placeholder="例如：5"
              min={0}
              value={form.quantity === "" ? "" : form.quantity}
              onChange={(e) => {
                const v = e.target.value;
                updateField("quantity", v === "" ? "" : Number(v));
              }}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-muted-foreground" />
              预算范围
            </Label>
            <Input
              placeholder="例如：30-50万"
              value={form.budgetRange}
              onChange={(e) => updateField("budgetRange", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* 期望交付时间 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            期望交付时间
          </Label>
          <Input
            placeholder="例如：2025年9月底前、尽快..."
            value={form.expectedDelivery}
            onChange={(e) => updateField("expectedDelivery", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 其他要求 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            其他要求
          </Label>
          <Textarea
            placeholder="任何额外的需求或备注..."
            value={form.otherRequirements}
            onChange={(e) => updateField("otherRequirements", e.target.value)}
            className="min-h-[60px] resize-none rounded-lg"
            rows={2}
          />
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-navy" />
            {result ? "创建完成" : "记录客户需求"}
          </SheetTitle>
          <SheetDescription>
            {result
              ? "出口项目已创建，你可以继续完善信息。"
              : "填写客户需求信息，创建出口项目并开始推进业务。"}
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderContent()}
        </div>

        {/* Footer（仅在表单模式下显示） */}
        {!result && !loadError && !showSkeleton && (
          <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="ghost"
              className="w-full sm:flex-1 text-muted-foreground hover:text-foreground"
              onClick={handleCreateEmpty}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              暂不填写，创建空项目
            </Button>
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              onClick={handleSaveOnly}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              仅保存需求
            </Button>
            <Button
              className="w-full sm:flex-[1.5] bg-navy hover:bg-navy-light text-white"
              onClick={handleSaveAndCreate}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              保存并创建项目
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}