import { NextRequest, NextResponse } from "next/server";
import { completeOrder, createOrder, failOrder, getOrder } from "@/lib/vehicle-inspection/insurance-orders";

/**
 * 碳数出险报告回调入口（notify_url）。
 *
 * 文档未给出明确回调字段，按行业惯例做最大兼容：
 *   - 优先取 data.order_id / order_id / orderId
 *   - 整包 payload 原样落库（内存），由前端拉取后再渲染
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const root = (raw ?? {}) as Record<string, unknown>;
  const data = (root.data as Record<string, unknown> | undefined) ?? root;

  const orderId =
    (data.order_id as string | undefined) ||
    (root.order_id as string | undefined) ||
    (data.orderId as string | undefined) ||
    (root.orderId as string | undefined);

  if (!orderId) {
    return NextResponse.json({ error: "missing order_id" }, { status: 400 });
  }

  const code = (root.code as number | undefined) ?? 1;
  const msg = (root.msg as string | undefined) ?? "";

  if (code !== 1) {
    failOrder(orderId, msg || `上游回调错误码 ${code}`);
  } else {
    // 若订单未登记（如服务重启后），先补建
    if (!getOrder(orderId)) {
      createOrder(orderId, (data.vin as string | undefined) ?? (root.vin as string | undefined));
    }
    completeOrder(orderId, data);
  }

  // 碳数要求返回成功标识
  return NextResponse.json({ code: 1, msg: "ok" });
}
