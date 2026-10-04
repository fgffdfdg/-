'use client';

// ============================================================
// 右侧编辑面板：内容（数字/公式/备注）与属性编辑 / 方案信息
// 左侧列表是纯计算器（录数字、看结果），公式在这里编写
// ============================================================

import { useEffect, useState } from 'react';
import type { CalcCell, CellFormat, CellKind, VisualCalculator } from '@/lib/quote-calculator/types';
import { CELL_ACCENTS, CELL_KIND_LABELS, formatCellValue } from '@/lib/quote-calculator/types';
import { getCellContent } from '@/lib/quote-calculator/classify';
import { isValidName, normalizeName, type ComputedCell } from '@/lib/quote-calculator/engine';
import { ContentInput } from './content-input';
import { AlertTriangle, Hash, Sigma, StickyNote, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CellEditorProps {
  calc: VisualCalculator | null;
  cell: CalcCell | null;
  cells: CalcCell[];
  result: ComputedCell | undefined;
  /** 公式格中计算出错的数量 */
  formulaErrorCount: number;
  onPatch: (id: string, patch: Partial<CalcCell>) => void;
  onRename: (id: string, newName: string) => void;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMetaChange: (patch: Partial<Pick<VisualCalculator, 'title' | 'description'>>) => void;
}

const KIND_ICONS: Record<CellKind, LucideIcon> = {
  input: Hash,
  formula: Sigma,
  note: StickyNote,
};

const KIND_HINTS: Record<CellKind, string> = {
  input: '内容是纯数字，可被其它公式引用',
  formula: '内容被识别为公式，引用其它单元格名称自动计算',
  note: '内容是备注文本，也可被公式引用（如条件判断）',
};

const FIELD_CLS =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary';

export function CellEditor({ calc, cell, cells, result, formulaErrorCount, onPatch, onRename, onContentChange, onDelete, onMetaChange }: CellEditorProps) {
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(cell?.name ?? '');
    setNameError(null);
  }, [cell?.id, cell?.name]);

  if (!calc) {
    return <div className="p-4 text-sm text-muted-foreground">加载中…</div>;
  }

  // ---------- 未选中单元格：方案信息 ----------
  if (!cell) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">方案名称</p>
          <input
            value={calc.title}
            onChange={(e) => onMetaChange({ title: e.target.value })}
            placeholder="未命名方案"
            className={cn(FIELD_CLS, 'mt-1.5 font-semibold')}
          />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">方案说明</p>
          <textarea
            value={calc.description}
            onChange={(e) => onMetaChange({ description: e.target.value })}
            placeholder="这个计算器用于什么业务场景？"
            rows={3}
            className={cn(FIELD_CLS, 'mt-1.5 resize-none')}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">使用方式</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>左侧是计算器：数字格直接录入数字，公式格只显示计算结果</li>
            <li>选中单元格后，在右侧「内容」里写公式、改数字或写备注，系统自动识别</li>
            <li>公式中输入 <span className="font-mono">@</span> 引用其它单元格，自动联想已有名称（Tab / 回车插入），如 <span className="font-mono">@车价*3%+海运费</span></li>
            <li>引用不存在的名称会报错；纯数字运算请以 = 开头（如 <span className="font-mono">=1+2</span>）</li>
            <li>用卡片头 ↑↓ 或按住拖拽手柄调整顺序</li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground">
          共 {cells.length} 个单元格
          {formulaErrorCount > 0 && <span className="ml-1 text-destructive">（{formulaErrorCount} 个公式异常）</span>}
        </div>
      </div>
    );
  }

  // ---------- 选中单元格：属性编辑 ----------
  const commitName = () => {
    const nm = nameDraft.trim();
    if (nm === cell.name) {
      setNameError(null);
      return;
    }
    const check = isValidName(nm);
    if (!check.valid) {
      setNameError(check.reason ?? '名称无效');
      return;
    }
    if (cells.some((c) => c.id !== cell.id && normalizeName(c.name) === normalizeName(nm))) {
      setNameError(`名称「${nm}」已被其它单元格使用（空格不参与区分）`);
      return;
    }
    setNameError(null);
    onRename(cell.id, nm);
  };

  const KindIcon = KIND_ICONS[cell.kind];

  return (
    <div className="space-y-4 p-4">
      {/* 内容：统一输入，自动识别为数字 / 公式 / 备注 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">内容（在这里写公式）</p>
        <div className="mt-1.5">
          <ContentInput
            content={getCellContent(cell)}
            onChange={(v) => onContentChange(cell.id, v)}
            names={cells.filter((c) => c.id !== cell.id).map((c) => c.name.trim()).filter(Boolean)}
            formulaContext={cell.kind === 'formula'}
            placeholder="输入数字、公式（@ 引用其它单元格）或备注文字"
          />
        </div>
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <KindIcon className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            自动识别为「<span className="font-medium text-foreground">{CELL_KIND_LABELS[cell.kind]}</span>」· {KIND_HINTS[cell.kind]}
          </span>
        </div>
      </div>

      {/* 名称 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">名称（可含空格；公式引用时空格会被忽略）</p>
        <input
          value={nameDraft}
          onChange={(e) => {
            setNameDraft(e.target.value);
            setNameError(null);
          }}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="如：车辆采购价"
          className={cn(FIELD_CLS, 'mt-1.5', nameError && 'border-destructive focus:border-destructive')}
        />
        {nameError ? (
          <p className="mt-1 text-[11px] text-destructive">{nameError}</p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">支持中文；改名会自动更新所有引用它的公式</p>
        )}
      </div>

      {/* 显示格式 */}
      {cell.kind !== 'note' && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">显示格式</p>
          <div className="mt-1.5 flex gap-2">
            <select
              value={cell.format.type}
              onChange={(e) => onPatch(cell.id, { format: { ...cell.format, type: e.target.value as CellFormat['type'] } })}
              className={cn(FIELD_CLS, 'flex-1')}
            >
              <option value="number">数字</option>
              <option value="currency">货币 ¥</option>
              <option value="percent">百分比 %</option>
            </select>
            <select
              value={cell.format.decimals}
              onChange={(e) => onPatch(cell.id, { format: { ...cell.format, decimals: Number(e.target.value) } })}
              className={cn(FIELD_CLS, 'w-24')}
            >
              {[0, 1, 2, 3, 4].map((d) => (
                <option key={d} value={d}>
                  {d} 位小数
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 强调色 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">强调色</p>
        <div className="mt-1.5 flex gap-1.5">
          {CELL_ACCENTS.map((a) => {
            const active = cell.accent === a.value;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => onPatch(cell.id, { accent: a.value })}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors',
                  active ? 'border-primary/60 bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border border-border/60',
                    a.value === 'navy' && 'bg-navy',
                    a.value === 'orange' && 'bg-orange',
                    a.value === 'success' && 'bg-success',
                    a.value === null && 'bg-muted',
                  )}
                />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 当前计算结果（公式格） */}
      {cell.kind === 'formula' && (
        <div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">当前结果：</span>
          {result?.error ? (
            <span className="font-medium text-destructive">{result.error.message}</span>
          ) : (
            <span className="font-semibold tabular-nums text-foreground">
              {formatCellValue(result?.value ?? null, cell.format)}
            </span>
          )}
        </div>
      )}

      {/* 删除 */}
      <button
        type="button"
        onClick={() => onDelete(cell.id)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除此单元格
      </button>

      {/* 错误提示 */}
      {cell.kind === 'formula' && result?.error && (
        <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result.error.message}</span>
        </div>
      )}
    </div>
  );
}
