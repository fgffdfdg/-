/**
 * 出险报告异步查询的进程内状态存储。
 *
 * 碳数出险报告接口是异步模式：POST 仅返回 order_id，真正的报告数据通过 notify_url
 * 回调进来。由于回调与提交落在同一服务进程，这里用模块级 Map 暂存订单状态即可。
 * 若后续部署到多副本 / Serverless 多实例，应替换为 Redis / Supabase 表。
 */

export type InsuranceOrderStatus = "pending" | "done" | "error";

export interface InsuranceOrderRecord {
  orderId: string;
  vin?: string;
  status: InsuranceOrderStatus;
  /** 上游返回的原始报告数据 */
  payload?: unknown;
  errorMsg?: string;
  createdAt: number;
  updatedAt: number;
}

const globalForOrders = globalThis as unknown as {
  __insuranceOrders?: Map<string, InsuranceOrderRecord>;
};

const orders: Map<string, InsuranceOrderRecord> =
  globalForOrders.__insuranceOrders ?? new Map<string, InsuranceOrderRecord>();

if (!globalForOrders.__insuranceOrders) {
  globalForOrders.__insuranceOrders = orders;
}

// 订单保留 24 小时，避免内存无限增长
const TTL_MS = 24 * 60 * 60 * 1000;

function gc(): void {
  const now = Date.now();
  for (const [k, v] of orders) {
    if (now - v.updatedAt > TTL_MS) orders.delete(k);
  }
}

export function createOrder(orderId: string, vin?: string): InsuranceOrderRecord {
  gc();
  const rec: InsuranceOrderRecord = {
    orderId,
    vin,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  orders.set(orderId, rec);
  return rec;
}

export function getOrder(orderId: string): InsuranceOrderRecord | undefined {
  return orders.get(orderId);
}

export function completeOrder(orderId: string, payload: unknown): InsuranceOrderRecord | undefined {
  const rec = orders.get(orderId);
  if (!rec) return undefined;
  rec.status = "done";
  rec.payload = payload;
  rec.updatedAt = Date.now();
  return rec;
}

export function failOrder(orderId: string, msg: string): InsuranceOrderRecord | undefined {
  const rec = orders.get(orderId);
  if (!rec) return undefined;
  rec.status = "error";
  rec.errorMsg = msg;
  rec.updatedAt = Date.now();
  return rec;
}
