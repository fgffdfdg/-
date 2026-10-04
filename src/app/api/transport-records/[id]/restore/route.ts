// ============ 运输跟踪 - 恢复已归档记录 ============

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDemoRecords } from '@/lib/tracking/data-service';

/** POST /api/transport-records/[id]/restore - 恢复已归档的运输记录 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 演示数据
    if (id.startsWith('demo-')) {
      const records = getDemoRecords();
      const record = records.find((r) => r.id === id);
      if (!record) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }
      record.is_archived = false;
      return NextResponse.json({ success: true, message: '已恢复跟踪' });
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('transport_records')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: '已恢复跟踪' });
  } catch (error: unknown) {
    console.error('POST /api/transport-records/[id]/restore error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '恢复失败' },
      { status: 500 }
    );
  }
}