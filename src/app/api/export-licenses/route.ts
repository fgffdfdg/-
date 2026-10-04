import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { parseVins } from '@/lib/export-license/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    let query = client
      .from('export_licenses')
      .select('*')
      .order('issue_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (search) {
      const q = search.toUpperCase();
      // 文本字段 OR 模糊匹配 + VIN 数组成员匹配；PostgREST 无法在一个 or() 中混合数组操作，
      // 因此并行发起两次查询，在服务端按 id 去重合并。
      const textFilter = `license_no.ilike.%${q}%,exporter.ilike.%${q}%,file_name.ilike.%${q}%,note.ilike.%${q}%`;
      const [textRes, vinRes] = await Promise.all([
        client.from('export_licenses').select('*').or(textFilter),
        client.from('export_licenses').select('*').contains('vins', [q]),
      ]);
      if (textRes.error) throw new Error(`查询失败: ${textRes.error.message}`);
      if (vinRes.error) throw new Error(`查询失败: ${vinRes.error.message}`);

      const merged = new Map<string, DbRow>();
      for (const row of (textRes.data as DbRow[] | null) ?? []) merged.set(row.id, row);
      for (const row of (vinRes.data as DbRow[] | null) ?? []) merged.set(row.id, row);

      // 按 issue_date desc, created_at desc 排序（与默认排序保持一致）
      const list = Array.from(merged.values()).sort((a, b) => {
        const da = a.issue_date ? Date.parse(a.issue_date) : 0;
        const db = b.issue_date ? Date.parse(b.issue_date) : 0;
        if (da !== db) return db - da;
        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      });

      return NextResponse.json({ data: list.map(rowToLicense) });
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({
      data: (data as DbRow[] | null)?.map(rowToLicense) ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);

    const form = await request.formData();
    const file = form.get('file');
    const licenseNo = String(form.get('license_no') ?? '').trim();
    const exporter = String(form.get('exporter') ?? '').trim();
    const issueDate = String(form.get('issue_date') ?? '').trim();
    const note = String(form.get('note') ?? '').trim();
    const organizationId = String(form.get('organization_id') ?? '').trim();
    const vinsRaw = form.get('vins');
    const vins = parseVins(
      Array.isArray(vinsRaw)
        ? vinsRaw.join('\n')
        : vinsRaw
          ? String(vinsRaw)
          : '',
    );

    if (!licenseNo) throw new Error('请填写许可证号');
    if (vins.length === 0) throw new Error('至少需要填写一个车架号（VIN）');
    if (!(file instanceof File)) throw new Error('必须上传许可证文件');
    if (file.size > MAX_FILE_SIZE) throw new Error('文件不能超过 20MB');

    const arrayBuf = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || 'license';
    const dot = originalName.lastIndexOf('.');
    const base = sanitizeSegment(dot > 0 ? originalName.slice(0, dot) : originalName);
    const ext = dot > 0 ? originalName.slice(dot) : '';
    const suggestedKey = `export-licenses/${userId}/${Date.now()}_${base}${ext}`;

    const s3 = getS3Storage();
    const fileKey = await s3.uploadFile({
      fileContent: arrayBuf,
      fileName: suggestedKey,
      contentType: file.type || 'application/octet-stream',
    });

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      license_no: licenseNo,
      file_name: file.name,
      file_key: fileKey,
      file_mime: file.type || 'application/octet-stream',
      file_size: file.size,
      vins,
      exporter: exporter || null,
      issue_date: issueDate || null,
      note: note || null,
      organization_id: organizationId || null,
    };

    const { data, error } = await client
      .from('export_licenses')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // 回滚已上传的文件
      await s3.deleteFile({ fileKey }).catch(() => undefined);
      throw new Error(`创建失败: ${error.message}`);
    }

    // 写入车辆关联索引
    upsertVehicleLinks(userId, organizationId || null, {
      docType: 'export_license',
      docId: (data as DbRow).id,
      docNo: licenseNo,
      vins,
    }).catch(() => {});

    return NextResponse.json({ data: rowToLicense(data as DbRow) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}
