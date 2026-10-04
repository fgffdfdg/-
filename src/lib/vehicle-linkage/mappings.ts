/**
 * 数据联动系统 - 字段映射注册表
 *
 * 每个单证类型注册一份映射：vehicle_archives 字段 → 单证字段。
 * 新增单证时只需在此注册表追加一条即可。
 *
 * ═══════════════════════════════════════════════════════════════
 * 领域类型对照（迁移指引）
 * ───────────────────────────────────────────────────────────────
 * 单证类型           │ 旧 Vehicle 类型        │ 新领域类型
 * ───────────────────────────────────────────────────────────────
 * invoice            │ VehicleItem            │ TradeVehicle
 * packing-list       │ VehicleItem            │ TradeVehicle
 * contract           │ VehicleItem            │ TradeVehicle
 * customs-declaration│ VehicleItem            │ CustomsVehicle
 * export-license     │ ExportLicenseData      │ LicenseVehicle
 * proforma-invoice   │ 自有 Vehicle           │ TradeVehicle
 * compliance-declaration│ 自有 Vehicle        │ ComplianceVehicle
 * export-declaration │ 自有 Vehicle           │ CustomsVehicle
 * ───────────────────────────────────────────────────────────────
 * 所有类型均从 @/lib/domain 统一导出。
 * ═══════════════════════════════════════════════════════════════
 */
import type { VehicleArchive } from "@/lib/car-inventory/types";
import type { DocMappingRegistry, FieldMapping } from "./types";
import { getDimensionsParts, BUILTIN_TRANSFORMS } from "./transforms";

// ─── 共用映射片段（避免重复定义）────────────────────────────────

/** 车辆基础信息（所有单证共用） */
const BASE_VEHICLE: FieldMapping[] = [
  { source: "vin", target: "vin" },
  { source: "brand", target: "brand" },
  { source: "model", target: "model" },
];

/** 规格参数（商业发票/装箱单/合同/报关单共用） */
const SPEC_PARAMS: FieldMapping[] = [
  { source: "fuelType", target: "energyType", transform: "fuel-type-cn-to-en" },
  { source: "power", target: "power" },
  { source: "curbWeight", target: "netWeight", transform: "to-number" },
  { source: "grossMass", target: "grossWeight", transform: "to-number" },
  { source: "color", target: "color" },
  { source: "registrationDate", target: "year", transform: "extract-year" },
];

/** 出口许可证附加信息表专用字段 */
const EXPORT_LICENSE_VEHICLE: FieldMapping[] = [
  { source: "engineNumber", target: "engineNo" },
  { source: "brand", target: "brandEn" },
  { source: "model", target: "modelEn" },
  { source: "usageNature", target: "purposeCn" },
  { source: "usageNature", target: "purposeEn", transform: "purpose-cn-to-en" },
  { source: "seatingCapacity", target: "seatingCapacity" },
];

// ─── 各单证映射 ────────────────────────────────────────────────

