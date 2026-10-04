// 车源管理 - 类型定义

// ─── 车辆档案（完整字段）──────────────────────────────────────

export interface VehicleArchive {
  id: string;
  userId: string;
  organizationId?: string | null;

  // 核心标识
  vin?: string | null;
  plateNumber?: string | null;

  // 车辆基本信息
  vehicleType?: string | null;
  brand?: string | null;
  model?: string | null;
  brandModel?: string | null;
  engineNumber?: string | null;
  engineModel?: string | null;
  displacement?: string | null;
  power?: string | null;
  fuelType?: string | null;
  emissionStandard?: string | null;
  color?: string | null;
  manufacturer?: string | null;
  isNewEnergy: boolean;

  // 登记信息
  ownerName?: string | null;
  ownerAddress?: string | null;
  usageNature?: string | null;
  registrationDate?: string | null;
  issueDate?: string | null;
  registrationAuthority?: string | null;
  idNumber?: string | null;
  acquisitionMethod?: string | null;

  // 规格参数
  grossMass?: string | null;
  curbWeight?: string | null;
  seatingCapacity?: string | null;
  dimensions?: string | null;
  steeringType?: string | null;
  axles?: string | null;
  wheelbase?: string | null;
  tireCount?: string | null;
  ratedLoad?: string | null;
  towingCapacity?: string | null;
  cargoDimensions?: string | null;

  // 登记证书附加信息
  transferRecords?: unknown[] | null;
  mortgageRecords?: unknown[] | null;

  // 证件图片
  drivingLicenseImageUrl?: string | null;
  registrationCertImageUrl?: string | null;

  // 用户自定义
  customModelName?: string | null;
  modelRemark?: string | null;
  tags: string[];
  notes?: string | null;
  customFields: Record<string, string>;

  // 元数据
  source: "manual" | "ocr_license" | "ocr_cert" | "ocr_both" | "vin_query";
  status: "active" | "archived" | "temporary";
  createdAt: string;
  updatedAt: string;
}

// ─── 创建/更新请求体 ────────────────────────────────────────

export type CreateVehicleArchivePayload = Partial<
  Omit<VehicleArchive, "id" | "userId" | "organizationId" | "createdAt" | "updatedAt">
>;

export type UpdateVehicleArchivePayload = Partial<CreateVehicleArchivePayload>;

// ─── 列表查询参数 ────────────────────────────────────────────

export interface VehicleArchiveListParams {
  page?: number;
  limit?: number;
  q?: string; // 全文搜索（VIN/车牌/车型名/品牌型号）
  vin?: string; // 精确 VIN
  plateNumber?: string; // 精确车牌
  brand?: string;
  fuelType?: string;
  status?: "active" | "archived" | "temporary";
}

// ─── 列表响应 ────────────────────────────────────────────────

export interface VehicleArchiveListResponse {
  items: VehicleArchive[];
  total: number;
  page: number;
  limit: number;
}

// ─── 轻量检索结果（供其他模块调用）─────────────────────────────

export interface VehicleArchiveSummary {
  id: string;
  vin: string | null;
  plateNumber: string | null;
  brandModel: string | null;
  customModelName: string | null;
  modelRemark: string | null;
  vehicleType: string | null;
  color: string | null;
  fuelType: string | null;
  registrationDate: string | null;
  notes: string | null;
}

// ─── OCR 解析结果 ────────────────────────────────────────────

export interface OcrParseResult {
  success: boolean;
  data: Partial<CreateVehicleArchivePayload>;
  /** 原始 API 返回的完整数据，用于调试 */
  raw?: unknown;
  error?: string;
}

// ─── 合并请求（行驶证+绿本）───────────────────────────────────

export interface MergeRequest {
  /** 行驶证 OCR 解析结果 */
  licenseData?: Partial<CreateVehicleArchivePayload> | null;
  /** 绿本 OCR 解析结果 */
  registrationData?: Partial<CreateVehicleArchivePayload> | null;
}

// ─── 合并优先级配置 ──────────────────────────────────────────

/**
 * 绿本优先的字段列表（绿本非空时采用绿本值，否则用行驶证的值）
 */
