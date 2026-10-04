// ============ 运输跟踪 - 标记通知已读 ============

import { NextRequest, NextResponse } from 'next/server';

/** POST /api/transport-notifications/read - 标记通知已读 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids, mark_all } = body;

    // 演示模式：直接返回成功
    return NextResponse.json({
      success: true,
      marked: notification_ids?.length || (mark_all ? 'all' : 0),
    });
  } catch (error: unknown) {
    console.error('POST /api/transport-notifications/read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}