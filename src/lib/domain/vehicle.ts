/**
 * 领域模型 - 车辆（Vehicle）
 *
 * 替代旧系统中膨胀的 VehicleItem（components/documents/types.ts）。
 *
 * 设计原则：
 *   - VehicleBase：所有单证共用的最小字段集
 *   - VehicleSpecs：规格参数（按需混入）
 *   - 各单证专属类型：只包含自己需要的字段
 */

// ═══════════════════════════════════════════════════════════════
// 基础层
// ═══════════════════════════════════════════════════════════════

/** 车辆基础信息（所有单证共用） */
export interface VehicleBase {
  /** 车架号 VIN（核心关联键） */
  vin: string;
  /** 品牌（中文） */
  brand: string;
  /** 品牌（英文，如 Wuling） */
  brandEn?: string;
  /** 车型（中文） */
  model: string;
  /** 车型（英文，如 Hongguang MINIEV） */
  modelEn?: string;
  /** 年份（从注册日期提取） */
  year?: string;
  /** 颜色 */
  color?: string;
}

/** 车辆规格参数（按需混入到各单证 Vehicle 类型） */
export interface VehicleSpecs {
  /** 能源类型（英文，如 Battery Electric / Gasoline） */
  energyType?: string;
  /** 功率 kW */
  power?: string;
  /** 净重（整备质量）kg */
  netWeight?: number;
  /** 毛重（总质量）kg */
  grossWeight?: number;
  /** 发动机型号 */
  engineNo?: string;
  /** 核定载客 */
  seatingCapacity?: string;
  /** 车身尺寸：长 mm */
  lengthMm?: string;
  /** 车身尺寸：宽 mm */
  widthMm?: string;
  /** 车身尺寸：高 mm */
  heightMm?: string;
}

// ═══════════════════════════════════════════════════════════════
// 各单证专属 Vehicle 类型
// ═══════════════════════════════════════════════════════════════

/**
 * 发票/合同/装箱单用 Vehicle
 *
 * 交易单据中的车辆，关注价格、数量、包装。
 */
export interface TradeVehicle extends VehicleBase, VehicleSpecs {
  id?: string;
  /** 数量 */
  quantity: number;
  /** 单价 */
  unitPrice: number;
  /** 总价 */
  totalPrice: number;
  /** 件数 */
  packages?: number;
  /** 唛头 */
  marks?: string;
  /** 新旧状态 */
  condition?: 'New' | 'Used';
  /** 车身类型（如 Passenger Vehicle / SUV） */
  bodyType?: string;
}

/**
 * 报关单用 Vehicle
 *
 * 海关出口货物报关单的商品明细，关注 HS 编码、货源地、币制等。
 */
export interface CustomsVehicle extends VehicleBase, VehicleSpecs {
  id?: string;
  /** 项号（从 1 开始） */
  itemNo?: number;
  /** 商品编码 10 位 HS code */
  hsCode: string;
  /** 商品名称及规格型号（自由文本） */
  goodsDescription?: string;
  /** 数量 */
  quantity: number;
  /** 法定第一计量单位 code，如 001=辆 */
  unitCode?: string;
  /** 单价 */
  unitPrice: number;
  /** 总价 */
  totalPrice: number;
  /** 币制 code，如 502=美元 */
  currencyCode: string;
  /** 原产国 code ISO alpha-3 */
  originCountryCode: string;
  /** 最终目的国 code */
  finalDestinationCode: string;
  /** 境内货源地 code */
  domesticSourceCode: string;
  /** 境内货源地名称 */
  domesticSourceName?: string;
  /** 征免 code，如 1=照章征税 */
  dutyExemptionCode: string;
  /** 件数 */
  packages: number;
  /** 新旧状态 */
  condition: 'New' | 'Used';
}

/**
 * 许可证附加信息表用 Vehicle
 *
 * 出口许可证附加信息表（单车单表），关注车主信息、燃料类型、里程。
 */
export interface LicenseVehicle extends VehicleBase, VehicleSpecs {
  /** 车主名称（中文） */
  ownerNameCn: string;
  /** 车主名称（英文） */
  ownerNameEn: string;
  /** 车主地址（中文） */
  ownerAddressCn: string;
  /** 车主地址（英文） */
  ownerAddressEn: string;
  /** 使用性质（中文，如"非营运"） */
  purposeCn: string;
  /** 使用性质（英文，如"Private Use"） */
  purposeEn: string;
  /** 燃料类型（中文，如"电动"） */
  fuelTypeCn: string;
  /** 燃料类型（英文，如"Battery EV"） */
  fuelTypeEn: string;
  /** 车身结构（如"5门4座两厢车"） */
  bodyStructure?: string;
  /** 里程表读数 km */
  mileageKm?: string;
}

/**
 * 准入声明用 Vehicle
 *
 * 合规准入声明中的车辆，关注排放标准和新旧。
 */
export interface ComplianceVehicle extends VehicleBase {
  /** 新旧状态 */
  condition: 'New' | 'Used';
  /** 排放标准 */
  emissionStandard?: string;
}

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/** 创建空的 TradeVehicle */
export function emptyTradeVehicle(vin?: string): TradeVehicle {
  return {
    vin: vin ?? '',
    brand: '',
    model: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    packages: 1,
    marks: 'N/M',
    condition: 'Used',
  };
}

/** 创建空的 CustomsVehicle */
export function emptyCustomsVehicle(): CustomsVehicle {
  return {
    vin: '',
    brand: '',
    model: '',
    hsCode: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    currencyCode: '502',
    originCountryCode: 'CHN',
    finalDestinationCode: '',
    domesticSourceCode: '',
    dutyExemptionCode: '1',
    packages: 1,
    condition: 'Used',
  };
}

/** 创建空的 LicenseVehicle */
export function emptyLicenseVehicle(): LicenseVehicle {
  return {
    vin: '',
    brand: '',
    model: '',
    ownerNameCn: '',
    ownerNameEn: '',
    ownerAddressCn: '',
    ownerAddressEn: '',
    purposeCn: '非营运',
    purposeEn: 'Private Use',
    fuelTypeCn: '',
    fuelTypeEn: '',
    seatingCapacity: '',
  };
}