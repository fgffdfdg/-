import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ExportPendingTransferRecord, CreateExportPendingTransferInput } from '@/lib/export-pending-transfer/types';

// GET /api/export-pending-transfer - 列表查询
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const status = searchParams.get('status') ?? '';
    const search = searchParams.get('search') ?? '';
    const orgId = searchParams.get('organization_id') ?? '';

    let query = client
      .from('export_pending_transfers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orgId) query = query.eq('organization_id', orgId);
    if (status) query = query.eq('status', status);

    // 搜索：需要通过 vehicle_archives 的 VIN/车牌/车型来搜索
    // 先获取匹配的 vehicle_archive_ids
    if (search) {
      const { data: vehicles } = await client
        .from('vehicle_archives')
        .select('id')
        .or(`vin.ilike.%${search}%,plate_number.ilike.%${search}%,custom_model_name.ilike.%${search}%,brand_model.ilike.%${search}%,model_remark.ilike.%${search}%`)
        .limit(100);

      if (vehicles && vehicles.length > 0) {
        const vehicleIds = vehicles.map((v: { id: string }) => v.id);
        query = query.in('vehicle_archive_id', vehicleIds);
      } else {
        // 没有匹配的车辆，返回空列表
        return NextResponse.json({ items: [], total: 0, page: Math.floor(offset / limit) + 1, limit });
      }
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    const records = (data ?? []) as ExportPendingTransferRecord[];

    // 获取关联的车辆摘要信息
    const vehicleIds = records.map((r) => r.vehicle_archive_id);
    let vehicleMap: Record<string, unknown> = {};
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await client
        .from('vehicle_archives')
        .select('id, vin, plate_number, brand_model, custom_model_name, model_remark, brand, model, color, fuel_type, registration_date')
        .in('id', vehicleIds);

      if (vehicles) {
        for (const v of vehicles) {
          vehicleMap[v.id] = v;
        }
      }
    }

    const items = records.map((r) => ({
      id: r.id,
      userId: r.user_id,
      organizationId: r.organization_id,
      vehicleArchiveId: r.vehicle_archive_id,
      status: r.status,
      greenBookKeys: r.green_book_keys ?? [],
      drivingLicenseKeys: r.driving_license_keys ?? [],
      invoiceKeys: r.invoice_keys ?? [],
      tempPlateKeys: r.temp_plate_keys ?? [],
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      vehicle: vehicleMap[r.vehicle_archive_id] ?? null,
    }));

    return NextResponse.json({
      items,
      total: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/export-pending-transfer - 创建记录
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = (await request.json()) as CreateExportPendingTransferInput;

    if (!body.vehicleArchiveId) {
      return NextResponse.json({ error: '请选择车辆' }, { status: 400 });
    }

    // 检查是否已有该车辆的在途记录
    const { data: existing } = await client
      .from('export_pending_transfers')
      .select('id')
      .eq('vehicle_archive_id', body.vehicleArchiveId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该车辆已存在出口待转移记录' }, { status: 409 });
    }

    const insertData = {
      user_id: user.id,
      vehicle_archive_id: body.vehicleArchiveId,
      status: 'pending',
      green_book_keys: [],
      driving_license_keys: [],
      invoice_keys: [],
      temp_plate_keys: [],
      notes: body.notes ?? null,
    };

    const { data, error } = await client
      .from('export_pending_transfers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    const record = data as ExportPendingTransferRecord;

    return NextResponse.json({
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      vehicleArchiveId: record.vehicle_archive_id,
      status: record.status,
      greenBookKeys: record.green_book_keys ?? [],
      drivingLicenseKeys: record.driving_license_keys ?? [],
      invoiceKeys: record.invoice_keys ?? [],
      tempPlateKeys: record.temp_plate_keys ?? [],
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}