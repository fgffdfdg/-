import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';
import { searchDocuments } from '@/lib/document-search/engine';

export const runtime = 'nodejs';

/**
 * 单证统一检索
 *
 * GET /api/document-search?q={keyword}&type={docType}&status={draft|official|all}&page=1&pageSize=20
 */
export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() || '';
    const type = searchParams.get('type')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));

    if (!q) {
      return NextResponse.json({
        data: [],
        total: 0,
        page: 1,
        pageSize,
        summary: { totalCount: 0, officialCount: 0, draftCount: 0, byType: {} },
      });
    }

    const result = await searchDocuments(client, { q, type, status, page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}