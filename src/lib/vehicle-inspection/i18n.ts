// 车况检测报告 — 中英双语标签 / 枚举翻译
// 所有展示层共享；未在字典中的值原样返回，保证数据安全。

import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

export interface BiPair {
  zh: string;
  en: string;
}

/** 字段/表头标签：中文为主，英文辅助 */
export const L = {
  // 通用
  reportNo: { zh: "报告编号", en: "Report No." },
  generatedAt: { zh: "生成时间", en: "Generated At" },
  dataSource: { zh: "数据来源", en: "Data Source" },
  vin: { zh: "车架号 VIN", en: "VIN" },
  plateNumber: { zh: "车牌号", en: "License Plate" },
  brandModel: { zh: "品牌车型", en: "Make / Model" },
  exportDrive: { zh: "ExportDrive 车况检测", en: "ExportDrive Vehicle Inspection" },
  serviceSubtitle: { zh: "二手车出口车况检测服务", en: "Used-Car Export Inspection Service" },

  // 报告标题
  titleInsurance: { zh: "车辆出险记录报告", en: "Vehicle Insurance Claim Report" },
  titleMileage: { zh: "车辆里程历史报告", en: "Vehicle Mileage History Report" },
  titleBattery: { zh: "动力电池健康度报告", en: "Traction Battery Health Report" },

  // 出险
  claimCount: { zh: "出险次数", en: "Claim Count" },
  totalPayout: { zh: "累计赔付", en: "Total Payout" },
  lastClaim: { zh: "最近出险", en: "Latest Claim" },
  majorAccident: { zh: "重大事故", en: "Major Accident" },
  payout: { zh: "赔付金额", en: "Claim Amount" },
  damagePart: { zh: "损伤部位", en: "Damaged Parts" },
  claimDate: { zh: "出险日期", en: "Claim Date" },
  accidentType: { zh: "事故类型", en: "Accident Type" },
  claimLocation: { zh: "出险地点", en: "Location" },
  status: { zh: "状态", en: "Status" },
  claimDetails: { zh: "理赔明细", en: "Claim Details" },
  noClaimRecords: { zh: "未查询到出险理赔记录。", en: "No insurance claim records found." },
  yes: { zh: "存在", en: "Yes" },
  no: { zh: "无", en: "None" },

  // 里程
  currentMileage: { zh: "当前里程", en: "Current Mileage" },
  annualAvg: { zh: "年均里程", en: "Annual Average" },
  latestRecord: { zh: "最近记录", en: "Latest Record" },
  tamperRisk: { zh: "调表风险", en: "Odometer Rollback Risk" },
  mileageCheckpoints: { zh: "里程节点", en: "Mileage Records" },
  recordDate: { zh: "记录日期", en: "Record Date" },
  mileageReading: { zh: "里程读数 (km)", en: "Reading (km)" },
  dataSourceField: { zh: "数据来源", en: "Source" },
  remark: { zh: "备注", en: "Remark" },
  riskLow: { zh: "低", en: "Low" },
  riskMedium: { zh: "中", en: "Medium" },
  riskHigh: { zh: "高", en: "High" },
  suspectedRollback: { zh: "⚠ 读数低于上一次记录，疑似调表", en: "⚠ Reading lower than previous record, suspected rollback" },
  rollbackDetected: { zh: "检测到里程异常回退，存在调表嫌疑，建议结合实车 OBD 与 4S 记录交叉验证。", en: "Abnormal mileage regression detected. Cross-check with on-board OBD and dealer service records recommended." },
  noRollback: { zh: "里程读数单调递增，未发现明显调表异常。", en: "Mileage increases monotonically; no obvious rollback detected." },

  // 电池
  soh: { zh: "SOH 健康度", en: "State of Health" },
  overallGrade: { zh: "综合评级", en: "Overall Grade" },
  batteryType: { zh: "电池类型", en: "Battery Type" },
  engineType: { zh: "动力类型", en: "Powertrain" },
  fullEndurance: { zh: "满电续航", en: "Full-Charge Range" },
  nominalEndurance: { zh: "标称续航", en: "Nominal Range" },
  currentCapacity: { zh: "当前容量", en: "Current Capacity" },
  nominalEnergy: { zh: "标称能量", en: "Nominal Energy" },
  totalMileage: { zh: "表显里程", en: "Displayed Mileage" },
  mileageDate: { zh: "里程更新", en: "Mileage Updated" },
  degradationRate: { zh: "衰减速率", en: "Degradation Rate" },
  batteryValuation: { zh: "电池估值", en: "Battery Valuation" },
  consistencyScores: { zh: "电池一致性得分", en: "Battery Consistency Scores" },
  healthScore: { zh: "健康得分", en: "Health Score" },
  capacityScore: { zh: "容量得分", en: "Capacity Score" },
  tempConsistency: { zh: "温度一致性", en: "Temperature Consistency" },
  voltageConsistency: { zh: "电压一致性", en: "Voltage Consistency" },
  irConsistency: { zh: "内阻一致性", en: "Internal Resistance Consistency" },
  selfDischarge: { zh: "自放电率", en: "Self-Discharge Rate" },
  keyCellMetrics: { zh: "关键电芯指标", en: "Key Cell Metrics" },
  score: { zh: "得分", en: "Score" },
  annualInspection: { zh: "动力电池年检", en: "Annual Battery Inspection" },
  inspectionItem: { zh: "检测项", en: "Inspection Item" },
  standard: { zh: "标准", en: "Standard" },
  measured: { zh: "实测", en: "Measured" },
  conclusion: { zh: "结论", en: "Result" },
  consistencyCompare: { zh: "电池一致性对比", en: "Consistency Benchmark" },
  vehicleValue: { zh: "本车", en: "This Vehicle" },
  peerAverage: { zh: "同型均值", en: "Peer Average" },
  evaluation: { zh: "评价", en: "Evaluation" },
  chargingHabits: { zh: "充电与使用习惯", en: "Charging & Usage Habits" },
  avgStartSoc: { zh: "平均起始 SOC", en: "Avg Start SOC" },
  avgEndSoc: { zh: "平均终止 SOC", en: "Avg End SOC" },
  depthOfCharge: { zh: "充电深度", en: "Depth of Charge" },
  fastChargeRate: { zh: "近一年快充占比", en: "Fast-Charging Share (1Y)" },
  batteryBasicInfo: { zh: "电池基本信息", en: "Battery Basic Information" },
  manufacturer: { zh: "生产企业", en: "Manufacturer" },
  batteryModel: { zh: "电池型号", en: "Battery Model" },
  warranty: { zh: "质保", en: "Warranty" },
  powerChange: { zh: "是否换电", en: "Battery Swap" },
  fuelConsumption: { zh: "百公里耗电", en: "Consumption / 100km" },
  energyDensity: { zh: "能量密度", en: "Energy Density" },
  batteryWeight: { zh: "电池总质量", en: "Battery Weight" },
  checkDate: { zh: "检测日期", en: "Inspection Date" },
  alarm90d: { zh: "近 90 天电池报警", en: "Battery Alarms (Last 90 Days)" },
  alarmLevel1: { zh: "一级", en: "Level 1" },
  alarmLevel2: { zh: "二级", en: "Level 2" },
  alarmLevel3: { zh: "三级", en: "Level 3" },
  professionalAdvice: { zh: "专业建议", en: "Professional Advice" },
} as const satisfies Record<string, BiPair>;

