// Document generation types
//
// ═══════════════════════════════════════════════════════════════
// 迁移指引：旧类型已标记 @deprecated，新代码请使用领域模型层
//   import { Party, TradeVehicle, CustomsVehicle, LicenseVehicle, ComplianceVehicle } from '@/lib/domain';
// ═══════════════════════════════════════════════════════════════

export type DocType = 'invoice' | 'packing-list' | 'contract';

/**
 * @deprecated 使用领域模型 `TradeVehicle`（@/lib/domain/vehicle.ts）替代。
 * 旧 VehicleItem 继续可用，但新代码优先使用分层的 TradeVehicle / CustomsVehicle / LicenseVehicle。
 */
export interface VehicleItem {
  id: string;
  vin: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // 报关单扩展字段 (customs declaration fields)
  energyType?: string;      // 能源类型: Battery Electric / Gasoline ...
  bodyType?: string;        // 车型: Passenger Vehicle / SUV ...
  power?: string;           // 功率 kW
  netWeight?: number;       // 净重 kg
  grossWeight?: number;     // 毛重 kg
  packages?: number;        // 件数
  marks?: string;           // 唛头
  hsCode?: string;          // HS 商品编码
  customsSpec?: string;     // 报关规格型号
  condition?: string;       // New / Used
  // 出口许可证附加信息表字段
  engineNo?: string;        // 发动机型号 / Engine Mode
  brandEn?: string;         // 品牌英文（如 Wuling）
  modelEn?: string;         // 车型英文（如 Hongguang MINIEV）
  purposeCn?: string;       // 使用性质（中文，如"非营运"）
  purposeEn?: string;       // Purpose（如"Private Use"）
  bodyStructureCn?: string; // 车身结构（如"5门4座两厢车"）
  seatingCapacity?: string; // 核定载客
  lengthMm?: string;        // 车辆长度 mm
  widthMm?: string;         // 车辆宽度 mm
  heightMm?: string;        // 车辆高度 mm
  mileageKm?: string;       // 里程表读数 km
  remarks?: string;         // 明细行备注（发票/合同车辆明细备注栏，自由填写）
}

/**
 * @deprecated 使用领域模型 `Party`（@/lib/domain/party.ts）替代。
 * 字段差异：Party 额外包含 code（统一社会信用代码）、countryCode（ISO）、keyNo（电子钥匙编号）。
 */
export interface CompanyInfo {
  name: string;
  nameEn?: string;
  address: string;
  addressEn?: string;
  country: string;
  countryEn?: string;
  contact: string;
  contactEn?: string;
  phone: string;
  email: string;
}

/** 统一交易文档数据 - 一次填写，生成合同/发票/装箱单三份文档 */
export interface TradeDocumentsData {
  /** 统一交易编号（不含前缀），如 TD-2025-001 */
  tradeNo: string;
  /** 交易日期 */
  tradeDate: string;

  /** 卖方（出口商）信息 */
  seller: CompanyInfo;
  /** 买方（进口商）信息 */
  buyer: CompanyInfo;
  /** 收货人（可与买方相同） */
  consignee: CompanyInfo;
  /** 收货人是否与买方相同 */
  sameAsBuyer: boolean;

  /** 车辆清单 */
  vehicles: VehicleItem[];

  /** 交易总额 */
  totalAmount: number;
  /** 币种 */
  currency: string;
  /** 付款方式 */
  paymentTerms: string;
  /** 贸易术语 */
  incoterm: string;

  /** 启运港 */
  loadingPort: string;
  loadingPortEn?: string;
  /** 目的港 */
  destinationPort: string;
  destinationPortEn?: string;
  /** 运输方式 */
  transportMode: string;

  // --- 合同专属字段 ---
  /** 签约地点 */
  signPlace: string;
  /** 交货日期 */
  deliveryDate: string;
  /** 检验条款 */
  inspectionTerms: string;
  /** 质保条款 */
  warrantyTerms: string;
  /** 适用法律 */
  governingLaw: string;

  // --- 装箱单专属字段 ---
  /** 船名 */
  vesselName: string;
  /** 航次 */
  voyageNo: string;
  /** 提单号 */
  blNo: string;
  /** 集装箱号 */
  containerNo: string;
  /** 封条号 */
  sealNo: string;
  /** 集装箱类型 */
  containerType: string;

