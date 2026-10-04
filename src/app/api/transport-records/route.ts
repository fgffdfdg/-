// ============ 运输跟踪 - 运输记录列表 & 创建 ============

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { queryTransport, detectInputType } from '@/lib/tracking/data-service';
import type { TransportRecord } from '@/lib/tracking/types';

/** GET /api/transport-records - 获取运输清单 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 从 cookie/session 获取 user 和 organization
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const blNumber = searchParams.get('bl_number') || '';
    const carrierTracking = searchParams.get('carrier_tracking') || '';
    const vin = searchParams.get('vin') || '';
    const destPort = searchParams.get('dest_port') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // 如果有Demo演示数据需求，返回演示数据
    const demo = searchParams.get('demo');
    if (demo === 'true') {
      const { getDemoRecords } = await import('@/lib/tracking/data-service');
      const records = getDemoRecords();
      const statuses = status ? status.split(',') : [];
      let filtered = records;
      if (statuses.length > 0) {
        filtered = records.filter((r) => statuses.includes(r.status));
      }
      if (blNumber) {
        filtered = filtered.filter((r) =>
          r.bl_number?.toLowerCase().includes(blNumber.toLowerCase())
        );
      }
      if (vin) {
        filtered = filtered.filter((r) =>
          r.vehicles?.some((v) => v.vin.toUpperCase().includes(vin.toUpperCase()))
        );
      }
      return NextResponse.json({
        data: filtered,
        count: filtered.length,
        page,
        page_size: pageSize,
        is_demo: true,
      });
    }

    let query = client
      .from('transport_records')
      .select('*', { count: 'exact' })
      .eq('is_archived', false);

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }
    if (blNumber) {
      query = query.ilike('bl_number', `%${blNumber}%`);
    }
    if (carrierTracking) {
      query = query.ilike('carrier_tracking_number', `%${carrierTracking}%`);
    }
    if (destPort) {
      query = query.or(
        `dest_port_name.ilike.%${destPort}%,dest_port_code.ilike.%${destPort}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('eta', { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: (data as TransportRecord[]) || [],
      count: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error: unknown) {
    console.error('GET /api/transport-records error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取运输清单失败' },
      { status: 500 }
    );
  }
}

/** POST /api/transport-records - 创建运输记录（加入运输清单） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { bl_number, carrier_tracking_number, organization_id, user_id } = body;

    if (!bl_number && !carrier_tracking_number) {
      return NextResponse.json(
        { error: '请提供提单号或承运商跟踪号' },
        { status: 400 }
      );
    }

    // 查重
    const { data: existing } = await client
      .from('transport_records')
      .select('id, bl_number, carrier_tracking_number')
      .eq('is_archived', false);

    if (existing) {
      const dup = existing.find(
        (r: { bl_number?: string; carrier_tracking_number?: string }) =>
          (bl_number && r.bl_number === bl_number) ||
          (carrier_tracking_number && r.carrier_tracking_number === carrier_tracking_number)
      );
      if (dup) {
        return NextResponse.json(
          { error: '该运输记录已存在', duplicate_id: (dup as { id: string }).id },
          { status: 409 }
        );
      }
    }

    // 生成运输记录编号
    const { count } = await client
      .from('transport_records')
      .select('*', { count: 'exact', head: true });
    const trackingNumber = `TR${String((count || 0) + 1).padStart(6, '0')}`;

    const { data, error } = await client
      .from('transport_records')
      .insert({
        ...body,
        tracking_number: trackingNumber,
        status: body.status || 'pending_shipment',
        is_archived: false,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/transport-records error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建运输记录失败' },
      { status: 500 }
    );
  }
}