export type LabelKey = keyof typeof L;

/** 已知枚举值的双语映射，未命中时原样输出 */
const ENUM_DICT: Record<string, BiPair> = {
  // 风险等级
  "低": { zh: "低", en: "Low" },
  "中": { zh: "中", en: "Medium" },
  "高": { zh: "高", en: "High" },
  // 通用是/否
  "存在": { zh: "存在", en: "Yes" },
  "无": { zh: "无", en: "None / No" },
  "否": { zh: "否", en: "No" },
  "是": { zh: "是", en: "Yes" },
  // 电池评级（中文映射 + S/A/B/C/D 原样）
  "优秀": { zh: "优秀", en: "Excellent" },
  "良好": { zh: "良好", en: "Good" },
  "一般": { zh: "一般", en: "Average" },
  "较差": { zh: "较差", en: "Below Average" },
  "差": { zh: "差", en: "Poor" },
  // 年检 / 评价结论
  "合格": { zh: "合格", en: "Pass" },
  "不合格": { zh: "不合格", en: "Fail" },
  // 电池动力类型
  "插电式混合动力汽车": { zh: "插电式混合动力汽车", en: "PHEV" },
  "纯电动汽车": { zh: "纯电动汽车", en: "BEV" },
  "混合动力汽车": { zh: "混合动力汽车", en: "HEV" },
  "增程式电动汽车": { zh: "增程式电动汽车", en: "REEV" },
  "燃料电池汽车": { zh: "燃料电池汽车", en: "FCEV" },
  // 电池类型
  "磷酸铁锂": { zh: "磷酸铁锂", en: "LFP" },
  "三元锂": { zh: "三元锂", en: "NMC/NCA Ternary" },
  "三元材料": { zh: "三元材料", en: "Ternary" },
  "钴酸锂": { zh: "钴酸锂", en: "LCO" },
  "锰酸锂": { zh: "锰酸锂", en: "LMO" },
  // 出险事故类型
  "碰撞": { zh: "碰撞", en: "Collision" },
  "追尾": { zh: "追尾", en: "Rear-end" },
  "剐蹭": { zh: "剐蹭", en: "Scratch" },
  "划痕": { zh: "划痕", en: "Scratch" },
  "玻璃破碎": { zh: "玻璃破碎", en: "Glass Breakage" },
  "水淹": { zh: "水淹", en: "Water Damage" },
  "火灾": { zh: "火灾", en: "Fire" },
  "自燃": { zh: "自燃", en: "Self-Ignition" },
  "盗抢": { zh: "盗抢", en: "Theft" },
  "台风": { zh: "台风", en: "Typhoon" },
  "雹灾": { zh: "雹灾", en: "Hail" },
  "物损": { zh: "物损", en: "Property Damage" },
  "人伤": { zh: "人伤", en: "Bodily Injury" },
  "双方事故": { zh: "双方事故", en: "Two-Party Accident" },
  "多方事故": { zh: "多方事故", en: "Multi-Party Accident" },
  "单方事故": { zh: "单方事故", en: "Single-Party Accident" },
  // 理赔状态
  "已结案": { zh: "已结案", en: "Closed" },
  "已赔付": { zh: "已赔付", en: "Paid" },
  "理赔中": { zh: "理赔中", en: "In Progress" },
  "处理中": { zh: "处理中", en: "Processing" },
  "已报案": { zh: "已报案", en: "Reported" },
  "已拒赔": { zh: "已拒赔", en: "Rejected" },
  "已撤销": { zh: "已撤销", en: "Withdrawn" },
  "未结案": { zh: "未结案", en: "Open" },
  // 里程来源
  "4S店保养": { zh: "4S 店保养", en: "Dealer Service" },
  "4S 店保养": { zh: "4S 店保养", en: "Dealer Service" },
  "年检": { zh: "年检", en: "Annual Inspection" },
  "过户": { zh: "过户", en: "Ownership Transfer" },
  "维修厂": { zh: "维修厂", en: "Repair Shop" },
  "OBD": { zh: "OBD", en: "OBD" },
  "保险公司": { zh: "保险公司", en: "Insurance Company" },
  "交易平台": { zh: "交易平台", en: "Trading Platform" },
};

