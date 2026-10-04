import { NextRequest, NextResponse } from 'next/server';
import { getAuthedClient, AuthError, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const { client } = await getAuthedClient(request);

    // 从 vehicle_archives 搜索 VIN
    let dbQuery = client
      .from('vehicle_archives')
      .select('id, vin, brand, model, manufacture_year')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (query.trim().length >= 3) {
      dbQuery = dbQuery.ilike('vin', `%${query.trim()}%`);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    const vehicles = (data || []).map((v: any) => ({
      id: v.id,
      vin: v.vin,
      make: v.brand,
      model: v.model,
      year: v.manufacture_year,
    }));

    return NextResponse.json({ data: vehicles });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return toErrorResponse(error);
    }
    console.error('[vehicles] search error:', error);
    return NextResponse.json({ error: error.message || '搜索失败' }, { status: 500 });
  }
}