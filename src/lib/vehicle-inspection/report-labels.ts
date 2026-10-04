/**
 * 车况检测报告 - 中英文双语字段标签映射
 * 用于报告详情页的表格渲染与 PDF 导出
 */

export type BilingualLabel = { zh: string; en: string };

// ─── 出险报告 ───────────────────────────────────────────────
export const INSURANCE_LABELS: Record<string, BilingualLabel> = {
  vin: { zh: '车架号', en: 'VIN' },
  claimCount: { zh: '理赔记录总数', en: 'Total Claims' },
  totalAmount: { zh: '理赔总金额', en: 'Total Claim Amount' },
  lastClaimDate: { zh: '最近理赔日期', en: 'Last Claim Date' },
  hasMajorAccident: { zh: '重大事故', en: 'Major Accident' },
  date: { zh: '日期', en: 'Date' },
  type: { zh: '出险类型', en: 'Claim Type' },
  amount: { zh: '理赔金额', en: 'Claim Amount' },
  damage: { zh: '损伤部位', en: 'Damage' },
  location: { zh: '出险地点', en: 'Location' },
  status: { zh: '处理状态', en: 'Status' },
  records: { zh: '理赔记录明细', en: 'Claim Records' },
  total_records: { zh: '理赔记录总数', en: 'Total Records' },
  code: { zh: '结果代码', en: 'Result Code' },
  msg: { zh: '结果说明', en: 'Message' },
};

// ─── 里程报告 ───────────────────────────────────────────────
export const MILEAGE_LABELS: Record<string, BilingualLabel> = {
  vin: { zh: '车架号', en: 'VIN' },
  currentMileage: { zh: '当前里程', en: 'Current Mileage' },
  annualAverage: { zh: '年均里程', en: 'Annual Average' },
  tamperRisk: { zh: '调表风险', en: 'Tamper Risk' },
  riskLevel: { zh: '风险等级', en: 'Risk Level' },
  lastRecordDate: { zh: '最近记录日期', en: 'Last Record Date' },
  date: { zh: '日期', en: 'Date' },
  mileage: { zh: '里程读数', en: 'Mileage' },
  source: { zh: '数据来源', en: 'Source' },
  checkpoints: { zh: '历史里程记录', en: 'Mileage History' },
  code: { zh: '结果代码', en: 'Result Code' },
  msg: { zh: '结果说明', en: 'Message' },
};

// ─── 电池健康度报告 ──────────────────────────────────────────
export const BATTERY_LABELS: Record<string, BilingualLabel> = {
  // 核心指标
  soh: { zh: '电池健康度', en: 'SOH (State of Health)' },
  grade: { zh: '综合评级', en: 'Overall Grade' },
  rawGrade: { zh: '电池等级', en: 'Battery Level' },
  batteryType: { zh: '电池类型', en: 'Battery Type' },
  batteryModel: { zh: '电池型号', en: 'Battery Model' },
  ratedCapacity: { zh: '额定容量', en: 'Rated Capacity' },
  currentCapacity: { zh: '当前可用容量', en: 'Current Capacity' },
  cycleCount: { zh: '估算循环次数', en: 'Estimated Cycles' },
  degradationRate: { zh: '衰减速率', en: 'Degradation Rate' },

  // 续航与能量
  fullEndurance: { zh: '当前满电续航', en: 'Full Charge Range' },
  nominalEndurance: { zh: '标称续航', en: 'Nominal Range' },
  nominalEnergy: { zh: '标称能量', en: 'Nominal Energy' },
  fuelConsumption: { zh: '百公里耗电', en: 'Energy Consumption' },
  energyDensity: { zh: '能量密度', en: 'Energy Density' },

  // 得分
  healthScore: { zh: '电池健康得分', en: 'Health Score' },
  capacityScore: { zh: '容量得分', en: 'Capacity Score' },
  temperatureScore: { zh: '温度一致性得分', en: 'Temperature Consistency' },
  voltageScore: { zh: '电压一致性得分', en: 'Voltage Consistency' },
  internalResistanceScore: { zh: '内阻一致性得分', en: 'Internal Resistance' },
  isolationScore: { zh: '自放电率得分', en: 'Self-Discharge Score' },

  // 充电
  avgStartSoc: { zh: '平均充电起始 SOC', en: 'Avg Start SOC' },
  avgEndSoc: { zh: '平均充电终止 SOC', en: 'Avg End SOC' },
  depthOfCharge: { zh: '充电深度', en: 'Depth of Charge' },
  fastChargingRate: { zh: '近一年快充占比', en: 'Fast Charging Rate (1Y)' },

  // 里程与估值
  totalMileage: { zh: '表显里程', en: 'Odometer Reading' },
  totalMileageDate: { zh: '里程更新时间', en: 'Mileage Update Date' },
  batteryValuation: { zh: '电池市场估值', en: 'Battery Valuation' },

  // 生产信息
  manufacturer: { zh: '电池生产企业', en: 'Manufacturer' },
  warranty: { zh: '电池质保', en: 'Warranty' },
  powerChange: { zh: '是否换电', en: 'Battery Swap' },
  engineType: { zh: '动力类型', en: 'Powertrain Type' },
  batteryWeight: { zh: '电池总质量', en: 'Battery Weight' },

  // 时间
  recordDate: { zh: '首次行驶月份', en: 'First Record Date' },
  checkDate: { zh: '检测日期', en: 'Inspection Date' },

  // 报警
  alarm90d: { zh: '近 90 天报警', en: 'Alerts (90 Days)' },
  l1: { zh: '一级报警', en: 'Level 1' },
  l2: { zh: '二级报警', en: 'Level 2' },
  l3: { zh: '三级报警', en: 'Level 3' },

  // 电芯组
  cellGroups: { zh: '电芯组概览', en: 'Cell Group Overview' },
  name: { zh: '名称', en: 'Name' },
  voltage: { zh: '电压', en: 'Voltage' },
  temperature: { zh: '温度', en: 'Temperature' },

  // 一致性对比
  evaluations: { zh: '电池一致性对比', en: 'Consistency Evaluation' },
  ownData: { zh: '本车数据', en: 'Own Data' },
  otherData: { zh: '同车型数据', en: 'Peer Data' },
  result: { zh: '对比结果', en: 'Result' },

  // 年检
  annualInspections: { zh: '动力电池年检信息', en: 'Annual Inspection' },
  standard: { zh: '标准值', en: 'Standard' },
  ownValue: { zh: '本车数值', en: 'Own Value' },

  // 建议
  suggestion: { zh: '养护建议', en: 'Maintenance Advice' },

  // 通用
  code: { zh: '结果代码', en: 'Result Code' },
  msg: { zh: '结果说明', en: 'Message' },
  vin: { zh: '车架号', en: 'VIN' },
};