/** 把任意字符串值尽量翻译为双语；未命中原样返回（视为无需翻译） */
export function transEnum(value: string | null | undefined): BiPair | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return ENUM_DICT[trimmed] ?? { zh: trimmed, en: trimmed };
}

// ============ 报告语言模式（zh / en / bilingual） ============
export type ReportLangMode = "zh" | "en" | "bilingual";

const STORAGE_KEY = "exportdrive_report_lang";
let currentMode: ReportLangMode = "bilingual";
const listeners = new Set<(m: ReportLangMode) => void>();

function readInitial(): ReportLangMode {
  if (typeof window === "undefined") return "bilingual";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "zh" || v === "en" || v === "bilingual") return v;
  } catch {
    /* ignore */
  }
  return "bilingual";
}

export function getLangMode(): ReportLangMode {
  if (typeof window !== "undefined") currentMode = readInitial();
  return currentMode;
}

export function setLangMode(mode: ReportLangMode): void {
  currentMode = mode;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn(mode));
}

export function subscribeLangMode(fn: (m: ReportLangMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 根据当前语言模式渲染文本：
 * - zh: 只中文
 * - en: 只英文
 * - bilingual: 中文 + 英文小字
 */
export function renderText(pair: BiPair, key?: string): ReactNode {
  const mode = getLangMode();
  if (mode === "zh") return pair.zh;
  if (mode === "en") return pair.en;
  return createElement(
    Fragment,
    key ? { key } : null,
    pair.zh,
    createElement(
      "span",
      {
        key: key ? `${key}-en` : undefined,
        className: "block text-[11px] font-normal normal-case tracking-normal text-muted-foreground/60",
      },
      pair.en
    )
  );
}

/** 渲染枚举值（可能为 null） */
export function renderEnum(value: string | null | undefined): React.ReactNode {
  const pair = transEnum(value);
  return pair ? renderText(pair) : "-";
}
