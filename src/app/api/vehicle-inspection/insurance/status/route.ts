import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/vehicle-inspection/insurance-orders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "缺少 order_id" }, { status: 400 });
  }

  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json(
      { error: "订单不存在或已过期（服务重启后会清空）" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    order_id: order.orderId,
    vin: order.vin,
    status: order.status,
    error_msg: order.errorMsg,
    data: order.status === "done" ? order.payload : null,
    updated_at: order.updatedAt,
  });
}
