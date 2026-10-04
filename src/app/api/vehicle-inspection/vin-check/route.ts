/**
 * GET /api/vehicle-inspection/vin-check
 *
 * VIN查重：检查VIN是否已存在活跃车辆
 * - 对应需求 0006（按VIN统一车辆身份并复用报告）
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkVinDuplicate } from '@/lib/vehicle-inspection/report-order-service';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');
    const orgId = searchParams.get('organization_id');

    if (!vin || vin.trim().length === 0) {
      return NextResponse.json({ error: 'VIN码不能为空' }, { status: 400 });
    }

    const result = await checkVinDuplicate(token, vin.trim(), orgId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}