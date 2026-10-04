import { NextRequest, NextResponse } from "next/server";
import { completeMileageOrder, failMileageOrder } from "@/lib/vehicle-inspection/mileage-orders";

interface CallbackPayload {
  order_id?: string
  code?: number
  msg?: string
  data?: unknown
}

export async function POST(request: NextRequest) {
  let payload: CallbackPayload
  try {
    payload = (await request.json()) as CallbackPayload
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const orderId = payload.order_id
  if (!orderId) {
    return NextResponse.json({ error: 'missing order_id' }, { status: 400 })
  }

  // 碳数回调: code===1 成功, data 中携带结果; 其他为失败
  if (payload.code === 1) {
    completeMileageOrder(orderId, payload.data)
  } else {
    failMileageOrder(orderId, payload.msg || `上游错误 ${payload.code ?? ''}`)
  }

  return NextResponse.json({ code: 1, msg: 'ok' })
}
