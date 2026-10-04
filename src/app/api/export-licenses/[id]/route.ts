import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { parseVins } from '@/lib/export-license/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface DbRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  license_no: string;
  file_name: string;
  file_key: string;
  file_mime: string;
  file_size: number;
  vins: string[] | null;
  exporter: string | null;
  issue_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function rowToLicense(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    licenseNo: row.license_no,
    fileName: row.file_name,
    fileKey: row.file_key,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    vins: row.vins ?? [],
    exporter: row.exporter,
    issueDate: row.issue_date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchOwned(
  client: SupabaseClient,
  id: string,
): Promise<DbRow | null> {
  const { data, error } = await client
    .from('export_licenses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询失败: ${error.message}`);
  return (data as DbRow | null) ?? null;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const row = await fetchOwned(client, id);
    if (!row) return NextResponse.json({ error: '许可证不存在' }, { status: 404 });
    return NextResponse.json({ data: rowToLicense(row) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const existing = await fetchOwned(client, id);
    if (!existing) return NextResponse.json({ error: '许可证不存在' }, { status: 404 });

    const form = await request.formData();
    const licenseNo = String(form.get('license_no') ?? existing.license_no).trim();
    const exporterRaw = form.get('exporter');
    const issueDateRaw = form.get('issue_date');
    const noteRaw = form.get('note');
    const vinsRaw = form.get('vins');
    const fileEntry = form.get('file');
    const clearFile = form.get('clear_file') === '1';
    const file = fileEntry instanceof File ? fileEntry : null;

    const vins = parseVins(
      Array.isArray(vinsRaw)
        ? vinsRaw.join('\n')
        : vinsRaw != null
          ? String(vinsRaw)
          : existing.vins?.join('\n') ?? '',
    );
    if (vins.length === 0) throw new Error('至少需要保留一个车架号（VIN）');

    if (!licenseNo) throw new Error('许可证号不能为空');
    if (file && !(file instanceof File)) throw new Error('文件参数非法');
    if (file && file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');
    if (clearFile && !file) throw new Error('未提供新文件时不能清空原文件');

    const updates: Record<string, unknown> = {
      license_no: licenseNo,
      vins,
      exporter: exporterRaw != null ? String(exporterRaw).trim() || null : existing.exporter,
      issue_date:
        issueDateRaw != null ? String(issueDateRaw).trim() || null : existing.issue_date,
      note: noteRaw != null ? String(noteRaw).trim() || null : existing.note,
      updated_at: new Date().toISOString(),
    };

    const s3 = getS3Storage();
    let oldKeyToDelete: string | null = null;

    if (file) {
      const originalName = file.name || existing.file_name || 'license';
      const dot = originalName.lastIndexOf('.');
      const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
      const ext = dot > 0 ? originalName.slice(dot) : '';
      const suggestedKey = `export-licenses/${existing.user_id ?? 'anon'}/${Date.now()}_${base}${ext}`;
      const arrayBuf = Buffer.from(await file.arrayBuffer());
      const newKey = await s3.uploadFile({
        fileContent: arrayBuf,
        fileName: suggestedKey,
        contentType: file.type || existing.file_mime || 'application/octet-stream',
      });
      updates.file_key = newKey;
      updates.file_name = file.name;
      updates.file_mime = file.type || existing.file_mime;
      updates.file_size = file.size;
      oldKeyToDelete = existing.file_key;
    }

    const { data, error } = await client
      .from('export_licenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // 更新失败：若上传了新文件，回滚新文件
      if (updates.file_key && typeof updates.file_key === 'string') {
        await s3.deleteFile({ fileKey: updates.file_key }).catch(() => undefined);
      }
      throw new Error(`更新失败: ${error.message}`);
    }

    // 更新成功后异步清理旧文件
    if (oldKeyToDelete) {
      void s3.deleteFile({ fileKey: oldKeyToDelete }).catch(() => undefined);
    }

    return NextResponse.json({ data: rowToLicense(data as DbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const existing = await fetchOwned(client, id);
    if (!existing) return NextResponse.json({ error: '许可证不存在' }, { status: 404 });

    const { error } = await client.from('export_licenses').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    // 异步删除对象存储中的文件
    void getS3Storage()
      .deleteFile({ fileKey: existing.file_key })
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
