'use client';

import * as React from 'react';
import { Hash, Truck, FileText, Package, List, Clipboard, Building, Building2 } from 'lucide-react';
import { SectionCard, FieldLabel, fieldInputClass, fieldTextareaClass } from './section-card';
import { CodeSelect } from './code-select';
import { GoodsTable } from './goods-table';
import { SavedConsigneePicker } from './saved-consignee-picker';
import { SourcePicker } from './source-picker';
import {
  CUSTOMS_OFFICES,
  TRANSPORT_MODES,
  SUPERVISION_MODES,
  DUTY_NATURES,
  COUNTRIES,
  PORTS,
  PACKAGE_TYPES,
  INCOTERMS,
  CURRENCIES,
  findByCode,
} from '@/lib/customs-codes';
import {
  type CustomsDeclarationFull,
  type DeclarationParty,
  type DeclarationGoodsItem,
} from '@/lib/customs-declaration/types';

interface Props {
  value: CustomsDeclarationFull;
  onChange: (next: CustomsDeclarationFull) => void;
  /** 已弃用：保留空实现 */
  onPickConsignor?: () => void;
  onPickConsignee?: () => void;
  /** 企业库选择器插槽（直接渲染按钮+Popover） */
  consignorPickerSlot?: React.ReactNode;
  consigneePickerSlot?: React.ReactNode;
  declaringEntityPickerSlot?: React.ReactNode;
  /** 自动填充回调 */
  onAutoFill?: (patch: Partial<CustomsDeclarationFull>, goods?: DeclarationGoodsItem[], source?: string) => void;
}

