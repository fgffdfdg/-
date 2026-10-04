/**
 * 报告订单 - 类型定义
 *
 * 报告组合：用户在提交前自由选择的一组车况报告，统一确认总费用后各自独立执行。
 * 报告订单：已确认费用并提交的一份报告请求，拥有独立状态。
 *
 * 三份需求文档：
 * - 0004: 先查询后保存 - 临时车辆承载报告，保存后才进入候选车源池
 * - 0005: 组合确认费用，报告独立执行 - 多报告组合、费用确认、独立状态
 * - 0006: 按 VIN 统一车辆身份并复用报告 - VIN唯一身份、报告归属、合并策略
 */

import type { ReportType } from "./reports";

// ─── 报告订单状态 ───────────────────────────────────────────────

/** 报告执行状态 */
export type ReportOrderStatus = "pending" | "querying" | "completed" | "failed" | "no_data" | "expired";

/** 报告财务状态（与执行状态独立） */
export type FinancialStatus = "pending" | "charged" | "refunded" | "not_charged";

// ─── 报告订单 ───────────────────────────────────────────────────

export interface ReportOrder {
  id: string;
  vehicleId: string;
  organizationId: string;
  createdBy: string;
  reportType: ReportType;
  status: ReportOrderStatus;
  financialStatus: FinancialStatus;
  costCents: number;
  queryParams: Record<string, unknown>;
  resultSummary?: string | null;
  errorMessage?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 创建报告订单的请求体 */
export interface CreateReportOrderPayload {
  vehicleId: string;
  reportType: ReportType;
  costCents: number;
  queryParams?: Record<string, unknown>;
}

/** 更新报告订单的请求体 */
export interface UpdateReportOrderPayload {
  status?: ReportOrderStatus;
  financialStatus?: FinancialStatus;
  resultSummary?: string | null;
  errorMessage?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
}

// ─── 报告组合（提交前的选择） ──────────────────────────────────

/** 一次报告组合提交 */
export interface ReportCombination {
  /** 组合中的报告类型列表 */
  reportTypes: ReportType[];
  /** 总费用（分） */
  totalCostCents: number;
  /** 企业查询余额（分） */
  enterpriseBalanceCents: number;
  /** 余额是否足够 */
  balanceSufficient: boolean;
}

/** 创建报告组合的请求体（前端客户端使用） */
export interface CreateReportCombinationPayload {
  /** VIN码（用于创建临时车辆或查找已有车辆身份） */
  vin: string;
  /** 行驶证图片URL（可选，部分报告类型需要） */
  drivingLicenseImageUrl?: string | null;
  /** 行驶证文件（前端上传用，会转为 multipart/form-data） */
  drivingLicenseFile?: File | null;
  /** 选择的报告类型列表 */
  reportTypes: ReportType[];
  /** 组织ID */
  organizationId?: string | null;
}

/** 报告组合提交响应 */
export interface ReportCombinationResponse {
  /** 临时车辆ID */
  vehicleId: string;
  /** 该VIN是否已存在活跃车辆 */
  vinExists: boolean;
  /** 已有车辆ID（VIN存在时） */
  existingVehicleId?: string | null;
  /** 创建的订单列表 */
  orders: ReportOrder[];
  /** 总费用（分） */
  totalCostCents: number;
  /** 扣费后余额（分） */
  remainingBalanceCents: number;
}

// ─── 保存临时车辆 ──────────────────────────────────────────────

/** 保存临时车辆的请求体 */
export interface SaveTemporaryVehiclePayload {
  vehicleId: string;
  /** 合并策略：create_new 创建新车辆 / merge 合并到已有车辆 */
  mergeStrategy?: "create_new" | "merge";
  /** 合并目标车辆ID（merge时必须提供） */
  mergeTargetVehicleId?: string | null;
  /** 补充的车辆信息 */
  vehicleData?: {
    plateNumber?: string | null;
    brandModel?: string | null;
    customModelName?: string | null;
    notes?: string | null;
    tags?: string[];
  };
}

/** 保存临时车辆响应 */
export interface SaveTemporaryVehicleResponse {
  success: boolean;
  vehicleId: string;
  /** 合并到的目标车辆ID（如果合并了） */
  mergedToVehicleId?: string | null;
  /** 转移的报告订单数 */
  transferredOrders: number;
}

// ─── VIN 查重 ──────────────────────────────────────────────────

/** VIN 查重结果 */
export interface VinDuplicateCheck {
  /** 是否已存在 */
  exists: boolean;
  /** 已有车辆列表 */
  existingVehicles: VinExistingVehicle[];
}

export interface VinExistingVehicle {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandModel: string | null;
  customModelName: string | null;
  status: string;
  /** 已有报告数量 */
  reportCount: number;
  /** 最近报告时间 */
  lastReportAt: string | null;
  createdAt: string;
}

// ─── 报告订单状态显示配置 ──────────────────────────────────────

export const REPORT_ORDER_STATUS_LABELS: Record<ReportOrderStatus, string> = {
  pending: "待提交",
  querying: "查询中",
  completed: "已完成",
  failed: "查询失败",
  no_data: "无数据",
  expired: "已过期",
};

export const REPORT_ORDER_STATUS_COLORS: Record<ReportOrderStatus, string> = {
  pending: "text-muted-foreground",
  querying: "text-blue-600",
  completed: "text-green-600",
  failed: "text-red-600",
  no_data: "text-amber-600",
  expired: "text-muted-foreground/60",
};

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pending: "待确认",
  charged: "已扣费",
  refunded: "已退回",
  not_charged: "未扣费",
};

export const FINANCIAL_STATUS_COLORS: Record<FinancialStatus, string> = {
  pending: "text-muted-foreground",
  charged: "text-green-600",
  refunded: "text-amber-600",
  not_charged: "text-muted-foreground/60",
};