// ============ 运输跟踪 - 运输记录详情/更新/归档 ============

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDemoRecords } from '@/lib/tracking/data-service';
import type { TransportRecord } from '@/lib/tracking/types';

/** GET /api/transport-records/[id] - 获取运输详情 */
export async function GET(
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
      return NextResponse.json({ data: record });
    }

    const client = getSupabaseClient();
    const { data: record, error } = await client
      .from('transport_records')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const r = record as TransportRecord;

    // 并行加载关联数据
    const [containers, vehicles, legs, notifications, overrides] = await Promise.all([
      client.from('transport_containers').select('*').eq('record_id', id).order('created_at'),
      client.from('transport_vehicles').select('*').eq('record_id', id).order('created_at'),
      client.from('transport_legs').select('*').eq('record_id', id).order('sequence'),
      client.from('transport_notifications').select('*').eq('record_id', id).order('created_at', { ascending: false }),
      client.from('transport_manual_overrides').select('*').eq('record_id', id),
    ]);

    r.containers = (containers.data || []) as TransportRecord['containers'];
    r.vehicles = (vehicles.data || []) as TransportRecord['vehicles'];
    r.legs = (legs.data || []) as TransportRecord['legs'];
    r.notifications = (notifications.data || []) as TransportRecord['notifications'];
    r.manual_overrides = (overrides.data || []) as TransportRecord['manual_overrides'];

    return NextResponse.json({ data: r });
  } catch (error: unknown) {
    console.error('GET /api/transport-records/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取运输详情失败' },
      { status: 500 }
    );
  }
}

/** PUT /api/transport-records/[id] - 更新运输记录 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('transport_records')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('PUT /api/transport-records/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新运输记录失败' },
      { status: 500 }
    );
  }
}

/** DELETE /api/transport-records/[id] - 永久删除（仅管理员） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('transport_records')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/transport-records/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除运输记录失败' },
      { status: 500 }
    );
  }
}