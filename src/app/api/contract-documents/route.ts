import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { parseVins } from '@/lib/contract-documents/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();

    let query = client
      .from('contract_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      const q = `%${search}%`;
      const textFilter = `contract_no.ilike.${q},invoice_no.ilike.${q},packing_list_no.ilike.${q},notes.ilike.${q}`;
      const [textRes, vinRes] = await Promise.all([
        client.from('contract_documents').select('*').or(textFilter),
        client.from('contract_documents').select('*').contains('vins', [search.toUpperCase()]),
      ]);
      if (textRes.error) throw new Error(`查询失败: ${textRes.error.message}`);
      if (vinRes.error) throw new Error(`查询失败: ${vinRes.error.message}`);

      const merged = new Map<string, DbRow>();
      for (const row of (textRes.data as DbRow[] | null) ?? []) merged.set(row.id, row);
      for (const row of (vinRes.data as DbRow[] | null) ?? []) merged.set(row.id, row);

      const list = Array.from(merged.values()).sort(
        (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      );

      // 如果指定了 status 筛选，在合并后再过滤
      const filtered = status && status !== 'all'
        ? list.filter((r) => r.status === status)
        : list;

      return NextResponse.json({ data: filtered.map(rowToDoc) });
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({
      data: (data as DbRow[] | null)?.map(rowToDoc) ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);

    const form = await request.formData();
    const contractNo = String(form.get('contract_no') ?? '').trim() || null;
    const invoiceNo = String(form.get('invoice_no') ?? '').trim() || null;
    const packingListNo = String(form.get('packing_list_no') ?? '').trim() || null;
    const vinsRaw = form.get('vins');
    const vins = parseVins(
      Array.isArray(vinsRaw) ? vinsRaw.join('\n') : vinsRaw ? String(vinsRaw) : '',
    );
    const status = String(form.get('status') ?? 'draft').trim();
    const notes = String(form.get('notes') ?? '').trim() || null;
    const fileEntry = form.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    // 至少需要填写一个编号或车架号
    if (!contractNo && !invoiceNo && !packingListNo && vins.length === 0 && !file) {
      throw new Error('请至少填写一个编号、车架号或上传文件');
    }

    if (status !== 'draft' && status !== 'archived') {
      throw new Error('状态值无效');
    }

    if (file && file.size > MAX_FILE_SIZE) {
      throw new Error('文件不能超过 20MB');
    }

    let fileKey: string | null = null;
    let fileName: string | null = null;
    let fileMime: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      const arrayBuf = Buffer.from(await file.arrayBuffer());
      const originalName = file.name || 'document';
      const dot = originalName.lastIndexOf('.');
      const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
      const ext = dot > 0 ? originalName.slice(dot) : '';
      const suggestedKey = `contract-documents/${userId}/${Date.now()}_${base}${ext}`;

      const s3 = getS3Storage();
      fileKey = await s3.uploadFile({
        fileContent: arrayBuf,
        fileName: suggestedKey,
        contentType: file.type || 'application/octet-stream',
      });
      fileName = file.name;
      fileMime = file.type || 'application/octet-stream';
      fileSize = file.size;
    }

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      contract_no: contractNo,
      invoice_no: invoiceNo,
      packing_list_no: packingListNo,
      vins,
      file_key: fileKey,
      file_name: fileName,
      file_mime: fileMime,
      file_size: fileSize,
      status,
      notes,
    };

    const { data, error } = await client
      .from('contract_documents')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // 回滚已上传的文件
      if (fileKey) {
        await getS3Storage().deleteFile({ fileKey }).catch(() => undefined);
      }
      throw new Error(`创建失败: ${error.message}`);
    }

    // 写入车辆关联索引
    const docNo = contractNo || invoiceNo || packingListNo || undefined;
    upsertVehicleLinks(userId, null, {
      docType: 'contract_document',
      docId: (data as DbRow).id,
      docNo: docNo,
      vins,
    }).catch(() => {});

    return NextResponse.json({ data: rowToDoc(data as DbRow) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}