export function DeclarationEditor({
  value,
  onChange,
  consignorPickerSlot,
  consigneePickerSlot,
  declaringEntityPickerSlot,
  onAutoFill,
}: Props) {
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  const update = React.useCallback(
    (patch: Partial<CustomsDeclarationFull>) => {
      const prev = valueRef.current;
      onChangeRef.current({ ...prev, ...patch });
    },
    [],
  );

  const updateParty = (key: 'consignor' | 'consignee' | 'manufacturer', patch: Partial<DeclarationParty>) => {
    update({ [key]: { ...value[key], ...patch } } as Partial<CustomsDeclarationFull>);
  };

  // 同步"生产销售单位同发货人"
  React.useEffect(() => {
    if (value.manufacturerSameAsConsignor) {
      onChange({ ...value, manufacturer: { ...value.consignor } });
    }
  }, [value.consignor, value.manufacturerSameAsConsignor, onChange]);

  // 自动同步币制到所有商品行（选顶层币制时）
  const setAllCurrency = (code: string) => {
    onChange({
      ...value,
      goods: value.goods.map((g) => ({ ...g, currencyCode: code })),
    });
  };

  return (
    <div className="space-y-5">
      {/* Section 0 — 关联单证自动填充 */}
      <SourcePicker
        value={value}
        onChange={onChange}
        contractNo={value.contractNo}
        licenseNo={value.licenseNo}
        onAutoFill={onAutoFill || (() => {})}
      />

      {/* Section 1 */}
      <SectionCard icon={<Hash className="w-4 h-4" />} title="基础信息与编号" subtitle="Basic Information & Numbers">
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5">
          <div>
            <FieldLabel>录入编号</FieldLabel>
            <input
              className={`${fieldInputClass} font-mono`}
              value={value.entryNo || '（保存后自动分配）'}
              readOnly
            />
          </div>
          <div>
            <FieldLabel>
              海关编号
              <span className="ml-auto text-[11px] text-accent">同预录入编号</span>
            </FieldLabel>
            <input
              className={`${fieldInputClass} font-mono bg-muted/50`}
              value={value.entryNo || '保存后自动分配'}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div>
            <FieldLabel>页码 / 页数</FieldLabel>
            <input
              className={fieldInputClass}
              value={value.pageInfo}
              onChange={(e) => update({ pageInfo: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>出口日期</FieldLabel>
            <input
              type="date"
              className={fieldInputClass}
              value={value.exportDate}
              onChange={(e) => update({ exportDate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>申报日期</FieldLabel>
            <input
              type="date"
              className={fieldInputClass}
              value={value.declareDate}
              onChange={(e) => update({ declareDate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>备案号</FieldLabel>
            <input
              className={fieldInputClass}
              placeholder="无备案可留空"
              value={value.recordNo}
              onChange={(e) => update({ recordNo: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 2 */}
      <SectionCard
        icon={<Truck className="w-4 h-4" />}
        title="境内发货人与运输信息"
        subtitle="Consignor & Transport"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required>境内发货人</FieldLabel>
            <div className="flex gap-2">
              <input
                className={`${fieldInputClass} flex-1`}
                value={value.consignor.name ? `${value.consignor.name}${value.consignor.code ? ` (${value.consignor.code})` : ''}` : ''}
                placeholder="选择或填写境内发货人企业名称"
                onChange={(e) => updateParty('consignor', { name: e.target.value })}
              />
              {consignorPickerSlot ?? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium whitespace-nowrap"
                >
                  <Building className="w-3.5 h-3.5" />
                  从企业库选择
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <input
                className={`${fieldInputClass} h-8 text-[11px] font-mono`}
                placeholder="统一社会信用代码"
                value={value.consignor.code}
                onChange={(e) => updateParty('consignor', { code: e.target.value })}
              />
              <input
                className={`${fieldInputClass} h-8 text-[11px]`}
                placeholder="联系人/电话（可选）"
                value={value.consignor.phone || ''}
                onChange={(e) => updateParty('consignor', { phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>境外收货人</FieldLabel>
            <div className="flex gap-2">
              <input
                className={`${fieldInputClass} flex-1`}
                value={value.consignee.name}
                placeholder="填写境外收货人英文名称"
                onChange={(e) => updateParty('consignee', { name: e.target.value })}
              />
              {consigneePickerSlot ?? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  从客户库选择
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <input
                className={`${fieldInputClass} h-8 text-[11px]`}
                placeholder="境外注册号/税号（可选）"
                value={value.consignee.code}
                onChange={(e) => updateParty('consignee', { code: e.target.value })}
              />
              <input
                className={`${fieldInputClass} h-8 text-[11px]`}
                placeholder="地址（可选）"
                value={value.consignee.address || ''}
                onChange={(e) => updateParty('consignee', { address: e.target.value })}
              />
            </div>
            <div className="mt-1.5">
              <SavedConsigneePicker
                currentConsignee={value.consignee}
                onPick={(p) => update({ consignee: { ...value.consignee, ...p } })}
              />
            </div>
          </div>

          <div>
            <FieldLabel>生产销售单位</FieldLabel>
            <div className="flex gap-2 items-center">
              <input
                className={`${fieldInputClass} flex-1`}
                value={
                  value.manufacturerSameAsConsignor
                    ? value.consignor.name
                      ? `${value.consignor.name}${value.consignor.code ? ` (${value.consignor.code})` : ''}`
                      : ''
                    : value.manufacturer.name
                }
                readOnly={value.manufacturerSameAsConsignor}
                onChange={(e) => updateParty('manufacturer', { name: e.target.value })}
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  className="accent-primary w-3.5 h-3.5"
                  checked={value.manufacturerSameAsConsignor}
                  onChange={(e) => update({ manufacturerSameAsConsignor: e.target.checked })}
                />
                同境内发货人
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-x-4 gap-y-3.5 pt-1">
            <div>
              <FieldLabel required>出境关别</FieldLabel>
              <CodeSelect
                options={CUSTOMS_OFFICES}
                value={value.exitCustomsCode}
                onChange={(code, opt) =>
                  update({
                    exitCustomsCode: code,
                    exitCustomsName: opt?.name ?? '',
                  })
                }
                placeholder="选择关别"
                searchPlaceholder="4位关别代码/名称"
                clearable
              />
            </div>
            <div>
              <FieldLabel required>运输方式</FieldLabel>
              <CodeSelect
                options={TRANSPORT_MODES}
                value={value.transportModeCode}
                onChange={(code, opt) =>
                  update({ transportModeCode: code, transportModeName: opt?.name ?? '' })
                }
                placeholder="运输方式"
                searchPlaceholder="如 2=水路/3=铁路"
              />
            </div>
            <div>
              <FieldLabel>运输工具及航次</FieldLabel>
              <input
                className={fieldInputClass}
                placeholder="MSC LISBON / FM6271"
                value={value.transportInfo}
                onChange={(e) => update({ transportInfo: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>提运单号</FieldLabel>
              <input
                className={`${fieldInputClass} font-mono`}
                value={value.blNo}
                placeholder="MSCUFG652819"
                onChange={(e) => update({ blNo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 3 */}
      <SectionCard icon={<FileText className="w-4 h-4" />} title="监管与贸易信息" subtitle="Supervision & Trade">
        <div className="grid grid-cols-4 gap-x-4 gap-y-3.5">
          <div>
            <FieldLabel required>监管方式</FieldLabel>
            <CodeSelect
              options={SUPERVISION_MODES}
              value={value.supervisionCode}
              onChange={(code, opt) => update({ supervisionCode: code, supervisionName: opt?.name ?? '' })}
              placeholder="监管方式"
              searchPlaceholder="如 0110=一般贸易"
            />
          </div>
          <div>
            <FieldLabel required>征免性质</FieldLabel>
            <CodeSelect
              options={DUTY_NATURES}
              value={value.dutyNatureCode}
              onChange={(code, opt) => update({ dutyNatureCode: code, dutyNatureName: opt?.name ?? '' })}
              placeholder="征免性质"
              searchPlaceholder="如 101=一般征税"
            />
          </div>
          <div>
            <FieldLabel required>贸易国(地区)</FieldLabel>
            <CodeSelect
              options={COUNTRIES}
              value={value.tradeCountryCode}
              onChange={(code, opt) => update({ tradeCountryCode: code, tradeCountryName: opt?.name ?? '' })}
              placeholder="贸易国"
              searchPlaceholder="中文/英文/3位代码"
            />
          </div>
          <div>
            <FieldLabel required>运抵国(地区)</FieldLabel>
            <CodeSelect
              options={COUNTRIES}
              value={value.arrivalCountryCode}
              onChange={(code, opt) => update({ arrivalCountryCode: code, arrivalCountryName: opt?.name ?? '' })}
              placeholder="运抵国"
              searchPlaceholder="中文/英文/3位代码"
            />
          </div>
          <div>
            <FieldLabel required>指运港</FieldLabel>
            <CodeSelect
              options={PORTS}
              value={value.destinationPortCode}
              onChange={(code, opt) =>
                update({ destinationPortCode: code, destinationPortName: opt?.name ?? '' })
              }
              placeholder="指运港"
              searchPlaceholder="如 VARBG=瓦尔纳"
              clearable
              contentWidth={300}
            />
          </div>
          <div>
            <FieldLabel>离境口岸</FieldLabel>
            <input
              className={fieldInputClass}
              value={value.departurePort}
              placeholder="南沙新港"
              onChange={(e) => update({ departurePort: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 4 */}
      <SectionCard icon={<Package className="w-4 h-4" />} title="包装成交与费用" subtitle="Package & Terms">
        <div className="grid grid-cols-4 gap-x-4 gap-y-3.5">
          <div>
            <FieldLabel required>包装种类</FieldLabel>
            <CodeSelect
              options={PACKAGE_TYPES}
              value={value.packageCode}
              onChange={(code, opt) => update({ packageCode: code, packageName: opt?.name ?? '' })}
              placeholder="包装种类"
            />
          </div>
          <div>
            <FieldLabel>件数</FieldLabel>
            <input
              type="number"
              min={0}
              className={fieldInputClass}
              value={value.packageCount || ''}
              onChange={(e) => update({ packageCount: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel>毛重(千克)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldInputClass}
              value={value.grossWeight || ''}
              onChange={(e) => update({ grossWeight: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel>净重(千克)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldInputClass}
              value={value.netWeight || ''}
              onChange={(e) => update({ netWeight: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel>包装件数</FieldLabel>
            <input
              type="number"
              min={0}
              className={fieldInputClass}
              value={value.packingCount || ''}
              onChange={(e) => update({ packingCount: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel required>成交方式</FieldLabel>
            <CodeSelect
              options={INCOTERMS}
              value={value.incotermCode}
              onChange={(code, opt) => update({ incotermCode: code, incotermName: opt?.name ?? '' })}
              placeholder="成交方式"
            />
          </div>
          <div>
            <FieldLabel hint="格式 币种/金额/标记">运费</FieldLabel>
            <input
              className={fieldInputClass}
              placeholder="如 502/500/3"
              value={value.freight}
              onChange={(e) => update({ freight: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>保费</FieldLabel>
            <input
              className={fieldInputClass}
              placeholder="可留空"
              value={value.insurance}
              onChange={(e) => update({ insurance: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required>统一币制</FieldLabel>
            <CodeSelect
              options={CURRENCIES}
              value={value.goods.find((g) => g.currencyCode)?.currencyCode ?? '502'}
              onChange={(code) => setAllCurrency(code)}
              placeholder="设置所有商品币制"
              searchPlaceholder="USD/502/人民币"
            />
          </div>
          <div>
            <FieldLabel>集装箱号</FieldLabel>
            <input
              className={`${fieldInputClass} font-mono`}
              value={value.containerNo}
              placeholder="MSKU1234567"
              onChange={(e) => update({ containerNo: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>封条号</FieldLabel>
            <input
              className={`${fieldInputClass} font-mono`}
              value={value.sealNo}
              placeholder="SL88291"
              onChange={(e) => update({ sealNo: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 5 商品明细 */}
      <SectionCard
        icon={<List className="w-4 h-4" />}
        title="商品明细（车辆）"
        subtitle="Goods Items · Vehicles"
        actions={
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            {value.goods.length > 0 && (
              <span>
                {value.goods.length} 项 · 境内货源地必填
              </span>
            )}
          </div>
        }
      >
        <GoodsTable value={value} onChange={onChange} />
      </SectionCard>

      {/* Section 6 */}
      <SectionCard
        icon={<Clipboard className="w-4 h-4" />}
        title="随附单证、备注与确认"
        subtitle="Attachments, Remarks & Declarations"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>随附单证及编号</FieldLabel>
              <textarea
                rows={2}
                className={fieldTextareaClass}
                placeholder="例如：发票 INV-2026-001；装箱单 PL-2026-001；合同 20260715-01-C"
                value={value.attachedDocs}
                onChange={(e) => update({ attachedDocs: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>标记唛码及备注</FieldLabel>
              <textarea
                rows={2}
                className={fieldTextareaClass}
                value={value.marks}
                onChange={(e) => update({ marks: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-1">
            <ConfirmBox label="特殊关系确认" checked={value.specialRelation} onChange={(v) => update({ specialRelation: v })} />
            <ConfirmBox label="价格影响确认" checked={value.priceInfluence} onChange={(v) => update({ priceInfluence: v })} />
            <ConfirmBox label="支付特许权使用费确认" checked={value.royaltyPayment} onChange={(v) => update({ royaltyPayment: v })} />
            <ConfirmBox label="自报自缴" checked={value.selfDeclare} onChange={(v) => update({ selfDeclare: v })} />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div>
              <FieldLabel>报关人员姓名</FieldLabel>
              <input
                className={fieldInputClass}
                value={value.declarantName}
                onChange={(e) => update({ declarantName: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>报关人员证号</FieldLabel>
              <input
                className={`${fieldInputClass} font-mono`}
                value={value.declarantCertNo}
                onChange={(e) => update({ declarantCertNo: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>联系电话</FieldLabel>
              <input
                className={fieldInputClass}
                value={value.declarantPhone}
                onChange={(e) => update({ declarantPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <FieldLabel>申报单位签章名称</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  className={`${fieldInputClass} flex-1`}
                  placeholder="默认为境内发货人企业名称"
                  value={value.declaringEntity}
                  onChange={(e) => update({ declaringEntity: e.target.value })}
                />
                {declaringEntityPickerSlot}
              </div>
            </div>
            <div>
              <FieldLabel>海关批注及签章（预留）</FieldLabel>
              <input
                className={fieldInputClass}
                placeholder="海关审核后填写"
                value={value.customsRemark}
                onChange={(e) => update({ customsRemark: e.target.value })}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="h-2" />
    </div>
  );
}

function ConfirmBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-surface-container/50 rounded-md px-3 py-2.5">
      <div className="text-xs text-on-surface-variant mb-1.5">{label}</div>
      <div className="flex items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            checked={checked === true}
            onChange={() => onChange(true)}
            className="accent-primary w-3.5 h-3.5"
          />
          是
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            checked={checked === false}
            onChange={() => onChange(false)}
            className="accent-primary w-3.5 h-3.5"
          />
          否
        </label>
      </div>
    </div>
  );
}
