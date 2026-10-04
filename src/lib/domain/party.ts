/**
 * 领域模型 - 统一交易方（Party）
 *
 * 替代旧系统中的三套企业类型：
 *   - `CompanyInfo` (components/documents/types.ts)
 *   - `DeclarationParty` (lib/customs-declaration/types.ts)
 *   - `LicensePartyProfile` (lib/export-license/storage.ts)
 *
 * 所有单证模块中的卖方/买方/发货人/收货人/报关方
 * 统一使用此类型，通过角色（role）区分用途。
 */

/** 交易方统一类型 */
export interface Party {
  /** 数据库 ID（持久化后存在） */
  id?: string;

  // ── 基础标识 ──
  /** 中文名称（必填） */
  name: string;
  /** 英文名称 */
  nameEn?: string;
  /** 统一社会信用代码 / 国别注册号 */
  code?: string;

  // ── 联系方式 ──
  /** 中文地址 */
  address?: string;
  /** 英文地址 */
  addressEn?: string;
  /** 国家（中文） */
  country?: string;
  /** 国家代码（ISO alpha-3，如 CHN） */
  countryCode?: string;
  /** 联系人 */
  contact?: string;
  /** 联系人英文 */
  contactEn?: string;
  /** 电话 */
  phone?: string;
  /** 邮箱 */
  email?: string;

  // ── 许可证专用（可选）──
  /** 电子钥匙编号（出口许可证主证第 1/2 栏） */
  keyNo?: string;
}

/** Party 在交易中的角色 */
export type PartyRole =
  | 'seller'       // 卖方（出口商）
  | 'buyer'        // 买方（进口商）
  | 'consignor'    // 发货人
  | 'consignee'    // 收货人
  | 'manufacturer' // 生产销售单位
  | 'declarant';   // 报关人员 / 申报单位

/** 交易中的各方映射 */
export type TradeParties = Partial<Record<PartyRole, Party>>;

/** 创建空的 Party */
export function emptyParty(): Party {
  return {
    name: '',
    nameEn: '',
    code: '',
    address: '',
    addressEn: '',
    country: '',
    countryCode: '',
    contact: '',
    contactEn: '',
    phone: '',
    email: '',
    keyNo: '',
  };
}

/** 判断 Party 是否为空（未填写） */
export function isPartyEmpty(p: Party | undefined | null): boolean {
  if (!p) return true;
  return !p.name.trim() && !p.nameEn?.trim() && !p.code?.trim();
}

/** 从 Party 生成显示名称 */
export function partyDisplayName(p: Party | undefined | null): string {
  if (!p) return '';
  return p.name || p.nameEn || p.code || '';
}