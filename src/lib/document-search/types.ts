/**
 * 单证统一检索 - 类型定义
 */

export type UnifiedDocType =
  | 'contract-invoice-pl'   // 发票·合同·装箱单
  | 'export-license'         // 出口许可证（已签发）
  | 'license-draft'          // 出口许可证（草单）
  | 'customs-declaration'    // 出口报关单（正式扫描件）
  | 'customs-draft'          // 出口报关单（草稿）
  | 'bl-document';           // 海运提单

export type DocStatus = 'draft' | 'official';

export interface DocTypeMeta {
  type: UnifiedDocType;
  label: string;
  color: string; // Tailwind color class for badge
}

/** 单证类型元数据 */
export const DOC_TYPE_META: Record<UnifiedDocType, DocTypeMeta> = {
  'contract-invoice-pl':  { type: 'contract-invoice-pl',  label: '发票·合同·装箱单', color: 'bg-blue-100 text-blue-700' },
  'export-license':       { type: 'export-license',       label: '出口许可证',       color: 'bg-green-100 text-green-700' },
  'license-draft':        { type: 'license-draft',        label: '许可证草单',       color: 'bg-yellow-100 text-yellow-700' },
  'customs-declaration':  { type: 'customs-declaration',  label: '出口报关单',       color: 'bg-purple-100 text-purple-700' },
  'customs-draft':        { type: 'customs-draft',        label: '报关单草稿',       color: 'bg-orange-100 text-orange-700' },
  'bl-document':          { type: 'bl-document',          label: '海运提单',         color: 'bg-cyan-100 text-cyan-700' },
};

export interface DocSearchResult {
  id: string;
  docType: UnifiedDocType;
  docTypeLabel: string;
  docNo: string | null;
  title: string | null;
  status: DocStatus;
  statusLabel: string;
  /** 关联编号 */
  relatedNos: {
    contractNo: string | null;
    invoiceNo: string | null;
    packingListNo: string | null;
    licenseNo: string | null;
    customsNo: string | null;
    blNo: string | null;
  };
  vins: string[];
  /** 文件信息 */
  hasFile: boolean;
  fileName: string | null;
  fileMime: string | null;
  /** 用来构造预览/下载 URL 的 source 标识 */
  source: string;
  /** 跳转到原单证模块的路由 */
  sourceRoute: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocSearchResponse {
  data: DocSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalCount: number;
    officialCount: number;
    draftCount: number;
    byType: Partial<Record<UnifiedDocType, number>>;
  };
}

export interface DocSearchParams {
  q: string;
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/** VIN 正则：17 位字母数字 */
export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

/** 判断输入是否为 VIN */
export function isVinQuery(q: string): boolean {
  return VIN_RE.test(q.trim().toUpperCase());
}