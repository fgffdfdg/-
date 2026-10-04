'use client';

// ============================================================
// 云端 API Client - 可视化计算器
// 云端存储：quote_calculators 表，items jsonb = { v: 2, cells }
// 旧版数组格式（v1 类型化公式）读取时直接弃用。
// ============================================================

import type { CalcCell, VisualCalculator } from './types';
import { parseCloudItems, serializeCells } from './storage';

function authHeaders(token: string | null, init?: HeadersInit): HeadersInit {
  const headers = new Headers(init);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error || `请求失败 (${res.status})`);
  }
  return json;
}

export interface CloudSavedCalculator {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  description: string;
  items: unknown;
  defaultExchangeRate: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** 云端记录 → 本地模型；旧格式返回 null */
function cloudToLocal(c: CloudSavedCalculator): VisualCalculator | null {
  const cells = parseCloudItems(c.items);
  if (!cells) return null;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    cells,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
    cloudId: c.id,
    deletedAt: c.deletedAt ? new Date(c.deletedAt).toISOString() : undefined,
  };
}

/** 拉取云端有效计算器（自动过滤旧版格式与回收站记录） */
export async function fetchAllCalculators(token: string | null): Promise<VisualCalculator[]> {
  if (!token) return [];
  const res = await fetch('/api/quote-calculators', { headers: authHeaders(token) });
  const json = await parseJson<{ data: CloudSavedCalculator[] }>(res);
  return json.data
    .map(cloudToLocal)
    .filter((c): c is VisualCalculator => c !== null);
}

/** 拉取云端回收站中的计算器 */
export async function fetchTrashCalculators(token: string | null): Promise<VisualCalculator[]> {
  if (!token) return [];
  const res = await fetch('/api/quote-calculators?scope=trash', { headers: authHeaders(token) });
  const json = await parseJson<{ data: CloudSavedCalculator[] }>(res);
  return json.data
    .map(cloudToLocal)
    .filter((c): c is VisualCalculator => c !== null);
}

/** 新建云端计算器，返回 cloudId */
export async function createCalculator(
  token: string | null,
  calc: VisualCalculator,
): Promise<{ cloudId: string }> {
  if (!token) throw new Error('未登录');
  const res = await fetch('/api/quote-calculators', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      title: calc.title,
      description: calc.description,
      items: serializeCells(calc.cells),
      defaultExchangeRate: 1,
    }),
  });
  const json = await parseJson<{ data: CloudSavedCalculator }>(res);
  return { cloudId: json.data.id };
}

/** 更新云端计算器 */
export async function updateCalculator(
  token: string | null,
  calc: VisualCalculator,
): Promise<void> {
  if (!token) throw new Error('未登录');
  const cloudId = calc.cloudId || calc.id;
  const res = await fetch(`/api/quote-calculators/${cloudId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      title: calc.title,
      description: calc.description,
      items: serializeCells(calc.cells),
      defaultExchangeRate: 1,
    }),
  });
  await parseJson<{ data: CloudSavedCalculator }>(res);
}

/** 云端计算器移入回收站（软删除，可恢复） */
export async function deleteCalculatorFromCloud(
  token: string | null,
  cloudId: string,
): Promise<void> {
  if (!token) throw new Error('未登录');
  const res = await fetch(`/api/quote-calculators/${cloudId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

/** 从云端回收站恢复计算器 */
export async function restoreCloudCalculator(
  token: string | null,
  cloudId: string,
): Promise<void> {
  if (!token) throw new Error('未登录');
  const res = await fetch(`/api/quote-calculators/${cloudId}/restore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

/** 彻底删除云端计算器（不可恢复） */
export async function permanentDeleteCloudCalculator(
  token: string | null,
  cloudId: string,
): Promise<void> {
  if (!token) throw new Error('未登录');
  const res = await fetch(`/api/quote-calculators/${cloudId}?permanent=true`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

export type { CalcCell };
