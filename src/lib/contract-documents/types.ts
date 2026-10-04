/**
 * 合同/发票/装箱单归档类型定义
 */

export type ContractDocumentStatus = 'draft' | 'official' | 'archived';

export interface ContractDocument {
  id: string;
  userId: string | null;
  organizationId: string | null;
  contractNo: string | null;
  invoiceNo: string | null;
  packingListNo: string | null;
  vins: string[];
  fileKey: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  status: ContractDocumentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractDocumentInput {
  contractNo?: string;
  invoiceNo?: string;
  packingListNo?: string;
  vins: string[];
  status?: ContractDocumentStatus;
  notes?: string;
}

/** 判断文件是否为 PDF */
export function isPdfFile(fileName: string, mime: string): boolean {
  const lower = fileName.toLowerCase();
  return mime === 'application/pdf' || lower.endsWith('.pdf');
}

/** 把任意输入拆分成 VIN 数组 */
export function parseVins(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join('\n') : input;
  const tokens = raw
    .toUpperCase()
    .split(/[\s,;，；、\t\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(tokens));
}