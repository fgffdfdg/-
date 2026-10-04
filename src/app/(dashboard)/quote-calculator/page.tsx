'use client';

// ============================================================
// 报价计算器 - 可视化搭建页
// 顺序列表：具名单元格卡片自上而下排列，公式用中文名称互相引用，
// 引擎实时联动求值。
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { CalcCell, VisualCalculator } from '@/lib/quote-calculator/types';
import { createCell, createNewCalculator } from '@/lib/quote-calculator/types';
import { classifyContent } from '@/lib/quote-calculator/classify';
import {
  createBlankCalculator,
  loadAllCalculators,
  markCalculatorSynced,
  mergeCalculators,
  saveCalculator as saveLocalCalculator,
  softDeleteCalculator as softDeleteLocalCalculator,
} from '@/lib/quote-calculator/storage';
import {
  createCalculator as createCloudCalculator,
  deleteCalculatorFromCloud,
  fetchAllCalculators,
  updateCalculator as updateCloudCalculator,
} from '@/lib/quote-calculator/api-client';
import { computeAll, extractRefs, normalizeName, renameReferences } from '@/lib/quote-calculator/engine';
import { CellList } from '@/components/quote-calculator/cell-list';
import { CellEditor } from '@/components/quote-calculator/cell-editor';
import { TrashDialog } from '@/components/quote-calculator/trash-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArchiveRestore,
  ChevronDown,
  Cloud,
  CloudOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuoteCalculatorPage() {
  const { token, loading: authLoading } = useAuth();

  const [calcs, setCalcs] = useState<VisualCalculator[]>([]);
  const [current, setCurrent] = useState<VisualCalculator | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** 存在未同步云端改动的方案 id 集合（按方案跟踪，切换方案不丢失状态） */
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [schemeMenuOpen, setSchemeMenuOpen] = useState(false);
  /** 待确认删除的单元格 id（智能提醒确认后执行） */
  const [cellDeleteTarget, setCellDeleteTarget] = useState<string | null>(null);
  /** 方案移入回收站确认弹窗 */
  const [schemeDeleteOpen, setSchemeDeleteOpen] = useState(false);
  /** 回收站弹窗 */
  const [trashOpen, setTrashOpen] = useState(false);
  /** 方案重命名行内编辑 */
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const initRef = useRef(false);

  // ---------- 初始加载：本地缓存 + 云端合并 ----------
  useEffect(() => {
    if (authLoading || initRef.current) return;
    initRef.current = true;
    let cancelled = false;
    (async () => {
      const local = loadAllCalculators();
      let merged = local;
      if (token) {
        try {
          merged = mergeCalculators(local, await fetchAllCalculators(token));
        } catch {
          merged = local;
        }
      }
      if (cancelled) return;
      setCalcs(merged);
      if (merged.length > 0) {
        setCurrent(merged[0]);
      } else {
        const fresh = createNewCalculator('出口报价方案');
        saveLocalCalculator(fresh);
        setCalcs([fresh]);
        setCurrent(fresh);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  // ---------- 本地自动保存（防抖，仅脏方案） ----------
  useEffect(() => {
    if (!loaded || !current) return;
    if (!dirtyIds.has(current.id)) return;
    const t = setTimeout(() => {
      saveLocalCalculator(current);
      setCalcs((prev) => {
        const idx = prev.findIndex((c) => c.id === current.id);
        if (idx < 0) return [current, ...prev];
        if (prev[idx] === current) return prev;
        const copy = [...prev];
        copy[idx] = current;
        return copy;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [current, loaded, dirtyIds]);

  // ---------- 关闭/刷新页面前兜底保存未落盘的脏方案 ----------
  const flushRef = useRef<{ calc: VisualCalculator | null; dirty: boolean }>({
    calc: null,
    dirty: false,
  });
  useEffect(() => {
    flushRef.current = { calc: current, dirty: current ? dirtyIds.has(current.id) : false };
  }, [current, dirtyIds]);
  useEffect(() => {
    const flush = () => {
      const { calc, dirty } = flushRef.current;
      if (calc && dirty) saveLocalCalculator(calc);
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // ---------- 实时计算 ----------
  const results = useMemo(() => computeAll(current?.cells ?? []), [current?.cells]);

  const formulaErrorCount = useMemo(() => {
    if (!current) return 0;
    return current.cells.filter((c) => c.kind === 'formula' && results.get(c.id)?.error).length;
  }, [current, results]);

  const selectedCell = useMemo(
    () => current?.cells.find((c) => c.id === selectedId) ?? null,
    [current, selectedId],
  );

  /** 当前方案是否有未同步到云端的改动 */
  const cloudDirty = current ? dirtyIds.has(current.id) : false;
  /** 需要云端保存：从未同步过（无 cloudId）或有未同步改动 */
  const needsSync = current ? (!current.cloudId || cloudDirty) : false;

  // ---------- 单元格操作 ----------
  const markDirty = useCallback((id: string) => {
    setDirtyIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const mutateCurrent = useCallback(
    (updater: (prev: VisualCalculator) => VisualCalculator) => {
      setCurrent((prev) => (prev ? updater(prev) : prev));
      if (current) markDirty(current.id);
    },
    [current, markDirty],
  );

  const updateCell = useCallback(
    (id: string, patch: Partial<CalcCell>) => {
      mutateCurrent((calc) => ({
        ...calc,
        cells: calc.cells.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [mutateCurrent],
  );

  const moveCell = useCallback(
    (id: string, dir: -1 | 1) => {
      mutateCurrent((calc) => {
        const idx = calc.cells.findIndex((c) => c.id === id);
        if (idx < 0) return calc;
        const target = idx + dir;
        if (target < 0 || target >= calc.cells.length) return calc;
        const cells = [...calc.cells];
        [cells[idx], cells[target]] = [cells[target], cells[idx]];
        return { ...calc, cells };
      });
    },
    [mutateCurrent],
  );

  const moveCellUp = useCallback((id: string) => moveCell(id, -1), [moveCell]);
  const moveCellDown = useCallback((id: string) => moveCell(id, 1), [moveCell]);

  /** 拖拽排序：把 fromId 插入到 toId 所在位置 */
  const reorderCell = useCallback(
    (fromId: string, toId: string) => {
      mutateCurrent((calc) => {
        const from = calc.cells.findIndex((c) => c.id === fromId);
        const to = calc.cells.findIndex((c) => c.id === toId);
        if (from < 0 || to < 0 || from === to) return calc;
        const cells = [...calc.cells];
        const [moved] = cells.splice(from, 1);
        cells.splice(to, 0, moved);
        return { ...calc, cells };
      });
    },
    [mutateCurrent],
  );

  /** 统一内容输入：自动分类为数字 / 公式 / 备注后写回 */
  const changeContent = useCallback(
    (id: string, content: string) => {
      const patch = classifyContent(content);
      updateCell(id, patch);
    },
    [updateCell],
  );

  const addCell = useCallback(() => {
    if (!current) return;
    const n = current.cells.length;
    const used = new Set(current.cells.map((c) => c.name.trim()));
    let k = n + 1;
    let name = `单元格${k}`;
    while (used.has(name)) {
      k += 1;
      name = `单元格${k}`;
    }
    const cell = createCell('input', name);
    mutateCurrent((calc) => ({ ...calc, cells: [...calc.cells, cell] }));
    setSelectedId(cell.id);
  }, [current, mutateCurrent]);

  const deleteCell = useCallback(
    (id: string) => {
      mutateCurrent((calc) => ({ ...calc, cells: calc.cells.filter((c) => c.id !== id) }));
      setSelectedId((s) => (s === id ? null : s));
    },
    [mutateCurrent],
  );

  /** 改名并自动更新所有引用该名称的公式 */
  const renameCell = useCallback(
    (id: string, newName: string) => {
      if (!current) return;
      const target = current.cells.find((c) => c.id === id);
      if (!target || target.name === newName) return;
      const oldName = target.name;
      mutateCurrent((calc) => ({
        ...calc,
        cells: calc.cells.map((c) => {
          if (c.id === id) return { ...c, name: newName };
          if (c.kind === 'formula' && oldName && c.formula.includes(normalizeName(oldName))) {
            return { ...c, formula: renameReferences(c.formula, oldName, newName) };
          }
          return c;
        }),
      }));
    },
    [current, mutateCurrent],
  );

  const changeMeta = useCallback(
    (patch: Partial<Pick<VisualCalculator, 'title' | 'description'>>) => {
      mutateCurrent((calc) => ({ ...calc, ...patch }));
    },
    [mutateCurrent],
  );

  // ---------- 云端同步 ----------
  const handleSync = async () => {
    if (!current) return;
    if (!token) {
      toast.info('请先登录后再同步到云端');
      return;
    }
    const localId = current.id;
    setSyncing(true);
    // 同步前先把最新状态落一次本地，避免防抖窗口内的编辑尚未写入 localStorage
    saveLocalCalculator(current);
    try {
      if (current.cloudId) {
        await updateCloudCalculator(token, current);
      } else {
        const { cloudId } = await createCloudCalculator(token, current);
        // 竞态保护：等待期间用户可能已切换方案，仅在仍是同一方案时回写 cloudId
        setCurrent((prev) => (prev && prev.id === localId ? { ...prev, cloudId } : prev));
        markCalculatorSynced(localId, cloudId);
        setCalcs((prev) => prev.map((c) => (c.id === localId ? { ...c, cloudId } : c)));
      }
      setDirtyIds((prev) => {
        if (!prev.has(localId)) return prev;
        const next = new Set(prev);
        next.delete(localId);
        return next;
      });
      toast.success('已同步到云端');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  // ---------- 方案管理 ----------
  const switchCalc = (calc: VisualCalculator) => {
    setCurrent(calc);
    setSelectedId(null);
    setSchemeMenuOpen(false);
  };

  const newFromTemplate = () => {
    const fresh = createNewCalculator(`出口报价方案 ${calcs.length + 1}`);
    saveLocalCalculator(fresh);
    setCalcs((prev) => [fresh, ...prev]);
    switchCalc(fresh);
  };

  const newBlank = () => {
    const fresh = createBlankCalculator(`未命名方案 ${calcs.length + 1}`);
    saveLocalCalculator(fresh);
    setCalcs((prev) => [fresh, ...prev]);
    switchCalc(fresh);
  };

  /** 当前方案移入回收站（软删除，可在回收站恢复） */
  const deleteCurrent = async () => {
    if (!current) return;
    const title = current.title || '未命名';
    // 先把最新状态落盘，避免防抖窗口内的编辑未写入就被移入回收站
    saveLocalCalculator(current);
    softDeleteLocalCalculator(current.id);
    if (token && current.cloudId) {
      try {
        await deleteCalculatorFromCloud(token, current.cloudId);
      } catch {
        toast.error('云端移入回收站失败，本地已移入');
      }
    }
    const rest = calcs.filter((c) => c.id !== current.id);
    setCalcs(rest);
    setSelectedId(null);
    setSchemeDeleteOpen(false);
    setDirtyIds((prev) => {
      if (!prev.has(current.id)) return prev;
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
    if (rest.length > 0) {
      setCurrent(rest[0]);
    } else {
      const fresh = createNewCalculator('出口报价方案');
      saveLocalCalculator(fresh);
      setCalcs([fresh]);
      setCurrent(fresh);
    }
    toast.success(`方案「${title}」已移入回收站`);
  };

  // ---------- 方案重命名 ----------
  const startRename = () => {
    if (!current) return;
    setTitleDraft(current.title);
    setEditingTitle(true);
  };

  const commitRename = () => {
    setEditingTitle(false);
    if (!current) return;
    const next = titleDraft.trim();
    if (!next) {
      toast.error('方案名称不能为空');
      return;
    }
    if (next === current.title) return;
    const updated: VisualCalculator = { ...current, title: next, updatedAt: new Date().toISOString() };
    setCurrent(updated);
    setCalcs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    saveLocalCalculator(updated);
    setDirtyIds((prev) => new Set(prev).add(updated.id));
  };

  /** 回收站恢复后刷新主列表（本地 + 云端重新合并） */
  const refreshList = useCallback(async () => {
    const local = loadAllCalculators();
    let merged = local;
    if (token) {
      try {
        merged = mergeCalculators(local, await fetchAllCalculators(token));
      } catch {
        merged = local;
      }
    }
    setCalcs(merged);
    setCurrent((prev) => {
      if (prev && merged.some((c) => c.id === prev.id)) return prev;
      return merged[0] ?? null;
    });
  }, [token]);

  /** 待删单元格的智能提醒信息：被哪些公式引用 */
  const cellDeleteInfo = useMemo(() => {
    if (!cellDeleteTarget || !current) return null;
    const target = current.cells.find((c) => c.id === cellDeleteTarget);
    if (!target) return null;
    const dependents = current.cells.filter(
      (c) =>
        c.kind === 'formula' &&
        c.id !== target.id &&
        extractRefs(c.formula).includes(normalizeName(target.name)),
    );
    return { target, dependents };
  }, [cellDeleteTarget, current]);

  const addBtnCls =
    'flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* 页头 */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">报价计算器</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            自上而下排列计算卡片，用公式把它们连起来——改一处，全联动
          </p>
        </div>
        {formulaErrorCount > 0 && (
          <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            {formulaErrorCount} 个公式异常
          </span>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
        {/* 方案切换与重命名 */}
        <div className="relative flex items-center gap-1">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              maxLength={50}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') commitRename();
                else if (e.key === 'Escape') setEditingTitle(false);
              }}
              className="w-48 rounded-md border border-primary/50 bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="输入方案名称"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSchemeMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
            >
              <span className="max-w-[180px] truncate">{current?.title || '未命名方案'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {!editingTitle && current && (
            <button
              type="button"
              onClick={startRename}
              title="重命名方案"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {schemeMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSchemeMenuOpen(false)} />
              <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg">
                <div className="max-h-64 overflow-y-auto p-1">
                  {calcs.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">暂无保存的方案</p>
                  )}
                  {calcs.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => switchCalc(c)}
                      className={cn(
                        'flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors hover:bg-muted',
                        c.id === current?.id && 'bg-muted/70',
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        {c.title || '未命名方案'}
                        {c.cloudId && <Cloud className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.cells.length} 个单元格 · 更新于 {new Date(c.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 border-t border-border p-2">
                  <button
                    type="button"
                    onClick={newFromTemplate}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    <Plus className="h-3 w-3" />
                    从模板新建
                  </button>
                  <button
                    type="button"
                    onClick={newBlank}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                    新建空白
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {needsSync && <span className="h-1.5 w-1.5 rounded-full bg-orange" title="有未同步的改动" />}

        <div className="mx-1 h-5 w-px bg-border" />

        {/* 添加单元格 */}
        <button type="button" onClick={addCell} className={addBtnCls}>
          <Plus className="h-3.5 w-3.5" />
          添加单元格
        </button>

        {/* 右侧：同步与删除 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !loaded}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
              needsSync
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : token ? (
              <Cloud className="h-3.5 w-3.5" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            {syncing ? '保存中…' : !token ? '登录后可同步云端' : needsSync ? '保存到云端' : '已同步'}
          </button>
          <button
            type="button"
            onClick={() => setSchemeDeleteOpen(true)}
            title="将当前方案移入回收站"
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            title="回收站"
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 列表 + 属性面板 */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {loaded ? (
            <CellList
              cells={current?.cells ?? []}
              results={results}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveUp={moveCellUp}
              onMoveDown={moveCellDown}
              onContentChange={changeContent}
              onReorder={reorderCell}
              onAddCell={addCell}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
          <CellEditor
            calc={current}
            cell={selectedCell}
            cells={current?.cells ?? []}
            result={selectedId ? results.get(selectedId) : undefined}
            formulaErrorCount={formulaErrorCount}
            onPatch={updateCell}
            onRename={renameCell}
            onContentChange={changeContent}
            onDelete={(id) => setCellDeleteTarget(id)}
            onMetaChange={changeMeta}
          />
        </aside>
      </div>

      {/* 删除单元格：智能提醒确认 */}
      <AlertDialog open={!!cellDeleteTarget} onOpenChange={(o) => !o && setCellDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除单元格「{cellDeleteInfo?.target.name ?? ''}」？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cellDeleteInfo && cellDeleteInfo.dependents.length > 0 ? (
                <>
                  该单元格被 {cellDeleteInfo.dependents.length} 个公式引用：
                  <span className="font-medium text-foreground">
                    {cellDeleteInfo.dependents.map((d) => d.name).join('、')}
                  </span>
                  。删除后这些公式都会变成 #NAME 错误。
                </>
              ) : (
                '该单元格没有被其它公式引用，可以安全删除。'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cellDeleteTarget) deleteCell(cellDeleteTarget);
                setCellDeleteTarget(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 方案移入回收站确认 */}
      <AlertDialog open={schemeDeleteOpen} onOpenChange={setSchemeDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              将方案「{current?.title || '未命名'}」移入回收站？
            </AlertDialogTitle>
            <AlertDialogDescription>
              该方案共 {current?.cells.length ?? 0}{' '}
              个单元格。移入回收站后不会丢失，可随时在右上角「回收站」中恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteCurrent()}>
              移入回收站
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 回收站 */}
      <TrashDialog
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        token={token}
        onRestored={() => void refreshList()}
      />
    </div>
  );
}
