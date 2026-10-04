/**
 * 数据联动系统 - 类型定义
 *
 * vehicle_archives → 各单证 Vehicle 接口的字段映射与自动填充。
 */

import type { VehicleArchive } from "@/lib/car-inventory/types";

// ─── 文档类型标识 ──────────────────────────────────────────────

export type DocTypeKey =
  | "invoice"              // 商业发票
  | "packing-list"         // 装箱单
  | "contract"             // 出口合同
  | "customs-declaration"  // 报关预录（海关出口货物报关单）
  | "proforma-invoice"     // 形式发票
  | "compliance-declaration" // 准入声明
  | "export-declaration"   // 出口报关单预录
  | "export-license";      // 出口许可证（附加信息表）

// ─── 转换函数签名 ──────────────────────────────────────────────

/** 值转换函数：接收原始值，返回转换后的值 */
export type ValueTransform = (value: unknown, vehicle: VehicleArchive) => unknown;

// ─── 字段映射定义 ──────────────────────────────────────────────

export interface FieldMapping {
  /** vehicle_archives 中的字段名（snake_case，如 "fuel_type"） */
  source: keyof VehicleArchive;
  /** 目标单证中的字段名 */
  target: string;
  /**
   * 可选转换：
   * - 内置转换名称（"fuel-type-cn-to-en" / "extract-year" / "parse-dimensions" / "identity"）
   * - 或自定义转换函数
   */
  transform?: string | ValueTransform;
}

// ─── 文档映射注册表 ────────────────────────────────────────────

export type DocMappingRegistry = Record<DocTypeKey, FieldMapping[]>;

// ─── Hook 返回值 ───────────────────────────────────────────────

export interface VinLookupResult {
  /** 自动填充的数据（key 为单证字段名，value 为填充值），可直接展开到表单 */
  [key: string]: unknown;
  /** 标记是否来自车辆档案 */
  _fromArchive: boolean;
}

export interface UseVinAutoFillReturn {
  /** 根据 VIN 查询并返回填充数据 */
  lookupByVin: (vin: string) => Promise<VinLookupResult>;
  /** 是否正在查询 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}