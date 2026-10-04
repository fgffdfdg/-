// ─── 选车工作台 (Vehicle Sourcing Workbench) 类型定义 ───

// 车源平台
export interface SourcePlatform {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  domain: string;
  icon?: string | null;
  type: "default" | "custom";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcePlatformInput {
  name: string;
  url: string;
  domain: string;
  icon?: string;
}

// 保存搜索
export interface SavedSearch {
  id: string;
  organizationId: string;
  platformId: string;
  name: string;
  url: string;
  visibility: "private" | "shared";
  createdBy: string;
  createdAt: string;
}

export interface SavedSearchInput {
  platformId: string;
  name: string;
  url: string;
  visibility: "private" | "shared";
}

// 候选车辆总状态
export type CandidateTotalStatus =
  | "pending_info"
  | "evaluating"
  | "selected"
  | "abandoned"
  | "invalid";

// VIN 状态
export type VinStatus = "missing" | "pending" | "verified";

// 候选车辆
export interface CandidateVehicle {
  id: string;
  organizationId: string;
  vin?: string | null;
  vinStatus: VinStatus;
  brand?: string | null;
  series?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  location?: string | null;
  color?: string | null;
  listingPrice?: number | null;
  estimatedPurchasePrice?: number | null;
  confirmedPurchasePrice?: number | null;
  totalStatus: CandidateTotalStatus;
  responsiblePersonId?: string | null;
  notes?: string | null;
  formalVehicleId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  // 关联数据（查询时填充）
  sources?: VehicleSource[];
  customers?: CandidateVehicleCustomer[];
  activities?: CandidateActivity[];
  sourceCount?: number;
  customerCount?: number;
  hasUnreadChanges?: boolean;
}

export interface CandidateVehicleInput {
  vin?: string;
  brand?: string;
  series?: string;
  model?: string;
  year?: number;
  mileage?: number;
  location?: string;
  color?: string;
  listingPrice?: number;
  estimatedPurchasePrice?: number;
  notes?: string;
  responsiblePersonId?: string;
}

// 车源状态
export type VehicleSourceStatus =
  | "new_listing"
  | "info_updated"
  | "reserved"
  | "sold"
  | "delisted"
  | "link_dead"
  | "temporarily_unavailable";

// 具体车源
export interface VehicleSource {
  id: string;
  candidateVehicleId: string;
  platformId?: string | null;
  platformName: string;
  url: string;
  title?: string | null;
  brand?: string | null;
  series?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  location?: string | null;
  listingPrice?: number | null;
  vin?: string | null;
  sellerInfo?: string | null;
  imageUrls?: string[];
  publishedAt?: string | null;
  sourceStatus: VehicleSourceStatus;
  lastCheckedAt?: string | null;
  checkMethod: "manual" | "auto" | "plugin";
  isStale: boolean;
  extractedAt: string;
  createdBy: string;
  priceHistory?: PriceHistoryEntry[];
}

export interface VehicleSourceInput {
  platformId?: string;
  platformName: string;
  url: string;
  title?: string;
  brand?: string;
  series?: string;
  model?: string;
  year?: number;
  mileage?: number;
  location?: string;
  listingPrice?: number;
  vin?: string;
  sellerInfo?: string;
  imageUrls?: string[];
  publishedAt?: string;
}

// 价格历史
export interface PriceHistoryEntry {
  id: string;
  vehicleSourceId: string;
  price: number;
  previousPrice?: number | null;
  changeType: "increase" | "decrease" | "unchanged";
  changeAmount?: number | null;
  changePercent?: number | null;
  recordedAt: string;
}

// 车型关注
export type WatchStatus = "active" | "paused" | "archived";

export interface ModelWatch {
  id: string;
  organizationId: string;
  brand?: string | null;
  series?: string | null;
  model?: string | null;
  yearMin?: number | null;
  yearMax?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  mileageMin?: number | null;
  mileageMax?: number | null;
  location?: string | null;
  watchStatus: WatchStatus;
  sampleCount: number;
  medianPrice?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  lastUpdatedAt?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ModelWatchInput {
  brand?: string;
  series?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  location?: string;
}

// 客户车辆机会
export interface CandidateVehicleCustomer {
  id: string;
  candidateVehicleId: string;
  customerId: string;
  organizationId: string;
  hasQuotation: boolean;
  quotationAmount?: number | null;
  hasProformaInvoice: boolean;
  proformaInvoiceStatus?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 活动记录
export interface CandidateActivity {
  id: string;
  candidateVehicleId: string;
  organizationId: string;
  actionType: string;
  details: Record<string, unknown>;
  performedBy: string;
  createdAt: string;
  isCorrection: boolean;
  correctsActivityId?: string | null;
  correctionReason?: string | null;
}

// 链接解析结果
export interface ParsedLinkResult {
  success: boolean;
  platform?: string;
  domain?: string;
  url: string;
  data?: {
    title?: string;
    brand?: string;
    series?: string;
    model?: string;
    year?: number;
    mileage?: number;
    location?: string;
    listingPrice?: number;
    vin?: string;
    sellerInfo?: string;
    imageUrls?: string[];
    publishedAt?: string;
  };
  error?: string;
  completeness: number;
  missingFields: string[];
}

// 链接解析请求
export interface ParseLinkRequest {
  url: string;
}

// 候选车辆列表查询参数
export interface CandidateListParams {
  status?: CandidateTotalStatus;
  responsiblePersonId?: string;
  customerId?: string;
  brand?: string;
  series?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  vinStatus?: VinStatus;
  platform?: string;
  sourceStatus?: VehicleSourceStatus;
  hasUnreadChanges?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

// 车辆转正请求
export interface FormalizeVehicleRequest {
  candidateVehicleId: string;
  vin: string;
  brand: string;
  series: string;
  model: string;
  year: number;
  confirmedPurchasePrice: number;
}

// 默认车源平台
export const DEFAULT_PLATFORMS: { name: string; url: string; domain: string; icon: string }[] = [
  {
    name: "汽车之家",
    url: "https://www.autohome.com.cn/",
    domain: "autohome.com.cn",
    icon: "https://www.autohome.com.cn/favicon.ico",
  },
  {
    name: "懂车帝",
    url: "https://www.dongchedi.com/",
    domain: "dongchedi.com",
    icon: "https://www.dongchedi.com/favicon.ico",
  },
  {
    name: "瓜子二手车",
    url: "https://www.guazi.com/",
    domain: "guazi.com",
    icon: "https://www.guazi.com/favicon.ico",
  },
];