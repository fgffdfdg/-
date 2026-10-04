/**
 * 合同/发票/装箱单归档 - 前端 API Client
 */

import type { ContractDocument, ContractDocumentInput } from './types';

const BASE = '/api/contract-documents';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

export async function listContractDocuments(params?: {
  search?: string;
  status?: string;
}): Promise<ContractDocument[]> {
  const url = new URL(BASE, window.location.origin);
  if (params?.search) url.searchParams.set('search', params.search);
  if (params?.status) url.searchParams.set('status', params.status);

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  const json = await res.json();
  return json.data ?? [];
}

export async function getContractDocument(id: string): Promise<ContractDocument> {
  const res = await fetch(`${BASE}/${id}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  const json = await res.json();
  return json.data;
}

export async function createContractDocument(
  input: ContractDocumentInput,
  file?: File | null,
): Promise<ContractDocument> {
  const form = new FormData();
  form.append('contract_no', input.contractNo ?? '');
  form.append('invoice_no', input.invoiceNo ?? '');
  form.append('packing_list_no', input.packingListNo ?? '');
  form.append('vins', input.vins.join('\n'));
  form.append('status', input.status ?? 'draft');
  if (input.notes) form.append('notes', input.notes);
  if (file) form.append('file', file);

  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error(err.error || '创建失败');
  }
  const json = await res.json();
  return json.data;
}

export async function updateContractDocument(
  id: string,
  input: Partial<ContractDocumentInput>,
  file?: File | null,
): Promise<ContractDocument> {
  const form = new FormData();
  if (input.contractNo !== undefined) form.append('contract_no', input.contractNo);
  if (input.invoiceNo !== undefined) form.append('invoice_no', input.invoiceNo);
  if (input.packingListNo !== undefined) form.append('packing_list_no', input.packingListNo);
  if (input.vins !== undefined) form.append('vins', input.vins.join('\n'));
  if (input.status !== undefined) form.append('status', input.status);
  if (input.notes !== undefined) form.append('notes', input.notes);
  if (file) form.append('file', file);

  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '更新失败' }));
    throw new Error(err.error || '更新失败');
  }
  const json = await res.json();
  return json.data;
}

export async function deleteContractDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error || '删除失败');
  }
}

export async function getContractDocumentFileUrl(
  id: string,
): Promise<{ url: string; fileName: string; fileMime: string }> {
  const res = await fetch(`${BASE}/${id}/file-url`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '获取文件失败' }));
    throw new Error(err.error || '获取文件失败');
  }
  return res.json();
}

export async function downloadContractDocument(id: string): Promise<void> {
  const { url, fileName } = await getContractDocumentFileUrl(id);
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'document';
  link.click();
  window.URL.revokeObjectURL(blobUrl);
}