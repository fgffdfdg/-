// 海运位置跟踪数据

export type TrackingStatus =
  | 'booked'
  | 'picked_up'
  | 'in_transit_to_port'
  | 'customs_export'
  | 'loaded'
  | 'on_sea'
  | 'at_transit'
  | 'arrived'
  | 'customs_import'
  | 'cleared'
  | 'delivered';

export interface TrackingWaypoint {
  id: string;
  label: string;
  labelEn: string;
  status: TrackingStatus;
  timestamp: string | null;
  location?: { lat: number; lng: number };
  description: string;
}

export interface ShipmentInfo {
  trackingNumber: string;
  containerNumber: string;
  blNumber: string;
  vessel: string;
  voyage: string;
  exportPort: { code: string; name: string; nameEn: string };
  destPort: { code: string; name: string; nameEn: string };
  vehicle: {
    brand: string;
    model: string;
    year: number;
    vin: string;
    color: string;
  };
  status: TrackingStatus;
  statusLabel: string;
  eta: string;
  etd: string;
  progress: number;
  waypoints: TrackingWaypoint[];
  currentLocation?: {
    label: string;
    lat: number;
    lng: number;
    speed: number;
    course: number;
  };
}

export const statusLabels: Record<TrackingStatus, string> = {
  booked: '已订舱',
  picked_up: '已提柜',
  in_transit_to_port: '运往起运港',
  customs_export: '出口报关中',
  loaded: '已装船',
  on_sea: '海运途中',
  at_transit: '中转港停靠',
  arrived: '已抵达目的港',
  customs_import: '进口清关中',
  cleared: '已清关放行',
  delivered: '已签收交付',
};

