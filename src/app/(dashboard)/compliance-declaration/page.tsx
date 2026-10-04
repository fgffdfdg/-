'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Printer,
  Save,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import { useVinAutoFill } from '@/lib/vehicle-linkage';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  vin: string;
  destination: string;
}

interface CompanyInfo {
  companyName: string;
  creditCode: string;
  recipient: string;
  date: string;
}

interface SavedRecord {
  id: string;
  title: string;
  company_info: CompanyInfo;
  vehicles: Vehicle[];
  created_at: string;
  updated_at: string;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ComplianceDeclarationPage() {
  const { token } = useAuth();
  const { currentOrgId } = useOrg();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '',
    creditCode: '',
    recipient: '',
    date: todayStr(),
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: genId(), brand: '', model: '', vin: '', destination: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const previewRef = useRef<HTMLDivElement>(null);

  // Save/Load state
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lookingUpVin, setLookingUpVin] = useState<string | null>(null);
  const { lookupByVin } = useVinAutoFill('compliance-declaration');

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
            ? { ...v, ...result, vin: cleanVin, destination: v.destination || (result as Record<string, unknown>).destination as string || '' }
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

  const updateCompany = (field: keyof CompanyInfo, value: string) => {
    if (field === 'creditCode') {
      value = value.toUpperCase();
    }
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`company_${field}`];
      return next;
    });
  };

  const updateVehicle = (id: string, field: keyof Vehicle, value: string) => {
    if (field === 'vin') {
      value = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
    }
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`vehicle_${id}_${field}`];
      return next;
    });

    // VIN 变更时触发自动填充
    if (field === 'vin' && value.length >= 17) {
      handleVinLookup(id, value);
    }
  };

  const addVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      { id: genId(), brand: '', model: '', vin: '', destination: '' },
    ]);
  };

  const removeVehicle = (id: string) => {
    if (vehicles.length <= 1) {
      toast.error('至少保留一辆车辆');
      return;
    }
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const copyVehicle = (vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, { ...vehicle, id: genId(), vin: '' }]);
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyInfo.companyName.trim()) {
      newErrors.company_companyName = '请输入公司全称';
    }
    if (!companyInfo.creditCode.trim()) {
      newErrors.company_creditCode = '请输入统一社会信用代码';
    } else if (companyInfo.creditCode.length !== 18) {
      newErrors.company_creditCode = '统一社会信用代码应为18位';
    }
    if (!companyInfo.recipient.trim()) {
      newErrors.company_recipient = '请输入接收单位';
    }
    if (!companyInfo.date) {
      newErrors.company_date = '请选择声明日期';
    }

    vehicles.forEach((v, i) => {
      if (!v.brand.trim()) newErrors[`vehicle_${v.id}_brand`] = `第${i + 1}辆车：请输入品牌`;
      if (!v.model.trim()) newErrors[`vehicle_${v.id}_model`] = `第${i + 1}辆车：请输入型号`;
      if (!v.vin.trim()) {
        newErrors[`vehicle_${v.id}_vin`] = `第${i + 1}辆车：请输入VIN码`;
      } else if (!VIN_REGEX.test(v.vin)) {
        newErrors[`vehicle_${v.id}_vin`] = `第${i + 1}辆车：VIN码格式不正确（17位，不含I/O/Q）`;
      }
      if (!v.destination.trim()) newErrors[`vehicle_${v.id}_destination`] = `第${i + 1}辆车：请输入目的国`;
    });

    // Check duplicate VINs
    const vinSet = new Set<string>();
    vehicles.forEach((v, i) => {
      if (v.vin && VIN_REGEX.test(v.vin)) {
        if (vinSet.has(v.vin)) {
          newErrors[`vehicle_${v.id}_vin`] = `第${i + 1}辆车：VIN码与第${vehicles.findIndex((x) => x.vin === v.vin) + 1}辆车重复`;
        }
        vinSet.add(v.vin);
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [companyInfo, vehicles]);

  const handlePrint = () => {
    if (!validate()) {
      toast.error('请完善表单信息');
      return;
    }
    window.print();
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('请完善表单信息');
      return;
    }
    setSaveOpen(true);
  };

  const confirmSave = async () => {
    if (!saveTitle.trim()) {
      toast.error('请输入标题');
      return;
    }
    setSaving(true);
    try {
      const url = currentId
        ? `/api/compliance-declarations/${currentId}`
        : '/api/compliance-declarations';
      const method = currentId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: saveTitle,
          company_info: companyInfo,
          vehicles,
          organization_id: currentOrgId,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const json = await res.json();
      setCurrentId(json?.data?.id ?? null);
      toast.success('保存成功');
      setSaveOpen(false);
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async () => {
    setLoadOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance-declarations${currentOrgId ? `?organization_id=${currentOrgId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Load failed');
      const json = await res.json();
      setRecords(Array.isArray(json) ? json : (json?.data ?? []));
    } catch {
      toast.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRecord = (record: SavedRecord) => {
    setCompanyInfo(record.company_info);
    setVehicles(record.vehicles.length > 0 ? record.vehicles : [{ id: genId(), brand: '', model: '', vin: '', destination: '' }]);
    setCurrentId(record.id);
    setSaveTitle(record.title);
    setLoadOpen(false);
    toast.success('已加载记录');
  };

  const deleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/compliance-declarations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (currentId === id) setCurrentId(null);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const handleNew = () => {
    setCompanyInfo({ companyName: '', creditCode: '', recipient: '', date: todayStr() });
    setVehicles([{ id: genId(), brand: '', model: '', vin: '', destination: '' }]);
    setCurrentId(null);
    setSaveTitle('');
    setErrors({});
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">准入声明</h1>
          <p className="text-sm text-muted-foreground mt-1">
            生成出口车辆符合目标市场准入标准的声明文件，支持 A4 预览与 PDF 导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNew}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            新建
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoad}>
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            加载
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            保存
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            导出PDF
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {hasErrors && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive print:hidden">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>表单存在 {Object.keys(errors).length} 处错误，请修正后再打印</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6 print:hidden">
          {/* Company Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">企业信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    公司全称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={companyInfo.companyName}
                    onChange={(e) => updateCompany('companyName', e.target.value)}
                    placeholder="请输入公司全称"
                  />
                  {errors.company_companyName && (
                    <p className="text-xs text-destructive">{errors.company_companyName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditCode">
                    统一社会信用代码 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="creditCode"
                    value={companyInfo.creditCode}
                    onChange={(e) => updateCompany('creditCode', e.target.value)}
                    placeholder="请输入18位信用代码"
                    maxLength={18}
                  />
                  {errors.company_creditCode && (
                    <p className="text-xs text-destructive">{errors.company_creditCode}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">
                    接收单位 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipient"
                    value={companyInfo.recipient}
                    onChange={(e) => updateCompany('recipient', e.target.value)}
                    placeholder="请输入接收单位"
                  />
                  {errors.company_recipient && (
                    <p className="text-xs text-destructive">{errors.company_recipient}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">
                    声明日期 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={companyInfo.date}
                    onChange={(e) => updateCompany('date', e.target.value)}
                  />
                  {errors.company_date && (
                    <p className="text-xs text-destructive">{errors.company_date}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle List */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  车辆列表
                  <Badge variant="secondary" className="ml-2">
                    {vehicles.length} 辆
                  </Badge>
                </CardTitle>
                <Button size="sm" onClick={addVehicle}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  添加车辆
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        车辆 {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyVehicle(vehicle)}
                          title="复制"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeVehicle(vehicle.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">品牌</Label>
                        <Input
                          value={vehicle.brand}
                          onChange={(e) => updateVehicle(vehicle.id, 'brand', e.target.value)}
                          placeholder="如：Toyota"
                        />
                        {errors[`vehicle_${vehicle.id}_brand`] && (
                          <p className="text-xs text-destructive">{errors[`vehicle_${vehicle.id}_brand`]}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">型号</Label>
                        <Input
                          value={vehicle.model}
                          onChange={(e) => updateVehicle(vehicle.id, 'model', e.target.value)}
                          placeholder="如：Camry"
                        />
                        {errors[`vehicle_${vehicle.id}_model`] && (
                          <p className="text-xs text-destructive">{errors[`vehicle_${vehicle.id}_model`]}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">VIN码</Label>
                        <div className="relative">
                          <Input
                            value={vehicle.vin}
                            onChange={(e) => updateVehicle(vehicle.id, 'vin', e.target.value)}
                            placeholder="17位车辆识别码"
                            maxLength={17}
                            className="font-mono pr-7"
                          />
                          {lookingUpVin === vehicle.id && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                          {vehicle.vin.length >= 17 && lookingUpVin !== vehicle.id && (
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
                          )}
                        </div>
                        {errors[`vehicle_${vehicle.id}_vin`] && (
                          <p className="text-xs text-destructive">{errors[`vehicle_${vehicle.id}_vin`]}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">出口目的国</Label>
                        <Input
                          value={vehicle.destination}
                          onChange={(e) => updateVehicle(vehicle.id, 'destination', e.target.value)}
                          placeholder="如：俄罗斯"
                        />
                        {errors[`vehicle_${vehicle.id}_destination`] && (
                          <p className="text-xs text-destructive">{errors[`vehicle_${vehicle.id}_destination`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: A4 Preview */}
        <div className="print:w-full print:max-w-none">
          <div className="sticky top-4 print:static">
            <div className="print:hidden mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">A4 预览</h3>
              {currentId && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  已保存
                </Badge>
              )}
            </div>
            <div
              ref={previewRef}
              className="a4-preview bg-white shadow-lg border rounded-sm mx-auto"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '25mm 20mm',
                fontFamily: 'SimSun, "Songti SC", serif',
                fontSize: '14px',
                lineHeight: '2',
                color: '#000',
                maxWidth: '100%',
              }}
            >
              <h1
                style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  marginBottom: '30px',
                  letterSpacing: '2px',
                }}
              >
                出口车辆符合出口目标市场准入标准的声明
              </h1>

              <div style={{ textIndent: '2em', marginBottom: '20px' }}>
                本公司（{companyInfo.companyName || '_______________'}，统一社会信用代码：{companyInfo.creditCode || '_______________'}）作为出口车辆的经营主体，现就出口车辆符合目标市场准入标准事宜，郑重声明如下：
              </div>

              <div style={{ textIndent: '2em', marginBottom: '15px' }}>
                一、本公司出口的以下车辆，均符合出口目标市场（{vehicles[0]?.destination || '_____'})的技术标准、安全要求、环保标准及相关法律法规的规定。
              </div>

              <div style={{ margin: '15px 0' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '5%' }}>序号</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '15%' }}>品牌</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '15%' }}>型号</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '35%' }}>车辆识别码（VIN）</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '30%' }}>出口目的国</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v, i) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{v.brand || '_____'}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{v.model || '_____'}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px' }}>{v.vin || '__________________'}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{v.destination || '_____'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ textIndent: '2em', marginBottom: '10px' }}>
                二、本公司保证上述车辆的技术状况良好，安全性能达标，不存在影响行驶安全的质量问题。
              </div>

              <div style={{ textIndent: '2em', marginBottom: '10px' }}>
                三、本公司已按照出口目标市场的要求，提供了真实、准确、完整的车辆技术资料和相关证明文件。
              </div>

              <div style={{ textIndent: '2em', marginBottom: '10px' }}>
                四、如上述声明内容存在虚假记载、误导性陈述或重大遗漏，本公司愿意承担相应的法律责任。
              </div>

              <div style={{ textIndent: '2em', marginBottom: '30px' }}>
                特此声明。
              </div>

              <div
                style={{
                  marginTop: '50px',
                  textAlign: 'right',
                  paddingRight: '20px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  声明单位（盖章）：{companyInfo.companyName || '_______________'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  统一社会信用代码：{companyInfo.creditCode || '_______________'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  接收单位：{companyInfo.recipient || '_______________'}
                </div>
                <div>
                  声明日期：{companyInfo.date || '____年____月____日'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存声明</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="saveTitle">标题</Label>
              <Input
                id="saveTitle"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="请输入标题，便于后续查找"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>加载历史记录</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无保存的记录
              </div>
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{record.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {record.company_info?.companyName || '未命名公司'} · {record.vehicles?.length || 0} 辆车
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.updated_at ? new Date(record.updated_at).toLocaleString('zh-CN') : new Date(record.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="outline" onClick={() => loadRecord(record)}>
                        加载
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteRecord(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .a4-preview,
          .a4-preview * {
            visibility: visible;
          }
          .a4-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 25mm 20mm;
            box-shadow: none;
            border: none;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
