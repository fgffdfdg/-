/**
 * 出口报关单预录单类型定义
 *
 * 对应中华人民共和国海关出口货物报关单（A4 横向）的标准栏目结构。
 * 所有编码字段同时保留 code 和 name，便于预览时输出"名称(代码)"格式。
 *
 * ═══════════════════════════════════════════════════════════════
 * 迁移指引：旧类型已标记 @deprecated，新代码请使用领域模型层
 *   import { Party, CustomsVehicle } from '@/lib/domain';
 * ═══════════════════════════════════════════════════════════════
 */

/** 报关单商品明细行（车辆或其他货品）
 * @deprecated 使用领域模型 `CustomsVehicle`（@/lib/domain/vehicle.ts）替代。
 * 旧 DeclarationGoodsItem 继续可用，新代码优先使用 CustomsVehicle。
 */
export interface DeclarationGoodsItem {
  id: string;
  /** 项号（从 1 开始，由前端自动维护） */
  itemNo: number;
  /** 商品编码 10 位 HS code */
  hsCode: string;
  /** 商品名称及规格型号（自由文本，允许 \n 分隔多行描述） */
  goodsDescription: string;
  /** 数量（数字） */
  quantity: number;
  /** 法定第一计量单位 code，如 001=辆 */
  unitCode: string;
  /** 单价（4位小数） */
  unitPrice: number;
  /** 总价（2位小数） */
  totalPrice: number;
  /** 币制 code，如 502=美元 */
  currencyCode: string;
  /** 原产国 code ISO alpha-3，如 CHN */
  originCountryCode: string;
  /** 最终目的国 code */
  finalDestinationCode: string;
  /** 境内货源地 code（5位） */
  domesticSourceCode: string;
  /** 境内货源地名称（由 code 回填，用于预览/打印） */
  domesticSourceName?: string;
  /** 征免 code（1位），如 1=照章征税 */
  dutyExemptionCode: string;
  /** 毛重（千克） */
  grossWeight: number;
  /** 净重（千克） */
  netWeight: number;
  /** 件数 */
  packages: number;
  /** VIN / 车架号（备注展示） */
  vin?: string;
}

/** 企业信息（用于发货人/收货人/生产销售单位）
 * @deprecated 使用领域模型 `Party`（@/lib/domain/party.ts）替代。
 * 字段差异：Party 额外包含 nameEn、addressEn、country、countryCode、contactEn、email、keyNo。
 */
export interface DeclarationParty {
  /** 统一社会信用代码或国别注册号 */
  code: string;
  name: string;
  /** 可选：地址、联系方式，用于备注或打印 */
  address?: string;
  contact?: string;
  phone?: string;
}

/** 报关单完整数据 */
export interface CustomsDeclarationFull {
  /** 数据库 ID（新建时为空） */
  id?: string;
  /** 录入编号（系统自动生成，如 ED20260715001） */
  entryNo: string;
  /** 海关编号（18位，可空，通常海关审核后返回） */
  customsNo: string;
  /** LOGO 图片地址（为空时预览使用默认海关徽记） */
  logoUrl?: string;
  /** 印章图片 base64 data URL */
  stampDataUrl?: string;
  /** 印章水平位置（% 相对于 sheet 左边缘） */
  stampX?: number;
  /** 印章垂直位置（% 相对于 sheet 下边缘） */
  stampY?: number;
  /** 印章宽度（px，按 100% 缩放） */
  stampWidth?: number;
  /** 印章高度（px，按 100% 缩放） */
  stampHeight?: number;
  /** 页码/页数，如 "1 / 1" */
  pageInfo: string;
  /** 出口日期 YYYY-MM-DD */
  exportDate: string;
  /** 申报日期 YYYY-MM-DD */
  declareDate: string;
  /** 备案号 */
  recordNo: string;

