// ============ 运输跟踪 - 归档/恢复 ============

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDemoRecords } from '@/lib/tracking/data-service';

/** POST /api/transport-records/[id]/archive - 归档运输记录 */
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
      record.is_archived = true;
      return NextResponse.json({ success: true, message: '已归档' });
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('transport_records')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: '已归档' });
  } catch (error: unknown) {
    console.error('POST /api/transport-records/[id]/archive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '归档失败' },
      { status: 500 }
    );
  }
}