'use client';

// ============================================================
// 单元格顺序列表：自上而下排列
// 排序方式：卡片头 ↑↓ 按钮 + 手柄拖拽（HTML5 DnD，拖动中实时换位）
// ============================================================

import { useEffect, useState } from 'react';
import type { CalcCell } from '@/lib/quote-calculator/types';
import type { ComputedCell } from '@/lib/quote-calculator/engine';
import { CellCard } from './cell-card';
import { Plus } from 'lucide-react';

interface CellListProps {
  cells: CalcCell[];
  results: Map<string, ComputedCell>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  /** 拖拽排序：把 fromId 移动到 toId 的位置 */
  onReorder: (fromId: string, toId: string) => void;
  onAddCell: () => void;
}

export function CellList({
  cells,
  results,
  selectedId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onContentChange,
  onReorder,
  onAddCell,
}: CellListProps) {
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // 手柄按下后若没有真正拖拽（普通点击/松开手），解除拖拽武装
  useEffect(() => {
    const clear = () => setArmedId(null);
    window.addEventListener('mouseup', clear);
    return () => window.removeEventListener('mouseup', clear);
  }, []);

  return (
    <div
      className="h-full w-full overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-6">
        {cells.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/80 p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-foreground">还没有单元格</p>
            <p className="mt-1 text-xs text-muted-foreground">
              添加单元格，在左侧录入数字，选中后在右侧写公式，把它们连起来
            </p>
            <button
              type="button"
              onClick={onAddCell}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              添加单元格
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cells.map((cell, index) => (
              <CellCard
                key={cell.id}
                cell={cell}
                index={index}
                total={cells.length}
                result={results.get(cell.id)}
                selected={selectedId === cell.id}
                armed={armedId === cell.id}
                dragging={dragId === cell.id}
                onSelect={(id) => onSelect(id)}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onContentChange={onContentChange}
                onArmDrag={setArmedId}
                onCardDragStart={setDragId}
                onCardDragOver={(id) => {
                  if (dragId && dragId !== id) onReorder(dragId, id);
                }}
                onCardDragEnd={() => {
                  setDragId(null);
                  setArmedId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