  /** 备注 */
  remarks: string;
  remarksEn?: string;
}

/**
 * 新建单证页面表单数据（ZEEX AUTO 格式）
 * 三段式：01 买方信息 + 02 订单与运输 + 03 车辆清单
 */
export interface TradeDocumentsFormData {
  seller: CompanyInfo;
  buyer: { name: string; nameEn: string; address: string; addressEn: string; country: string; countryEn: string; tel: string; email: string; contact: string };
  /** 收货人是否与买方相同 */
  sameAsBuyer: boolean;
  /** 收货人（与买方不同时填写） */
  consignee: { name: string; nameEn: string; address: string; addressEn: string; country: string; countryEn: string; tel: string; email: string; contact: string };
  tradeInfo: {
    invoiceNo: string;
    invoiceDate: string;
    contractNo: string;
    signDate: string;
    signPlace: string;
    plNo: string;
    plDate: string;
    tradeTerm: string;
    tradePlace: string;
    currency: string;
    loadingPort: string;
    destination: string;
    latestLoadingDate: string;
    paymentTerms: string;
    tolerance: string;
  };
  vehicles: TradeDocumentsFormVehicle[];
}

export interface TradeDocumentsFormVehicle {
  condition: string;
  brand: string;
  brandEn: string;
  model: string;
  vin: string;
  energyType: string;
  power: string;
  bodyType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: string;
  grossWeight: string;
  packages: number;
  marks: string;
  /** 明细行备注（发票/合同车辆明细备注栏，自由填写） */
  remarks: string;
}

/** 从 TradeDocumentsData 生成 InvoiceData */
export function tradeToInvoiceData(t: TradeDocumentsData): InvoiceData {
  return {
    invoiceNo: `INV-${t.tradeNo}`,
    invoiceDate: t.tradeDate,
    seller: t.seller,
    buyer: t.buyer,
    vehicles: t.vehicles,
    totalAmount: t.totalAmount,
    currency: t.currency,
    paymentTerms: t.paymentTerms,
    tradeTerms: t.incoterm,
    tradePlace: '',
    loadingPort: t.loadingPortEn || t.loadingPort,
    destinationPort: t.destinationPortEn || t.destinationPort,
    remarks: t.remarksEn || t.remarks,
  };
}

/** 从 TradeDocumentsData 生成 PackingListData */
export function tradeToPackingListData(t: TradeDocumentsData): PackingListData {
  const grossWeight = t.vehicles.reduce((acc, v) => acc + (v.grossWeight || 0), 0);
  const netWeight = t.vehicles.reduce((acc, v) => acc + (v.netWeight || 0), 0);
  const totalPackages = t.vehicles.reduce((acc, v) => acc + (v.packages || 1), 0);
  return {
    plNo: `PL-${t.tradeNo}`,
    plDate: t.tradeDate,
    seller: t.seller,
    buyer: t.buyer,
    vessels: t.vesselName,
    voyage: t.voyageNo,
    blNo: t.blNo,
    containerNo: t.containerNo,
    sealNo: t.sealNo,
    containerType: t.containerType,
    vehicles: t.vehicles,
    grossWeight,
    netWeight,
    totalPackages,
    remarks: t.remarksEn || t.remarks,
  };
}

/** 从 TradeDocumentsData 生成 ContractData */
export function tradeToContractData(t: TradeDocumentsData): ContractData {
  return {
    contractNo: `CON-${t.tradeNo}`,
    signDate: t.tradeDate,
    signPlace: t.signPlace,
    seller: t.seller,
    buyer: t.buyer,
    vehicles: t.vehicles,
    totalAmount: t.totalAmount,
    currency: t.currency,
    paymentTerms: t.paymentTerms,
    deliveryTerms: t.incoterm,
    loadingPort: t.loadingPortEn || t.loadingPort,
    destinationPort: t.destinationPortEn || t.destinationPort,
    deliveryDate: t.deliveryDate,
    inspectionTerms: t.inspectionTerms,
    warrantyTerms: t.warrantyTerms,
    governingLaw: t.governingLaw,
    tolerance: '',
    remarks: t.remarksEn || t.remarks,
  };
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  seller: CompanyInfo;
  buyer: CompanyInfo;
  consignee?: CompanyInfo;
  vehicles: VehicleItem[];
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  tradeTerms: string;
  /** Incoterm 对应的地点（装运港/目的港/交货地，取决于所选术语） */
  tradePlace: string;
  loadingPort: string;
  destinationPort: string;
  remarks: string;
}

