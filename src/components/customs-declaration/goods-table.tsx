'use client';

import * as React from 'react';
import { Plus, Trash2, PlusSquare, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { CodeSelect } from './code-select';
import {
  COUNTRIES,
  CURRENCIES,
  DOMESTIC_SOURCES,
  UNITS,
  DUTY_EXEMPTIONS,
  findByCode,
} from '@/lib/customs-codes';
import type { CustomsDeclarationFull, DeclarationGoodsItem } from '@/lib/customs-declaration/types';
import { newGoodsItem } from '@/lib/customs-declaration/types';

interface Props {
  value: CustomsDeclarationFull;
  onChange: (next: CustomsDeclarationFull) => void;
}

export function GoodsTable({ value, onChange }: Props) {
  const goods = value.goods;
  const valueRef = React.useRef(value);
  React.useEffect(() => {
    valueRef.current = value;
  });

  const updateItem = React.useCallback(
    (id: string, patch: Partial<DeclarationGoodsItem>) => {
      const prev = valueRef.current;
      const next = prev.goods.map((g) => {
        if (g.id !== id) return g;
        const merged = { ...g, ...patch };
        if (patch.unitPrice !== undefined || patch.quantity !== undefined) {
          const qty = Number(merged.quantity) || 0;
          const up = Number(merged.unitPrice) || 0;
          if (!patch.totalPrice) {
            merged.totalPrice = Math.round(qty * up * 100) / 100;
          }
        }
        return merged;
      });
      onChange({ ...prev, goods: reindex(next) });
    },
    [onChange],
  );

  const addRow = (base?: Partial<DeclarationGoodsItem>) => {
    const prev = valueRef.current;
    const item = newGoodsItem(base);
    onChange({ ...prev, goods: reindex([...prev.goods, item]) });
  };

  const removeRow = (id: string) => {
    const prev = valueRef.current;
    onChange({ ...prev, goods: reindex(prev.goods.filter((g) => g.id !== id)) });
  };

  const totals = React.useMemo(() => {
    let qty = 0;
    let amount = 0;
    let gross = 0;
    let net = 0;
    goods.forEach((g) => {
      const q = Number(g.quantity) || 0;
      qty += q;
      amount += Number(g.totalPrice) || Number(g.unitPrice) * q || 0;
      gross += (Number(g.grossWeight) || 0) * q;
      net += (Number(g.netWeight) || 0) * q;
    });
    return { qty, amount, gross, net };
  }, [goods]);

  const firstCurrency = goods.find((g) => g.currencyCode)?.currencyCode;
  const currencyName = firstCurrency ? findByCode(CURRENCIES, firstCurrency)?.alias?.split(' ')[0] : '';
  const unitName = goods[0]?.unitCode ? findByCode(UNITS, goods[0].unitCode)?.name : '';

  return (
    <div>
      <div className="space-y-3">
        {goods.length === 0 && (
          <div className="rounded-lg border border-dashed border-outline-variant/50 text-center text-on-surface-variant text-sm py-12">
            暂无商品明细，点击右下角"手动添加"开始录入
          </div>
        )}
        {goods.map((g, idx) => (
          <GoodsCard key={g.id} item={g} index={idx + 1} onChange={updateItem} onRemove={removeRow} />
        ))}
      </div>

      {/* 汇总栏 */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-on-surface-variant">
        <span>
          共 <b className="text-on-surface">{goods.length}</b> 项
        </span>
        <span className="w-px h-3 bg-outline-variant" />
        <span>
          总数量 <b className="text-on-surface">{totals.qty}</b> {unitName}
        </span>
        <span className="w-px h-3 bg-outline-variant" />
        <span>
          总价{' '}
          <b className="text-on-surface font-mono">
            {currencyName} {totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </b>
        </span>
        <span className="w-px h-3 bg-outline-variant" />
        <span>
          总毛重 <b className="text-on-surface font-mono">{totals.gross.toLocaleString()}</b> kg / 净重{' '}
          <b className="text-on-surface font-mono">{totals.net.toLocaleString()}</b> kg
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.message('车辆库功能即将上线，请先手动添加')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            从车辆库添加
          </button>
          <button
            type="button"
            onClick={() => addRow()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            手动添加
          </button>
        </div>
      </div>
    </div>
  );
}

function reindex(items: DeclarationGoodsItem[]): DeclarationGoodsItem[] {
  return items.map((g, i) => ({ ...g, itemNo: i + 1 }));
}

/* ───────── 卡片式布局 ───────── */

interface CardProps {
  item: DeclarationGoodsItem;
  index: number;
  onChange: (id: string, patch: Partial<DeclarationGoodsItem>) => void;
  onRemove: (id: string) => void;
}

function GoodsCard({ item, index, onChange, onRemove }: CardProps) {
  const { token } = useAuth();
  const [vinSearching, setVinSearching] = React.useState(false);

  const handleVinLookup = React.useCallback(async () => {
    const vin = item.vin?.trim();
    if (!vin || vin.length !== 17) {
      toast.error('请先输入完整的17位车架号');
      return;
    }

    if (!token) {
      toast.error('登录已过期，请刷新页面');
      return;
    }

    setVinSearching(true);
    try {
      const res = await fetch(`/api/customs-declaration/vin-lookup?vin=${encodeURIComponent(vin)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '检索失败');
        return;
      }

      const patch: Partial<DeclarationGoodsItem> = {};

      // 自动填充商品名称及规格型号
      if (data.goodsDescription) {
        patch.goodsDescription = data.goodsDescription;
      } else if (data.vehicle) {
        patch.goodsDescription = [data.vehicle.brand, data.vehicle.model]
          .filter(Boolean)
          .join(' ');
      }

      // 优先使用装箱单中的毛重/净重
      if (data.packing?.grossWeight != null) {
        patch.grossWeight = data.packing.grossWeight;
      } else if (data.vehicle?.grossMass != null) {
        patch.grossWeight = data.vehicle.grossMass;
      }

      if (data.packing?.netWeight != null) {
        patch.netWeight = data.packing.netWeight;
      } else if (data.vehicle?.curbWeight != null) {
        patch.netWeight = data.vehicle.curbWeight;
      }

      onChange(item.id, patch);

      const filled: string[] = [];
      if (patch.goodsDescription) filled.push('规格型号');
      if (patch.grossWeight != null) filled.push('毛重');
      if (patch.netWeight != null) filled.push('净重');
      toast.success(filled.length > 0 ? `已自动填充: ${filled.join('、')}` : '未找到匹配数据');
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setVinSearching(false);
    }
  }, [item.vin, item.id, onChange, token]);
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface/50">
      {/* 标题栏 */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant/20 bg-surface-container/40">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {index}
        </span>
        <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider shrink-0">
          商品编码 *
        </label>
        <input
          type="text"
          value={item.hsCode}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            onChange(item.id, { hsCode: val });
          }}
          placeholder="10位HS编码，如 8703800000"
          className="flex-1 max-w-[240px] rounded-md bg-surface-container px-3 py-1.5 text-sm font-mono text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="w-7 h-7 inline-flex items-center justify-center rounded text-error/60 hover:bg-error/10 hover:text-error transition-colors"
          title="删除此项"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 主体 */}
      <div className="p-4 space-y-3">
        {/* 商品名称 */}
        <div>
          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
            商品名称及规格型号 *
          </label>
          <textarea
            rows={3}
            value={item.goodsDescription}
            onChange={(e) => onChange(item.id, { goodsDescription: e.target.value })}
            placeholder="品牌、型号、排量/功率、动力类型、新旧等，如：比亚迪 宋PLUS EV｜电动｜功率230kW｜80.64kWh｜二手"
            className="w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high resize-y min-h-[60px]"
          />
        </div>

        {/* VIN + 毛重/净重 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              VIN / 车架号
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={item.vin ?? ''}
                onChange={(e) => onChange(item.id, { vin: e.target.value })}
                placeholder="17位车架号"
                className="flex-1 rounded-md bg-surface-container px-3 py-2 text-sm font-mono text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high"
              />
              <button
                type="button"
                disabled={!item.vin || item.vin.length !== 17 || vinSearching}
                onClick={handleVinLookup}
                title="从车辆档案和装箱单中检索并自动填充"
                className="shrink-0 rounded-md bg-primary/10 text-primary px-2.5 py-2 text-xs font-medium hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {vinSearching ? '...' : '检索'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              毛重 (kg)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.grossWeight || ''}
              onChange={(e) => onChange(item.id, { grossWeight: Number(e.target.value) })}
              placeholder="整备质量+荷载"
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              净重 (kg)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.netWeight || ''}
              onChange={(e) => onChange(item.id, { netWeight: Number(e.target.value) })}
              placeholder="整备质量"
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high"
            />
          </div>
        </div>

        {/* 核心字段：数量/单位/单价/总价 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              数量及单位 *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="1"
                value={item.quantity || ''}
                onChange={(e) => onChange(item.id, { quantity: Number(e.target.value) })}
                className="w-20 rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex-1 min-w-0">
                <CodeSelect
                  options={UNITS}
                  value={item.unitCode}
                  onChange={(code) => onChange(item.id, { unitCode: code })}
                  placeholder="单位"
                  searchPlaceholder="单位"
                  showCode={false}
                  className="h-[38px] text-sm"
                  contentWidth={200}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              单价
            </label>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={item.unitPrice || ''}
              onChange={(e) => onChange(item.id, { unitPrice: Number(e.target.value) })}
              placeholder="FOB单价"
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm font-mono text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              总价
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.totalPrice || ''}
              onChange={(e) => onChange(item.id, { totalPrice: Number(e.target.value) })}
              placeholder="自动计算"
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm font-mono font-semibold text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              币制 *
            </label>
            <CodeSelect
              options={CURRENCIES}
              value={item.currencyCode}
              onChange={(code) => onChange(item.id, { currencyCode: code })}
              placeholder="币制"
              searchPlaceholder="币制 如 USD/502"
              className="h-[38px] text-sm"
              contentWidth={260}
            />
          </div>
        </div>

        {/* 国家/地区/征免 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              原产国(地区) *
            </label>
            <CodeSelect
              options={COUNTRIES}
              value={item.originCountryCode}
              onChange={(code) => onChange(item.id, { originCountryCode: code })}
              placeholder="原产国"
              searchPlaceholder="国家中文/英文/3位代码"
              className="h-[38px] text-sm"
              contentWidth={280}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              最终目的国 *
            </label>
            <CodeSelect
              options={COUNTRIES}
              value={item.finalDestinationCode}
              onChange={(code) => onChange(item.id, { finalDestinationCode: code })}
              placeholder="最终目的国"
              searchPlaceholder="国家中文/英文/3位代码"
              className="h-[38px] text-sm"
              contentWidth={280}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              境内货源地 *
            </label>
            <CodeSelect
              options={DOMESTIC_SOURCES}
              value={item.domesticSourceCode}
              onChange={(code, opt) => onChange(item.id, { domesticSourceCode: code, domesticSourceName: opt?.name })}
              placeholder="输入代码或地区名，如 31222 / 浦东"
              searchPlaceholder="5位代码 / 地区名 / 拼音"
              clearable
              className="h-[38px] text-sm"
              contentWidth={320}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              征免 *
            </label>
            <CodeSelect
              options={DUTY_EXEMPTIONS}
              value={item.dutyExemptionCode}
              onChange={(code) => onChange(item.id, { dutyExemptionCode: code })}
              placeholder="征免"
              searchPlaceholder="征减免税方式"
              showCode
              className="h-[38px] text-sm"
              contentWidth={220}
            />
          </div>
        </div>
      </div>
    </div>
  );
}