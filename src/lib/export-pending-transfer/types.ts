// 出口待转移 - 类型定义

import type { VehicleArchiveSummary } from "@/lib/car-inventory/types";

// ─── 附件类型 ─────────────────────────────────────────────────

export type AttachmentCategory =
  | "green_book"        // 绿本（机动车登记证书）
  | "driving_license"   // 行驶证
  | "invoice"           // 二手车统一交易发票
  | "temp_plate";       // 临牌

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  green_book: "绿本（机动车登记证书）",
  driving_license: "行驶证",
  invoice: "二手车统一交易发票",
  temp_plate: "临牌",
};

export interface AttachmentRecord {
  id: string;           // UUID
  fileKey: string;      // S3 key
  fileName: string;     // 原始文件名
  fileMime: string;     // MIME 类型
  fileSize: number;     // 文件大小（字节）
  category: AttachmentCategory;
  uploadedAt: string;   // 上传时间
}

// ─── 出口待转移记录 ────────────────────────────────────────────

export interface ExportPendingTransfer {
  id: string;
  userId: string;
  organizationId: string | null;
  vehicleArchiveId: string;
  status: "pending" | "transferred" | "cancelled";
  greenBookKeys: AttachmentRecord[];
  drivingLicenseKeys: AttachmentRecord[];
  invoiceKeys: AttachmentRecord[];
  tempPlateKeys: AttachmentRecord[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // 关联的车辆摘要（前端填充）
  vehicle?: VehicleArchiveSummary | null;
}

// ─── 创建/更新请求体 ──────────────────────────────────────────

export interface CreateExportPendingTransferInput {
  vehicleArchiveId: string;
  notes?: string;
}

export interface UpdateExportPendingTransferInput {
  status?: "pending" | "transferred" | "cancelled";
  notes?: string | null;
}

// ─── 列表查询参数 ─────────────────────────────────────────────

export interface ExportPendingTransferListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string; // 搜索 VIN/车牌/车型
}

// ─── 列表响应 ─────────────────────────────────────────────────

export interface ExportPendingTransferListResponse {
  items: ExportPendingTransfer[];
  total: number;
  page: number;
  limit: number;
}

// ─── 数据库记录类型（snake_case）────────────────────────────────

export interface ExportPendingTransferRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  vehicle_archive_id: string;
  status: string;
  green_book_keys: AttachmentRecord[];
  driving_license_keys: AttachmentRecord[];
  invoice_keys: AttachmentRecord[];
  temp_plate_keys: AttachmentRecord[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}