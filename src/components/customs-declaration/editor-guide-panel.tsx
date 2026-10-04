'use client';

import * as React from 'react';
import { ShieldCheck, Info, Save, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { CustomsDeclarationFull } from '@/lib/customs-declaration/types';
import { validateDeclaration } from '@/lib/customs-declaration/types';

interface Props {
  value: CustomsDeclarationFull;
  lastSavedAt?: Date | null;
}

const CHECKLIST: { key: keyof CustomsDeclarationFull | 'consignor' | 'consignee' | 'manufacturer' | 'goods' | 'packageCode' | 'incotermCode'; label: string }[] = [
  { key: 'consignor', label: '境内发货人' },
  { key: 'consignee', label: '境外收货人' },
  { key: 'exitCustomsCode', label: '出境关别' },
  { key: 'transportModeCode', label: '运输方式' },
  { key: 'supervisionCode', label: '监管方式' },
  { key: 'dutyNatureCode', label: '征免性质' },
  { key: 'contractNo', label: '合同协议号' },
  { key: 'tradeCountryCode', label: '贸易国(地区)' },
  { key: 'arrivalCountryCode', label: '运抵国(地区)' },
  { key: 'destinationPortCode', label: '指运港' },
  { key: 'packageCode', label: '包装种类' },
  { key: 'incotermCode', label: '成交方式' },
];

export function EditorGuidePanel({ value, lastSavedAt }: Props) {
  const issues = React.useMemo(() => validateDeclaration(value), [value]);
  const failedTopFields = new Set(
    issues
      .map((i) => i.field.split('.')[0].replace(/\[\d+\]/g, ''))
      .filter((k) => CHECKLIST.some((c) => c.key === k)),
  );
  const passedCount = CHECKLIST.length - failedTopFields.size + (issues.some((i) => i.field.startsWith('goods')) ? 0 : 1);
  const goodsOk = value.goods.length > 0 && !issues.some((i) => i.field.startsWith('goods'));

  return (
    <aside className="w-80 shrink-0 sticky top-20 space-y-4">
      <div className="bg-surface rounded-lg p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">必填校验</h3>
          <span className="ml-auto text-[11px] text-success font-medium tabular-nums">
            {Math.max(0, CHECKLIST.length - issues.filter((i) => CHECKLIST.some((c) => i.field.startsWith(c.key))).length)}/{CHECKLIST.length + 1}
          </span>
        </div>
        <ul className="space-y-1.5 text-xs">
          {CHECKLIST.map((item) => {
            const failed = issues.some((i) => i.field === item.key || i.field.startsWith(`${item.key}.`));
            return (
              <li key={item.key} className="flex items-center gap-2 text-on-surface">
                {failed ? (
                  <XCircle className="w-3.5 h-3.5 text-error shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                )}
                <span className={failed ? 'text-on-surface' : ''}>{item.label}</span>
              </li>
            );
          })}
          <li className="flex items-center gap-2 text-on-surface border-t border-outline-variant/30 pt-1.5 mt-1.5">
            {goodsOk ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-error shrink-0" />
            )}
            <span>商品明细 {value.goods.length > 0 ? `${value.goods.length} 项` : '≥ 1 项'}</span>
          </li>
        </ul>
      </div>

      {issues.length > 0 && (
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <div className="flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-medium text-on-surface mb-1">待处理项</div>
              <ul className="space-y-1 text-on-surface-variant list-disc pl-4">
                {issues.slice(0, 6).map((iss, idx) => (
                  <li key={idx}>{iss.message}</li>
                ))}
                {issues.length > 6 && <li>还有 {issues.length - 6} 项…</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-lg p-4 shadow-card">
        <div className="flex gap-2.5">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-on-surface-variant">
            <div className="font-medium text-on-surface mb-1">代码表说明</div>
            境内货源地为海关 5 位代码（如 <span className="font-mono text-primary">31222</span>），可直接输入代码、名称或拼音搜索；关别 4 位、国别 3 位字母、币制 3 位数字、HS 10 位。
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-4 shadow-card">
        <div className="flex items-center gap-2.5">
          <Save className="w-4 h-4 text-success" />
          <div>
            <div className="text-xs font-medium text-on-surface">最近自动保存</div>
            <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
              {lastSavedAt ? formatTime(lastSavedAt) : '尚未保存'}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-on-surface-variant/80 px-1">
        <AlertCircle className="w-3 h-3 inline-block -mt-0.5 mr-1" />
        本工具不直接向海关申报，导出的 PDF 用于单一窗口核对录入。
      </p>
    </aside>
  );
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
