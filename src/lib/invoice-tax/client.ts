'use client';

import type {
  InvoiceTitle,
  InvoiceTitleInput,
  TaxBureauFavorite,
  TaxBureauFavoriteInput,
} from '@/lib/invoice-tax/types';

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

// ===== 发票抬头 =====

export interface ListInvoiceTitlesParams {
  type?: 'own_company' | 'partner' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
  organizationId?: string | null;
}

export async function listInvoiceTitles(
  token: string | null,
  params: ListInvoiceTitlesParams = {},
): Promise<{ data: InvoiceTitle[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.type && params.type !== 'all') searchParams.set('type', params.type);
  if (params.search) searchParams.set('search', params.search);
  if (params.organizationId) searchParams.set('organization_id', params.organizationId);

  const res = await fetch(`/api/invoice-titles?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
  return parseJson<{ data: InvoiceTitle[]; total: number }>(res);
}

export async function createInvoiceTitle(
  token: string | null,
  input: InvoiceTitleInput,
): Promise<InvoiceTitle> {
  const res = await fetch('/api/invoice-titles', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: InvoiceTitle }>(res);
  return json.data;
}

export async function updateInvoiceTitle(
  token: string | null,
  id: string,
  input: Partial<InvoiceTitleInput>,
): Promise<InvoiceTitle> {
  const res = await fetch(`/api/invoice-titles/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: InvoiceTitle }>(res);
  return json.data;
}

export async function deleteInvoiceTitle(token: string | null, id: string): Promise<void> {
  const res = await fetch(`/api/invoice-titles/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

// ===== 税务局收藏 =====

export interface ListTaxBureausParams {
  siteType?: TaxBureauFavorite['site_type'] | 'all';
  region?: string;
  search?: string;
  limit?: number;
  offset?: number;
  organizationId?: string | null;
}

export async function listTaxBureaus(
  token: string | null,
  params: ListTaxBureausParams = {},
): Promise<{ data: TaxBureauFavorite[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.siteType && params.siteType !== 'all') searchParams.set('site_type', params.siteType);
  if (params.region) searchParams.set('region', params.region);
  if (params.search) searchParams.set('search', params.search);
  if (params.organizationId) searchParams.set('organization_id', params.organizationId);

  const res = await fetch(`/api/tax-bureaus?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
  return parseJson<{ data: TaxBureauFavorite[]; total: number }>(res);
}

export async function createTaxBureau(
  token: string | null,
  input: TaxBureauFavoriteInput,
): Promise<TaxBureauFavorite> {
  const res = await fetch('/api/tax-bureaus', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: TaxBureauFavorite }>(res);
  return json.data;
}

export async function updateTaxBureau(
  token: string | null,
  id: string,
  input: Partial<TaxBureauFavoriteInput>,
): Promise<TaxBureauFavorite> {
  const res = await fetch(`/api/tax-bureaus/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ data: TaxBureauFavorite }>(res);
  return json.data;
}

export async function deleteTaxBureau(token: string | null, id: string): Promise<void> {
  const res = await fetch(`/api/tax-bureaus/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

// ===== 工具函数 =====

export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return '—';
  const digits = account.replace(/\s+/g, '');
  if (digits.length <= 8) return account;
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return value;
  }
}
