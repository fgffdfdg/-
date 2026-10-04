"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { getSupabaseBrowserClientAsync } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import type { CompanyInfo } from "@/components/documents/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Copy,
  Printer,
  Save,
  FolderOpen,
  FileText,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useVinAutoFill } from "@/lib/vehicle-linkage";

const CompanyProfilePicker = dynamic(
  () => import("@/components/documents/company-profile-picker"),
  { ssr: false, loading: () => null }
);

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  vin: string;
  manufactureDate: string;
  engineNo: string;
  color: string;
  destinationCountry: string;
}

interface Declaration {
  id: string;
  companyName: string;
  companyCode: string;
  recipient: string;
  declarationDate: string;
  vehicles: Vehicle[];
  createdAt: string;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const newVehicle = (template?: Partial<Vehicle>): Vehicle => ({
  id: generateId(),
  brand: template?.brand || "",
  model: template?.model || "",
  vin: template?.vin || "",
  manufactureDate: template?.manufactureDate || "",
  engineNo: template?.engineNo || "",
  color: template?.color || "",
  destinationCountry: template?.destinationCountry || "",
});

const todayValue = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function ExportDeclarationPage() {
  const { user } = useAuth();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    getSupabaseBrowserClientAsync().then(setSupabase);
  }, []);

  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [recipient, setRecipient] = useState("海关 / 相关监管部门");
  const [declarationDate, setDeclarationDate] = useState(todayValue());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [savedDeclarations, setSavedDeclarations] = useState<Declaration[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lookingUpVin, setLookingUpVin] = useState<string | null>(null);
  const { lookupByVin } = useVinAutoFill('export-declaration');

  const handleVinLookup = useCallback(async (id: string, vin: string) => {
    const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (cleanVin.length < 17) return;

    setLookingUpVin(id);
    try {
      const result = await lookupByVin(cleanVin);
      if (!result) { setLookingUpVin(null); return; }

      setVehicles((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, ...result, vin: cleanVin, destinationCountry: v.destinationCountry || (result as Record<string, unknown>).destinationCountry as string || '' }
            : v
        )
      );
      toast.success(`已从车辆档案自动填充 ${result.brand || ''} ${result.model || ''} 的信息`);
    } catch {
      // 静默处理
    } finally {
      setLookingUpVin(null);
    }
  }, []);

  const loadSavedDeclarations = async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from("export_declarations")
      .select("id, company_name, company_code, recipient, declaration_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSavedDeclarations(
        data.map((d: any): Declaration => ({
          id: d.id,
          companyName: d.company_name,
          companyCode: d.company_code,
          recipient: d.recipient || "海关 / 相关监管部门",
          declarationDate: d.declaration_date,
          vehicles: [],
          createdAt: d.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    if (user) {
      loadSavedDeclarations();
    }
  }, [user]);

  const loadDeclaration = async (id: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("export_declarations")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setCompanyName(data.company_name || "");
      setCompanyCode(data.company_code || "");
      setRecipient(data.recipient || "海关 / 相关监管部门");
      setDeclarationDate(data.declaration_date || todayValue());
      setVehicles(data.vehicles || []);
      setCurrentId(data.id);
      setErrors([]);
    }
  };

  const deleteDeclaration = async (id: string) => {
    if (!supabase) return;
    if (!window.confirm("确定要删除这份声明吗？")) return;

    const { error } = await supabase
      .from("export_declarations")
      .delete()
      .eq("id", id);

    if (!error) {
      setSavedDeclarations((prev) => prev.filter((d) => d.id !== id));
      if (currentId === id) {
        setCurrentId(null);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setCompanyCode("");
    setRecipient("海关 / 相关监管部门");
    setDeclarationDate(todayValue());
    setVehicles([newVehicle()]);
    setCurrentId(null);
    setErrors([]);
  };

  const addVehicle = () => {
    setVehicles([...vehicles, newVehicle()]);
  };

  const removeVehicle = (id: string) => {
    if (vehicles.length === 1) {
      alert("至少需要保留一辆车。");
      return;
    }
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const copyVehicle = (id: string) => {
    const index = vehicles.findIndex((v) => v.id === id);
    if (index > -1) {
      const newV = newVehicle(vehicles[index]);
      const newVehicles = [...vehicles];
      newVehicles.splice(index + 1, 0, newV);
      setVehicles(newVehicles);
    }
  };

  const updateVehicle = (id: string, field: keyof Vehicle, value: string) => {
    setVehicles(
      vehicles.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
    if (field === 'vin') {
      handleVinLookup(id, value);
    }
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];
    if (!companyName.trim()) newErrors.push("请填写公司全称");
    if (!companyCode.trim()) newErrors.push("请填写统一社会信用代码");
    vehicles.forEach((v, i) => {
      if (!v.vin.trim()) newErrors.push(`第 ${i + 1} 辆车请填写 VIN 码`);
    });
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const saveDeclaration = async () => {
    if (!validate()) return;
    if (!supabase || !user) return;

    const payload = {
      user_id: user.id,
      company_name: companyName,
      company_code: companyCode,
      recipient,
      declaration_date: declarationDate,
      vehicles,
    };

    let error;
    if (currentId) {
      const result = await supabase
        .from("export_declarations")
        .update(payload)
        .eq("id", currentId);
      error = result.error;
    } else {
      const result = await supabase
        .from("export_declarations")
        .insert(payload)
        .select()
        .single();
      if (!result.error && result.data) {
        setCurrentId(result.data.id);
      }
      error = result.error;
    }

    if (!error) {
      setShowSaveModal(false);
      await loadSavedDeclarations();
      alert("保存成功！");
    } else {
      alert("保存失败：" + error.message);
    }
  };

  const generateDeclarationHtml = () => {
    const vehicleRows = vehicles
      .map(
        (v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${v.brand || "-"}</td>
        <td>${v.model || "-"}</td>
        <td>${v.vin || "-"}</td>
        <td>${v.manufactureDate || "-"}</td>
        <td>${v.engineNo || "-"}</td>
        <td>${v.color || "-"}</td>
        <td>${v.destinationCountry || "-"}</td>
      </tr>
    `
      )
      .join("");

    return `
      <h1>符合目标市场准入声明</h1>
      <p><strong>声明人：</strong>${companyName || "________"}</p>
      <p><strong>统一社会信用代码：</strong>${companyCode || "________"}</p>
      <p><strong>致：</strong>${recipient}</p>
      <p class="sl-indent">
        本公司郑重声明，以下所列出口车辆均符合目标市场的准入要求，包括但不限于安全标准、环保标准、技术法规等相关规定。本公司对所提供信息的真实性负责，并愿意承担因信息不实而产生的法律责任。
      </p>
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>品牌</th>
            <th>型号</th>
            <th>VIN 码</th>
            <th>生产日期</th>
            <th>发动机号</th>
            <th>颜色</th>
            <th>目的国</th>
          </tr>
        </thead>
        <tbody>
          ${vehicleRows}
        </tbody>
      </table>
      <p class="sl-indent">
        本公司承诺上述车辆已通过必要的检测和认证，具备出口至目标市场的资格。如有虚假，本公司愿承担相应的法律责任。
      </p>
      <div class="sl-sign-area">
        <div>
          <p><strong>声明人（盖章）：</strong></p>
          <p style="margin-top: 3em;">____________________</p>
        </div>
        <div>
          <p><strong>法定代表人（签字）：</strong></p>
          <p style="margin-top: 3em;">____________________</p>
        </div>
      </div>
      <p class="sl-date-line"><strong>日期：</strong>${declarationDate || "________"}</p>
    `;
  };

  const printDocument = () => {
    if (!validate()) return;

    const printCss = `
      @page { size: A4; margin: 20mm; }
      body { font-family: "Songti SC", SimSun, serif; color: #111; padding: 20px; line-height: 1.8; }
      h1 { text-align: center; font-size: 22pt; margin-bottom: 20pt; }
      p { margin: 10pt 0; }
      .sl-indent { text-indent: 2em; }
      table { width: 100%; border-collapse: collapse; margin: 16pt 0; font-size: 10pt; }
      th, td { border: 1px solid #333; padding: 6pt; text-align: center; }
      th { background: #f2f2f2; font-weight: bold; }
      .sl-sign-area { display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; margin-top: 30pt; }
      .sl-date-line { margin-top: 24pt; }
      @media print { button { display: none; } }
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(
      `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>符合目标市场准入声明</title><style>${printCss}</style></head><body>${generateDeclarationHtml()}<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>`
    );
    win.document.close();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">符合目标市场准入声明</h1>
        <p className="text-muted-foreground">
          填写企业及车辆信息，生成符合目标市场准入要求的声明文件
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧表单 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 已保存的声明 */}
          {savedDeclarations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  已保存的声明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedDeclarations.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => loadDeclaration(d.id)}
                      >
                        <div className="font-medium">{d.companyName}</div>
                        <div className="text-sm text-muted-foreground">
                          {d.declarationDate} · {d.vehicles.length} 辆车
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDeclaration(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 企业信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">企业与声明信息</CardTitle>
                <CompanyProfilePicker
                  size="sm"
                  current={{
                    name: companyName,
                    address: "",
                    country: "China",
                    contact: "",
                    phone: "",
                    email: "",
                  }}
                  onPick={(info: CompanyInfo) => {
                    setCompanyName(info.name);
                  }}
                  label="选择档案"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  公司全称 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="请输入公司全称"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  统一社会信用代码 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={companyCode}
                  onChange={(e) =>
                    setCompanyCode(e.target.value.toUpperCase().replace(/\s/g, ""))
                  }
                  placeholder="请输入统一社会信用代码"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">致</label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="海关 / 相关监管部门"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">声明日期</label>
                <Input
                  type="date"
                  value={declarationDate}
                  onChange={(e) => setDeclarationDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 车辆信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">车辆信息</CardTitle>
                <Button size="sm" onClick={addVehicle}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加车辆
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicles.map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  className="border rounded-lg p-4 bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">车辆 {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyVehicle(vehicle.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVehicle(vehicle.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">品牌</label>
                      <Input
                        value={vehicle.brand}
                        onChange={(e) =>
                          updateVehicle(vehicle.id, "brand", e.target.value)
                        }
                        placeholder="车辆品牌"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">型号</label>
                      <Input
                        value={vehicle.model}
                        onChange={(e) =>
                          updateVehicle(vehicle.id, "model", e.target.value)
                        }
                        placeholder="车辆型号"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        VIN 码 <span className="text-destructive">*</span>
                        {lookingUpVin === vehicle.id && (
                          <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin text-muted-foreground" />
                        )}
                      </label>
                      <Input
                        value={vehicle.vin}
                        onChange={(e) =>
                          updateVehicle(
                            vehicle.id,
                            "vin",
                            e.target.value.toUpperCase().replace(/\s/g, "")
                          )
                        }
                        placeholder="输入 17 位 VIN 码，自动从车辆档案填充"
                        maxLength={17}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">生产日期</label>
                      <Input
                        type="date"
                        value={vehicle.manufactureDate}
                        onChange={(e) =>
                          updateVehicle(
                            vehicle.id,
                            "manufactureDate",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">发动机号</label>
                      <Input
                        value={vehicle.engineNo}
                        onChange={(e) =>
                          updateVehicle(vehicle.id, "engineNo", e.target.value)
                        }
                        placeholder="发动机编号"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">颜色</label>
                      <Input
                        value={vehicle.color}
                        onChange={(e) =>
                          updateVehicle(vehicle.id, "color", e.target.value)
                        }
                        placeholder="车辆颜色"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium">目的国</label>
                      <Input
                        value={vehicle.destinationCountry}
                        onChange={(e) =>
                          updateVehicle(
                            vehicle.id,
                            "destinationCountry",
                            e.target.value
                          )
                        }
                        placeholder="出口目的国家"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setShowSaveModal(true)}>
              <Save className="h-4 w-4 mr-2" />
              保存声明
            </Button>
            <Button variant="outline" onClick={resetForm}>
              重置
            </Button>
            <Button onClick={printDocument}>
              <Printer className="h-4 w-4 mr-2" />
              打印/下载 PDF
            </Button>
          </div>

          {/* 错误提示 */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <h4 className="font-medium text-destructive mb-2">
                请完善以下信息：
              </h4>
              <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 右侧预览 */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  声明预览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 aspect-[210/297] overflow-auto text-sm leading-relaxed font-serif">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateDeclarationHtml(),
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  A4 纸张预览 · 打印时自动适配
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 保存确认对话框 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>保存声明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                确认保存当前声明信息？保存后可随时加载和编辑。
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                >
                  取消
                </Button>
                <Button onClick={saveDeclaration}>确认保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
