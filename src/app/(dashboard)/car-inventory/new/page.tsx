'use client';

import { useState, useCallback, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Upload,
  Loader2,
  Scan,
  Save,
  CheckCircle2,
  AlertCircle,
  FileImage,
  X,
} from 'lucide-react';
import type { VehicleArchiveInput } from '@/lib/car-inventory/types';

const INITIAL_FORM: VehicleArchiveInput = {
  vin: '',
  plate_number: '',
  vehicle_origin: '',
  vehicle_type: '',
  owner_name: '',
  owner_address: '',
  usage_nature: '',
  brand: '',
  model: '',
  brand_model: '',
  engine_number: '',
  engine_model: '',
  displacement: '',
  power: '',
  fuel_type: '',
  emission_standard: '',
  color: '',
  manufacturer: '',
  registration_date: '',
  issue_date: '',
  gross_mass: '',
  curb_weight: '',
  seating_capacity: '',
  dimensions: '',
  is_new_energy: false,
  acquisition_method: '',
  steering_type: '',
  axles: '',
  wheelbase: '',
  tire_count: '',
  rated_load: '',
  towing_capacity: '',
  cargo_dimensions: '',
  transfer_records: null,
  mortgage_records: null,
  registration_authority: '',
  id_number: '',
  custom_model_name: '',
  tags: [],
  notes: '',
  custom_fields: {},
  source: 'manual',
  status: 'active',
};