export interface PackingListData {
  plNo: string;
  plDate: string;
  seller: CompanyInfo;
  buyer: CompanyInfo;
  vessels: string;
  voyage: string;
  blNo: string;
  containerNo: string;
  sealNo: string;
  containerType: string;
  vehicles: VehicleItem[];
  grossWeight: number;
  netWeight: number;
  totalPackages: number;
  remarks: string;
}

export interface ContractData {
  contractNo: string;
  signDate: string;
  signPlace: string;
  seller: CompanyInfo;
  buyer: CompanyInfo;
  consignee?: CompanyInfo;
  vehicles: VehicleItem[];
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  deliveryTerms: string;
  loadingPort: string;
  destinationPort: string;
  deliveryDate: string;
  inspectionTerms: string;
  warrantyTerms: string;
  governingLaw: string;
  tolerance: string;
  remarks: string;
}

/**
 * 中华人民共和国海关出口货物报关单
 * @deprecated 使用 CustomsDeclarationFull from @/lib/customs-declaration/types 替代。
 * 新报关单模块位于 src/components/customs-declaration/，旧版仅保留兼容。
 * 参考报关单标准格式（A4 横向），字段命名与海关报关单一致。
 */
export interface CustomsDeclarationData {
  // 顶部编号
  entryNo: string;          // 录入编号
  customsNo: string;        // 海关编号
  pageInfo: string;         // 页码 / 页数 (e.g. "1 / 1")

  // 日期
  exportDate: string;       // 出口日期
  declareDate: string;      // 申报日期
  recordNo: string;         // 备案号

  // 境内发货人 / 生产销售单位
  consignorCode: string;    // 发货人统一社会信用代码（留空则使用 seller 的 taxId 或空）

  // 出境关别
  exitCustomsCode: string;  // 出境关别代码
  exitCustomsName: string;  // 出境关别

  // 境外收货人（默认使用 buyer.name）
  // 直接使用 buyer 字段

  // 运输
  transportModeCode: string; // 运输方式代码 (e.g. "2")
  transportModeName: string; // 运输方式 (e.g. "水路运输")
  transportInfo: string;     // 运输工具名称及航次号
  blNo: string;              // 提运单号

  // 监管方式 / 征免性质
  supervisionCode: string;   // 监管方式代码 e.g. "0110"
  supervisionName: string;   // 监管方式 e.g. "一般贸易"
  dutyCode: string;          // 征免性质代码 e.g. "101"
  dutyName: string;          // 征免性质 e.g. "一般征税"
  licenseNo: string;         // 许可证号

  // 合同协议号 → 复用 invoiceNo / contractNo
  contractNo: string;

  // 贸易国 / 运抵国 / 指运港 / 离境口岸
  tradeCountryCode: string;
  tradeCountryName: string;
  arrivalCountryCode: string;
  arrivalCountryName: string;
  destinationPortCode: string;
  destinationPortName: string;
  departurePort: string;     // 离境口岸

  // 包装
  packageCode: string;       // 包装种类代码 e.g. "1"
  packageName: string;       // 包装种类 e.g. "裸装"

  // 成交方式 / 运费 / 保费 / 杂费
  incoterm: string;          // 成交方式 e.g. FOB / CIF
  freight: string;
  insurance: string;
  otherFees: string;

  // 随附单证 / 标记唛码
  attachedDocs: string;
  marks: string;             // 标记唛码及备注

  // 集装箱信息（备注）
  containerNo: string;
  sealNo: string;

  // 币种
  currency: string;

  // 原产国 / 最终目的国 / 境内货源地 / 征免
  originCountry: string;     // e.g. "中国(CHN)"
  finalDestination: string;  // 最终目的国
  domesticSource: string;    // 境内货源地
  dutyExemption: string;     // 征免 e.g. "照章征税(1)"

  // 确认项
  specialRelation: string;   // 特殊关系确认: 是/否
  priceInfluence: string;    // 价格影响确认: 是/否
  royaltyPayment: string;    // 支付特许权使用费确认: 是/否
  selfDeclare: string;       // 自报自缴: 是/否

