/**
 * POST /api/vehicle-inspection/save-temp-vehicle
 *
 * 保存临时车辆：将临时车辆转为正式车辆档案
 * - 对应需求 0004（先查询后保存）和 0006（按VIN统一车辆身份）
 */
import { NextRequest, NextResponse } from 'next/server';
import { saveTemporaryVehicle, checkVinDuplicate } from '@/lib/vehicle-inspection/report-order-service';
import type { SaveTemporaryVehiclePayload } from '@/lib/vehicle-inspection/report-orders';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const body = (await request.json()) as SaveTemporaryVehiclePayload;

    if (!body.vehicleId) {
      return NextResponse.json({ error: '车辆ID不能为空' }, { status: 400 });
    }

    const result = await saveTemporaryVehicle(token, body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');
    const orgId = searchParams.get('organization_id');

    if (!vin) {
      return NextResponse.json({ error: 'VIN码不能为空' }, { status: 400 });
    }

    const result = await checkVinDuplicate(token, vin, orgId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}