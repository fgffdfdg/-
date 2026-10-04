'use client';

/**
 * 出口许可证 — 云端 API Client
 *
 * 所有方法都需要传入 Supabase access_token（由 useAuth() 提供）。
 * 文件本体走 multipart/form-data 上传到服务端，再由服务端转存到对象存储。
 */

import type { ExportLicense, ExportLicenseInput } from '@/lib/export-license/types';

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

export interface ListExportLicensesParams {
  search?: string;
}

export async function listExportLicenses(
  token: string | null,
  params: ListExportLicensesParams = {},
): Promise<ExportLicense[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  const url = `/api/export-licenses${qs.size ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const json = await parseJson<{ data: ExportLicense[] }>(res);
  return json.data;
}

export interface CreateExportLicenseInput extends ExportLicenseInput {
  file: File;
  organizationId?: string | null;
}

export async function createExportLicense(
  token: string | null,
  input: CreateExportLicenseInput,
): Promise<ExportLicense> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('license_no', input.licenseNo);
  form.append('vins', input.vins.join('\n'));
  if (input.exporter) form.append('exporter', input.exporter);
  if (input.issueDate) form.append('issue_date', input.issueDate);
  if (input.note) form.append('note', input.note);
  if (input.organizationId) form.append('organization_id', input.organizationId);

  const res = await fetch('/api/export-licenses', {
    method: 'POST',
    headers: authHeaders(token), // 不要设置 Content-Type，浏览器会自动加 boundary
    body: form,
  });
  const json = await parseJson<{ data: ExportLicense }>(res);
  return json.data;
}

export interface UpdateExportLicenseInput extends Partial<ExportLicenseInput> {
  file?: File;
}

export async function updateExportLicense(
  token: string | null,
  id: string,
  input: UpdateExportLicenseInput,
): Promise<ExportLicense> {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  if (input.licenseNo !== undefined) form.append('license_no', input.licenseNo);
  if (input.vins) form.append('vins', input.vins.join('\n'));
  if (input.exporter !== undefined) form.append('exporter', input.exporter ?? '');
  if (input.issueDate !== undefined) form.append('issue_date', input.issueDate ?? '');
  if (input.note !== undefined) form.append('note', input.note ?? '');

  const res = await fetch(`/api/export-licenses/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: form,
  });
  const json = await parseJson<{ data: ExportLicense }>(res);
  return json.data;
}

export async function deleteExportLicense(
  token: string | null,
  id: string,
): Promise<void> {
  const res = await fetch(`/api/export-licenses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ success: boolean }>(res);
}

export async function getExportLicenseFileUrl(
  token: string | null,
  id: string,
): Promise<{ url: string; fileName: string; fileMime: string }> {
  const res = await fetch(`/api/export-licenses/${id}/file-url`, {
    headers: authHeaders(token),
  });
  return parseJson<{ url: string; fileName: string; fileMime: string }>(res);
}

/**
 * 跨域下载工具：使用 fetch + blob，避免 <a download> 在跨域签名 URL 上失效。
 */
export async function downloadExportLicense(
  token: string | null,
  license: Pick<ExportLicense, 'id' | 'fileName'>,
): Promise<void> {
  const { url, fileName } = await getExportLicenseFileUrl(token, license.id);
  const response = await fetch(url);
  if (!response.ok) throw new Error('下载失败');
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'license';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}