  // 报关人员
  declarantName: string;
  declarantCertNo: string;
  declarantPhone: string;

  // 海关批注
  customsRemark: string;

  // 关联信息
  seller: CompanyInfo;
  buyer: CompanyInfo;
  vehicles: VehicleItem[];
}

/**
 * 出口许可证附加信息表（Supplementary Information Form for Export License）
 * 单车单表，字段参照真实单证格式
 */
export interface ExportLicenseData {
  licenseNo: string;        // 许可证号
  issueDate: string;        // 发证日期 YYYYMMDD
  vin: string;              // 车架号 VIN
  brandCn: string;          // 汽车品牌（中文）
  brandEn: string;          // Make
  modelCn: string;          // 车型（中文）
  modelEn: string;          // Model
  engineMode: string;       // 发动机型号
  ownerNameCn: string;      // 车主名称（中文）
  ownerNameEn: string;      // Owner Name
  ownerAddressCn: string;   // 车主地址（中文）
  ownerAddressEn: string;   // Owner Address
  purposeCn: string;        // 使用性质（中文，如"非营运"）
  purposeEn: string;        // Purpose（如"Private Use"）
  bodyStructure: string;    // 车身结构（如"5门4座两厢车"）
  seatingCapacity: string;  // 核定载客
  vehicleWeightKg: string;  // 车辆自重 kg
  grossVehicleWeightKg: string; // 车辆总质量 kg
  fuelTypeCn: string;       // 燃料类型（中文，如"电动"）
  fuelTypeEn: string;       // Fuel Type（如"Battery EV"）
  lengthMm: string;         // 车辆长度 mm
  widthMm: string;          // 车辆宽度 mm
  heightMm: string;         // 车辆高度 mm
  mileageKm: string;        // 里程表读数 km
  // 复用：车主信息通常等同卖方；ownerDifferent=true 时使用 owner* 独立字段
  seller: CompanyInfo;
  ownerDifferent?: boolean; // 车主与出口商/卖方是否不同
}

export function getDefaultExportLicense(): ExportLicenseData {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return {
    licenseNo: '',
    issueDate: `${yyyy}${mm}${dd}`,
    vin: '',
    brandCn: '',
    brandEn: '',
    modelCn: '',
    modelEn: '',
    engineMode: '',
    ownerNameCn: '',
    ownerNameEn: '',
    ownerAddressCn: '',
    ownerAddressEn: '',
    purposeCn: '非营运',
    purposeEn: 'Private Use',
    bodyStructure: '',
    seatingCapacity: '',
    vehicleWeightKg: '',
    grossVehicleWeightKg: '',
    fuelTypeCn: '',
    fuelTypeEn: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    mileageKm: '',
    seller: { ...defaultCompany },
  };
}

/**
 * 出口许可证明细行（主证第 12~17 栏）
 */
export interface ExportLicenseItem {
  id: string;
  specification: string; // 12. 规格、等级
  unit: string;          // 13. 单位（默认"辆"）
  quantity: number;      // 14. 数量
  currency: string;      // 15. 单价币种（CNY / USD / EUR / GBP / JPY）
  unitPriceUsd: number;  // 15. 单价（按所选币种计价）
  amountUsd: number;     // 16. 总值（按所选币种计价）
  amountInUsd: number;   // 17. 总值折美元（手动填写，USD 时自动等于 amountUsd）
}

/**
 * 中华人民共和国出口许可证（主证）
 */
export interface ExportLicenseMainData {
  // 1 & 2 出口商 / 发货人（按图片真实结构：电子钥匙编号 + 空行 + 统一社会信用代码 + 名称）
  exporterName: string;       // 出口商名称
  exporterKeyNo: string;      // 出口商电子钥匙编号（代码框上方，如 4401MACPQJKN0）
  exporterCode: string;       // 出口商统一社会信用代码（代码框下方，如 91440113MACPQJKN06）
  consignorName: string;      // 发货人名称
  consignorKeyNo: string;     // 发货人电子钥匙编号
  consignorCode: string;      // 发货人统一社会信用代码
  // 3 & 4 许可证号 / 有效期
  exportLicenseNo: string;    // 出口许可证号
  expiryDate: string;         // 出口许可证有效截止日期 YYYY年MM月DD日
  // 5 & 8 贸易方式 / 进口国
  termsOfTrade: string;       // 贸易方式 (一般贸易)
  countryOfPurchase: string;  // 进口国(地区)
  // 6 & 9 合同号 / 付款方式
  contractNo: string;
  payment: string;            // 汇付 / 信用证 等
  // 7 & 10 报关口岸 / 运输方式
  placeOfClearance: string;
  modeOfTransport: string;
  // 11 商品名称 + 编码 + 设备状态
  descriptionOfGoods: string;
  codeOfGoods: string;
  equipmentStatus: string;    // 设备状态: 旧 / 新
  // 12~17 明细行
  items: ExportLicenseItem[];
  // 19 备注
  supplementaryDetails: string;
  // 21 发证日期
  licenceDate: string;        // 发证日期 YYYY年MM月DD日
}

