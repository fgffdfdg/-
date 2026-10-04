// ============ 运输跟踪 - 批量导入 ============

import { NextRequest, NextResponse } from 'next/server';
import { parseBatchImport } from '@/lib/tracking/data-service';

/** POST /api/transport-records/batch - 批量导入解析 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: '请输入要导入的数据，每行一条记录' },
        { status: 400 }
      );
    }

    const results = parseBatchImport(text);

    return NextResponse.json({
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      duplicate: results.filter((r) => r.status === 'duplicate').length,
      format_error: results.filter((r) => r.status === 'format_error').length,
      pending_query: results.filter((r) => r.status === 'pending_query').length,
      results,
    });
  } catch (error: unknown) {
    console.error('POST /api/transport-records/batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量导入失败' },
      { status: 500 }
    );
  }
}