  /** 境内发货人 */
  consignor: DeclarationParty;
  /** 境外收货人 */
  consignee: DeclarationParty;
  /** 生产销售单位（默认同境内发货人） */
  manufacturer: DeclarationParty;
  /** 是否生产销售单位同发货人 */
  manufacturerSameAsConsignor: boolean;

  /** 出境关别 code（4位），如 5166 */
  exitCustomsCode: string;
  /** 出境关别名称 */
  exitCustomsName: string;

  /** 运输方式 code（1位），如 2=水路运输 */
  transportModeCode: string;
  transportModeName: string;
  /** 运输工具名称及航次号 */
  transportInfo: string;
  /** 提运单号 */
  blNo: string;

  /** 监管方式 code，如 0110=一般贸易 */
  supervisionCode: string;
  supervisionName: string;
  /** 征免性质 code，如 101=一般征税 */
  dutyNatureCode: string;
  dutyNatureName: string;
  /** 许可证号 */
  licenseNo: string;

  /** 合同协议号 */
  contractNo: string;

  /** 贸易国（地区）code ISO alpha-3 */
  tradeCountryCode: string;
  tradeCountryName: string;
  /** 运抵国（地区）code */
  arrivalCountryCode: string;
  arrivalCountryName: string;
  /** 指运港 code（5位，可能是国家级聚合代码如 BGR000） */
  destinationPortCode: string;
  destinationPortName: string;
  /** 离境口岸（文字，通常与出境关别一致，可不同） */
  departurePort: string;

  /** 包装种类 code */
  packageCode: string;
  packageName: string;
  /** 件数（汇总，可由商品明细汇总） */
  packageCount: number;
  /** 包装件数 */
  packingCount: number;
  /** 毛重（千克，汇总） */
  grossWeight: number;
  /** 净重（千克，汇总） */
  netWeight: number;

  /** 成交方式 code，如 3=FOB */
  incotermCode: string;
  incotermName: string;
  /** 运费（格式：币种/金额/标记，如 "502/500/3"） */
  freight: string;
  /** 保费 */
  insurance: string;
  /** 杂费 */
  otherFees: string;

  /** 随附单证及编号 */
  attachedDocs: string;
  /** 标记唛码及备注（VIN 自动追加） */
  marks: string;
  /** 集装箱号 */
  containerNo: string;
  /** 封条号 */
  sealNo: string;

  /** 商品明细 */
  goods: DeclarationGoodsItem[];

  /** 特殊关系确认：是/否 */
  specialRelation: boolean;
  /** 价格影响确认 */
  priceInfluence: boolean;
  /** 支付特许权使用费确认 */
  royaltyPayment: boolean;
  /** 自报自缴 */
  selfDeclare: boolean;

  /** 报关人员 */
  declarantName: string;
  declarantCertNo: string;
  declarantPhone: string;

  /** 海关批注及签章 */
  customsRemark: string;

  /** 申报单位签章名称（一般为发货人） */
  declaringEntity: string;

  /** 状态：draft 草稿 / submitted 待申报 / archived 已归档 */
  status: 'draft' | 'submitted' | 'archived';

  /** 元数据 */
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
}

let __itemCounter = 0;
export function newGoodsItem(partial?: Partial<DeclarationGoodsItem>): DeclarationGoodsItem {
  __itemCounter += 1;
  return {
    id: `g_${Date.now()}_${__itemCounter}`,
    itemNo: 0,
    hsCode: '',
    goodsDescription: '',
    quantity: 1,
    unitCode: '001',
    unitPrice: 0,
    totalPrice: 0,
    currencyCode: '502',
    originCountryCode: 'CHN',
    finalDestinationCode: '',
    domesticSourceCode: '',
    dutyExemptionCode: '1',
    grossWeight: 0,
    netWeight: 0,
    packages: 1,
    vin: '',
    ...partial,
  };
}

/** 生成录入编号：ED + YYYYMMDD + 3位随机/序号（仅前端预览用，真实编号由服务端按申报日期+流水生成） */
export function generateEntryNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `ED${y}${m}${day}${seq}`;
}