let __licenseItemCounter = 0;
export function newLicenseItem(): ExportLicenseItem {
  __licenseItemCounter += 1;
  return {
    id: `li_${Date.now()}_${__licenseItemCounter}`,
    specification: '',
    unit: '辆',
    quantity: 1,
    currency: 'CNY',
    unitPriceUsd: 0,
    amountUsd: 0,
    amountInUsd: 0,
  };
}

export function getDefaultExportLicenseMain(): ExportLicenseMainData {
  const now = new Date();
  const yyyy = now.getFullYear();
  const endOfYear = `${yyyy + 1}年12月31日`;
  const today = `${yyyy}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
  return {
    exporterName: '',
    exporterKeyNo: '',
    exporterCode: '',
    consignorName: '',
    consignorKeyNo: '',
    consignorCode: '',
    exportLicenseNo: '',
    expiryDate: endOfYear,
    termsOfTrade: '一般贸易',
    countryOfPurchase: '',
    contractNo: '',
    payment: '汇付',
    placeOfClearance: '',
    modeOfTransport: '',
    descriptionOfGoods: '',
    codeOfGoods: '',
    equipmentStatus: '旧',
    items: [newLicenseItem()],
    supplementaryDetails: '',
    licenceDate: today,
  };
}

export const defaultCompany: CompanyInfo = {
  name: '',
  nameEn: '',
  address: '',
  addressEn: '',
  country: '',
  countryEn: '',
  contact: '',
  contactEn: '',
  phone: '',
  email: '',
};

/** 生成空白的统一交易文档数据 */
export function getDefaultTradeDocuments(): TradeDocumentsData {
  const baseNo = `TD-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(3, '0')}`;
  return {
    tradeNo: baseNo,
    tradeDate: new Date().toISOString().split('T')[0],
    seller: { ...defaultCompany },
    buyer: { ...defaultCompany },
    consignee: { ...defaultCompany },
    sameAsBuyer: false,
    vehicles: [defaultVehicle()],
    totalAmount: 0,
    currency: 'USD',
    paymentTerms: '',
    incoterm: 'FOB',
    loadingPort: '',
    loadingPortEn: '',
    destinationPort: '',
    destinationPortEn: '',
    transportMode: '',
    signPlace: '',
    deliveryDate: '',
    inspectionTerms: '',
    warrantyTerms: '',
    governingLaw: '',
    vesselName: '',
    voyageNo: '',
    blNo: '',
    containerNo: '',
    sealNo: '',
    containerType: '',
    remarks: '',
    remarksEn: '',
  };
}

export const defaultVehicle = (): VehicleItem => ({
  id: crypto.randomUUID(),
  vin: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  energyType: 'Battery Electric',
  bodyType: 'Passenger Vehicle',
  power: '',
  netWeight: 0,
  grossWeight: 0,
  packages: 1,
  marks: 'N/M',
  hsCode: '',
  customsSpec: '',
  condition: 'Used',
});

export const energyTypeOptions = [
  'Battery Electric',
  'Plug-in Hybrid',
  'Hybrid',
  'Range-Extended Electric',
  'Gasoline',
  'Diesel',
];

export const energyTypeCnMap: Record<string, string> = {
  'Battery Electric': '纯电动',
  'Plug-in Hybrid': '插电式混合动力',
  'Hybrid': '混合动力',
  'Range-Extended Electric': '增程式电动',
  'Gasoline': '汽油',
  'Diesel': '柴油',
};

export const bodyTypeOptions = [
  'Passenger Vehicle',
  'Sedan',
  'SUV',
  'MPV',
  'Hatchback',
  'Pickup',
  'Commercial Vehicle',
];

export const bodyTypeCnMap: Record<string, string> = {
  'Passenger Vehicle': '乘用车',
  'Sedan': '轿车',
  'SUV': 'SUV',
  'MPV': 'MPV',
  'Hatchback': '两厢车',
  'Pickup': '皮卡',
  'Commercial Vehicle': '商用车',
};

export const conditionOptions = ['New', 'Used'];

export const currencyOptions = ['USD', 'EUR', 'CNY', 'GBP', 'CHF'];

export const incotermOptions = ['EXW', 'FCA', 'FOB', 'CIF', 'DDP'];

export const transportModeOptions = [
  { code: '2', name: '水路运输' },
  { code: '3', name: '铁路运输' },
  { code: '4', name: '公路运输' },
  { code: '5', name: '航空运输' },
  { code: '9', name: '其他运输' },
];

export const supervisionOptions = [
  { code: '0110', name: '一般贸易' },
  { code: '1210', name: '保税电商' },
  { code: '9610', name: '跨境电商零售' },
];

export const dutyNatureOptions = [
  { code: '101', name: '一般征税' },
  { code: '898', name: '免税' },
  { code: '799', name: '自有资金' },
];

export const packageTypeOptions = [
  { code: '1', name: '裸装' },
  { code: '2', name: '散装' },
  { code: '3', name: '托盘' },
  { code: '9', name: '其他' },
];

export const dutyExemptionOptions = [
  '照章征税(1)',
  '折半征税(2)',
  '全免(3)',
  '特案减免(4)',
  '随征免性质(5)',
  '保证金(6)',
  '保函(7)',
];

export const yesNoOptions = ['否', '是'];

/** @deprecated 使用 getDefaultCustomsDeclarationFull from @/lib/customs-declaration/types 替代 */
export const getDefaultCustomsDeclaration = (): CustomsDeclarationData => {
  const today = new Date().toISOString().split('T')[0];
  return {
    entryNo: '',
    customsNo: '',
    pageInfo: '1 / 1',
    exportDate: today,
    declareDate: today,
    recordNo: '',
    consignorCode: '',
    exitCustomsCode: '5166',
    exitCustomsName: '南沙新港',
    transportModeCode: '2',
    transportModeName: '水路运输',
    transportInfo: '',
    blNo: '',
    supervisionCode: '0110',
    supervisionName: '一般贸易',
    dutyCode: '101',
    dutyName: '一般征税',
    licenseNo: '',
    contractNo: `CD-${Date.now().toString(36).toUpperCase()}`,
    tradeCountryCode: '',
    tradeCountryName: '',
    arrivalCountryCode: '',
    arrivalCountryName: '',
    destinationPortCode: '',
    destinationPortName: '',
    departurePort: '',
    packageCode: '1',
    packageName: '裸装',
    incoterm: 'FOB',
    freight: '',
    insurance: '',
    otherFees: '',
    attachedDocs: '',
    marks: '',
    containerNo: '',
    sealNo: '',
    currency: 'USD',
    originCountry: '中国(CHN)',
    finalDestination: '',
    domesticSource: '',
    dutyExemption: '照章征税(1)',
    specialRelation: '否',
    priceInfluence: '否',
    royaltyPayment: '否',
    selfDeclare: '否',
    declarantName: '',
    declarantCertNo: '',
    declarantPhone: '',
    customsRemark: '',
    seller: { ...defaultCompany },
    buyer: { ...defaultCompany },
    vehicles: [defaultVehicle()],
  };
};


export const paymentTermsOptions = [
  'T/T 100% in advance',
  'T/T 30% deposit + 70% before shipment',
  'T/T 50% deposit + 50% after BL date',
  'L/C at sight',
  'D/P at sight',
  'D/A 30 days',
];

export const tradeTermsOptions = [
  'FOB Shanghai',
  'FOB Tianjin',
  'FOB Guangzhou',
  'CIF Lagos',
  'CIF Mombasa',
  'CFR Tema',
  'EXW Warehouse',
];

export const containerTypeOptions = [
  '20GP (20ft General Purpose)',
  '40GP (40ft General Purpose)',
  '40HC (40ft High Cube)',
  '20OT (20ft Open Top)',
  '40FR (40ft Flat Rack)',
];
