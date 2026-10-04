/**
 * 数据联动系统 - 值转换器
 *
 * vehicle_archives 的原始值 → 单证所需的目标格式。
 */
import type { VehicleArchive } from "@/lib/car-inventory/types";

// ─── 燃料类型：中文 → 英文 ─────────────────────────────────────

const FUEL_TYPE_CN_TO_EN: Record<string, string> = {
  "纯电动": "Battery Electric",
  "电动": "Battery Electric",
  "插电式混合动力": "Plug-in Hybrid",
  "混合动力": "Hybrid",
  "增程式电动": "Range-Extended Electric",
  "增程式": "Range-Extended Electric",
  "汽油": "Gasoline",
  "柴油": "Diesel",
  "天然气": "CNG",
  "液化石油气": "LPG",
  "燃料电池": "Fuel Cell",
  "氢燃料电池": "Fuel Cell",
};

export function fuelTypeCnToEn(cn: string): string {
  if (!cn) return "";
  return FUEL_TYPE_CN_TO_EN[cn] ?? cn;
}

// ─── 燃料类型：中文 → 英文（出口许可证用，缩写版）─────────────────

const FUEL_TYPE_CN_TO_EN_SHORT: Record<string, string> = {
  "纯电动": "Battery EV",
  "电动": "Battery EV",
  "插电式混合动力": "PHEV",
  "混合动力": "HEV",
  "增程式电动": "EREV",
  "增程式": "EREV",
  "汽油": "Gasoline",
  "柴油": "Diesel",
};

export function fuelTypeCnToEnShort(cn: string): string {
  if (!cn) return "";
  return FUEL_TYPE_CN_TO_EN_SHORT[cn] ?? cn;
}

// ─── 使用性质 → 英文 ───────────────────────────────────────────

const PURPOSE_CN_TO_EN: Record<string, string> = {
  "非营运": "Private Use",
  "营运": "Commercial Use",
  "公路客运": "Passenger Transport",
  "货运": "Freight Transport",
  "预约出租客运": "Ride-Hailing",
  "出租客运": "Taxi",
  "租赁": "Leasing",
  "教练": "Driving School",
  "警用": "Police",
};

export function purposeCnToEn(cn: string): string {
  if (!cn) return "";
  return PURPOSE_CN_TO_EN[cn] ?? cn;
}

// ─── 车身尺寸解析："4680×1810×1515" → { length, width, height } ─

export interface ParsedDimensions {
  lengthMm: string;
  widthMm: string;
  heightMm: string;
}

export function parseDimensions(dimensions: string): ParsedDimensions {
  if (!dimensions) return { lengthMm: "", widthMm: "", heightMm: "" };
  // 支持 ×（中文乘号）、x（字母）、*（星号）分隔
  const parts = dimensions.split(/[×xX\*]/).map((s) => s.trim().replace(/[^0-9.]/g, ""));
  return {
    lengthMm: parts[0] ?? "",
    widthMm: parts[1] ?? "",
    heightMm: parts[2] ?? "",
  };
}

// ─── 日期提取年份 ──────────────────────────────────────────────

export function extractYear(date: string): string {
  if (!date) return "";
  // 支持 "2023-05-15" / "2023/05/15" / "2023年05月15日"
  const match = date.match(/(\d{4})/);
  return match ? match[1] : "";
}

// ─── 净重：kg 字符串 → 数字 ─────────────────────────────────────

export function toNumber(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// ─── 内置转换名称映射 ──────────────────────────────────────────

export const BUILTIN_TRANSFORMS: Record<string, (value: unknown, _vehicle: VehicleArchive) => unknown> = {
  "fuel-type-cn-to-en": (v) => fuelTypeCnToEn(v as string),
  "fuel-type-cn-to-en-short": (v) => fuelTypeCnToEnShort(v as string),
  "purpose-cn-to-en": (v) => purposeCnToEn(v as string),
  "extract-year": (v) => extractYear(v as string),
  "to-number": (v) => toNumber(v as string | null | undefined),
  "identity": (v) => v,
};

/**
 * 解析 "dimensions" 字段并返回 { lengthMm, widthMm, heightMm }
 * 这是一个特殊处理：一个 source 字段映射到多个 target 字段
 * 在 applyMapping 中需要特殊处理
 */
export function getDimensionsParts(vehicle: VehicleArchive): ParsedDimensions {
  return parseDimensions(vehicle.dimensions ?? "");
}