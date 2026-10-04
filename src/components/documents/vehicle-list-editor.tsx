'use client';

import { useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Upload, Loader2, ScanLine, Search } from 'lucide-react';
import type { VehicleItem } from './types';
import {
  defaultVehicle,
  bodyTypeOptions,
  conditionOptions,
  energyTypeOptions,
} from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useVinAutoFill } from '@/lib/vehicle-linkage';
import type { DocType } from '@/lib/vehicle-linkage';

interface ExtractedVehicle {
  vin: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  energyType: string | null;
  bodyType: string | null;
  power: string;
  netWeight: number | null;
  grossWeight: number | null;
}

interface Props {
  vehicles: VehicleItem[];
  onChange: (vehicles: VehicleItem[]) => void;
  showPrice?: boolean;
  currency?: string;
  /** 是否显示报关单扩展字段（能源类型 / 车身 / 重量 / HS Code 等） */
  showCustomsFields?: boolean;
  /** 单证类型，用于 VIN 自动填充联动 */
  docType?: DocType;
}

export default function VehicleListEditor({
  vehicles,
  onChange,
  showPrice = true,
  currency = 'USD',
  showCustomsFields = false,
  docType,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [lookingUpVin, setLookingUpVin] = useState<string | null>(null);
  const { lookupByVin } = useVinAutoFill(docType || 'invoice');

  const addVehicle = () => {
    onChange([...vehicles, defaultVehicle()]);
  };

  const removeVehicle = (id: string) => {
    onChange(vehicles.filter((v) => v.id !== id));
  };

  const handleVinLookup = useCallback(async (id: string, vin: string) => {
    if (!docType || vin.length < 17) return;
    const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanVin.length < 17) return;

    // 检查是否已有同 VIN 的查找结果
    const existing = vehicles.find((v) => v.id !== id && v.vin.toUpperCase() === cleanVin);
    if (existing) {
      toast.info(`VIN ${cleanVin} 已存在于车辆 #{vehicles.findIndex((v) => v.id === existing.id) + 1}，跳过查询`);
      return;
    }

    setLookingUpVin(id);
    try {
      const result = await lookupByVin(cleanVin);
      if (!result) {
        // 未找到，静默
        setLookingUpVin(null);
        return;
      }

      onChange(
        vehicles.map((v) => {
          if (v.id !== id) return v;
          const merged = { ...v, ...result };
          // 保留用户可能已修改的字段
          if (v.vin) merged.vin = v.vin;
          if (v.quantity !== defaultVehicle().quantity) merged.quantity = v.quantity;
          if (v.unitPrice !== defaultVehicle().unitPrice) merged.unitPrice = v.unitPrice;
          merged.totalPrice = merged.quantity * merged.unitPrice;
          return merged;
        }),
      );
      toast.success(`已从车辆档案自动填充 ${result.brand || ''} ${result.model || ''} 的信息`);
    } catch {
      // 静默处理查询失败
    } finally {
      setLookingUpVin(null);
    }
  }, [docType, vehicles, onChange]);

  const updateVehicle = (id: string, field: keyof VehicleItem, value: string | number) => {
    onChange(
      vehicles.map((v) => {
        if (v.id !== id) return v;
        const updated = { ...v, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        // 净重输入时，如果毛重为空则自动同步
        if (field === 'netWeight' && !updated.grossWeight) {
          updated.grossWeight = value as number;
        }
        return updated;
      }),
    );

    // VIN 变更时触发自动填充
    if (field === 'vin' && typeof value === 'string' && value.length >= 17) {
      handleVinLookup(id, value);
    }
  };

  const handleExtractFromImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 重置 input，允许重复选同一文件
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件（JPG / PNG 等）');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('图片过大（>8MB），请压缩后再试');
      return;
    }

    setExtracting(true);
    const loadingId = toast.loading('正在识别车辆证件，请稍候…');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/documents/extract-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || '识别失败');
      }
      const ext = json.data as ExtractedVehicle;

      // 若已存在同 VIN 的车，更新该车；否则追加一辆
      const newVehicle: VehicleItem = {
        ...defaultVehicle(),
        vin: ext.vin || '',
        brand: ext.brand || '',
        model: ext.model || '',
        year: ext.year || '',
        color: ext.color || '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      };
      if (showCustomsFields) {
        if (ext.energyType && energyTypeOptions.includes(ext.energyType as typeof energyTypeOptions[number])) {
          newVehicle.energyType = ext.energyType;
        }
        if (ext.bodyType && bodyTypeOptions.includes(ext.bodyType as typeof bodyTypeOptions[number])) {
          newVehicle.bodyType = ext.bodyType;
        }
        if (ext.power) newVehicle.power = ext.power;
        if (ext.netWeight) newVehicle.netWeight = ext.netWeight;
        if (ext.grossWeight) newVehicle.grossWeight = ext.grossWeight;
        newVehicle.condition = 'Used';
        newVehicle.packages = 1;
        newVehicle.marks = 'N/M';
      }

      let next: VehicleItem[];
      const existingIdx = ext.vin
        ? vehicles.findIndex((v) => v.vin && v.vin.toUpperCase() === ext.vin.toUpperCase())
        : -1;
      if (existingIdx >= 0) {
        next = vehicles.map((v, i) => (i === existingIdx ? { ...v, ...newVehicle, id: v.id } : v));
        toast.dismiss(loadingId);
        toast.success(`已更新 ${ext.brand || ''} ${ext.model || ''} 的信息`);
      } else {
        next = [...vehicles, newVehicle];
        toast.dismiss(loadingId);
        toast.success(`已识别并添加：${ext.brand || ''} ${ext.model || ''}（${ext.vin || '无VIN'}）`);
      }
      onChange(next);
    } catch (err) {
      toast.dismiss(loadingId);
      const message = err instanceof Error ? err.message : '识别失败';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-navy">
          Vehicle List / 车辆清单
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleExtractFromImage}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="h-7 text-xs"
            title="上传机动车登记证或行驶证，AI 自动识别并填入"
          >
            {extracting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <ScanLine className="h-3 w-3 mr-1" />
            )}
            {extracting ? '识别中…' : 'AI 识别证件'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVehicle}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No vehicles added. Click &quot;Add Vehicle&quot; to start.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            上传登记证 / 行驶证，一键识别
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v, idx) => (
            <div key={v.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-navy">Vehicle #{idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVehicle(v.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* 基础字段 */}
              <div className="grid grid-cols-3 gap-2">
                {showCustomsFields && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Condition / 新旧</Label>
                    <Select
                      value={v.condition || 'Used'}
                      onValueChange={(val) => updateVehicle(v.id, 'condition', val)}
                    >
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="col-span-3 sm:col-span-1">
                  <Label className="text-[10px] text-muted-foreground">VIN</Label>
                  <div className="relative">
                    <Input
                      className="mt-0.5 h-7 text-xs font-mono pr-7"
                      placeholder="LSVAU2180N2XXXXXX"
                      value={v.vin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'vin', e.target.value.toUpperCase())}
                      maxLength={17}
                    />
                    {lookingUpVin === v.id && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    {docType && v.vin.length >= 17 && lookingUpVin !== v.id && (
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/60" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Brand / 品牌</Label>
                  <Input
                    className="mt-0.5 h-7 text-xs"
                    placeholder="Toyota"
                    value={v.brand}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'brand', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Model / 型号</Label>
                  <Input
                    className="mt-0.5 h-7 text-xs"
                    placeholder="Camry"
                    value={v.model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'model', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Year / 年份</Label>
                  <Input
                    className="mt-0.5 h-7 text-xs"
                    placeholder="2020"
                    value={v.year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'year', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Color / 颜色</Label>
                  <Input
                    className="mt-0.5 h-7 text-xs"
                    placeholder="White"
                    value={v.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'color', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Qty / 数量</Label>
                  <Input
                    type="number"
                    className="mt-0.5 h-7 text-xs"
                    min={1}
                    value={v.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* 报关单扩展字段 */}
              {showCustomsFields && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Energy / 能源类型</Label>
                      <Select
                        value={v.energyType || 'Battery Electric'}
                        onValueChange={(val) => updateVehicle(v.id, 'energyType', val)}
                      >
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {energyTypeOptions.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Body / 车型</Label>
                      <Select
                        value={v.bodyType || 'Passenger Vehicle'}
                        onValueChange={(val) => updateVehicle(v.id, 'bodyType', val)}
                      >
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {bodyTypeOptions.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Power (kW)</Label>
                      <Input
                        type="number"
                        className="mt-0.5 h-7 text-xs"
                        min={0}
                        value={v.power ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'power', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Net (kg)</Label>
                      <Input
                        type="number"
                        className="mt-0.5 h-7 text-xs"
                        min={0}
                        value={v.netWeight ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'netWeight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Gross (kg)</Label>
                      <Input
                        type="number"
                        className="mt-0.5 h-7 text-xs"
                        min={0}
                        value={v.grossWeight ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'grossWeight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Packages 件数</Label>
                      <Input
                        type="number"
                        className="mt-0.5 h-7 text-xs"
                        min={1}
                        value={v.packages ?? 1}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'packages', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Marks 唛头</Label>
                      <Input
                        className="mt-0.5 h-7 text-xs"
                        value={v.marks ?? 'N/M'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'marks', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">HS Code 商品编码</Label>
                      <Input
                        className="mt-0.5 h-7 text-xs font-mono"
                        value={v.hsCode ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'hsCode', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px] text-muted-foreground">Customs Spec / 报关规格型号</Label>
                      <Input
                        className="mt-0.5 h-7 text-xs"
                        value={v.customsSpec ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'customsSpec', e.target.value)}
                        placeholder="留空将自动根据品牌/型号/能源/车型生成"
                      />
                    </div>
                  </div>
                </>
              )}

              {showPrice && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Unit Price ({currency})</Label>
                    <Input
                      type="number"
                      className="mt-0.5 h-7 text-xs"
                      min={0}
                      step={0.01}
                      value={v.unitPrice || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVehicle(v.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Total ({currency})</Label>
                    <div className="mt-0.5 h-7 flex items-center rounded-md bg-muted px-2 text-xs font-semibold text-navy">
                      {v.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