/** 绿本优先字段（snake_case，与 API 返回的字段名一致） */
export const REGISTRATION_PRIORITY_FIELDS = [
  "vin",
  "plate_number",
  "vehicle_type",
  "owner_name",
  "engine_number",
  "gross_mass",
  "curb_weight",
  "seating_capacity",
  "dimensions",
] as const;

/** 行驶证独有字段 */
export const LICENSE_ONLY_FIELDS = [
  "owner_address",
  "usage_nature",
  "issue_date",
  "brand_model",
] as const;

/**
 * 绿本独有的字段（行驶证中没有，直接取绿本值）
 */
// ─── API 层类型（snake_case，与数据库列名一致）─────────────────

/** POST /api/car-inventory 请求体 */
export interface VehicleArchiveInput {
  vin?: string | null;
  plate_number?: string | null;
  vehicle_origin?: string | null;
  vehicle_type?: string | null;
  owner_name?: string | null;
  owner_address?: string | null;
  usage_nature?: string | null;
  brand?: string | null;
  model?: string | null;
  brand_model?: string | null;
  model_remark?: string | null;
  engine_number?: string | null;
  engine_model?: string | null;
  displacement?: string | null;
  power?: string | null;
  fuel_type?: string | null;
  emission_standard?: string | null;
  color?: string | null;
  manufacturer?: string | null;
  registration_date?: string | null;
  issue_date?: string | null;
  gross_mass?: string | null;
  curb_weight?: string | null;
  seating_capacity?: string | null;
  dimensions?: string | null;
  is_new_energy?: boolean;
  acquisition_method?: string | null;
  steering_type?: string | null;
  axles?: string | null;
  wheelbase?: string | null;
  tire_count?: string | null;
  rated_load?: string | null;
  towing_capacity?: string | null;
  cargo_dimensions?: string | null;
  transfer_records?: unknown[] | null;
  mortgage_records?: unknown[] | null;
  registration_authority?: string | null;
  id_number?: string | null;
  driving_license_image_url?: string | null;
  registration_cert_image_url?: string | null;
  custom_model_name?: string | null;
  tags?: string[];
  notes?: string | null;
  custom_fields?: Record<string, string>;
  source?: string;
  status?: string;
  organization_id?: string | null;
}

/** 数据库返回的记录类型（snake_case） */
export interface VehicleArchiveRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  vin: string | null;
  plate_number: string | null;
  vehicle_origin: string | null;
  vehicle_type: string | null;
  owner_name: string | null;
  owner_address: string | null;
  usage_nature: string | null;
  brand: string | null;
  model: string | null;
  brand_model: string | null;
  engine_number: string | null;
  engine_model: string | null;
  displacement: string | null;
  power: string | null;
  fuel_type: string | null;
  emission_standard: string | null;
  color: string | null;
  manufacturer: string | null;
  registration_date: string | null;
  issue_date: string | null;
  gross_mass: string | null;
  curb_weight: string | null;
  seating_capacity: string | null;
  dimensions: string | null;
  is_new_energy: boolean;
  acquisition_method: string | null;
  steering_type: string | null;
  axles: string | null;
  wheelbase: string | null;
  tire_count: string | null;
  rated_load: string | null;
  towing_capacity: string | null;
  cargo_dimensions: string | null;
  transfer_records: unknown[] | null;
  mortgage_records: unknown[] | null;
  registration_authority: string | null;
  id_number: string | null;
  driving_license_image_url: string | null;
  registration_cert_image_url: string | null;
  custom_model_name: string | null;
  tags: string[];
  notes: string | null;
  custom_fields: Record<string, string>;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** 绿本独有字段 */
export const REGISTRATION_ONLY_FIELDS = [
  "engine_model",
  "displacement",
  "power",
  "fuel_type",
  "emission_standard",
  "color",
  "manufacturer",
  "is_new_energy",
  "registration_authority",
  "id_number",
  "acquisition_method",
  "steering_type",
  "axles",
  "wheelbase",
  "tire_count",
  "rated_load",
  "towing_capacity",
  "cargo_dimensions",
  "transfer_records",
  "mortgage_records",
  "brand",
  "model",
] as const;