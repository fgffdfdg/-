import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin')?.trim().toUpperCase();

    if (!vin || vin.length !== 17) {
      return NextResponse.json({ error: 'VIN 格式不正确，需要17位车架号' }, { status: 400 });
    }

    const client = getSupabaseClient(token);

    // 1. 检索车辆档案
    const { data: vehicle, error: vehicleError } = await client
      .from('vehicle_archives')
      .select('*')
      .eq('vin', vin)
      .maybeSingle();

    if (vehicleError) {
      return NextResponse.json({ error: `车辆档案查询失败: ${vehicleError.message}` }, { status: 500 });
    }

    // 2. 检索装箱单中的毛重/净重
    let packingGrossWeight: number | null = null;
    let packingNetWeight: number | null = null;

    // 尝试用 JSONB contains 搜索装箱单
    const { data: packingDocs } = await client
      .from('saved_documents')
      .select('doc_data')
      .eq('doc_type', 'packing-list')
      .contains('doc_data', { vehicles: [{ vin }] });

    if (packingDocs?.length) {
      for (const doc of packingDocs) {
        const vehicles = (doc.doc_data as Record<string, unknown>)?.vehicles as Array<Record<string, unknown>> | undefined;
        if (vehicles) {
          for (const v of vehicles) {
            if (typeof v.vin === 'string' && v.vin.toUpperCase() === vin) {
              const gw = v.grossWeight || v.gw || v.grossWeightKg;
              const nw = v.netWeight || v.nw || v.netWeightKg;
              if (gw != null) packingGrossWeight = Number(gw);
              if (nw != null) packingNetWeight = Number(nw);
              break;
            }
          }
        }
        if (packingGrossWeight != null) break;
      }
    }

    // 3. 构建车辆描述（商品名称及规格型号）
    let goodsDescription = '';
    if (vehicle) {
      const parts: string[] = [];
      if (vehicle.brand) parts.push(vehicle.brand);
      if (vehicle.model) parts.push(vehicle.model);
      if (vehicle.displacement) parts.push(`${vehicle.displacement}L`);
      if (vehicle.power) parts.push(`功率${vehicle.power}kW`);
      if (vehicle.fuelType) {
        const fuelMap: Record<string, string> = {
          'electric': '电动',
          'petrol': '汽油',
          'diesel': '柴油',
          'hybrid': '混动',
          'phev': '插电混动',
          'bev': '纯电动',
          'hydrogen': '氢能',
        };
        parts.push(fuelMap[vehicle.fuelType] || vehicle.fuelType);
      }
      goodsDescription = parts.join(' | ');
    }

    return NextResponse.json({
      vehicle: vehicle
        ? {
            id: vehicle.id,
            vin: vehicle.vin,
            brand: vehicle.brand,
            model: vehicle.model,
            fuelType: vehicle.fuelType,
            power: vehicle.power,
            displacement: vehicle.displacement,
            grossMass: vehicle.grossMass ? Number(vehicle.grossMass) : null,
            curbWeight: vehicle.curbWeight ? Number(vehicle.curbWeight) : null,
          }
        : null,
      packing: {
        grossWeight: packingGrossWeight,
        netWeight: packingNetWeight,
      },
      goodsDescription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}