/**
 * 生成海关编号：
 * 第 1 位：进出口标志（E=出口 / I=进口）
 * 第 2-5 位：年份
 * 第 6-9 位：关区代码（出境关别 4 位）
 * 第 10-18 位：9 位流水号
 */
export function generateCustomsNo(exitCustomsCode = '5166', isExport = true, year?: number): string {
  const code = (exitCustomsCode || '5166').replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
  const y = year ?? new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900000000) + 100000000);
  return `${isExport ? 'E' : 'I'}${y}${code}${seq}`;
}

/** 生成合同号 */
export function generateContractNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 90) + 10);
  return `${y}${m}${d}-${seq}-C`;
}

/** 默认报关单 */
export function getDefaultDeclaration(): CustomsDeclarationFull {
  const today = new Date().toISOString().split('T')[0];
  const consignor: DeclarationParty = {
    code: '',
    name: '',
  };
  return {
    entryNo: '', // 预录入编号由服务端在保存时按"ED+YYYYMMDD+3位流水"生成
    customsNo: generateCustomsNo('5166', true),
    pageInfo: '1 / 1',
    exportDate: '',
    declareDate: today,
    recordNo: '',

    consignor,
    consignee: { code: '', name: '' },
    manufacturer: { ...consignor },
    manufacturerSameAsConsignor: true,

    exitCustomsCode: '5166',
    exitCustomsName: '南沙新港',

    transportModeCode: '2',
    transportModeName: '水路运输',
    transportInfo: '',
    blNo: '',

    supervisionCode: '0110',
    supervisionName: '一般贸易',
    dutyNatureCode: '101',
    dutyNatureName: '一般征税',
    licenseNo: '',

    contractNo: generateContractNo(),

    tradeCountryCode: 'HKG',
    tradeCountryName: '中国香港',
    arrivalCountryCode: '',
    arrivalCountryName: '',
    destinationPortCode: '',
    destinationPortName: '',
    departurePort: '南沙新港',

    packageCode: '1',
    packageName: '裸装',
    packageCount: 1,
    packingCount: 0,
    grossWeight: 0,
    netWeight: 0,

    incotermCode: '3',
    incotermName: 'FOB',
    freight: '',
    insurance: '',
    otherFees: '',

    attachedDocs: '',
    marks: 'N/M',
    containerNo: '',
    sealNo: '',

    goods: [],

    specialRelation: false,
    priceInfluence: false,
    royaltyPayment: false,
    selfDeclare: false,

    declarantName: '',
    declarantCertNo: '',
    declarantPhone: '',

    customsRemark: '',
    declaringEntity: '',

    status: 'draft',
  };
}

/** 必填字段校验结果 */
export interface ValidationIssue {
  field: string;
  label: string;
  message: string;
}

const REQUIRED_LABELS: Record<string, string> = {
  consignor: '境内发货人',
  consignee: '境外收货人',
  manufacturer: '生产销售单位',
  exitCustomsCode: '出境关别',
  transportModeCode: '运输方式',
  supervisionCode: '监管方式',
  dutyNatureCode: '征免性质',
  contractNo: '合同协议号',
  tradeCountryCode: '贸易国（地区）',
  arrivalCountryCode: '运抵国（地区）',
  destinationPortCode: '指运港',
  packageCode: '包装种类',
  incotermCode: '成交方式',
  declarantName: '报关人员',
};

