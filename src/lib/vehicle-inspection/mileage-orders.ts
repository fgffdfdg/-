/**
 * 里程报告订单内存存储
 * 开发单进程足够; 多实例部署可替换为 Redis 或 Supabase 表
 */

export type MileageOrderStatus = 'pending' | 'done' | 'error'

export interface MileageOrderRecord {
  orderId: string
  vin?: string
  status: MileageOrderStatus
  requestAt: number
  doneAt?: number
  // 上游回调原始 data
  rawData?: unknown
  errorMsg?: string
}

const store = new Map<string, MileageOrderRecord>()
const TTL_MS = 24 * 60 * 60 * 1000

export function saveMileageOrder(rec: MileageOrderRecord): void {
  store.set(rec.orderId, rec)
}

export function createOrder(orderId: string, vin?: string): void {
  saveMileageOrder({
    orderId,
    vin,
    status: 'pending',
    requestAt: Date.now(),
  })
}

export function getMileageOrder(orderId: string): MileageOrderRecord | undefined {
  const rec = store.get(orderId)
  if (rec && Date.now() - rec.requestAt > TTL_MS) {
    store.delete(orderId)
    return undefined
  }
  return rec
}

export function completeMileageOrder(
  orderId: string,
  data: unknown
): MileageOrderRecord | undefined {
  const rec = store.get(orderId)
  if (!rec) return undefined
  rec.status = 'done'
  rec.doneAt = Date.now()
  rec.rawData = data
  return rec
}

export function failMileageOrder(
  orderId: string,
  msg: string
): MileageOrderRecord | undefined {
  const rec = store.get(orderId)
  if (!rec) return undefined
  rec.status = 'error'
  rec.doneAt = Date.now()
  rec.errorMsg = msg
  return rec
}
