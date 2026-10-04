import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { VehicleArchiveInput, VehicleArchiveRecord } from '@/lib/car-inventory/types';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const search = searchParams.get('search') ?? '';
    const vin = searchParams.get('vin') ?? '';
    const plateNumber = searchParams.get('plate_number') ?? '';
    const brand = searchParams.get('brand') ?? '';
    const fuelType = searchParams.get('fuel_type') ?? '';
    const status = searchParams.get('status') ?? '';
    const orgId = searchParams.get('organization_id') ?? '';

    let query = client
      .from('vehicle_archives')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orgId) query = query.eq('organization_id', orgId);
    if (status) query = query.eq('status', status);
    if (vin) query = query.eq('vin', vin);
    if (plateNumber) query = query.ilike('plate_number', `%${plateNumber}%`);
    if (brand) query = query.ilike('brand', `%${brand}%`);
    if (fuelType) query = query.eq('fuel_type', fuelType);

    if (search) {
      query = query.or(
        `vin.ilike.%${search}%,plate_number.ilike.%${search}%,custom_model_name.ilike.%${search}%,brand_model.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,model_remark.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ data: (data ?? []) as VehicleArchiveRecord[], total: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = (await request.json()) as VehicleArchiveInput;

    // 检查 VIN 是否重复
    if (body.vin) {
      const vinUpper = body.vin.toUpperCase();
      const orgId = body.organization_id ?? undefined;
      let dupQuery = client
        .from('vehicle_archives')
        .select('id, vin, brand_model, custom_model_name, plate_number')
        .eq('vin', vinUpper)
        .limit(1);
      if (orgId) dupQuery = dupQuery.eq('organization_id', orgId);
      const { data: existing } = await dupQuery;
      if (existing && existing.length > 0) {
        const dup = existing[0];
        return NextResponse.json({
          error: 'VIN 重复',
          code: 'DUPLICATE_VIN',
          existingVehicle: { id: dup.id, vin: dup.vin, brand_model: dup.brand_model, custom_model_name: dup.custom_model_name, plate_number: dup.plate_number },
        }, { status: 409 });
      }
    }

    const insertData = buildInsertPayload(user.id, body);

    const { data, error } = await client
      .from('vehicle_archives')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data: data as VehicleArchiveRecord }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildInsertPayload(userId: string, body: VehicleArchiveInput) {
  return {
    user_id: userId,
    organization_id: body.organization_id ?? null,
    vin: body.vin ?? null,
    plate_number: body.plate_number ?? null,
    vehicle_origin: body.vehicle_origin ?? null,
    vehicle_type: body.vehicle_type ?? null,
    owner_name: body.owner_name ?? null,
    owner_address: body.owner_address ?? null,
    usage_nature: body.usage_nature ?? null,
    brand: body.brand ?? null,
    model: body.model ?? null,
    brand_model: body.brand_model ?? null,
    model_remark: body.model_remark ?? null,
    engine_number: body.engine_number ?? null,
    engine_model: body.engine_model ?? null,
    displacement: body.displacement ?? null,
    power: body.power ?? null,
    fuel_type: body.fuel_type ?? null,
    emission_standard: body.emission_standard ?? null,
    color: body.color ?? null,
    manufacturer: body.manufacturer ?? null,
    registration_date: body.registration_date ?? null,
    issue_date: body.issue_date ?? null,
    gross_mass: body.gross_mass ?? null,
    curb_weight: body.curb_weight ?? null,
    seating_capacity: body.seating_capacity ?? null,
    dimensions: body.dimensions ?? null,
    is_new_energy: body.is_new_energy ?? false,
    acquisition_method: body.acquisition_method ?? null,
    steering_type: body.steering_type ?? null,
    axles: body.axles ?? null,
    wheelbase: body.wheelbase ?? null,
    tire_count: body.tire_count ?? null,
    rated_load: body.rated_load ?? null,
    towing_capacity: body.towing_capacity ?? null,
    cargo_dimensions: body.cargo_dimensions ?? null,
    transfer_records: body.transfer_records ?? null,
    mortgage_records: body.mortgage_records ?? null,
    registration_authority: body.registration_authority ?? null,
    id_number: body.id_number ?? null,
    driving_license_image_url: body.driving_license_image_url ?? null,
    registration_cert_image_url: body.registration_cert_image_url ?? null,
    custom_model_name: body.custom_model_name ?? null,
    tags: body.tags ?? [],
    notes: body.notes ?? null,
    custom_fields: body.custom_fields ?? {},
    source: body.source ?? 'manual',
    status: body.status ?? 'active',
  };
}