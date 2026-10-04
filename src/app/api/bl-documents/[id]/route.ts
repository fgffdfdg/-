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

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data, error } = await client
      .from('bl_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '提单不存在' }, { status: 404 });

    return NextResponse.json({ data: rowToBl(data as BlDbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const { id } = await ctx.params;

    // 先查现有记录
    const { data: existing } = await client
      .from('bl_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: '提单不存在' }, { status: 404 });

    const form = await request.formData();
    const blNo = String(form.get('bl_no') ?? '').trim();
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

    const updatePayload: Record<string, unknown> = {
      bl_no: blNo || (existing as BlDbRow).bl_no,
      vessel_name: vesselName,
      voyage,
      container_numbers: containerNumbers.length > 0 ? containerNumbers : (existing as BlDbRow).container_numbers,
      vins: vins.length > 0 ? vins : (existing as BlDbRow).vins,
      port_of_loading: portOfLoading,
      port_of_discharge: portOfDischarge,
      shipping_date: shippingDate,
      estimated_arrival_date: estimatedArrivalDate,
      carrier,
      note,
      updated_at: new Date().toISOString(),
    };

    // 如果上传了新文件，替换旧文件
    if (file) {
      if (file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');

      const arrayBuf = Buffer.from(await file.arrayBuffer());
      const originalName = file.name || 'bl-document';
      const dot = originalName.lastIndexOf('.');
      const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
      const ext = dot > 0 ? originalName.slice(dot) : '';
      const suggestedKey = `bl-documents/${userId}/${Date.now()}_${base}${ext}`;

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

      // 删除旧文件（异步，不阻塞）
      const oldKey = (existing as BlDbRow).file_key;
      if (oldKey) {
        s3.deleteFile({ fileKey: oldKey }).catch(() => {});
      }
    }

    const { data, error } = await client
      .from('bl_documents')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ data: rowToBl(data as BlDbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    // 先获取 file_key 以便删除 S3 文件
    const { data: existing } = await client
      .from('bl_documents')
      .select('file_key')
      .eq('id', id)
      .maybeSingle();

    const { error } = await client.from('bl_documents').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    // 异步删除 S3 文件
    if (existing?.file_key) {
      getS3Storage().deleteFile({ fileKey: existing.file_key }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}