export const DOCUMENT_MAPPINGS: DocMappingRegistry = {
  // 商业发票 → VehicleItem
  invoice: [
    ...BASE_VEHICLE,
    ...SPEC_PARAMS,
    ...EXPORT_LICENSE_VEHICLE,
  ],

  // 装箱单 → VehicleItem（与商业发票结构相同）
  "packing-list": [
    ...BASE_VEHICLE,
    ...SPEC_PARAMS,
    ...EXPORT_LICENSE_VEHICLE,
  ],

  // 出口合同 → VehicleItem（与商业发票结构相同）
  contract: [
    ...BASE_VEHICLE,
    ...SPEC_PARAMS,
    ...EXPORT_LICENSE_VEHICLE,
  ],

  // 报关预录（海关出口货物报关单）→ VehicleItem
  "customs-declaration": [
    ...BASE_VEHICLE,
    ...SPEC_PARAMS,
    ...EXPORT_LICENSE_VEHICLE,
  ],

  // 形式发票 → 自有 Vehicle 接口
  "proforma-invoice": [
    { source: "vin", target: "vin" },
    { source: "brand", target: "brand" },
    { source: "model", target: "model" },
    { source: "fuelType", target: "energy", transform: "fuel-type-cn-to-en" },
    { source: "power", target: "power" },
    { source: "curbWeight", target: "net", transform: "to-number" },
    { source: "grossMass", target: "gross", transform: "to-number" },
  ],

  // 准入声明 → 自有 Vehicle 接口
  "compliance-declaration": [
    { source: "vin", target: "vin" },
    { source: "brand", target: "brand" },
    { source: "model", target: "model" },
  ],

  // 出口报关单预录 → 自有 Vehicle 接口
  "export-declaration": [
    { source: "vin", target: "vin" },
    { source: "brand", target: "brand" },
    { source: "model", target: "model" },
    { source: "registrationDate", target: "manufactureDate" },
    { source: "engineNumber", target: "engineNo" },
    { source: "color", target: "color" },
  ],

  // 出口许可证（附加信息表）→ ExportLicenseData
  "export-license": [
    { source: "vin", target: "vin" },
    { source: "brand", target: "brandCn" },
    { source: "brand", target: "brandEn" },
    { source: "model", target: "modelCn" },
    { source: "model", target: "modelEn" },
    { source: "engineNumber", target: "engineMode" },
    { source: "ownerName", target: "ownerNameCn" },
    { source: "ownerName", target: "ownerNameEn" },
    { source: "ownerAddress", target: "ownerAddressCn" },
    { source: "ownerAddress", target: "ownerAddressEn" },
    { source: "usageNature", target: "purposeCn" },
    { source: "usageNature", target: "purposeEn", transform: "purpose-cn-to-en" },
    { source: "seatingCapacity", target: "seatingCapacity" },
    { source: "curbWeight", target: "vehicleWeightKg" },
    { source: "grossMass", target: "grossVehicleWeightKg" },
    { source: "fuelType", target: "fuelTypeCn" },
    { source: "fuelType", target: "fuelTypeEn", transform: "fuel-type-cn-to-en-short" },
  ],
};

// ─── 应用映射核心函数 ──────────────────────────────────────────

/**
 * 将 vehicle_archives 的一行数据，按映射表转换为单证所需的字段集合。
 * 特殊处理 dimensions → lengthMm/widthMm/heightMm 的拆分。
 */
export function applyMapping(
  vehicle: VehicleArchive,
  docType: keyof DocMappingRegistry
): Record<string, unknown> {
  const mappings = DOCUMENT_MAPPINGS[docType];
  if (!mappings) return {};

  const result: Record<string, unknown> = {};

  for (const m of mappings) {
    const rawValue = vehicle[m.source];
    if (rawValue === null || rawValue === undefined) continue;

    let value: unknown = rawValue;

    // 应用转换
    if (m.transform) {
      if (typeof m.transform === "string") {
        value = BUILTIN_TRANSFORMS[m.transform]?.(rawValue, vehicle) ?? rawValue;
      } else {
        value = m.transform(rawValue, vehicle);
      }
    }

    result[m.target] = value;
  }

  // 特殊处理：dimensions 拆分为 lengthMm / widthMm / heightMm
  if (vehicle.dimensions) {
    const dims = getDimensionsParts(vehicle);
    if (dims.lengthMm) result["lengthMm"] = dims.lengthMm;
    if (dims.widthMm) result["widthMm"] = dims.widthMm;
    if (dims.heightMm) result["heightMm"] = dims.heightMm;
  }

  return result;
}

/**
 * 获取某个单证类型支持填充的字段列表（用于 UI 提示）
 */
export function getFillableFields(docType: keyof DocMappingRegistry): string[] {
  const mappings = DOCUMENT_MAPPINGS[docType];
  if (!mappings) return [];
  const fields = new Set(mappings.map((m) => m.target));
  // 特殊处理 dimensions 的三个子字段
  if (fields.has("lengthMm") || fields.has("widthMm") || fields.has("heightMm")) {
    fields.add("lengthMm");
    fields.add("widthMm");
    fields.add("heightMm");
  }
  return Array.from(fields);
}