// ─── 风险等级 ───────────────────────────────────────────────
export const RISK_LEVEL_LABELS: Record<string, BilingualLabel> = {
  low: { zh: '低风险', en: 'Low Risk' },
  medium: { zh: '中风险', en: 'Medium Risk' },
  high: { zh: '高风险', en: 'High Risk' },
};

// ─── 评级 ──────────────────────────────────────────────────
export const GRADE_LABELS: Record<string, BilingualLabel> = {
  '优秀': { zh: '优秀', en: 'Excellent (S)' },
  '良好': { zh: '良好', en: 'Good (A)' },
  '一般': { zh: '一般', en: 'Fair (B)' },
  '较差': { zh: '较差', en: 'Poor (C/D)' },
};

// ─── 工具函数 ───────────────────────────────────────────────
export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '是 / Yes' : '否 / No';

  // 金额
  if (key === 'totalAmount' || key === 'batteryValuation') {
    const n = Number(value);
    return Number.isFinite(n) ? `¥${n.toLocaleString('zh-CN')}` : '—';
  }

  // 容量
  if (key === 'currentCapacity' || key === 'ratedCapacity') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} Ah` : '—';
  }

  // 里程
  if (key === 'currentMileage' || key === 'totalMileage') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} km` : '—';
  }
  if (key === 'annualAverage') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} km/年` : '—';
  }
  if (key === 'mileage') {
    const n = Number(value);
    return `${n.toLocaleString('zh-CN')} km`;
  }

  // 续航
  if (key === 'fullEndurance' || key === 'nominalEndurance') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} km` : '—';
  }

  // 百分比
  const pctKeys = ['soh', 'degradationRate', 'healthScore', 'capacityScore', 'temperatureScore',
    'voltageScore', 'internalResistanceScore', 'isolationScore',
    'avgStartSoc', 'avgEndSoc', 'depthOfCharge', 'fastChargingRate'];
  if (pctKeys.includes(key)) {
    const n = Number(value);
    return n > 0 ? `${n}%` : '—';
  }

  // 能量
  if (key === 'nominalEnergy') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} kWh` : '—';
  }

  // 重量
  if (key === 'batteryWeight') {
    const n = Number(value);
    return n > 0 ? `${n.toLocaleString('zh-CN')} kg` : '—';
  }

  // 电压
  if (key === 'voltage') {
    const n = Number(value);
    return n > 0 ? `${n} V` : '—';
  }

  // 温度
  if (key === 'temperature') {
    const n = Number(value);
    return n > 0 ? `${n}°C` : '—';
  }

  if (key === 'tamperRisk') {
    return value ? '⚠ 存在调表嫌疑 / Tamper Suspected' : '✓ 未发现异常 / Normal';
  }

  return String(value);
}