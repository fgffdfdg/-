// 车况检测相关类型定义

export type ReportType = 'insurance' | 'mileage' | 'battery';

export interface VehicleBaseInfo {
  vin: string;
  plateNumber?: string;
  /** 行驶证图片，存 base64 dataURL（本地上传，仅前端留存） */
  drivingLicenseImage?: string;
  brand?: string;
  series?: string;
  modelName?: string;
  year?: string;
}

// ─── 出险报告 ───────────────────────────────────────────────
export interface InsuranceClaimRecord {
  /** 理赔日期，ISO yyyy-mm-dd */
  date: string;
  /** 出险原因/类型 */
  type: string;
  /** 理赔金额，单位元 */
  amount: number;
  /** 出险地点 */
  location?: string;
  /** 损伤部位/描述 */
  damage: string;
  /** 处理状态 */
  status: '已结案' | '处理中';
}

export interface InsuranceReport {
  claimCount: number;
  totalAmount: number;
  lastClaimDate?: string;
  hasMajorAccident: boolean;
  records: InsuranceClaimRecord[];
}

// ─── 里程报告 ───────────────────────────────────────────────
export interface MileageCheckpoint {
  /** 读数日期 */
  date: string;
  /** 里程读数，km */
  mileage: number;
  /** 来源：4S 保养 / 年检 / 过户 / 维修厂 */
  source: string;
}

export interface MileageReport {
  currentMileage: number;
  /** 年均里程，km */
  annualAverage: number;
  /** 是否存在调表嫌疑 */
  tamperRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  /** 最近一次记录日期 */
  lastRecordDate: string;
  checkpoints: MileageCheckpoint[];
}

// ─── 电池健康报告 ──────────────────────────────────────────
export interface BatteryCellGroup {
  name: string;
  /** 单体平均电压，V */
  voltage: number;
  /** 温度，℃ */
  temperature: number;
  /** 健康度 % */
  soh: number;
}

/** 电池一致性对比（碳数 battery_evaluation_info） */
export interface BatteryEvaluationItem {
  name: string;
  ownData: string;
  otherData: string;
  result: string;
}

/** 动力电池年检信息（碳数 annual_inspection_info） */
export interface BatteryAnnualInspectionItem {
  name: string;
  standard: string;
  result: string;
  ownValue: string;
}

export interface BatteryReport {
  /** 电池健康度 SOH，百分比 */
  soh: number;
  /** 额定容量，Ah（无数据时为 0） */
  ratedCapacity: number;
  /** 当前可用容量，Ah（碳数 full_capacity_assessment，可能为 -1 表示无数据） */
  currentCapacity: number;
  /** 累计循环次数（碳数未直接提供，按 SOH/衰减速率估算；无数据时为 0） */
  cycleCount: number;
  /** 电池类型 */
  batteryType: string;
  /** 评估等级（碳数 battery_level：S/A/B/C/D，映射为 优秀/良好/一般/较差） */
  grade: '优秀' | '良好' | '一般' | '较差';
  /** 电芯组数据（基于年检/一致性数据合成展示） */
  cellGroups: BatteryCellGroup[];
  /** 建议（碳数 battery_maintenance_msg，缺省时根据评级生成） */
  suggestion: string;

  // ── 以下为碳数 V2 全量字段 ──
  /** 电池综合评级原始值 S/A/B/C/D */
  rawGrade?: string;
  /** 电池衰减速率 %/年 */
  degradationRate?: number;
  /** 车辆动力类型 */
  engineType?: string;
  /** 首次车辆行驶月份 yyyy-mm */
  recordDate?: string;
  /** 检测日期 yyyy-mm */
  checkDate?: string;
  /** 表显里程 km */
  totalMileage?: number;
  /** 表显里程更新时间 */
  totalMileageDate?: string;
  /** 电池市场估值（元） */
  batteryValuation?: number;
  /** 温度一致性得分 */
  temperatureScore?: number;
  /** 电压一致性得分 */
  voltageScore?: number;
  /** 内阻一致性得分 */
  internalResistanceScore?: number;
  /** 容量得分 */
  capacityScore?: number;
  /** 自放电率得分 */
  isolationScore?: number;
  /** 电池健康得分 */
  healthScore?: number;
  /** 当前满电续航 km */
  fullEndurance?: number;
  /** 标称续航 km */
  nominalEndurance?: number;
  /** 标称能量 kWh */
  nominalEnergy?: number;
  /** 电池型号 */
  batteryModel?: string;
  /** 平均充电起始 SOC */
  avgStartSoc?: number;
  /** 平均充电终止 SOC */
  avgEndSoc?: number;
  /** 充电深度 % */
  depthOfCharge?: number;
  /** 近一年快充占比 % */
  fastChargingRate?: number;
  /** 电池生产企业 */
  manufacturer?: string;
  /** 电池质保 */
  warranty?: string;
  /** 是否换电 */
  powerChange?: string;
  /** 百公里耗电 */
  fuelConsumption?: string;
  /** 能量密度 Wh/kg */
  energyDensity?: string;
  /** 电池总质量 kg */
  batteryWeight?: number;
  /** 近 90 天三级报警 */
  alarm90d?: { l1?: string; l2?: string; l3?: string };
  /** 电池一致性对比 */
  evaluations?: BatteryEvaluationItem[];
  /** 动力电池年检信息 */
  annualInspections?: BatteryAnnualInspectionItem[];
}

// ─── 综合存储结构 ───────────────────────────────────────────
export interface SavedReport {
  id: string;
  type: ReportType;
  vehicle: VehicleBaseInfo;
  /** 查询生成时间，ISO 字符串 */
  createdAt: string;
  data: InsuranceReport | MileageReport | BatteryReport;
}

export const REPORT_META: Record<
  ReportType,
  {
    title: string;
    shortTitle: string;
    description: string;
    requiredMaterials: string[];
    /** 是否必须上传行驶证 */
    requireLicenseImage: boolean;
  }
> = {
  insurance: {
    title: '出险报告',
    shortTitle: '出险',
    description: '提交行驶证正面照片，查询车辆历史保险理赔记录与事故赔付情况',
    requiredMaterials: ['行驶证正面照片（必传，≤4MB）', 'VIN 码（选填，可辅助查询）'],
    requireLicenseImage: true,
  },
  mileage: {
    title: '里程报告',
    shortTitle: '里程',
    description: '提交行驶证正面照片，查询车辆历史里程读数，识别调表嫌疑',
    requiredMaterials: ['行驶证正面照片（必传，≤4MB）', 'VIN 码（选填，可辅助查询）'],
    requireLicenseImage: true,
  },
  battery: {
    title: '电池健康度报告',
    shortTitle: '电池',
    description: '新能源车动力电池 SOH、容量、一致性、年检指标与养护建议（仅需 VIN）',
    requiredMaterials: ['VIN 码（17 位，必填）', '车牌号（选填）'],
    requireLicenseImage: false,
  },
};
