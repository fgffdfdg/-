import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data, error } = await client
      .from('bl_documents')
      .select('id,file_key,file_name,file_mime')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '提单不存在' }, { status: 404 });

    const row = data as { id: string; file_key: string; file_name: string; file_mime: string };
    const url = await getS3Storage().generatePresignedUrl({
      key: row.file_key,
      expireTime: 3600,
    });

    return NextResponse.json({ url, fileName: row.file_name, fileMime: row.file_mime });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}