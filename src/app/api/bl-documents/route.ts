import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function parseArray(input: FormDataEntryValue | null): string[] {
  if (!input) return [];
  const raw = String(input).trim();
  if (!raw) return [];
  return raw
    .split(/[\s,;，；、\t\r\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

interface BlDbRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  bl_no: string;
  vessel_name: string | null;
  voyage: string | null;
  container_numbers: string[];
  vins: string[];
  port_of_loading: string | null;
  port_of_discharge: string | null;
  shipping_date: string | null;
  estimated_arrival_date: string | null;
  carrier: string | null;
  file_key: string;
  file_name: string;
  file_mime: string;
  file_size: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBl(row: BlDbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    blNo: row.bl_no,
    vesselName: row.vessel_name,
    voyage: row.voyage,
    containerNumbers: row.container_numbers || [],
    vins: row.vins || [],
    portOfLoading: row.port_of_loading,
    portOfDischarge: row.port_of_discharge,
    shippingDate: row.shipping_date,
    estimatedArrivalDate: row.estimated_arrival_date,
    carrier: row.carrier,
    fileKey: row.file_key,
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSize: row.file_size,
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
      .from('bl_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      const likeQ = `%${search}%`;
      query = query.or(`bl_no.ilike.${likeQ},vessel_name.ilike.${likeQ},voyage.ilike.${likeQ}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({
      data: (data as BlDbRow[] | null)?.map(rowToBl) ?? [],
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

    const blNo = String(form.get('bl_no') ?? '').trim();
    if (!blNo) throw new Error('提单号不能为空');

    const vesselName = String(form.get('vessel_name') ?? '').trim() || null;
    const voyage = String(form.get('voyage') ?? '').trim() || null;
    const containerNumbers = parseArray(form.get('container_numbers'));
    const vins = parseArray(form.get('vins'));
    const portOfLoading = String(form.get('port_of_loading') ?? '').trim() || null;
    const portOfDischarge = String(form.get('port_of_discharge') ?? '').trim() || null;
    const shippingDate = String(form.get('shipping_date') ?? '').trim() || null;
    const estimatedArrivalDate = String(form.get('estimated_arrival_date') ?? '').trim() || null;
    const carrier = String(form.get('carrier') ?? '').trim() || null;
    const note = String(form.get('note') ?? '').trim() || null;

    const fileEntry = form.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) throw new Error('请上传提单文件');
    if (file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');

    // 上传文件到 S3
    const arrayBuf = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || 'bl-document';
    const dot = originalName.lastIndexOf('.');
    const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
    const ext = dot > 0 ? originalName.slice(dot) : '';
    const suggestedKey = `bl-documents/${userId}/${Date.now()}_${base}${ext}`;

    const s3 = getS3Storage();
    const fileKey = await s3.uploadFile({
      fileContent: arrayBuf,
      fileName: suggestedKey,
      contentType: file.type || 'application/octet-stream',
    });

    const insertPayload = {
      user_id: userId,
      bl_no: blNo,
      vessel_name: vesselName,
      voyage,
      container_numbers: containerNumbers,
      vins,
      port_of_loading: portOfLoading,
      port_of_discharge: portOfDischarge,
      shipping_date: shippingDate,
      estimated_arrival_date: estimatedArrivalDate,
      carrier,
      file_key: fileKey,
      file_name: file.name,
      file_mime: file.type || 'application/octet-stream',
      file_size: file.size,
      note,
    };

    const { data, error: insertErr } = await client
      .from('bl_documents')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      // 回滚 S3
      await s3.deleteFile({ fileKey }).catch(() => {});
      throw new Error(`创建失败: ${insertErr.message}`);
    }

    return NextResponse.json({ data: rowToBl(data as BlDbRow) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}