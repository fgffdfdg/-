import { NextRequest, NextResponse } from "next/server";
import { getMileageOrder } from "@/lib/vehicle-inspection/mileage-orders";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order_id')
  if (!orderId) {
    return NextResponse.json({ error: '缺少 order_id 参数' }, { status: 400 })
  }
  const rec = getMileageOrder(orderId)
  if (!rec) {
    return NextResponse.json(
      { error: '订单不存在或已过期（服务重启后会清空）' },
      { status: 404 }
    )
  }
  return NextResponse.json({
    order_id: rec.orderId,
    vin: rec.vin,
    status: rec.status,
    request_at: rec.requestAt,
    done_at: rec.doneAt,
    data: rec.status === 'done' ? rec.rawData : undefined,
    error: rec.status === 'error' ? rec.errorMsg : undefined,
  })
}
