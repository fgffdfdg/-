import type {
  BatteryAnnualInspectionItem,
  BatteryEvaluationItem,
  BatteryReport,
} from './types';

/**
 * 碳数电池健康 V2 原始返回字段（仅声明用到的，其他字段保持 unknown 透传不报错）。
 */
interface TanshuBatteryData {
  vin?: string;
  soh?: string | number;
  battery_level?: string;
  battery_degradation_rate?: string | number;
  engine_type?: string;
  record_date?: string;
  check_date?: string;
  total_mileage?: string | number;
  total_mileage_date?: string;
  battery_valuation?: string | number;
  battery_maintenance_msg?: string;
  temperature_accord_score?: string | number;
  voltage_accord_score?: string | number;
  full_capacity_assessment?: string | number;
  ir_accord_score?: string | number;
  full_endurance?: string | number;
  battery_capacity_score?: string | number;
  battery_model?: string;
  isolation_score?: string | number;
  battery_health_val?: string | number;
  avg_start_soc?: string | number;
  avg_end_soc?: string | number;
  depth_of_charge?: string | number;
  fast_charging_year_rate?: string | number;
  enterprise_name?: string;
  battery_type?: string;
  battery_warranty?: string;
  power_change?: string;
  battery_energy_nominal?: string | number;
  endurance_nominal?: string | number;
  fuel_consumption?: string | number;
  energy_density?: string | number;
  battery_weight?: string | number;
  battery_level1_alarm?: string;
  battery_level2_alarm?: string;
  battery_level3_alarm?: string;
  battery_evaluation_info?: Array<{
    ownData?: string | number;
    evaluationName?: string;
    otherData?: string | number;
    evaluationResult?: string;
  }>;
  annual_inspection_info?: Array<{
    annualInspectionName?: string;
    annualInspectionValue?: string;
    annualInspectionResult?: string;
    ownValue?: string;
  }>;
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** S/A/B/C/D -> 优秀/良好/一般/较差；兼容直接传入中文 */
function mapGrade(raw?: string): BatteryReport['grade'] {
  switch ((raw || '').toUpperCase().trim()) {
    case 'S':
    case '优秀':
      return '优秀';
    case 'A':
    case '良好':
      return '良好';
    case 'B':
    case '一般':
      return '一般';
    case 'C':
    case 'D':
    case '较差':
      return '较差';
    default:
      return '一般';
  }
}

function buildSuggestion(grade: BatteryReport['grade'], custom?: string): string {
  if (custom && custom.trim()) return custom.trim();
  switch (grade) {
    case '优秀':
      return '电池状态优秀，一致性良好，建议保持当前的充放电习惯。';
    case '良好':
      return '电池整体状态良好；建议日常避免长时间满充或亏电存放，定期检查即可。';
    case '一般':
      return '电池已出现一定衰减，建议避免频繁快充、避免长期高 SOC 停放，并定期进行专业检测。';
    case '较差':
      return '电池衰减或一致性偏差较明显，建议尽快到品牌授权服务中心进行电池组检测与均衡维护。';
  }
}

/**
 * 将碳数电池 V2 返回映射成内部 BatteryReport。
 * 即使部分字段缺失，也会返回完整结构，便于 UI 直接渲染。
 */
export function mapBatteryPayload(payload: unknown): BatteryReport {
  const d = (payload ?? {}) as TanshuBatteryData;

  const rawGrade = d.battery_level;
  const grade = mapGrade(rawGrade);
  const soh = toNumber(d.soh);
  const healthScore = toNumber(d.battery_health_val);
  const capacityScore = toNumber(d.battery_capacity_score);
  const temperatureScore = toNumber(d.temperature_accord_score);
  const voltageScore = toNumber(d.voltage_accord_score);
  const irScore = toNumber(d.ir_accord_score);
  const isolationScore = toNumber(d.isolation_score);
  const currentCapacity = toNumber(d.full_capacity_assessment);
  const nominalEnergy = toNumber(d.battery_energy_nominal);
  const fullEndurance = toNumber(d.full_endurance);
  const nominalEndurance = toNumber(d.endurance_nominal);
  const degradationRate = toNumber(d.battery_degradation_rate);

  // 电芯组展示：用年检信息里的最高温度 / 最高电压 / 电压极差 合成 3 个"电芯组"概览
  const annual = (d.annual_inspection_info ?? []).map<BatteryAnnualInspectionItem>((it) => ({
    name: it.annualInspectionName || '未命名项',
    standard: String(it.annualInspectionValue ?? '-'),
    result: String(it.annualInspectionResult ?? '-'),
    ownValue: String(it.ownValue ?? '-'),
  }));

  const findOwn = (kw: string): number => {
    const hit = annual.find((x) => x.name.includes(kw));
    return hit ? toNumber(hit.ownValue) : 0;
  };
  const maxTemp = findOwn('最高温度');
  const maxVoltage = findOwn('最高电压');
  const minVoltage = findOwn('最低电压');
  const voltageDiff = findOwn('电压极差');

  const cellGroups = [
    {
      name: '最高温度电芯',
      voltage: maxVoltage || 0,
      temperature: maxTemp || 0,
      soh: soh || healthScore || 0,
    },
    {
      name: '最低电压电芯',
      voltage: minVoltage || 0,
      temperature: maxTemp || 0,
      soh: soh || healthScore || 0,
    },
    {
      name: '电压极差',
      voltage: voltageDiff || 0,
      temperature: maxTemp || 0,
      soh: voltageScore || 0,
    },
  ].filter((g) => g.voltage > 0 || g.temperature > 0);

  const evaluations = (d.battery_evaluation_info ?? []).map<BatteryEvaluationItem>((it) => ({
    name: it.evaluationName || '未命名指标',
    ownData: String(it.ownData ?? '-'),
    otherData: String(it.otherData ?? '-'),
    result: String(it.evaluationResult ?? '-'),
  }));

  // 用衰减率粗略估算循环次数（仅供参考，碳数未直接提供循环数）
  const cycleCount = degradationRate > 0 && soh > 0 ? Math.round((100 - soh) / degradationRate * 200) : 0;

  return {
    soh,
    ratedCapacity: 0,
    currentCapacity: currentCapacity > 0 ? currentCapacity : 0,
    cycleCount,
    batteryType: d.battery_type || '未知',
    grade,
    cellGroups,
    suggestion: buildSuggestion(grade, d.battery_maintenance_msg),

    rawGrade: rawGrade || undefined,
    degradationRate: degradationRate || undefined,
    engineType: d.engine_type,
    recordDate: d.record_date,
    checkDate: d.check_date,
    totalMileage: toNumber(d.total_mileage) || undefined,
    totalMileageDate: d.total_mileage_date,
    batteryValuation: toNumber(d.battery_valuation) || undefined,
    temperatureScore: temperatureScore || undefined,
    voltageScore: voltageScore || undefined,
    internalResistanceScore: irScore || undefined,
    capacityScore: capacityScore || undefined,
    isolationScore: isolationScore || undefined,
    healthScore: healthScore || undefined,
    fullEndurance: fullEndurance || undefined,
    nominalEndurance: nominalEndurance || undefined,
    nominalEnergy: nominalEnergy || undefined,
    batteryModel: d.battery_model || undefined,
    avgStartSoc: toNumber(d.avg_start_soc) || undefined,
    avgEndSoc: toNumber(d.avg_end_soc) || undefined,
    depthOfCharge: toNumber(d.depth_of_charge) || undefined,
    fastChargingRate: toNumber(d.fast_charging_year_rate) || undefined,
    manufacturer: d.enterprise_name,
    warranty: d.battery_warranty,
    powerChange: d.power_change,
    fuelConsumption: d.fuel_consumption !== undefined ? String(d.fuel_consumption) : undefined,
    energyDensity: d.energy_density !== undefined ? String(d.energy_density) : undefined,
    batteryWeight: toNumber(d.battery_weight) || undefined,
    alarm90d: {
      l1: d.battery_level1_alarm,
      l2: d.battery_level2_alarm,
      l3: d.battery_level3_alarm,
    },
    evaluations,
    annualInspections: annual,
  };
}
