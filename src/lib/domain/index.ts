/**
 * 领域模型层 - 统一导出
 *
 * 整个 ExportDrive 平台的核心实体类型。
 * 所有单证模块应优先使用此层的类型，而非各自定义。
 */

// 交易方
export type {
  Party,
  PartyRole,
  TradeParties,
} from './party';
export {
  emptyParty,
  isPartyEmpty,
  partyDisplayName,
} from './party';

// 车辆
export type {
  VehicleBase,
  VehicleSpecs,
  TradeVehicle,
  CustomsVehicle,
  LicenseVehicle,
  ComplianceVehicle,
} from './vehicle';
export {
  emptyTradeVehicle,
  emptyCustomsVehicle,
  emptyLicenseVehicle,
} from './vehicle';

// 跨单证引用
export type {
  DocType,
  DocRef,
} from './doc-ref';
export {
  DOC_TYPE_LABELS,
  createDocRef,
  isSameDocRef,
  docRefDisplay,
} from './doc-ref';