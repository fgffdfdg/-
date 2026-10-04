import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/car-inventory/search
 * 轻量级车辆检索，供其他模块（形式发票、准入声明等）调用
 * 返回精简字段：id, vin, plate_number, brand_model, custom_model_name
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20);
    const orgId = searchParams.get('organization_id') ?? '';

    let query = client
      .from('vehicle_archives')
      .select('id, vin, plate_number, brand_model, custom_model_name, model_remark, brand, model, color, fuel_type, registration_date, notes')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (orgId) query = query.eq('organization_id', orgId);

    if (q) {
      query = query.or(
        `vin.ilike.%${q}%,plate_number.ilike.%${q}%,custom_model_name.ilike.%${q}%,brand_model.ilike.%${q}%,model_remark.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(`检索失败: ${error.message}`);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}