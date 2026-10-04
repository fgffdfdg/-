import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function parseArray(input: FormDataEntryValue | null): string[] {
  if (!input) return [];
  const raw = String(input).trim();
  if (!raw) return [];
  return raw
    .split(/[\s,;，；、\t\r\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

interface CfDbRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  entry_no: string;
  customs_no: string | null;
  contract_no: string | null;
  vins: string[];
  file_key: string;
  file_name: string;
  file_mime: string;
  file_size: number;
  issue_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCf(row: CfDbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    entryNo: row.entry_no,
    customsNo: row.customs_no,
    contractNo: row.contract_no,
    vins: row.vins || [],
    fileKey: row.file_key,
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    issueDate: row.issue_date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data, error } = await client
      .from('customs_declaration_files')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '报关单不存在' }, { status: 404 });

    return NextResponse.json({ data: rowToCf(data as CfDbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data: existing } = await client
      .from('customs_declaration_files')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: '报关单不存在' }, { status: 404 });

    const form = await request.formData();
    const entryNo = String(form.get('entry_no') ?? '').trim();
    const customsNo = String(form.get('customs_no') ?? '').trim() || null;
    const contractNo = String(form.get('contract_no') ?? '').trim() || null;
    const vins = parseArray(form.get('vins'));
    const issueDate = String(form.get('issue_date') ?? '').trim() || null;
    const note = String(form.get('note') ?? '').trim() || null;
    const fileEntry = form.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    const updatePayload: Record<string, unknown> = {
      entry_no: entryNo || (existing as CfDbRow).entry_no,
      customs_no: customsNo,
      contract_no: contractNo,
      vins: vins.length > 0 ? vins : (existing as CfDbRow).vins,
      issue_date: issueDate,
      note,
      updated_at: new Date().toISOString(),
    };

    if (file) {
      if (file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');

      const arrayBuf = Buffer.from(await file.arrayBuffer());
      const originalName = file.name || 'customs-declaration';
      const dot = originalName.lastIndexOf('.');
      const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
      const ext = dot > 0 ? originalName.slice(dot) : '';
      const suggestedKey = `customs-declarations/${userId}/${Date.now()}_${base}${ext}`;

      const s3 = getS3Storage();
      const newFileKey = await s3.uploadFile({
        fileContent: arrayBuf,
        fileName: suggestedKey,
        contentType: file.type || 'application/octet-stream',
      });

      updatePayload.file_key = newFileKey;
      updatePayload.file_name = file.name;
      updatePayload.file_mime = file.type || 'application/octet-stream';
      updatePayload.file_size = file.size;

      const oldKey = (existing as CfDbRow).file_key;
      if (oldKey) {
        s3.deleteFile({ fileKey: oldKey }).catch(() => {});
      }
    }

    const { data, error } = await client
      .from('customs_declaration_files')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ data: rowToCf(data as CfDbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data: existing } = await client
      .from('customs_declaration_files')
      .select('file_key')
      .eq('id', id)
      .maybeSingle();

    const { error } = await client.from('customs_declaration_files').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    if (existing?.file_key) {
      getS3Storage().deleteFile({ fileKey: existing.file_key }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}