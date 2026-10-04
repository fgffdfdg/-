/**
 * 车况检测报告 - 类型定义
 * 与 vehicle_inspection_reports 表关联，每个报告绑定到一辆车
 */

export type ReportType = "insurance" | "mileage" | "battery" | "technical" | "maintenance" | "accident";
export type ReportStatus = "pending" | "querying" | "completed" | "failed" | "no_data" | "expired";

export interface VehicleInspectionReport {
  id: string;
  vehicleId: string;
  userId: string;
  organizationId?: string | null;
  reportType: ReportType;
  status: ReportStatus;
  reportOrderId?: string | null;
  orderId?: string | null;
  reportData: Record<string, unknown>;
  errorMessage?: string | null;
  costCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  vehicleId: string;
  reportType: ReportType;
  orderId?: string;
  reportData?: Record<string, unknown>;
}

export interface UpdateReportPayload {
  status?: ReportStatus;
  orderId?: string;
  reportData?: Record<string, unknown>;
  errorMessage?: string | null;
}

/** 检测类型显示配置 */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  insurance: "出险报告",
  mileage: "里程报告",
  battery: "电池健康度",
  technical: "技术参数",
  maintenance: "维保记录",
  accident: "事故记录",
};

export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  insurance: "Shield",
  mileage: "Gauge",
  battery: "Battery",
  technical: "Wrench",
  maintenance: "ClipboardList",
  accident: "AlertTriangle",
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  insurance: "查询车辆历史出险记录，了解事故与理赔情况",
  mileage: "查询车辆历史里程数据，判断是否存在调表风险",
  battery: "查询新能源车电池健康度，评估电池衰减状态",
  technical: "查询车辆出厂技术参数，核对制造与合规属性",
  maintenance: "查询车辆4S店维保记录，核实保养与维修历史",
  accident: "查询车辆事故记录，了解重大事故与结构性损伤",
};

/** 检测类型所需的证件 */
export const REPORT_TYPE_REQUIREMENTS: Record<ReportType, { needLicense: boolean; needVIN: boolean }> = {
  insurance: { needLicense: true, needVIN: true },
  mileage: { needLicense: true, needVIN: true },
  battery: { needLicense: false, needVIN: true },
  technical: { needLicense: false, needVIN: true },
  maintenance: { needLicense: false, needVIN: true },
  accident: { needLicense: false, needVIN: true },
};

/** 报告类型定价（分） */
export const REPORT_TYPE_PRICES: Record<ReportType, number> = {
  insurance: 2900,
  mileage: 1500,
  battery: 1800,
  technical: 500,
  maintenance: 1200,
  accident: 2000,
};