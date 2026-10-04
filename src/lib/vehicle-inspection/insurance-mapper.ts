import { InsuranceClaimRecord, InsuranceReport } from "./types";

/**
 * 将碳数 car_insurance_v4 回调数据映射为前端通用的 InsuranceReport 结构。
 *
 * 由于文档未给出回调 data 的字段明细，这里做最大兼容：
 *   - 优先识别常见结构：list/records/insurance_list/claim_list/result
 *   - 单项字段：date/claim_date, type/accident_type/reason, amount/money/claim_amount,
 *     damage/damage_part/desc, location/address, status/state
 *   - 汇总字段：count/claim_count/total_count, total_amount/claim_amount_sum
 *
 * 如果实际字段与此不一致，只需调整本文件，其他模块无需改动。
 */
function toStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function pick<T extends string>(raw: unknown, keys: string[], valid?: readonly T[]): T | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  for (const k of keys) {
    const v = toStr(r[k]);
    if (v) {
      if (valid && !(valid as readonly string[]).includes(v)) continue;
      return v as T;
    }
  }
  return undefined;
}

function findRecordsArray(data: Record<string, unknown>): unknown[] | undefined {
  const candidates = [
    "list",
    "records",
    "insurance_list",
    "claim_list",
    "claims",
    "accident_list",
    "result",
    "items",
    "data",
  ];
  for (const k of candidates) {
    const v = data[k];
    if (Array.isArray(v)) return v;
  }
  // 深层 data.list 也常见
  const inner = data.data;
  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>;
    for (const k of candidates) {
      const v = obj[k];
      if (Array.isArray(v)) return v;
    }
  }
  return undefined;
}

function mapRecord(raw: unknown): InsuranceClaimRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const date = pick(r, ["date", "claim_date", "accident_date", "report_date", "start_date"]);
  const type = pick(r, ["type", "accident_type", "reason", "case_type", "insurance_type"]) || "保险理赔";
  const amount = toNum(r.amount ?? r.claim_amount ?? r.money ?? r.pay_amount ?? r.compensation);
  const damage = pick(r, ["damage", "damage_part", "description", "desc", "case_describe", "content"]) || "—";
  const location = pick(r, ["location", "address", "place", "city"]);
  const statusRaw = pick(r, ["status", "state", "case_status"]);
  const status: InsuranceClaimRecord["status"] =
    statusRaw === "处理中" || statusRaw === "未结案" || statusRaw === "pending"
      ? "处理中"
      : "已结案";

  if (!date && amount === undefined) return null;

  return {
    date: date || "—",
    type,
    amount: amount ?? 0,
    damage,
    location,
    status,
  };
}

export function mapInsurancePayload(payload: unknown): InsuranceReport {
  const data = (payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}) as Record<string, unknown>;
  const innerData = (data.data && typeof data.data === "object" ? data.data : data) as Record<string, unknown>;

  const rawRecords = findRecordsArray(data) ?? findRecordsArray(innerData);
  const records: InsuranceClaimRecord[] = (rawRecords ?? [])
    .map(mapRecord)
    .filter((x): x is InsuranceClaimRecord => x !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const countFromSummary =
    toNum(data.claim_count ?? data.count ?? data.total_count ?? innerData.claim_count ?? innerData.count) ??
    records.length;

  const totalFromSummary =
    toNum(
      data.total_amount ??
        data.claim_amount_sum ??
        data.claim_total_amount ??
        innerData.total_amount ??
        innerData.claim_amount_sum
    );
  const totalAmount =
    totalFromSummary ??
    Math.round(records.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  const hasMajorAccident =
    toNum(data.has_major_accident ?? data.major_accident ?? innerData.has_major_accident) === 1 ||
    records.some((r) => r.amount > 20000);

  return {
    claimCount: countFromSummary,
    totalAmount,
    lastClaimDate: records[0]?.date,
    hasMajorAccident,
    records,
  };
}
