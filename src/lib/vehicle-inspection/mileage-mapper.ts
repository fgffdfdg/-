import type { MileageCheckpoint, MileageReport } from './types'

/**
 * 将碳数里程接口 (car_mileage_v1) 回调返回的 data 映射为前端 MileageReport。
 * 由于上游字段名可能变化，这里做最大兼容性的容错：
 *  - 优先识别 mileage_list / list / records / checkpoints / history 等数组
 *  - 每条记录兼容 date/time/record_date, mileage/mile/miles, source/source_type/channel
 *  - 支持汇总字段 total_mileage / current_mileage / last_mileage / annual_avg
 */

type MileageRow = Record<string, unknown>

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    // 去掉 "km"/","/"约" 等非数字
    const cleaned = v.replace(/[^0-9.\-]/g, '')
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function pickFirst(obj: MileageRow, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}

function normalizeDate(v: unknown): string {
  const s = asString(v)
  if (!s) return ''
  // 2024/1/2, 2024年1月2日, 2024-01-02 10:00:00 等
  const m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (m) {
    const [, y, mo, d] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s.slice(0, 10)
}

function findRows(data: unknown): MileageRow[] {
  if (!data || typeof data !== 'object') return []
  const d = data as MileageRow

  // data 本身就是数组
  if (Array.isArray(d)) return d.filter((x): x is MileageRow => !!x && typeof x === 'object')

  // 常见字段名
  const candidates = [
    'mileage_list',
    'list',
    'records',
    'checkpoints',
    'history',
    'mileage_history',
    'mileage_records',
    'maintain_list',
    'maintenance_list',
  ]
  for (const key of candidates) {
    const v = d[key]
    if (Array.isArray(v)) return v.filter((x): x is MileageRow => !!x && typeof x === 'object')
  }

  // 如果 data 里只有一个对象字段且是数组, 取第一个
  for (const v of Object.values(d)) {
    if (Array.isArray(v)) return v.filter((x): x is MileageRow => !!x && typeof x === 'object')
  }
  return []
}

function mapRow(row: MileageRow): MileageCheckpoint | null {
  const date = normalizeDate(pickFirst(row, ['date', 'time', 'record_date', 'mileage_date', 'create_time', 'created_at', 'happen_date', 'happen_time']))
  const mileage = asNumber(pickFirst(row, ['mileage', 'mile', 'miles', 'km', 'odometer', 'mileage_num', 'reading']))
  const source = asString(pickFirst(row, ['source', 'source_type', 'channel', 'type', 'record_type', 'remark', 'note']))

  if (!date && mileage === undefined) return null
  return {
    date: date || '-',
    mileage: mileage ?? 0,
    source: source || '未知来源',
  }
}

function inferRiskLevel(points: MileageCheckpoint[]): { tamperRisk: boolean; riskLevel: 'low' | 'medium' | 'high' } {
  if (points.length < 2) return { tamperRisk: false, riskLevel: 'low' }

  let drops = 0
  let maxDrop = 0
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].mileage - points[i - 1].mileage
    if (diff < 0) {
      drops++
      maxDrop = Math.max(maxDrop, -diff)
    }
  }

  if (drops === 0) return { tamperRisk: false, riskLevel: 'low' }
  if (drops === 1 && maxDrop < 1000) return { tamperRisk: true, riskLevel: 'medium' }
  return { tamperRisk: true, riskLevel: 'high' }
}

export function mapMileageResponse(
  data: unknown,
  fallbackVin?: string
): { report: MileageReport; vin?: string } {
  const d = (data && typeof data === 'object' ? (data as MileageRow) : {}) as MileageRow
  const vin = asString(pickFirst(d, ['vin', 'chassis_no', 'frame_no'])) || fallbackVin

  const rawRows = findRows(d)
  let checkpoints = rawRows.map(mapRow).filter((x): x is MileageCheckpoint => x !== null)

  // 按日期升序
  checkpoints.sort((a, b) => {
    if (a.date === b.date) return a.mileage - b.mileage
    return a.date < b.date ? -1 : 1
  })

  const currentMileage =
    asNumber(pickFirst(d, ['current_mileage', 'total_mileage', 'last_mileage', 'mileage', 'odometer'])) ??
    (checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].mileage : 0)

  const lastRecordDate =
    asString(pickFirst(d, ['last_record_date', 'last_time', 'latest_date'])) ||
    (checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].date : '')

  const firstDate = checkpoints.length > 0 ? checkpoints[0].date : ''
  let annualAverage = asNumber(pickFirst(d, ['annual_avg', 'annual_mileage', 'avg_mileage', 'average_mileage']))
  if (annualAverage === undefined && firstDate && lastRecordDate && checkpoints.length > 1) {
    const years =
      (new Date(lastRecordDate).getTime() - new Date(firstDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
    const span =
      checkpoints[checkpoints.length - 1].mileage - checkpoints[0].mileage
    if (years > 0.1 && span > 0) annualAverage = Math.round(span / years)
  }
  if (annualAverage === undefined) annualAverage = 0

  const risk = inferRiskLevel(checkpoints)

  // 空数据兜底
  if (checkpoints.length === 0 && currentMileage === 0) {
    return {
      vin,
      report: {
        currentMileage: 0,
        annualAverage: 0,
        tamperRisk: false,
        riskLevel: 'low',
        lastRecordDate: lastRecordDate || '',
        checkpoints: [],
      },
    }
  }

  return {
    vin,
    report: {
      currentMileage,
      annualAverage,
      tamperRisk: risk.tamperRisk,
      riskLevel: risk.riskLevel,
      lastRecordDate,
      checkpoints,
    },
  }
}
