// ============ 运输跟踪 - Freightower 响应映射器 ============

import type {
  TransportRecord,
  TransportContainer,
  TransportLeg,
  TransportStatus,
  LegStatus,
  TransportNotification,
} from './types';
import type {
  FreightowerQueryResponse,
  FreightowerResult,
  FreightowerContainer as FtContainer,
  FreightowerPlace,
  FreightowerStatusEvent,
} from './freightower-client';

// ============ 状态映射 ============

/** Freightower eventCode → TransportStatus */
const EVENT_CODE_TO_STATUS: Record<string, TransportStatus> = {
  STSP: 'pending_shipment',    // 提空箱
  GITM: 'pending_shipment',    // 进场
  PASS: 'awaiting_departure',  // 海关放行
  TMPS: 'awaiting_departure',  // 码头放行
  PRLD: 'awaiting_departure',  // 船公司配载
  LOBD: 'awaiting_departure',  // 装船
  DLPT: 'at_sea',              // 离港
  BDAR: 'arrived',             // 抵港
  POCA: 'arrived',             // 卸船
  RCVE: 'delivered',           // 还空箱
};

/** Freightower statusCategory 回退映射 */
const STATUS_CATEGORY_MAP: Record<string, TransportStatus> = {
  COMPLETE: 'delivered',
  ACTIVE: 'at_sea',
};

/** 根据 Freightower currentStatus 判断运输状态 */
function mapStatus(result: FreightowerResult): TransportStatus {
  // 优先使用 eventCode 映射
  const eventCode = result.currentStatus?.eventCode;
  if (eventCode && EVENT_CODE_TO_STATUS[eventCode]) {
    return EVENT_CODE_TO_STATUS[eventCode];
  }

  // 回退到 statusCategory
  if (result.statusCategory && STATUS_CATEGORY_MAP[result.statusCategory]) {
    return STATUS_CATEGORY_MAP[result.statusCategory];
  }

  return 'pending_shipment';
}

/** 计算运输进度百分比 */
function calculateProgress(result: FreightowerResult): number {
  if (result.statusCategory === 'COMPLETE') return 100;

  const events = collectAllEvents(result);
  const currentEventCode = result.currentStatus?.eventCode;

  if (!currentEventCode || events.length === 0) return 0;

  const eventOrder = [
    'STSP', 'GITM', 'PASS', 'TMPS', 'PRLD', 'LOBD', 'DLPT', 'BDAR', 'POCA', 'RCVE',
  ];

  const currentIdx = eventOrder.indexOf(currentEventCode);
  if (currentIdx === -1) return 50;

  return Math.min(Math.round((currentIdx / (eventOrder.length - 1)) * 100), 99);
}

function collectAllEvents(result: FreightowerResult): FreightowerStatusEvent[] {
  const events: FreightowerStatusEvent[] = [];
  if (result.currentStatus) events.push(result.currentStatus);
  for (const container of result.containers || []) {
    for (const evt of container.status || []) {
      if (!events.find((e) => e.eventCode === evt.eventCode && e.eventTime === evt.eventTime)) {
        events.push(evt);
      }
    }
  }
  return events;
}

// ============ 港口映射 ============

/** 将 Freightower Place 映射为 TransportLeg */
function mapPlacesToLegs(
  places: FreightowerPlace[],
  recordId: string,
  routes: FreightowerResult['routes']
): TransportLeg[] {
  const legs: TransportLeg[] = [];

  // 按 routes 构建航段，用 places 补充时间信息
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const fromPlace = places.find(
      (p) => p.code === route.polCode && (p.type === 1 || p.type === 2 || p.type === 4)
    );
    const toPlace = places.find(
      (p) => p.code === route.podCode && (p.type === 4 || p.type === 5)
    );

    const etd = route.modeDetails?.polEtd || route.modeDetails?.polAtd || fromPlace?.etd || fromPlace?.atd || null;
    const eta = route.modeDetails?.podEta || route.modeDetails?.podAta || toPlace?.eta || toPlace?.ata || null;
    const atd = route.modeDetails?.polAtd || fromPlace?.atd || null;
    const ata = route.modeDetails?.podAta || toPlace?.ata || null;

    let legStatus: LegStatus = 'planned';
    if (ata) {
      legStatus = 'completed';
    } else if (atd) {
      legStatus = 'in_progress';
    }

    legs.push({
      id: `${recordId}-leg-${route.route}`,
      record_id: recordId,
      vessel_name: route.modeDetails?.vessel || undefined,
      voyage: route.modeDetails?.voyage || undefined,
      route_code: route.modeDetails?.routeCode || undefined,
      from_port_code: route.polCode,
      from_port_name: route.polName || route.polOrigin,
      from_port_lat: parseFloat(route.polLat) || undefined,
      from_port_lng: parseFloat(route.polLon) || undefined,
      to_port_code: route.podCode,
      to_port_name: route.podName || route.podOrigin,
      to_port_lat: parseFloat(route.podLat) || undefined,
      to_port_lng: parseFloat(route.podLon) || undefined,
      transport_mode: route.transportMode,
      etd: etd ? formatDate(etd) : undefined,
      eta: eta ? formatDate(eta) : undefined,
      atd: atd ? formatDateTime(atd) : undefined,
      ata: ata ? formatDateTime(ata) : undefined,
      status: legStatus,
      is_current: i === routes.length - 1 && !ata,
      sequence: route.route,
      created_at: new Date().toISOString(),
    });
  }

  return legs;
}

