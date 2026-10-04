/**
 * 出口许可证（云端版本）类型定义。
 *
 * 与 `src/storage/database/shared/schema.ts` 中 `exportLicenses` 表字段一一对应，
 * 字段统一使用 camelCase，序列化时由 API 层负责在 snake_case / camelCase 之间转换。
 */

export type ExportLicenseFileType = 'pdf' | 'image' | 'other';

export interface ExportLicense {
  id: string;
  userId: string | null;
  organizationId: string | null;
  licenseNo: string;
  fileName: string;
  /** 对象存储中的 key（非签名 URL），下载/预览时由 API 动态换签名 URL */
  fileKey: string;
  fileMime: string;
  fileSize: number;
  vins: string[];
  exporter: string | null;
  issueDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportLicenseInput {
  licenseNo: string;
  vins: string[];
  exporter?: string | null;
  issueDate?: string | null;
  note?: string | null;
}

export function detectFileType(fileName: string, mime: string): ExportLicenseFileType {
  const lower = fileName.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(lower))
    return 'image';
  return 'other';
}

/** 把任意输入拆分成 VIN 数组（支持换行、逗号、空格、分号、制表符、中文标点） */
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
