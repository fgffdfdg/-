import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

/** 数据源 → 表名 映射 */
const SOURCE_TABLE: Record<string, string> = {
  contract_documents: 'contract_documents',
  export_licenses: 'export_licenses',
  customs_declaration_files: 'customs_declaration_files',
  bl_documents: 'bl_documents',
};

/**
 * 获取单证文件的临时签名 URL
 *
 * GET /api/document-search/file-url?id={id}&source={source}&disposition=inline|attachment
 */
export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const source = searchParams.get('source');
    const disposition = searchParams.get('disposition') || 'inline';

    if (!id) return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    if (!source) return NextResponse.json({ error: '缺少 source 参数' }, { status: 400 });

    const table = SOURCE_TABLE[source];
    if (!table) {
      return NextResponse.json({ error: `不支持的数据源: ${source}` }, { status: 400 });
    }

    const { data, error } = await client
      .from(table)
      .select('id,file_key,file_name,file_mime')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const row = data as { id: string; file_key: string; file_name: string; file_mime: string };
    if (!row.file_key) return NextResponse.json({ error: '该记录无附件' }, { status: 404 });

    const url = await getS3Storage().generatePresignedUrl({
      key: row.file_key,
      expireTime: 3600,
    });

    return NextResponse.json({
      url,
      fileName: row.file_name,
      fileMime: row.file_mime,
      disposition,
    });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}