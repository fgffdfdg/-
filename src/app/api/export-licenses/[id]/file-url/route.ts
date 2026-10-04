import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

interface DbRow {
  id: string;
  file_key: string;
  file_name: string;
  file_mime: string;
}

/**
 * 获取许可证文件的临时签名 URL（供前端预览 / 下载）。
 *
 * GET /api/export-licenses/:id/file-url?disposition=inline|attachment
 * 默认 inline（预览）；下载时前端传 attachment。
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data, error } = await client
      .from('export_licenses')
      .select('id,file_key,file_name,file_mime')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '许可证不存在' }, { status: 404 });

    const row = data as DbRow;
    const url = await getS3Storage().generatePresignedUrl({
      key: row.file_key,
      expireTime: 3600,
    });

    return NextResponse.json({
      url,
      fileName: row.file_name,
      fileMime: row.file_mime,
    });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}
