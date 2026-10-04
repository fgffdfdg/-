// ============ 运输跟踪 - 通知 ============

import { NextRequest, NextResponse } from 'next/server';
import { getDemoRecords } from '@/lib/tracking/data-service';

/** GET /api/transport-notifications - 获取通知列表 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const demo = searchParams.get('demo') || 'true';

    if (demo === 'true') {
      const records = getDemoRecords();
      const allNotifications = records
        .flatMap((r) =>
          (r.notifications || []).map((n) => ({
            ...n,
            record_id: r.id,
            bl_number: r.bl_number,
            tracking_number: r.tracking_number,
            status: r.status,
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      return NextResponse.json({
        data: allNotifications,
        count: allNotifications.length,
        unread_count: allNotifications.filter((n) => !n.is_read).length,
      });
    }

    return NextResponse.json({ data: [], count: 0, unread_count: 0 });
  } catch (error: unknown) {
    console.error('GET /api/transport-notifications error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取通知失败' },
      { status: 500 }
    );
  }
}