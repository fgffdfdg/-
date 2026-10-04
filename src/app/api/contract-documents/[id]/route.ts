import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { parseVins } from '@/lib/contract-documents/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface DbRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  contract_no: string | null;
  invoice_no: string | null;
  packing_list_no: string | null;
  vins: string[] | null;
  file_key: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDoc(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    contractNo: row.contract_no,
    invoiceNo: row.invoice_no,
    packingListNo: row.packing_list_no,
    vins: row.vins ?? [],
    fileKey: row.file_key,
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchOwned(client: SupabaseClient, id: string): Promise<DbRow | null> {
  const { data, error } = await client
    .from('contract_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询失败: ${error.message}`);
  return (data as DbRow | null) ?? null;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const row = await fetchOwned(client, id);
    if (!row) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    return NextResponse.json({ data: rowToDoc(row) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const existing = await fetchOwned(client, id);
    if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const form = await request.formData();
    const updates: Record<string, unknown> = {};

    if (form.has('contract_no')) {
      updates.contract_no = String(form.get('contract_no')).trim() || null;
    }
    if (form.has('invoice_no')) {
      updates.invoice_no = String(form.get('invoice_no')).trim() || null;
    }
    if (form.has('packing_list_no')) {
      updates.packing_list_no = String(form.get('packing_list_no')).trim() || null;
    }
    if (form.has('vins')) {
      const vinsRaw = form.get('vins');
      updates.vins = parseVins(
        Array.isArray(vinsRaw) ? vinsRaw.join('\n') : vinsRaw ? String(vinsRaw) : '',
      );
    }
    if (form.has('status')) {
      const s = String(form.get('status')).trim();
      if (s !== 'draft' && s !== 'archived') throw new Error('状态值无效');
      updates.status = s;
    }
    if (form.has('notes')) {
      updates.notes = String(form.get('notes')).trim() || null;
    }

    updates.updated_at = new Date().toISOString();

    const fileEntry = form.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    if (file && file.size > MAX_FILE_SIZE) {
      throw new Error('文件不能超过 20MB');
    }

    const s3 = getS3Storage();
    let oldKeyToDelete: string | null = null;

    if (file) {
      const originalName = file.name || existing.file_name || 'document';
      const dot = originalName.lastIndexOf('.');
      const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
      const ext = dot > 0 ? originalName.slice(dot) : '';
      const suggestedKey = `contract-documents/${existing.user_id ?? 'anon'}/${Date.now()}_${base}${ext}`;
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
      if (existing.file_key) oldKeyToDelete = existing.file_key;
    }

    const { data, error } = await client
      .from('contract_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (updates.file_key && typeof updates.file_key === 'string') {
        await s3.deleteFile({ fileKey: updates.file_key }).catch(() => undefined);
      }
      throw new Error(`更新失败: ${error.message}`);
    }

    if (oldKeyToDelete) {
      void s3.deleteFile({ fileKey: oldKeyToDelete }).catch(() => undefined);
    }

    return NextResponse.json({ data: rowToDoc(data as DbRow) });
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
    if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const { error } = await client.from('contract_documents').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    if (existing.file_key) {
      void getS3Storage()
        .deleteFile({ fileKey: existing.file_key })
        .catch(() => undefined);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}