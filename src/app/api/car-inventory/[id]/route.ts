import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { VehicleArchiveRecord } from '@/lib/car-inventory/types';

const ALLOWED_UPDATE_FIELDS: string[] = [
  'vin', 'plate_number', 'vehicle_origin', 'vehicle_type', 'owner_name', 'owner_address',
  'usage_nature', 'brand', 'model', 'brand_model', 'model_remark', 'engine_number',
  'engine_model', 'displacement', 'power', 'fuel_type', 'emission_standard',
  'color', 'manufacturer', 'registration_date', 'issue_date', 'gross_mass',
  'curb_weight', 'seating_capacity', 'dimensions', 'is_new_energy',
  'acquisition_method', 'steering_type', 'axles', 'wheelbase', 'tire_count',
  'rated_load', 'towing_capacity', 'cargo_dimensions', 'transfer_records',
  'mortgage_records', 'registration_authority', 'id_number',
  'driving_license_image_url', 'registration_cert_image_url',
  'custom_model_name', 'tags', 'notes', 'custom_fields', 'status',
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = _request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { data, error } = await client
      .from('vehicle_archives')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '车辆档案不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: data as VehicleArchiveRecord });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // 检查 VIN 是否重复（排除自身）
    if (body.vin) {
      const vinUpper = String(body.vin).toUpperCase();
      const orgId = body.organization_id ?? undefined;
      let dupQuery = client
        .from('vehicle_archives')
        .select('id, vin, brand_model, custom_model_name, plate_number')
        .eq('vin', vinUpper)
        .neq('id', id)
        .limit(1);
      if (orgId) dupQuery = dupQuery.eq('organization_id', orgId);
      const { data: existing } = await dupQuery;
      if (existing && existing.length > 0) {
        const dup = existing[0];
        return NextResponse.json({
          error: 'VIN 重复，已有相同车架号的车辆档案',
          code: 'DUPLICATE_VIN',
          existingVehicle: { id: dup.id, vin: dup.vin, brand_model: dup.brand_model, custom_model_name: dup.custom_model_name, plate_number: dup.plate_number },
        }, { status: 409 });
      }
    }

    const { data, error } = await client
      .from('vehicle_archives')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '车辆档案不存在或无权修改' }, { status: 404 });
    }

    return NextResponse.json({ data: data as VehicleArchiveRecord });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // 硬删除：彻底删除记录
      const { error } = await client
        .from('vehicle_archives')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`删除失败: ${error.message}`);
      return NextResponse.json({ success: true, data: { id, deleted: true } });
    }

    // 软删除：标记为 archived
    const { data, error } = await client
      .from('vehicle_archives')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`归档失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '车辆档案不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}