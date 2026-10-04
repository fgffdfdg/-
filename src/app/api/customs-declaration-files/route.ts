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

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10) || 20);

    let query = client
      .from('customs_declaration_files')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      const likeQ = `%${search}%`;
      query = query.or(`entry_no.ilike.${likeQ},customs_no.ilike.${likeQ},contract_no.ilike.${likeQ}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({
      data: (data as CfDbRow[] | null)?.map(rowToCf) ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const form = await request.formData();

    const entryNo = String(form.get('entry_no') ?? '').trim();
    if (!entryNo) throw new Error('报关单号不能为空');

    const customsNo = String(form.get('customs_no') ?? '').trim() || null;
    const contractNo = String(form.get('contract_no') ?? '').trim() || null;
    const vins = parseArray(form.get('vins'));
    const issueDate = String(form.get('issue_date') ?? '').trim() || null;
    const note = String(form.get('note') ?? '').trim() || null;

    const fileEntry = form.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) throw new Error('请上传报关单文件');
    if (file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');

    const arrayBuf = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || 'customs-declaration';
    const dot = originalName.lastIndexOf('.');
    const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
    const ext = dot > 0 ? originalName.slice(dot) : '';
    const suggestedKey = `customs-declarations/${userId}/${Date.now()}_${base}${ext}`;

    const s3 = getS3Storage();
    const fileKey = await s3.uploadFile({
      fileContent: arrayBuf,
      fileName: suggestedKey,
      contentType: file.type || 'application/octet-stream',
    });

    const insertPayload = {
      user_id: userId,
      entry_no: entryNo,
      customs_no: customsNo,
      contract_no: contractNo,
      vins,
      file_key: fileKey,
      file_name: file.name,
      file_mime: file.type || 'application/octet-stream',
      file_size: file.size,
      issue_date: issueDate,
      note,
    };

    const { data, error: insertErr } = await client
      .from('customs_declaration_files')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      await s3.deleteFile({ fileKey }).catch(() => {});
      throw new Error(`创建失败: ${insertErr.message}`);
    }

    return NextResponse.json({ data: rowToCf(data as CfDbRow) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}