export default function NewCarInventoryPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { organization } = useOrg();

  const [form, setForm] = useState<VehicleArchiveInput>({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // OCR states
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState<'license' | 'reg' | 'both' | null>(null);
  const [parseResult, setParseResult] = useState<{ source: string; fields: string[] } | null>(null);

  // Drag states
  const [dragLicense, setDragLicense] = useState(false);
  const [dragReg, setDragReg] = useState(false);

  const handleFieldChange = (field: keyof VehicleArchiveInput, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /** 拖拽通用处理 */
  const makeDragHandlers = (setDrag: (v: boolean) => void, setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDrag(true); },
    onDragLeave: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDrag(false); },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      handleFileSelect(file, setFile, setPreview);
    },
  });

  const handleParseLicense = async () => {
    if (!licenseFile) return;
    setParsing('license');
    setError('');
    setParseResult(null);
    try {
      const base64 = await fileToBase64Compressed(licenseFile);
      const res = await fetch('/api/car-inventory/parse-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        toast.error(`行驶证识别服务异常: ${text.slice(0, 100)}`);
        return;
      }
      const json = await res.json();
      if (json.error) {
        toast.error(json.error || '行驶证识别失败');
        return;
      }
      if (json.data) {
        setForm((prev) => ({ ...prev, ...json.data, source: 'ocr_license' }));
        const fields = Object.keys(json.data).filter(k => json.data[k] != null);
        setParseResult({ source: '行驶证', fields });
        toast.success(`行驶证识别成功，提取 ${fields.length} 个字段`);
      } else {
        toast.warning('行驶证识别完成，但未提取到数据');
      }
    } catch (err) {
      toast.error('行驶证识别失败，请检查网络后重试');
    } finally {
      setParsing(null);
    }
  };

  const handleParseReg = async () => {
    if (!regFile) return;
    setParsing('reg');
    setError('');
    setParseResult(null);
    try {
      const base64 = await fileToBase64Compressed(regFile);
      const res = await fetch('/api/car-inventory/parse-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        toast.error(`绿本识别服务异常: ${text.slice(0, 100)}`);
        return;
      }
      const json = await res.json();
      if (json.error) {
        toast.error(json.error || '绿本识别失败');
        return;
      }
      if (json.data) {
        setForm((prev) => ({ ...prev, ...json.data, source: prev.source === 'ocr_license' ? 'ocr_both' : 'ocr_cert' }));
        const fields = Object.keys(json.data).filter(k => json.data[k] != null);
        setParseResult({ source: '绿本', fields });
        toast.success(`绿本识别成功，提取 ${fields.length} 个字段`);
      } else {
        toast.warning('绿本识别完成，但未提取到数据');
      }
    } catch (err) {
      toast.error('绿本识别失败，请检查网络后重试');
    } finally {
      setParsing(null);
    }
  };

  /** 上传单张图片到 S3，返回 key */
  const uploadImageToS3 = async (file: File): Promise<string> => {
    const base64 = await fileToBase64Compressed(file, 1600, 0.75);
    const res = await fetch('/api/car-inventory/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageBase64: base64, fileName: file.name, contentType: file.type }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.key; // 返回 S3 key，持久化存储
  };

  const handleSave = async () => {
    if (!user || !token) return;
    if (!form.vin) {
      toast.error('VIN/车辆识别代号为必填项');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // 上传行驶证和绿本图片到 S3
      const [licenseKey, regKey] = await Promise.all([
        licenseFile ? uploadImageToS3(licenseFile).catch((err) => { toast.error(`行驶证上传失败: ${err.message}`); return null; }) : null,
        regFile ? uploadImageToS3(regFile).catch((err) => { toast.error(`绿本上传失败: ${err.message}`); return null; }) : null,
      ]);

      const payload: VehicleArchiveInput = {
        ...form,
        organization_id: organization?.id ?? null,
        vin: form.vin?.toUpperCase() || null,
        driving_license_image_url: licenseKey ?? form.driving_license_image_url ?? null,
        registration_cert_image_url: regKey ?? form.registration_cert_image_url ?? null,
      };
      const res = await fetch('/api/car-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('服务异常，请稍后重试');
      }
      const json = await res.json();
      if (json.error) {
        if (json.code === 'DUPLICATE_VIN' && json.existingVehicle) {
          const dup = json.existingVehicle;
          toast.error('VIN 重复，请勿重复录入', {
            description: `已有车辆：${dup.custom_model_name || dup.brand_model || dup.vin}（${dup.plate_number || '无车牌'}）`,
            action: { label: '查看', onClick: () => router.push(`/car-inventory/${dup.id}`) },
            duration: 8000,
          });
          setError('VIN 重复');
          setSaving(false);
          return;
        }
        throw new Error(json.error);
      }
      toast.success('车辆档案保存成功');
      router.push(`/car-inventory/${json.data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">新增车辆档案</h1>
          <p className="text-sm text-muted-foreground mt-1">手动录入或上传证件自动识别</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {parseResult && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          已从{parseResult.source}识别到 {parseResult.fields.length} 个字段，已自动填入表单
        </div>
      )}

      {/* OCR Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scan className="w-4 h-4" />
            证件识别（可选）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 行驶证上传 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">行驶证</Label>
              {licensePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={licensePreview} alt="行驶证预览" className="w-full h-48 object-contain bg-muted" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                    onClick={() => { setLicenseFile(null); setLicensePreview(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragLicense
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  {...makeDragHandlers(setDragLicense, setLicenseFile, setLicensePreview)}
                >
                  {dragLicense ? (
                    <>
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm text-primary font-medium">释放以上传行驶证</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">点击或拖拽上传行驶证</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, setLicenseFile, setLicensePreview)}
                  />
                </label>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!licenseFile || parsing !== null}
                onClick={handleParseLicense}
              >
                {parsing === 'license' ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 识别中...</>
                ) : (
                  <><Scan className="w-3 h-3 mr-1" /> 识别行驶证</>
                )}
              </Button>
            </div>

            {/* 绿本上传 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">机动车登记证书（绿本）</Label>
              {regPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={regPreview} alt="绿本预览" className="w-full h-48 object-contain bg-muted" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                    onClick={() => { setRegFile(null); setRegPreview(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragReg
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  {...makeDragHandlers(setDragReg, setRegFile, setRegPreview)}
                >
                  {dragReg ? (
                    <>
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm text-primary font-medium">释放以上传绿本</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">点击或拖拽上传绿本</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, setRegFile, setRegPreview)}
                  />
                </label>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!regFile || parsing !== null}
                onClick={handleParseReg}
              >
                {parsing === 'reg' ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 识别中...</>
                ) : (
                  <><Scan className="w-3 h-3 mr-1" /> 识别绿本</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Tabs defaultValue="core">
        <TabsList className="w-full">
          <TabsTrigger value="core" className="flex-1">核心信息</TabsTrigger>
          <TabsTrigger value="detail" className="flex-1">详细参数</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">自定义</TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>VIN / 车辆识别代号 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="17位VIN码"
                  className="font-mono"
                  value={form.vin ?? ''}
                  onChange={(e) => handleFieldChange('vin', e.target.value.toUpperCase())}
                  maxLength={17}
                />
              </div>
              <div className="space-y-2">
                <Label>号牌号码</Label>
                <Input value={form.plate_number ?? ''} onChange={(e) => handleFieldChange('plate_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>车源地</Label>
                <Input value={form.vehicle_origin ?? ''} onChange={(e) => handleFieldChange('vehicle_origin', e.target.value)} placeholder="如：北京、上海" />
              </div>
              <div className="space-y-2">
                <Label>车辆类型</Label>
                <Input value={form.vehicle_type ?? ''} onChange={(e) => handleFieldChange('vehicle_type', e.target.value)} placeholder="小型轿车" />
              </div>
              <div className="space-y-2">
                <Label>品牌</Label>
                <Input value={form.brand ?? ''} onChange={(e) => handleFieldChange('brand', e.target.value)} placeholder="丰田牌" />
              </div>
              <div className="space-y-2">
                <Label>型号</Label>
                <Input value={form.model ?? ''} onChange={(e) => handleFieldChange('model', e.target.value)} placeholder="TV7250" />
              </div>
              <div className="space-y-2">
                <Label>品牌型号（全称）</Label>
                <Input value={form.brand_model ?? ''} onChange={(e) => handleFieldChange('brand_model', e.target.value)} placeholder="丰田牌TV7250" />
              </div>
              <div className="space-y-2">
                <Label>发动机号码</Label>
                <Input value={form.engine_number ?? ''} onChange={(e) => handleFieldChange('engine_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>发动机型号</Label>
                <Input value={form.engine_model ?? ''} onChange={(e) => handleFieldChange('engine_model', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>所有人</Label>
                <Input value={form.owner_name ?? ''} onChange={(e) => handleFieldChange('owner_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>使用性质</Label>
                <Select value={form.usage_nature ?? ''} onValueChange={(v) => handleFieldChange('usage_nature', v)}>
                  <SelectTrigger><SelectValue placeholder="选择使用性质" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="非营运">非营运</SelectItem>
                    <SelectItem value="营运">营运</SelectItem>
                    <SelectItem value="租赁">租赁</SelectItem>
                    <SelectItem value="教练">教练</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>注册日期</Label>
                <Input type="date" value={form.registration_date ?? ''} onChange={(e) => handleFieldChange('registration_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>发证日期</Label>
                <Input type="date" value={form.issue_date ?? ''} onChange={(e) => handleFieldChange('issue_date', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>燃料种类</Label>
                <Select value={form.fuel_type ?? ''} onValueChange={(v) => handleFieldChange('fuel_type', v)}>
                  <SelectTrigger><SelectValue placeholder="选择燃料种类" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="汽油">汽油</SelectItem>
                    <SelectItem value="柴油">柴油</SelectItem>
                    <SelectItem value="纯电动">纯电动</SelectItem>
                    <SelectItem value="插电混动">插电混动</SelectItem>
                    <SelectItem value="天然气">天然气</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排放标准</Label>
                <Select value={form.emission_standard ?? ''} onValueChange={(v) => handleFieldChange('emission_standard', v)}>
                  <SelectTrigger><SelectValue placeholder="选择排放标准" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="国IV">国IV</SelectItem>
                    <SelectItem value="国V">国V</SelectItem>
                    <SelectItem value="国VI">国VI</SelectItem>
                    <SelectItem value="欧V">欧V</SelectItem>
                    <SelectItem value="欧VI">欧VI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>车身颜色</Label>
                <Input value={form.color ?? ''} onChange={(e) => handleFieldChange('color', e.target.value)} placeholder="白" />
              </div>
              <div className="space-y-2">
                <Label>排量</Label>
                <Input value={form.displacement ?? ''} onChange={(e) => handleFieldChange('displacement', e.target.value)} placeholder="2494ml" />
              </div>
              <div className="space-y-2">
                <Label>功率</Label>
                <Input value={form.power ?? ''} onChange={(e) => handleFieldChange('power', e.target.value)} placeholder="135kw" />
              </div>
              <div className="space-y-2">
                <Label>制造厂名称</Label>
                <Input value={form.manufacturer ?? ''} onChange={(e) => handleFieldChange('manufacturer', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>总质量</Label>
                <Input value={form.gross_mass ?? ''} onChange={(e) => handleFieldChange('gross_mass', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>整备质量</Label>
                <Input value={form.curb_weight ?? ''} onChange={(e) => handleFieldChange('curb_weight', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>核定载人数</Label>
                <Input value={form.seating_capacity ?? ''} onChange={(e) => handleFieldChange('seating_capacity', e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label>外廓尺寸</Label>
                <Input value={form.dimensions ?? ''} onChange={(e) => handleFieldChange('dimensions', e.target.value)} placeholder="4825×1820×1480mm" />
              </div>
              <div className="space-y-2">
                <Label>转向形式</Label>
                <Input value={form.steering_type ?? ''} onChange={(e) => handleFieldChange('steering_type', e.target.value)} placeholder="左转" />
              </div>
              <div className="space-y-2">
                <Label>轴数</Label>
                <Input value={form.axles ?? ''} onChange={(e) => handleFieldChange('axles', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>是否新能源</Label>
                <Select value={form.is_new_energy ? 'true' : 'false'} onValueChange={(v) => handleFieldChange('is_new_energy', v === 'true')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">否</SelectItem>
                    <SelectItem value="true">是</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>登记机关</Label>
                <Input value={form.registration_authority ?? ''} onChange={(e) => handleFieldChange('registration_authority', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>车型备注名</Label>
                <Input
                  value={form.custom_model_name ?? ''}
                  onChange={(e) => handleFieldChange('custom_model_name', e.target.value)}
                  placeholder="方便业务人员记忆，如'老张那台卡罗拉'"
                />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={form.notes ?? ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="其他需要记录的信息..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** 将 File 压缩后转为 base64，最长边不超过 maxPx */
async function fileToBase64Compressed(file: File, maxPx = 1600, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('压缩失败')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}