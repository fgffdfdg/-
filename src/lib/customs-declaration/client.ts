'use client';

import type { CustomsDeclarationFull } from './types';

/** 列表项（数据库列 + 名称回填） */
export interface CustomsDeclarationListItem {
  id: string;
  entryNo: string;
  customsNo: string | null;
  contractNo: string | null;
  consigneeName: string | null;
  tradeCountryCode: string | null;
  tradeCountryName: string | null;
  arrivalCountryCode: string | null;
  arrivalCountryName: string | null;
  exitCustomsCode: string | null;
  exitCustomsName: string | null;
  transportModeCode: string | null;
  transportModeName: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  currencyCode: string | null;
  exportDate: string | null;
  declareDate: string | null;
  status: 'draft' | 'submitted' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ListCustomsDeclarationsParams {
  q?: string;
  status?: 'draft' | 'submitted' | 'archived' | 'all';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  organizationId?: string | null;
}

function authHeaders(token: string | null, init?: HeadersInit): HeadersInit {
  const headers = new Headers(init);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error || `请求失败 (${res.status})`);
  }
  return json;
}

export async function listCustomsDeclarations(
  token: string | null,
  params: ListCustomsDeclarationsParams = {},
): Promise<{ data: CustomsDeclarationListItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.q) searchParams.set('q', params.q);
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.organizationId) searchParams.set('organization_id', params.organizationId);

  const res = await fetch(`/api/customs-declarations?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
  return parseJson<{ data: CustomsDeclarationListItem[]; total: number }>(res);
}

export async function getCustomsDeclaration(
  token: string | null,
  id: string,
): Promise<{ data: { id: string; data: CustomsDeclarationFull } & Record<string, unknown> }> {
  const res = await fetch(`/api/customs-declarations/${id}`, {
    headers: authHeaders(token),
  });
  return parseJson<{ data: { id: string; data: CustomsDeclarationFull } & Record<string, unknown> }>(res);
}

export async function createCustomsDeclaration(
  token: string | null,
  input: { data: CustomsDeclarationFull; organization_id?: string | null },
): Promise<{ data: { id: string } & Record<string, unknown> }> {
  const res = await fetch('/api/customs-declarations', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return parseJson<{ data: { id: string } & Record<string, unknown> }>(res);
}

export async function updateCustomsDeclaration(
  token: string | null,
  id: string,
  input: { data?: CustomsDeclarationFull; status?: 'draft' | 'submitted' | 'archived' },
): Promise<{ data: Record<string, unknown> }> {
  const res = await fetch(`/api/customs-declarations/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return parseJson<{ data: Record<string, unknown> }>(res);
}

export async function deleteCustomsDeclaration(
  token: string | null,
  id: string,
): Promise<{ success: true }> {
  const res = await fetch(`/api/customs-declarations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return parseJson<{ success: true }>(res);
}
