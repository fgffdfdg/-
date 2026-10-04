'use client';

// ============================================================
// 单元格卡片：顺序列表中的一行（左侧 = 纯计算器）
// 数字格：直接录入数字；公式格：只展示计算结果（公式在右侧面板编辑）；
// 备注格：展示文本。支持 ↑↓ 按钮与手柄拖拽两种排序方式
// ============================================================

import { useMemo } from 'react';
import type { CalcCell, CellKind } from '@/lib/quote-calculator/types';
import { CELL_KIND_LABELS, formatCellValue } from '@/lib/quote-calculator/types';
import type { ComputedCell } from '@/lib/quote-calculator/engine';
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Hash, Sigma, StickyNote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_ICONS: Record<CellKind, LucideIcon> = {
  input: Hash,
  formula: Sigma,
  note: StickyNote,
};

interface CellCardProps {
  cell: CalcCell;
  index: number;
  total: number;
  result: ComputedCell | undefined;
  selected: boolean;
  /** 手柄已按下、允许拖拽 */
  armed: boolean;
  /** 当前正在被拖拽 */
  dragging: boolean;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onArmDrag: (id: string) => void;
  onCardDragStart: (id: string) => void;
  onCardDragOver: (id: string) => void;
  onCardDragEnd: () => void;
}

export function CellCard({
  cell,
  index,
  total,
  result,
  selected,
  armed,
  dragging,
  onSelect,
  onMoveUp,
  onMoveDown,
  onContentChange,
  onArmDrag,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
}: CellCardProps) {

  // 数字格：货币/百分比格式的预览
  const numericPreview = useMemo(() => {
    if (cell.kind !== 'input') return null;
    const raw = cell.value.trim().replace(/,/g, '');
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (cell.format.type === 'number') return null;
    return formatCellValue(n, cell.format);
  }, [cell.kind, cell.value, cell.format]);

  const KindIcon = KIND_ICONS[cell.kind];

  const accentBorder =
    cell.accent === 'navy'
      ? 'border-l-[3px] border-l-navy'
      : cell.accent === 'orange'
        ? 'border-l-[3px] border-l-orange'
        : cell.accent === 'success'
          ? 'border-l-[3px] border-l-success'
          : '';

  const moveBtnCls =
    'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30';

  return (
    <div
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cell.id);
        onCardDragStart(cell.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onCardDragOver(cell.id);
      }}
      onDrop={(e) => e.preventDefault()}
      onDragEnd={onCardDragEnd}
      onClick={() => onSelect(cell.id)}
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm transition-shadow',
        accentBorder,
        selected && 'ring-2 ring-primary/60',
        dragging && 'opacity-40',
      )}
    >
      {/* 卡片头 */}
      <div className="flex items-center gap-1.5 border-b border-border/60 px-2 py-1.5">
        <button
          type="button"
          title="按住拖拽调整顺序"
          onMouseDown={(e) => {
            e.stopPropagation();
            onArmDrag(cell.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground/70">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{cell.name || '未命名'}</span>
        <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <KindIcon className="h-3 w-3" />
          {CELL_KIND_LABELS[cell.kind]}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            title="上移"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(cell.id);
            }}
            className={moveBtnCls}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="下移"
            disabled={index === total - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(cell.id);
            }}
            className={moveBtnCls}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 卡片体：左侧纯计算器——数字格录入数字，公式格只展示结果，备注格展示文本 */}
      <div className="px-3 py-2.5">
        {cell.kind === 'input' && (
          <>
            <input
              value={cell.value}
              onChange={(e) => onContentChange(cell.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="输入数字"
              className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-base font-semibold tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-border focus:border-primary focus:bg-background"
            />
            {numericPreview && (
              <div className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">= {numericPreview}</div>
            )}
          </>
        )}

        {cell.kind === 'formula' && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
            {result?.error ? (
              <span className="flex min-w-0 items-start gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{result.error.message}</span>
              </span>
            ) : (
              <span className="break-all text-right text-lg font-semibold tabular-nums text-foreground">
                {formatCellValue(result?.value ?? null, cell.format)}
              </span>
            )}
            <span className="shrink-0 text-right text-[10px] leading-relaxed text-muted-foreground">
              自动计算
              <br />
              选中后在右侧编辑公式
            </span>
          </div>
        )}

        {cell.kind === 'note' && (
          <p className="whitespace-pre-wrap break-all px-1 py-0.5 text-sm leading-relaxed text-muted-foreground">
            {cell.value.replace(/^'/, '') || '—'}
          </p>
        )}
      </div>
    </div>
  );
}