export function validateDeclaration(data: CustomsDeclarationFull): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.consignor.name) {
    issues.push({ field: 'consignor', label: REQUIRED_LABELS.consignor, message: '请选择境内发货人' });
  }
  if (!data.consignee.name) {
    issues.push({ field: 'consignee', label: REQUIRED_LABELS.consignee, message: '请填写境外收货人' });
  }
  if (!data.manufacturerSameAsConsignor && !data.manufacturer.name) {
    issues.push({ field: 'manufacturer', label: REQUIRED_LABELS.manufacturer, message: '请填写生产销售单位' });
  }
  if (!data.exitCustomsCode) {
    issues.push({ field: 'exitCustomsCode', label: REQUIRED_LABELS.exitCustomsCode, message: '请选择出境关别' });
  }
  if (!data.transportModeCode) {
    issues.push({ field: 'transportModeCode', label: REQUIRED_LABELS.transportModeCode, message: '请选择运输方式' });
  }
  if (!data.supervisionCode) {
    issues.push({ field: 'supervisionCode', label: REQUIRED_LABELS.supervisionCode, message: '请选择监管方式' });
  }
  if (!data.dutyNatureCode) {
    issues.push({ field: 'dutyNatureCode', label: REQUIRED_LABELS.dutyNatureCode, message: '请选择征免性质' });
  }
  if (!data.contractNo.trim()) {
    issues.push({ field: 'contractNo', label: REQUIRED_LABELS.contractNo, message: '请填写合同协议号' });
  }
  if (!data.tradeCountryCode) {
    issues.push({ field: 'tradeCountryCode', label: REQUIRED_LABELS.tradeCountryCode, message: '请选择贸易国' });
  }
  if (!data.arrivalCountryCode) {
    issues.push({ field: 'arrivalCountryCode', label: REQUIRED_LABELS.arrivalCountryCode, message: '请选择运抵国' });
  }
  if (!data.destinationPortCode) {
    issues.push({ field: 'destinationPortCode', label: REQUIRED_LABELS.destinationPortCode, message: '请选择指运港' });
  }
  if (!data.packageCode) {
    issues.push({ field: 'packageCode', label: REQUIRED_LABELS.packageCode, message: '请选择包装种类' });
  }
  if (!data.incotermCode) {
    issues.push({ field: 'incotermCode', label: REQUIRED_LABELS.incotermCode, message: '请选择成交方式' });
  }
  if (!data.goods || data.goods.length === 0) {
    issues.push({ field: 'goods', label: '商品明细', message: '至少添加 1 项商品明细' });
  } else {
    data.goods.forEach((g, idx) => {
      const row = idx + 1;
      if (!g.hsCode) {
        issues.push({ field: `goods[${idx}].hsCode`, label: `第${row}项商品编码`, message: `第${row}项请选择商品编码` });
      }
      if (!g.goodsDescription.trim()) {
        issues.push({ field: `goods[${idx}].goodsDescription`, label: `第${row}项商品名称`, message: `第${row}项请填写商品名称及规格型号` });
      }
      if (!g.quantity || g.quantity <= 0) {
        issues.push({ field: `goods[${idx}].quantity`, label: `第${row}项数量`, message: `第${row}项数量必须大于0` });
      }
      if (!g.domesticSourceCode) {
        issues.push({ field: `goods[${idx}].domesticSourceCode`, label: `第${row}项境内货源地`, message: `第${row}项请选择境内货源地` });
      }
      if (!g.finalDestinationCode) {
        issues.push({ field: `goods[${idx}].finalDestinationCode`, label: `第${row}项最终目的国`, message: `第${row}项请选择最终目的国` });
      }
    });
  }

  return issues;
}

/** 汇总字段：从商品明细自动汇总件数/毛重/净重/总价 */
export function summarizeGoods(data: CustomsDeclarationFull): {
  packageCount: number;
  grossWeight: number;
  netWeight: number;
  totalAmount: number;
  totalQuantity: number;
} {
  return data.goods.reduce(
    (acc, g) => {
      const qty = Number(g.quantity) || 0;
      acc.packageCount += (Number(g.packages) || 0) * qty;
      acc.grossWeight += (Number(g.grossWeight) || 0) * qty;
      acc.netWeight += (Number(g.netWeight) || 0) * qty;
      acc.totalAmount += (Number(g.totalPrice) || Number(g.unitPrice) * qty || 0);
      acc.totalQuantity += qty;
      return acc;
    },
    { packageCount: 0, grossWeight: 0, netWeight: 0, totalAmount: 0, totalQuantity: 0 },
  );
}