// ============ 集装箱映射 ============

function mapContainers(
  ftContainers: FtContainer[],
  recordId: string
): TransportContainer[] {
  return ftContainers.map((c, idx) => ({
    id: `${recordId}-container-${idx}`,
    record_id: recordId,
    container_number: c.containerNo,
    status: 'normal' as const,
    seal_number: c.sealNo || undefined,
    container_type: c.containerTypeGroup || c.containerType,
    created_at: new Date().toISOString(),
  }));
}

// ============ 通知映射 ============

function mapNotifications(
  result: FreightowerResult,
  recordId: string,
  organizationId: string
): TransportNotification[] {
  const notifications: TransportNotification[] = [];
  const currentStatus = result.currentStatus;

  if (!currentStatus) return notifications;

  // 重要节点生成通知
  const importantEvents = ['DLPT', 'BDAR', 'POCA', 'RCVE'];
  if (importantEvents.includes(currentStatus.eventCode)) {
    const typeMap: Record<string, 'normal_update' | 'important_change'> = {
      DLPT: 'important_change',
      BDAR: 'important_change',
      POCA: 'normal_update',
      RCVE: 'important_change',
    };

    notifications.push({
      id: `${recordId}-notif-${currentStatus.eventCode}`,
      record_id: recordId,
      organization_id: organizationId,
      type: typeMap[currentStatus.eventCode] || 'normal_update',
      title: `${currentStatus.descriptionCn}`,
      content: `${currentStatus.eventPlaceOrigin} — ${currentStatus.eventTime}`,
      created_at: new Date().toISOString(),
    });
  }

  return notifications;
}

// ============ 日期格式化 ============

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // 处理 "2025/07/07 00:30:00" 格式
  const parts = dateStr.split(' ')[0];
  return parts.replace(/\//g, '-');
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.replace(/\//g, '-');
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return formatDate(dateStr);
}

// ============ 主导出函数 ============

/** 将 Freightower API 响应映射为 TransportRecord */
export function mapFreightowerToTransportRecord(
  result: FreightowerResult,
  recordId: string,
  organizationId: string,
  userId: string
): TransportRecord {
  const status = mapStatus(result);
  const progress = calculateProgress(result);
  const currentStatus = result.currentStatus;

  // 提取起运港和目的港（从 places 中按 type 区分）
  const firstPlace = result.places?.find((p) => p.type === 1 || p.type === 2);
  const lastPlace = result.places
    ?.filter((p) => p.type === 4 || p.type === 5)
    .pop();

  const exportPort = result.receipt || firstPlace;
  const destPort = result.delivery || lastPlace;

  // 船舶信息
  const vesselName =
    result.firstVessel?.vessel ||
    currentStatus?.vslName ||
    result.routes?.[0]?.modeDetails?.vessel ||
    undefined;

  const voyage =
    result.firstVessel?.voyage ||
    currentStatus?.voy ||
    result.routes?.[0]?.modeDetails?.voyage ||
    undefined;

  return {
    id: recordId,
    organization_id: organizationId,
    user_id: userId,
    tracking_number: `TR${Date.now().toString(36).toUpperCase()}`,
    bl_number: result.billNo || undefined,
    carrier_tracking_number: undefined,
    vessel_name: vesselName,
    imo: undefined,
    voyage,
    export_port_code: exportPort?.code || undefined,
    export_port_name: exportPort?.name || exportPort?.nameOrigin || undefined,
    dest_port_code: destPort?.code || undefined,
    dest_port_name: destPort?.name || destPort?.nameOrigin || undefined,
    etd: parseDate(result.receipt?.etd || result.receipt?.atd || ''),
    eta: parseDate(result.delivery?.eta || result.delivery?.ata || ''),
    ata: parseDate(result.delivery?.ata || ''),
    eta_source: 'carrier',
    last_position_lat: currentStatus?.lat || undefined,
    last_position_lng: currentStatus?.lon || undefined,
    last_position_label: currentStatus?.eventPlaceOrigin || undefined,
    last_position_time: currentStatus?.eventTime
      ? formatDateTime(currentStatus.eventTime)
      : undefined,
    remaining_distance: currentStatus?.distance || undefined,
    progress,
    status,
    container_count: result.containers?.length || 0,
    vehicle_count: 0,
    is_demo: false,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: result.updateTime
      ? formatDateTime(result.updateTime)
      : new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    containers: mapContainers(result.containers || [], recordId),
    vehicles: [],
    legs: mapPlacesToLegs(result.places || [], recordId, result.routes || []),
    notifications: mapNotifications(result, recordId, organizationId),
  };
}

/** 将 Freightower API 响应映射为简化的查询结果 */
export function mapFreightowerToQueryResult(
  response: FreightowerQueryResponse,
  input: string
): {
  type: 'bl' | 'carrier_tracking';
  input: string;
  record: TransportRecord;
  is_demo: boolean;
  is_existing: boolean;
} {
  const result = response.data.result;
  const record = mapFreightowerToTransportRecord(
    result,
    `ft-${Date.now().toString(36)}`,
    '',
    ''
  );

  return {
    type: 'bl',
    input,
    record,
    is_demo: false,
    is_existing: false,
  };
}