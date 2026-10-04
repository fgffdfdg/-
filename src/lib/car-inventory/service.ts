/**
 * 车源管理 - 服务端数据访问层
 * 通过 Supabase 客户端操作 vehicle_archives 表，按 user_id + organization_id 隔离。
 */
import type {
  VehicleArchive,
  CreateVehicleArchivePayload,
  VehicleArchiveSummary,
  OcrParseResult,
} from "./types";
import {
  REGISTRATION_PRIORITY_FIELDS,
  LICENSE_ONLY_FIELDS,
  REGISTRATION_ONLY_FIELDS,
} from "./types";

/**
 * 合并行驶证和绿本的 OCR 解析结果
 *
 * 去重策略（三层优先级）：
 * 1. 绿本字段（非空时直接采用）— 权威性更高
 * 2. 行驶证字段（绿本为空时兜底）
 * 3. 绿本独有字段 / 行驶证独有字段直接取对应值
 */
export function mergeLicenseAndRegistration(
  licenseData?: Record<string, unknown> | null,
  registrationData?: Record<string, unknown> | null
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const license = licenseData ?? {};
  const reg = registrationData ?? {};

  // 排除 _extra / _example 等内部字段
  const isExtra = (k: string) => k.startsWith('_');

  // 1. 绿本优先字段：绿本非空取绿本，否则取行驶证
  for (const field of REGISTRATION_PRIORITY_FIELDS) {
    const regVal = reg[field];
    const licVal = license[field];
    if (regVal !== undefined && regVal !== null && regVal !== '') {
      result[field] = regVal;
    } else if (licVal !== undefined && licVal !== null && licVal !== '') {
      result[field] = licVal;
    }
  }

  // 2. 行驶证独有字段
  for (const field of LICENSE_ONLY_FIELDS) {
    const val = license[field];
    if (val !== undefined && val !== null && val !== '') {
      result[field] = val;
    }
  }

  // 3. 绿本独有字段（含 brand / model）
  for (const field of REGISTRATION_ONLY_FIELDS) {
    const val = reg[field];
    if (val !== undefined && val !== null && val !== '') {
      result[field] = val;
    }
  }

  // 4. 行驶证额外字段（不在优先级列表中的）
  for (const [key, val] of Object.entries(license)) {
    if (isExtra(key)) continue;
    if (result[key] !== undefined) continue; // 已由绿本覆盖
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  }

  // 5. 绿本额外字段（不在独有列表中的）
  for (const [key, val] of Object.entries(reg)) {
    if (isExtra(key)) continue;
    if (result[key] !== undefined) continue;
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  }

  // 6. 用户自定义字段初始化为空
  result.custom_model_name = null;
  result.tags = [];
  result.notes = null;
  result.custom_fields = {};

  // 7. 合并行驶证/绿本的 _extra 字段到 custom_fields
  const extraFields: Record<string, string> = {};
  const licExtra = (license._extra ?? {}) as Record<string, string>;
  const regExtra = (reg._extra ?? {}) as Record<string, string>;
  for (const [k, v] of Object.entries({ ...licExtra, ...regExtra })) {
    if (v) extraFields[k] = v;
  }
  if (Object.keys(extraFields).length > 0) {
    result.custom_fields = extraFields;
  }

  // 8. 数据来源标记
  const hasLicense = licenseData && Object.keys(licenseData).length > 0;
  const hasReg = registrationData && Object.keys(registrationData).length > 0;
  if (hasLicense && hasReg) {
    result.source = 'ocr_both';
  } else if (hasLicense) {
    result.source = 'ocr_license';
  } else if (hasReg) {
    result.source = 'ocr_cert';
  } else {
    result.source = 'manual';
  }

  return result;
}

/**
 * 将 OCR 原始响应转换为标准化的 Partial<CreateVehicleArchivePayload>
 * 用于在 API 层做字段映射时调用
 */
export function normalizeOcrResult(
  raw: Record<string, unknown>,
  source: "license" | "registration"
): OcrParseResult {
  try {
    return {
      success: true,
      data: raw as Partial<CreateVehicleArchivePayload>,
      raw,
    };
  } catch {
    return {
      success: false,
      data: {},
      raw,
      error: `解析 ${source === "license" ? "行驶证" : "绿本"} 结果失败`,
    };
  }
}