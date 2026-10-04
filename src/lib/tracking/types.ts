// ============ 运输跟踪 - 类型定义 ============

/** 运输状态 */
export type TransportStatus =
  | 'pending_shipment'
  | 'awaiting_departure'
  | 'at_sea'
  | 'in_transit'
  | 'arrived'
  | 'customs_clearance'
  | 'delivered'
  | 'exception'
  | 'cancelled';

/** 通知类型 */
export type NotificationType = 'normal_update' | 'important_change' | 'risk_warning';

/** ETA 数据来源 */
export type EtaSource = 'carrier' | 'logistics' | 'ais_estimated';

/** 数据来源 */
export type DataSource = 'carrier' | 'logistics' | 'ais' | 'manual';

/** 集装箱状态 */
export type ContainerStatus = 'normal' | 'exception';

/** 航段状态 */
export type LegStatus = 'planned' | 'in_progress' | 'completed';

/** 运输记录状态标签映射 */
export const transportStatusLabels: Record<TransportStatus, string> = {
  pending_shipment: '待装运',
  awaiting_departure: '待开船',
  at_sea: '海运途中',
  in_transit: '中转中',
  arrived: '已到港',
  customs_clearance: '清关中',
  delivered: '已交付',
  exception: '异常',
  cancelled: '已取消',
};

/** 运输记录状态分组 */
export const transportStatusGroups: Record<string, TransportStatus[]> = {
  '待装运': ['pending_shipment'],
  '待开船': ['awaiting_departure'],
  '海运途中': ['at_sea'],
  '中转中': ['in_transit'],
  '已到港': ['arrived'],
  '清关中': ['customs_clearance'],
  '已交付': ['delivered'],
  '异常': ['exception'],
  '已取消': ['cancelled'],
};

/** 通知类型标签 */
export const notificationTypeLabels: Record<NotificationType, string> = {
  normal_update: '普通更新',
  important_change: '重要变化',
  risk_warning: '风险警告',
};

// ============ 数据结构 ============

/** 集装箱 */
export interface TransportContainer {
  id: string;
  record_id: string;
  container_number: string;
  status: ContainerStatus;
  seal_number?: string;
  container_type: string;
  notes?: string;
  created_at: string;
}

/** 车辆 */
export interface TransportVehicle {
  id: string;
  record_id: string;
  container_id?: string;
  vin: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  notes?: string;
  created_at: string;
}

/** 运输航段 */
export interface TransportLeg {
  id: string;
  record_id: string;
  vessel_name?: string;
  imo?: string;
  voyage?: string;
  route_code?: string;
  transport_mode?: string;
  from_port_code?: string;
  from_port_name?: string;
  from_port_lat?: number;
  from_port_lng?: number;
  to_port_code?: string;
  to_port_name?: string;
  to_port_lat?: number;
  to_port_lng?: number;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  status: LegStatus;
  is_current: boolean;
  sequence: number;
  notes?: string;
  created_at: string;
}

/** 运输记录（完整） */
export interface TransportRecord {
  id: string;
  organization_id: string;
  user_id: string;
  tracking_number: string;
  bl_number?: string;
  carrier_tracking_number?: string;
  vessel_name?: string;
  imo?: string;
  voyage?: string;
  export_port_code?: string;
  export_port_name?: string;
  dest_port_code?: string;
  dest_port_name?: string;
  etd?: string;
  eta?: string;
  ata?: string;
  eta_source: EtaSource;
  eta_updated_at?: string;
  last_position_lat?: number;
  last_position_lng?: number;
  last_position_label?: string;
  last_position_time?: string;
  remaining_distance?: number;
  progress: number;
  status: TransportStatus;
  container_count: number;
  vehicle_count: number;
  is_demo: boolean;
  is_archived: boolean;
  data_source: DataSource;
  data_updated_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  containers?: TransportContainer[];
  vehicles?: TransportVehicle[];
  legs?: TransportLeg[];
  notifications?: TransportNotification[];
  manual_overrides?: TransportManualOverride[];
}

/** 运输通知 */
export interface TransportNotification {
  id: string;
  record_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  content?: string;
  created_at: string;
  // 前端计算字段
  is_read?: boolean;
}

/** 通知已读记录 */
export interface TransportNotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

/** 手动覆盖 */
export interface TransportManualOverride {
  id: string;
  record_id: string;
  field_name: string;
  manual_value?: string;
  auto_value?: string;
  source?: string;
  overridden_by: string;
  overridden_at: string;
}

// ============ 查询相关 ============

/** 统一查询输入 */
export interface UnifiedQueryInput {
  input: string;
  type?: 'bl' | 'carrier_tracking' | 'vin' | 'auto';
  carrier?: string;
}

/** 查询结果 */
export interface QueryResult {
  type: 'bl' | 'carrier_tracking' | 'vin' | 'unknown';
  input: string;
  record?: TransportRecord;
  records?: TransportRecord[];
  is_demo: boolean;
  is_existing: boolean;
  existing_record_id?: string;
  message?: string;
  not_found?: boolean;
}

/** 批量导入条目 */
export interface BatchImportItem {
  bl_number?: string;
  carrier_tracking_number?: string;
  carrier?: string;
  vin?: string;
  customer_ref?: string;
  status: 'success' | 'duplicate' | 'pending_query' | 'format_error';
  message?: string;
  record_id?: string;
}

/** 运输清单筛选参数 */
export interface TransportListFilters {
  vin?: string;
  bl_number?: string;
  carrier_tracking_number?: string;
  customer?: string;
  dest_port?: string;
  eta_from?: string;
  eta_to?: string;
  status?: TransportStatus[];
  notification_status?: 'unread' | 'read';
  search?: string;
}

/** 排序方式 */
export type TransportSortField = 'eta' | 'updated_at' | 'created_at';
export type TransportSortOrder = 'asc' | 'desc';

/** 分页参数 */
export interface PaginationParams {
  page: number;
  page_size: number;
}