const sampleShipments: Record<string, ShipmentInfo> = {
  ED20250601001: {
    trackingNumber: 'ED20250601001',
    containerNumber: 'CSLU2387654',
    blNumber: 'COSU6823456789',
    vessel: 'COSCO FORTUNE',
    voyage: 'V.2506E',
    exportPort: { code: 'CNSHA', name: '上海港', nameEn: 'Shanghai' },
    destPort: { code: 'NGAPP', name: '阿帕帕', nameEn: 'Apapa' },
    vehicle: {
      brand: 'Toyota',
      model: 'Land Cruiser 200',
      year: 2019,
      vin: 'JTMHU82J50D123456',
      color: '白色',
    },
    status: 'on_sea',
    statusLabel: '海运途中',
    eta: '2025-07-12',
    etd: '2025-06-15',
    progress: 55,
    currentLocation: {
      label: '印度洋 · 马尔代夫以西约320海里',
      lat: 4.5,
      lng: 70.2,
      speed: 14.5,
      course: 245,
    },
    waypoints: [
      { id: 'wp1', label: '订舱确认', labelEn: 'Booking Confirmed', status: 'booked', timestamp: '2025-06-01T09:30:00Z', description: '舱位已确认，预计6月15日开船' },
      { id: 'wp2', label: '车辆提柜', labelEn: 'Container Picked Up', status: 'picked_up', timestamp: '2025-06-08T14:00:00Z', location: { lat: 31.23, lng: 121.47 }, description: '集装箱已从堆场提出，运往上海港码头' },
      { id: 'wp3', label: '运往起运港', labelEn: 'In Transit to Port', status: 'in_transit_to_port', timestamp: '2025-06-09T08:15:00Z', location: { lat: 31.35, lng: 121.6 }, description: '车辆已运抵上海洋山深水港' },
      { id: 'wp4', label: '出口报关', labelEn: 'Export Customs', status: 'customs_export', timestamp: '2025-06-11T10:00:00Z', location: { lat: 30.63, lng: 122.07 }, description: '出口报关申报中，海关审核通过' },
      { id: 'wp5', label: '装船完成', labelEn: 'Loaded on Vessel', status: 'loaded', timestamp: '2025-06-14T16:30:00Z', location: { lat: 30.63, lng: 122.07 }, description: '集装箱已装载至COSCO FORTUNE轮' },
      { id: 'wp6', label: '海运出发', labelEn: 'Departed on Sea', status: 'on_sea', timestamp: '2025-06-15T06:00:00Z', location: { lat: 30.5, lng: 122.3 }, description: '船舶已离港，驶往尼日利亚阿帕帕港' },
      { id: 'wp7', label: '抵达目的港', labelEn: 'Arrived at Destination', status: 'arrived', timestamp: null, location: { lat: 6.45, lng: 3.4 }, description: '预计7月12日抵达阿帕帕港' },
      { id: 'wp8', label: '进口清关', labelEn: 'Import Customs', status: 'customs_import', timestamp: null, description: '目的港清关手续办理' },
      { id: 'wp9', label: '签收交付', labelEn: 'Delivered', status: 'delivered', timestamp: null, description: '收货人签收，完成交付' },
    ],
  },
  ED20250520003: {
    trackingNumber: 'ED20250520003',
    containerNumber: 'MSKU7654321',
    blNumber: 'MSCU7890123456',
    vessel: 'MSC ARIES',
    voyage: 'V.2505W',
    exportPort: { code: 'CNTXG', name: '天津新港', nameEn: 'Tianjin Xingang' },
    destPort: { code: 'DAMMK', name: '达曼', nameEn: 'Dammam' },
    vehicle: {
      brand: 'BYD',
      model: 'Han EV',
      year: 2022,
      vin: 'LGXCE6DB5N0123789',
      color: '黑色',
    },
    status: 'arrived',
    statusLabel: '已抵达目的港',
    eta: '2025-06-28',
    etd: '2025-06-02',
    progress: 85,
    currentLocation: {
      label: '达曼港锚地',
      lat: 26.39,
      lng: 50.1,
      speed: 0,
      course: 0,
    },
    waypoints: [
      { id: 'wp1', label: '订舱确认', labelEn: 'Booking Confirmed', status: 'booked', timestamp: '2025-05-20T10:00:00Z', description: '舱位已确认' },
      { id: 'wp2', label: '车辆提柜', labelEn: 'Container Picked Up', status: 'picked_up', timestamp: '2025-05-25T09:00:00Z', location: { lat: 39.0, lng: 117.7 }, description: '集装箱已从堆场提出' },
      { id: 'wp3', label: '出口报关', labelEn: 'Export Customs', status: 'customs_export', timestamp: '2025-05-28T14:00:00Z', description: '海关审核通过' },
      { id: 'wp4', label: '装船完成', labelEn: 'Loaded on Vessel', status: 'loaded', timestamp: '2025-06-01T08:00:00Z', description: '集装箱已装载至MSC ARIES轮' },
      { id: 'wp5', label: '海运出发', labelEn: 'Departed on Sea', status: 'on_sea', timestamp: '2025-06-02T05:30:00Z', description: '船舶已离港' },
      { id: 'wp6', label: '抵达目的港', labelEn: 'Arrived at Destination', status: 'arrived', timestamp: '2025-06-28T11:00:00Z', location: { lat: 26.39, lng: 50.1 }, description: '已抵达达曼港，等待卸船' },
      { id: 'wp7', label: '进口清关', labelEn: 'Import Customs', status: 'customs_import', timestamp: null, description: '目的港清关手续办理中' },
      { id: 'wp8', label: '签收交付', labelEn: 'Delivered', status: 'delivered', timestamp: null, description: '收货人签收' },
    ],
  },
  ED20250618002: {
    trackingNumber: 'ED20250618002',
    containerNumber: 'HLCU9876543',
    blNumber: 'HLCU2025061801',
    vessel: 'HAPAG LLOYD ORION',
    voyage: 'V.2506S',
    exportPort: { code: 'CNNSA', name: '南沙港', nameEn: 'Nansha/Guangzhou' },
    destPort: { code: 'KEMBA', name: '蒙巴萨', nameEn: 'Mombasa' },
    vehicle: {
      brand: 'Geely',
      model: 'Coolray',
      year: 2023,
      vin: 'L6G38A1C5KN456789',
      color: '银色',
    },
    status: 'customs_export',
    statusLabel: '出口报关中',
    eta: '2025-07-25',
    etd: '2025-07-05',
    progress: 25,
    currentLocation: {
      label: '广州南沙港',
      lat: 22.63,
      lng: 113.58,
      speed: 0,
      course: 0,
    },
    waypoints: [
      { id: 'wp1', label: '订舱确认', labelEn: 'Booking Confirmed', status: 'booked', timestamp: '2025-06-18T11:00:00Z', description: '舱位已确认，预计7月5日开船' },
      { id: 'wp2', label: '车辆提柜', labelEn: 'Container Picked Up', status: 'picked_up', timestamp: '2025-06-22T10:00:00Z', description: '集装箱已从堆场提出' },
      { id: 'wp3', label: '出口报关', labelEn: 'Export Customs', status: 'customs_export', timestamp: '2025-06-25T09:00:00Z', description: '出口报关申报中，等待海关审核' },
      { id: 'wp4', label: '装船完成', labelEn: 'Loaded on Vessel', status: 'loaded', timestamp: null, description: '等待装船' },
      { id: 'wp5', label: '海运出发', labelEn: 'Departed on Sea', status: 'on_sea', timestamp: null, description: '预计7月5日出发' },
      { id: 'wp6', label: '抵达目的港', labelEn: 'Arrived at Destination', status: 'arrived', timestamp: null, description: '预计7月25日抵达蒙巴萨港' },
      { id: 'wp7', label: '进口清关', labelEn: 'Import Customs', status: 'customs_import', timestamp: null, description: '目的港清关手续办理' },
      { id: 'wp8', label: '签收交付', labelEn: 'Delivered', status: 'delivered', timestamp: null, description: '收货人签收' },
    ],
  },
};

export function getTrackingInfo(trackingNumber: string): ShipmentInfo | null {
  const normalized = trackingNumber.trim().toUpperCase();
  return sampleShipments[normalized] ?? null;
}

export function getAllShipments(): ShipmentInfo[] {
  return Object.values(sampleShipments);
}

export function getTrackingNumbers(): string[] {
  return Object.keys(sampleShipments);
}
