'use client';

/**
 * 出口许可证草单 — 云端 API Client
 *
 * 所有方法都需要传入 Supabase access_token（由 useAuth() 提供）。
 * 草单数据（main + annex JSON）以 JSON 格式直接传输，无需文件上传。
 */

import type { LicenseDraft } from '@/lib/export-license/storage';

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

/** 云端返回的草单格式（camelCase），与 LicenseDraft 兼容 */
export interface CloudLicenseDraft {
  id: string;
  userId: string | null;
  organizationId: string | null;
  no: string;
  title: string;
  exporter: string;
  country: string;
  vehicleCount: number;
  totalAmount: number;
  status: 'draft' | 'submitted';
  contractNo?: string;
  vins?: string[];
  brand?: string;
  model?: string;
  main: unknown;
  annex: unknown;
  createdAt: number;
  updatedAt: number;
}

export async function listLicenseDrafts(
  token: string | null,
  search?: string,
): Promise<CloudLicenseDraft[]> {
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  const url = `/api/license-drafts${qs.size ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const json = await parseJson<{ data: CloudLicenseDraft[] }>(res);
  return json.data;
}

export interface CreateLicenseDraftInput {
  draftNo: string;
  title?: string;
  exporter: string;
  country: string;
  vehicleCount: number;
  totalAmount: number;
  status?: string;
  contractNo?: string;
  vins?: string[];
  brand?: string;
  model?: string;
  main: unknown;
  annex: unknown;
  organizationId?: string | null;
}

export async function createLicenseDraft(
  token: string | null,
  input: CreateLicenseDraftInput,
): Promise<CloudLicenseDraft> {
  const res = await fetch('/api/license-drafts', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: CloudLicenseDraft }>(res);
  return json.data;
}

export interface UpdateLicenseDraftInput {
  draftNo?: string;
  title?: string;
  exporter?: string;
  country?: string;
  vehicleCount?: number;
  totalAmount?: number;
  status?: string;
  contractNo?: string;
  vins?: string[];
  brand?: string;
  model?: string;
  main?: unknown;
  annex?: unknown;
}

export async function updateLicenseDraft(
  token: string | null,
  id: string,
  input: UpdateLicenseDraftInput,
): Promise<CloudLicenseDraft> {
  const res = await fetch(`/api/license-drafts/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: CloudLicenseDraft }>(res);
  return json.data;
}

export async function deleteLicenseDraft(
  token: string | null,
  id: string,
): Promise<void> {
  const res = await fetch(`/api/license-drafts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

/**
 * 将本地 localStorage 中的草单批量上传到云端。
 * 返回成功上传的数量。
 */
export async function migrateLocalDrafts(
  token: string | null,
  drafts: LicenseDraft[],
  organizationId?: string | null,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const d of drafts) {
    try {
      await createLicenseDraft(token, {
        draftNo: d.no,
        title: d.title,
        exporter: d.exporter,
        country: d.country,
        vehicleCount: d.vehicleCount,
        totalAmount: d.totalAmount,
        status: d.status,
        contractNo: d.contractNo,
        vins: d.vins,
        brand: d.brand,
        model: d.model,
        main: d.main,
        annex: d.annex,
        organizationId: organizationId ?? null,
      });
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.warn('[draft-api-client] migration upload failed:', err);
    }
  }

  return { succeeded, failed };
}