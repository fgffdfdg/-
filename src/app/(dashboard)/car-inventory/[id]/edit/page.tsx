'use client';

import { useState, useEffect, type DragEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Upload,
  FileImage,
  X,
  Image as ImageIcon,
  Scan,
  CheckCircle2,
} from 'lucide-react';
import type { VehicleArchiveInput, VehicleArchiveRecord } from '@/lib/car-inventory/types';

export default function EditCarInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { token } = useAuth();

  const [form, setForm] = useState<VehicleArchiveInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  // 证件图片状态
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [licenseRemoved, setLicenseRemoved] = useState(false);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [regRemoved, setRegRemoved] = useState(false);

  // 已保存的图片 URL 解析
  const [existingLicenseUrl, setExistingLicenseUrl] = useState<string | null>(null);
  const [existingRegUrl, setExistingRegUrl] = useState<string | null>(null);

  // Drag
  const [dragLicense, setDragLicense] = useState(false);
  const [dragReg, setDragReg] = useState(false);

  // 识别状态
  const [parsing, setParsing] = useState<'license' | 'reg' | null>(null);
  const [parseResult, setParseResult] = useState<{ source: string; fields: string[] } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/car-inventory/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        const record = json.data as VehicleArchiveRecord;
        setForm({
          vin: record.vin,
          plate_number: record.plate_number,
          vehicle_origin: record.vehicle_origin,
          vehicle_type: record.vehicle_type,
          owner_name: record.owner_name,
          owner_address: record.owner_address,
          usage_nature: record.usage_nature,
          brand: record.brand,
          model: record.model,
          brand_model: record.brand_model,
          engine_number: record.engine_number,
          engine_model: record.engine_model,
          displacement: record.displacement,
          power: record.power,
          fuel_type: record.fuel_type,
          emission_standard: record.emission_standard,
          color: record.color,
          manufacturer: record.manufacturer,
          registration_date: record.registration_date,
          issue_date: record.issue_date,
          gross_mass: record.gross_mass,
          curb_weight: record.curb_weight,
          seating_capacity: record.seating_capacity,
          dimensions: record.dimensions,
          is_new_energy: record.is_new_energy,
          acquisition_method: record.acquisition_method,
          steering_type: record.steering_type,
          axles: record.axles,
          wheelbase: record.wheelbase,
          tire_count: record.tire_count,
          rated_load: record.rated_load,
          towing_capacity: record.towing_capacity,
          cargo_dimensions: record.cargo_dimensions,
          transfer_records: record.transfer_records,
          mortgage_records: record.mortgage_records,
          registration_authority: record.registration_authority,
          id_number: record.id_number,
          driving_license_image_url: record.driving_license_image_url,
          registration_cert_image_url: record.registration_cert_image_url,
          custom_model_name: record.custom_model_name,
          tags: record.tags,
          notes: record.notes,
          custom_fields: record.custom_fields,
          status: record.status,
        });

        // 加载已有图片 URL
        if (record.driving_license_image_url) {
          resolveImageUrl(record.driving_license_image_url, token).then(setExistingLicenseUrl);
        }
        if (record.registration_cert_image_url) {
          resolveImageUrl(record.registration_cert_image_url, token).then(setExistingRegUrl);
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFieldChange = (field: keyof VehicleArchiveInput, value: string | boolean) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    setRemoved: (v: boolean) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setFile(file);
    setRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const makeDragHandlers = (
    setDrag: (v: boolean) => void,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    setRemoved: (v: boolean) => void
  ) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDrag(true); },
    onDragLeave: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDrag(false); },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      handleFileSelect(file, setFile, setPreview, setRemoved);
    },
  });

  const handleParseLicense = async () => {
    const file = licenseFile;
    const existingUrl = (!licenseRemoved && existingLicenseUrl) ? existingLicenseUrl : null;
    if (!file && !existingUrl) return;
    setParsing('license');
    setError('');
    setParseResult(null);
    try {
      const body = file
        ? { imageBase64: await fileToBase64Compressed(file) }
        : { imageUrl: existingUrl };
      const res = await fetch('/api/car-inventory/parse-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        toast.error(`行驶证识别服务异常: ${text.slice(0, 100)}`);
        return;
      }
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      if (json.data) {
        setForm((prev) => prev ? { ...prev, ...json.data, source: 'ocr_license' } : null);
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
    const file = regFile;
    const existingUrl = (!regRemoved && existingRegUrl) ? existingRegUrl : null;
    if (!file && !existingUrl) return;
    setParsing('reg');
    setError('');
    setParseResult(null);
    try {
      const body = file
        ? { imageBase64: await fileToBase64Compressed(file) }
        : { imageUrl: existingUrl };
      const res = await fetch('/api/car-inventory/parse-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        toast.error(`绿本识别服务异常: ${text.slice(0, 100)}`);
        return;
      }
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      if (json.data) {
        setForm((prev) => prev ? { ...prev, ...json.data, source: prev.source === 'ocr_license' ? 'ocr_both' : 'ocr_cert' } : null);
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

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      // 处理证件图片
      let drivingLicenseUrl = form.driving_license_image_url ?? null;
      let regCertUrl = form.registration_cert_image_url ?? null;

      // 上传新图片
      if (licenseFile) {
        const base64 = await fileToBase64Compressed(licenseFile);
        const res = await fetch('/api/car-inventory/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ imageBase64: base64, fileName: licenseFile.name, contentType: licenseFile.type }),
        });
        const json = await res.json();
        if (json.error) throw new Error(`行驶证上传失败: ${json.error}`);
        drivingLicenseUrl = json.key;
      } else if (licenseRemoved) {
        drivingLicenseUrl = null;
      }

      if (regFile) {
        const base64 = await fileToBase64Compressed(regFile);
        const res = await fetch('/api/car-inventory/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ imageBase64: base64, fileName: regFile.name, contentType: regFile.type }),
        });
        const json = await res.json();
        if (json.error) throw new Error(`绿本上传失败: ${json.error}`);
        regCertUrl = json.key;
      } else if (regRemoved) {
        regCertUrl = null;
      }

      const payload = {
        ...form,
        vin: form.vin?.toUpperCase() || null,
        driving_license_image_url: drivingLicenseUrl,
        registration_cert_image_url: regCertUrl,
      };
      const res = await fetch(`/api/car-inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) {
        if (json.code === 'DUPLICATE_VIN' && json.existingVehicle) {
          const dup = json.existingVehicle;
          toast.error('VIN 重复，已有相同车架号的车辆档案', {
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
      toast.success('车辆档案已更新');
      router.push(`/car-inventory/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">{loadError || '车辆档案不存在'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/car-inventory')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">编辑车辆档案</h1>
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          已从{parseResult.source}识别到 {parseResult.fields.length} 个字段，已自动填入表单
        </div>
      )}

      {/* 证件图片上传 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            证件图片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 行驶证 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">行驶证</Label>
              {(licensePreview || existingLicenseUrl) && !licenseRemoved ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={licensePreview || existingLicenseUrl || ''}
                    alt="行驶证预览"
                    className="w-full h-48 object-contain bg-muted"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                    onClick={() => { setLicenseFile(null); setLicensePreview(null); setLicenseRemoved(true); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragLicense ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  {...makeDragHandlers(setDragLicense, setLicenseFile, setLicensePreview, setLicenseRemoved)}
                >
                  {dragLicense ? (
                    <>
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm text-primary font-medium">释放以上传行驶证</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {licenseRemoved ? '已移除，点击重新上传' : '点击或拖拽上传行驶证'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, setLicenseFile, setLicensePreview, setLicenseRemoved)}
                  />
                </label>
              )}
              {/* 识别按钮 */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={parsing !== null || (!licenseFile && !(!licenseRemoved && existingLicenseUrl))}
                onClick={handleParseLicense}
              >
                {parsing === 'license' ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 识别中...</>
                ) : (
                  <><Scan className="w-3 h-3 mr-1" /> 识别行驶证</>
                )}
              </Button>
            </div>

            {/* 绿本 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">机动车登记证书（绿本）</Label>
              {(regPreview || existingRegUrl) && !regRemoved ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={regPreview || existingRegUrl || ''}
                    alt="绿本预览"
                    className="w-full h-48 object-contain bg-muted"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                    onClick={() => { setRegFile(null); setRegPreview(null); setRegRemoved(true); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragReg ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  {...makeDragHandlers(setDragReg, setRegFile, setRegPreview, setRegRemoved)}
                >
                  {dragReg ? (
                    <>
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm text-primary font-medium">释放以上传绿本</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {regRemoved ? '已移除，点击重新上传' : '点击或拖拽上传绿本'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, setRegFile, setRegPreview, setRegRemoved)}
                  />
                </label>
              )}
              {/* 识别按钮 */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={parsing !== null || (!regFile && !(!regRemoved && existingRegUrl))}
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
                <Label>VIN</Label>
                <Input className="font-mono" value={form.vin ?? ''} onChange={(e) => handleFieldChange('vin', e.target.value.toUpperCase())} maxLength={17} />
              </div>
              <div className="space-y-2"><Label>号牌号码</Label><Input value={form.plate_number ?? ''} onChange={(e) => handleFieldChange('plate_number', e.target.value)} /></div>
              <div className="space-y-2"><Label>车源地</Label><Input value={form.vehicle_origin ?? ''} onChange={(e) => handleFieldChange('vehicle_origin', e.target.value)} placeholder="如：北京、上海" /></div>
              <div className="space-y-2"><Label>车辆类型</Label><Input value={form.vehicle_type ?? ''} onChange={(e) => handleFieldChange('vehicle_type', e.target.value)} /></div>
              <div className="space-y-2"><Label>品牌</Label><Input value={form.brand ?? ''} onChange={(e) => handleFieldChange('brand', e.target.value)} /></div>
              <div className="space-y-2"><Label>型号</Label><Input value={form.model ?? ''} onChange={(e) => handleFieldChange('model', e.target.value)} /></div>
              <div className="space-y-2"><Label>品牌型号</Label><Input value={form.brand_model ?? ''} onChange={(e) => handleFieldChange('brand_model', e.target.value)} /></div>
              <div className="space-y-2"><Label>发动机号码</Label><Input value={form.engine_number ?? ''} onChange={(e) => handleFieldChange('engine_number', e.target.value)} /></div>
              <div className="space-y-2"><Label>发动机型号</Label><Input value={form.engine_model ?? ''} onChange={(e) => handleFieldChange('engine_model', e.target.value)} /></div>
              <div className="space-y-2"><Label>所有人</Label><Input value={form.owner_name ?? ''} onChange={(e) => handleFieldChange('owner_name', e.target.value)} /></div>
              <div className="space-y-2">
                <Label>使用性质</Label>
                <Select value={form.usage_nature ?? ''} onValueChange={(v) => handleFieldChange('usage_nature', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="非营运">非营运</SelectItem>
                    <SelectItem value="营运">营运</SelectItem>
                    <SelectItem value="租赁">租赁</SelectItem>
                    <SelectItem value="教练">教练</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>注册日期</Label><Input type="date" value={form.registration_date ?? ''} onChange={(e) => handleFieldChange('registration_date', e.target.value)} /></div>
              <div className="space-y-2"><Label>发证日期</Label><Input type="date" value={form.issue_date ?? ''} onChange={(e) => handleFieldChange('issue_date', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>燃料种类</Label>
                <Select value={form.fuel_type ?? ''} onValueChange={(v) => handleFieldChange('fuel_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="汽油">汽油</SelectItem>
                    <SelectItem value="柴油">柴油</SelectItem>
                    <SelectItem value="纯电动">纯电动</SelectItem>
                    <SelectItem value="插电混动">插电混动</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排放标准</Label>
                <Select value={form.emission_standard ?? ''} onValueChange={(v) => handleFieldChange('emission_standard', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="国IV">国IV</SelectItem>
                    <SelectItem value="国V">国V</SelectItem>
                    <SelectItem value="国VI">国VI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>车身颜色</Label><Input value={form.color ?? ''} onChange={(e) => handleFieldChange('color', e.target.value)} /></div>
              <div className="space-y-2"><Label>排量</Label><Input value={form.displacement ?? ''} onChange={(e) => handleFieldChange('displacement', e.target.value)} /></div>
              <div className="space-y-2"><Label>功率</Label><Input value={form.power ?? ''} onChange={(e) => handleFieldChange('power', e.target.value)} /></div>
              <div className="space-y-2"><Label>制造厂</Label><Input value={form.manufacturer ?? ''} onChange={(e) => handleFieldChange('manufacturer', e.target.value)} /></div>
              <div className="space-y-2"><Label>总质量</Label><Input value={form.gross_mass ?? ''} onChange={(e) => handleFieldChange('gross_mass', e.target.value)} /></div>
              <div className="space-y-2"><Label>整备质量</Label><Input value={form.curb_weight ?? ''} onChange={(e) => handleFieldChange('curb_weight', e.target.value)} /></div>
              <div className="space-y-2"><Label>核定载人数</Label><Input value={form.seating_capacity ?? ''} onChange={(e) => handleFieldChange('seating_capacity', e.target.value)} /></div>
              <div className="space-y-2"><Label>外廓尺寸</Label><Input value={form.dimensions ?? ''} onChange={(e) => handleFieldChange('dimensions', e.target.value)} /></div>
              <div className="space-y-2"><Label>转向形式</Label><Input value={form.steering_type ?? ''} onChange={(e) => handleFieldChange('steering_type', e.target.value)} /></div>
              <div className="space-y-2"><Label>轴数</Label><Input value={form.axles ?? ''} onChange={(e) => handleFieldChange('axles', e.target.value)} /></div>
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
              <div className="space-y-2"><Label>登记机关</Label><Input value={form.registration_authority ?? ''} onChange={(e) => handleFieldChange('registration_authority', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>车型备注名</Label>
                <Input value={form.custom_model_name ?? ''} onChange={(e) => handleFieldChange('custom_model_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={form.notes ?? ''} onChange={(e) => handleFieldChange('notes', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** 将 S3 key 或 URL 解析为可显示的图片 URL */
async function resolveImageUrl(src: string, token?: string): Promise<string> {
  if (src.startsWith('http')) return src;
  try {
    const res = await fetch(`/api/car-inventory/image-url?key=${encodeURIComponent(src)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    return json.url || src;
  } catch {
    return src;
  }
}

/** 将 File 压缩后转为 base64 */
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