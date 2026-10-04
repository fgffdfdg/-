/**
 * 数据联动系统 - 统一导出
 *
 * 正向联动：VIN → vehicle_archives 查询 → 字段映射 → 自动填充单证表单
 * 反向联动：合同号/发票号 → document_vehicle_links → 关联车辆 → 所有相关单证
 */
export { useVinAutoFill } from "./use-vin-autofill";
export { lookupByVin } from "./client";
export { applyMapping, DOCUMENT_MAPPINGS, getFillableFields } from "./mappings";
export { fetchVehicleByVin, fetchVehiclesByVins } from "./client";
export {
  linkVehiclesToDocument,
  getDocumentsByVin,
  getVinsByDocNo,
  removeDocumentLinks,
} from "./links-client";
export type { VehicleLink, LinkVehicleInput } from "./links-client";
export {
  fuelTypeCnToEn,
  fuelTypeCnToEnShort,
  purposeCnToEn,
  parseDimensions,
  getDimensionsParts,
  extractYear,
  toNumber,
  BUILTIN_TRANSFORMS,
} from "./transforms";
export type {
  DocTypeKey,
  FieldMapping,
  DocMappingRegistry,
  VinLookupResult,
  UseVinAutoFillReturn,
  ValueTransform,
} from "./types";
/** 文档类型，别名 */
export type DocType = import("./types").DocTypeKey;