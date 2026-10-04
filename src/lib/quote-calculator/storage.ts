// ============================================================
// 本地存储工具 - 可视化计算器（localStorage 缓存，云端为主）
// 使用独立的 v2 存储键，旧版（类型化公式）数据自然弃用。
// ============================================================

import type { CalcCell, VisualCalculator } from './types';
import { CALC_DATA_VERSION, createDefaultCells } from './types';

const STORAGE_KEY = 'quote_calculators_v2';

function readStore(): VisualCalculator[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isVisualCalculator);
  } catch {
    return [];
  }
}

function writeStore(calcs: VisualCalculator[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calcs));
  } catch {
    // 存储满等异常静默处理
  }
}

/** 结构校验：只接受 v2 结构（含 cells 数组） */
export function isVisualCalculator(v: unknown): v is VisualCalculator {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.cells) &&
    (obj.cells as unknown[]).every(
      (c) =>
        c !== null &&
        typeof c === 'object' &&
        typeof (c as Record<string, unknown>).id === 'string' &&
        typeof (c as Record<string, unknown>).name === 'string',
    )
  );
}

/** 云端 items jsonb → cells（兼容校验；旧数组格式返回 null 表示弃用） */
export function parseCloudItems(items: unknown): CalcCell[] | null {
  if (!items || typeof items !== 'object' || Array.isArray(items)) return null;
  const obj = items as Record<string, unknown>;
  if (obj.v !== CALC_DATA_VERSION || !Array.isArray(obj.cells)) return null;
  return (obj.cells as unknown[]).filter(
    (c): c is CalcCell =>
      c !== null &&
      typeof c === 'object' &&
      typeof (c as Record<string, unknown>).id === 'string' &&
      typeof (c as Record<string, unknown>).name === 'string',
  );
}

/** 序列化为云端 items jsonb 结构 */
export function serializeCells(cells: CalcCell[]): { v: number; cells: CalcCell[] } {
  return { v: CALC_DATA_VERSION, cells };
}

/** 获取所有本地保存的计算器（不含回收站中的） */
export function loadAllCalculators(): VisualCalculator[] {
  return readStore().filter((c) => !c.deletedAt);
}

/** 获取本地回收站中的计算器（按删除时间倒序） */
export function loadTrashCalculators(): VisualCalculator[] {
  return readStore()
    .filter((c) => !!c.deletedAt)
    .sort((a, b) => new Date(b.deletedAt as string).getTime() - new Date(a.deletedAt as string).getTime());
}

/** 移入回收站（软删除，保留数据可恢复；可指定删除时间） */
export function softDeleteCalculator(id: string, at?: string): void {
  const all = readStore();
  const idx = all.findIndex((c) => c.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], deletedAt: at ?? new Date().toISOString() };
    writeStore(all);
  }
}

/** 从回收站恢复 */
export function restoreCalculator(id: string): void {
  const all = readStore();
  const idx = all.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const next = { ...all[idx] };
    delete next.deletedAt;
    all[idx] = next;
    writeStore(all);
  }
}

/** 保存单个计算器（新增或更新，仅本地） */
export function saveCalculator(calc: VisualCalculator): void {
  const all = readStore();
  const idx = all.findIndex((c) => c.id === calc.id);
  const next = { ...calc, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = next;
  } else {
    all.push(next);
  }
  writeStore(all);
}

/** 删除计算器（仅本地） */
export function deleteCalculator(id: string): void {
  writeStore(readStore().filter((c) => c.id !== id));
}

/** 获取单个计算器 */
export function loadCalculator(id: string): VisualCalculator | null {
  return readStore().find((c) => c.id === id) ?? null;
}

/** 创建一份空白计算器（不带默认模板） */
export function createBlankCalculator(title: string): VisualCalculator {
  const now = new Date().toISOString();
  return {
    id: `calc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    description: '',
    cells: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** 给本地计算器标记 cloudId */
export function markCalculatorSynced(localId: string, cloudId: string): void {
  const all = readStore();
  const idx = all.findIndex((c) => c.id === localId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], cloudId };
    writeStore(all);
  }
}

/**
 * 合并云端数据到本地，并回写缓存。
 * - 云端有、本地无 → 用云端
 * - 本地有、云端无（未同步）→ 保留本地
 * - 双方都有 → 比较 updatedAt：本地更新（存在尚未同步的编辑）时保留本地，
 *   否则用云端，避免刷新页面时云端旧版本覆盖本地未同步的改动。
 */
export function mergeCalculators(local: VisualCalculator[], cloud: VisualCalculator[]): VisualCalculator[] {
  const cloudById = new Map(cloud.map((c) => [c.id, c]));
  const merged = [...cloud];

  for (const lc of local) {
    if (lc.cloudId && cloudById.has(lc.cloudId)) {
      const cc = cloudById.get(lc.cloudId);
      const localTs = new Date(lc.updatedAt).getTime();
      const cloudTs = cc ? new Date(cc.updatedAt).getTime() : 0;
      if (cc && localTs > cloudTs) {
        const idx = merged.findIndex((c) => c.id === lc.cloudId);
        if (idx >= 0) merged[idx] = lc; // 本地有未同步的新编辑 → 保留本地
      }
      continue;
    }
    merged.push(lc);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

export { createDefaultCells };
