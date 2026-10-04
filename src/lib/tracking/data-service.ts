// ============ 运输跟踪 - 演示数据与查询服务 ============

import type {
  TransportRecord,
  TransportContainer,
  TransportVehicle,
  TransportLeg,
  TransportNotification,
  TransportStatus,
  UnifiedQueryInput,
  QueryResult,
  BatchImportItem,
} from './types';

// ============ 演示数据 ============

const demoTrackingNumber = (n: number) => `TR${String(n).padStart(6, '0')}`;

/** 生成演示运输记录 */
export function getDemoRecords(): TransportRecord[] {
  return [
    buildDemoRecord1(),
    buildDemoRecord2(),
    buildDemoRecord3(),
    buildDemoRecord4(),
    buildDemoRecord5(),
    buildDemoRecord6(),
  ];
}

function buildDemoRecord1(): TransportRecord {
  return {
    id: 'demo-rec-001',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(1),
    bl_number: 'COSU6823456789',
    carrier_tracking_number: 'COSCO-TR-20260701',
    vessel_name: 'COSCO FORTUNE',
    imo: '9446887',
    voyage: 'V.2506E',
    export_port_code: 'CNSHA',
    export_port_name: '上海港',
    dest_port_code: 'NGAPP',
    dest_port_name: '阿帕帕 (Apapa)',
    etd: '2026-06-15',
    eta: '2026-07-12',
    eta_source: 'carrier',
    last_position_lat: 4.5,
    last_position_lng: 70.2,
    last_position_label: '印度洋 · 马尔代夫以西约320海里',
    last_position_time: '2026-07-01T08:00:00Z',
    remaining_distance: 2840,
    progress: 55,
    status: 'at_sea',
    container_count: 2,
    vehicle_count: 3,
    is_demo: true,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: '2026-07-01T08:00:00Z',
    created_at: '2026-06-01T09:30:00Z',
    updated_at: '2026-07-01T08:00:00Z',
    containers: [
      { id: 'c1', record_id: 'demo-rec-001', container_number: 'CSLU2387654', status: 'normal', seal_number: 'SEAL001', container_type: '40HQ', created_at: '2026-06-01T09:30:00Z' },
      { id: 'c2', record_id: 'demo-rec-001', container_number: 'CSLU2387655', status: 'normal', seal_number: 'SEAL002', container_type: '40HQ', created_at: '2026-06-01T09:30:00Z' },
    ],
    vehicles: [
      { id: 'v1', record_id: 'demo-rec-001', container_id: 'c1', vin: 'JTMHU82J50D123456', brand: 'Toyota', model: 'Land Cruiser 200', year: 2019, color: '白色', created_at: '2026-06-01T09:30:00Z' },
      { id: 'v2', record_id: 'demo-rec-001', container_id: 'c1', vin: 'JTMHU82J50D123457', brand: 'Toyota', model: 'Land Cruiser 150', year: 2020, color: '黑色', created_at: '2026-06-01T09:30:00Z' },
      { id: 'v3', record_id: 'demo-rec-001', container_id: 'c2', vin: 'JTMHU82J50D123458', brand: 'Toyota', model: 'RAV4', year: 2021, color: '银色', created_at: '2026-06-01T09:30:00Z' },
    ],
    legs: [
      { id: 'l1', record_id: 'demo-rec-001', vessel_name: 'COSCO FORTUNE', imo: '9446887', voyage: 'V.2506E', from_port_code: 'CNSHA', from_port_name: '上海港', from_port_lat: 31.23, from_port_lng: 121.47, to_port_code: 'NGAPP', to_port_name: '阿帕帕', to_port_lat: 6.45, to_port_lng: 3.38, etd: '2026-06-15', eta: '2026-07-12', atd: '2026-06-15T06:00:00Z', status: 'in_progress', is_current: true, sequence: 1, created_at: '2026-06-01T09:30:00Z' },
    ],
    notifications: [],
  };
}

function buildDemoRecord2(): TransportRecord {
  return {
    id: 'demo-rec-002',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(2),
    bl_number: 'MSCU7890123456',
    carrier_tracking_number: 'MSC-TR-20260702',
    vessel_name: 'MSC ARIES',
    imo: '9755933',
    voyage: 'V.2505W',
    export_port_code: 'CNTXG',
    export_port_name: '天津新港',
    dest_port_code: 'DAMMK',
    dest_port_name: '达曼 (Dammam)',
    etd: '2026-06-02',
    eta: '2026-06-28',
    ata: '2026-06-28T11:00:00Z',
    eta_source: 'carrier',
    last_position_lat: 26.39,
    last_position_lng: 50.1,
    last_position_label: '达曼港锚地',
    last_position_time: '2026-06-28T11:00:00Z',
    remaining_distance: 0,
    progress: 85,
    status: 'arrived',
    container_count: 1,
    vehicle_count: 2,
    is_demo: true,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: '2026-06-28T11:00:00Z',
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-06-28T11:00:00Z',
    containers: [
      { id: 'c3', record_id: 'demo-rec-002', container_number: 'MSKU7654321', status: 'normal', seal_number: 'SEAL003', container_type: '40HQ', created_at: '2026-05-20T10:00:00Z' },
    ],
    vehicles: [
      { id: 'v4', record_id: 'demo-rec-002', container_id: 'c3', vin: 'LGXCE6DB5N0123789', brand: 'BYD', model: 'Han EV', year: 2022, color: '黑色', created_at: '2026-05-20T10:00:00Z' },
      { id: 'v5', record_id: 'demo-rec-002', container_id: 'c3', vin: 'LGXCE6DB5N0123790', brand: 'BYD', model: 'Tang EV', year: 2023, color: '白色', created_at: '2026-05-20T10:00:00Z' },
    ],
    legs: [
      { id: 'l2', record_id: 'demo-rec-002', vessel_name: 'MSC ARIES', imo: '9755933', voyage: 'V.2505W', from_port_code: 'CNTXG', from_port_name: '天津新港', from_port_lat: 39.00, from_port_lng: 117.70, to_port_code: 'DAMMK', to_port_name: '达曼', to_port_lat: 26.43, to_port_lng: 50.10, etd: '2026-06-02', eta: '2026-06-28', atd: '2026-06-02T05:30:00Z', ata: '2026-06-28T11:00:00Z', status: 'completed', is_current: true, sequence: 1, created_at: '2026-05-20T10:00:00Z' },
    ],
    notifications: [
      { id: 'n1', record_id: 'demo-rec-002', organization_id: '', type: 'important_change', title: 'MSC ARIES 已抵达达曼港', content: '船舶已于 2026-06-28 11:00 抵达达曼港锚地，等待卸船。', created_at: '2026-06-28T11:30:00Z', is_read: false },
    ],
  };
}

function buildDemoRecord3(): TransportRecord {
  return {
    id: 'demo-rec-003',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(3),
    bl_number: 'HLCU2026071801',
    vessel_name: 'HAPAG LLOYD ORION',
    imo: '9467180',
    voyage: 'V.2506S',
    export_port_code: 'CNNSA',
    export_port_name: '南沙港',
    dest_port_code: 'KEMBA',
    dest_port_name: '蒙巴萨 (Mombasa)',
    etd: '2026-07-05',
    eta: '2026-07-25',
    eta_source: 'carrier',
    last_position_lat: 22.63,
    last_position_lng: 113.58,
    last_position_label: '广州南沙港',
    last_position_time: '2026-06-28T09:00:00Z',
    remaining_distance: 5200,
    progress: 15,
    status: 'awaiting_departure',
    container_count: 1,
    vehicle_count: 4,
    is_demo: true,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: '2026-06-28T09:00:00Z',
    created_at: '2026-06-18T11:00:00Z',
    updated_at: '2026-06-28T09:00:00Z',
    containers: [
      { id: 'c4', record_id: 'demo-rec-003', container_number: 'HLCU9876543', status: 'normal', seal_number: 'SEAL004', container_type: '40HQ', created_at: '2026-06-18T11:00:00Z' },
    ],
    vehicles: [
      { id: 'v6', record_id: 'demo-rec-003', container_id: 'c4', vin: 'L6G38A1C5KN456789', brand: 'Geely', model: 'Coolray', year: 2023, color: '银色', created_at: '2026-06-18T11:00:00Z' },
      { id: 'v7', record_id: 'demo-rec-003', container_id: 'c4', vin: 'L6G38A1C5KN456790', brand: 'Geely', model: 'Azkarra', year: 2023, color: '蓝色', created_at: '2026-06-18T11:00:00Z' },
      { id: 'v8', record_id: 'demo-rec-003', container_id: 'c4', vin: 'L6G38A1C5KN456791', brand: 'Geely', model: 'Coolray', year: 2024, color: '白色', created_at: '2026-06-18T11:00:00Z' },
      { id: 'v9', record_id: 'demo-rec-003', container_id: 'c4', vin: 'L6G38A1C5KN456792', brand: 'Geely', model: 'Tugella', year: 2023, color: '红色', created_at: '2026-06-18T11:00:00Z' },
    ],
    legs: [
      { id: 'l3', record_id: 'demo-rec-003', vessel_name: 'HAPAG LLOYD ORION', imo: '9467180', voyage: 'V.2506S', from_port_code: 'CNNSA', from_port_name: '南沙港', from_port_lat: 22.67, from_port_lng: 113.67, to_port_code: 'KEMBA', to_port_name: '蒙巴萨', to_port_lat: -4.04, to_port_lng: 39.67, etd: '2026-07-05', eta: '2026-07-25', status: 'planned', is_current: true, sequence: 1, created_at: '2026-06-18T11:00:00Z' },
    ],
    notifications: [],
  };
}

function buildDemoRecord4(): TransportRecord {
  return {
    id: 'demo-rec-004',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(4),
    bl_number: 'MAEU2026072001',
    carrier_tracking_number: 'MAERSK-TR-20260704',
    vessel_name: 'MAERSK MCKINNEY',
    imo: '9619907',
    voyage: 'V.2507N',
    export_port_code: 'CNNGB',
    export_port_name: '宁波舟山港',
    dest_port_code: 'AEDXB',
    dest_port_name: '杰贝阿里 (Jebel Ali)',
    etd: '2026-07-10',
    eta: '2026-08-05',
    eta_source: 'carrier',
    last_position_lat: 29.8,
    last_position_lng: 122.0,
    last_position_label: '宁波舟山港',
    last_position_time: '2026-07-01T06:00:00Z',
    remaining_distance: 6200,
    progress: 5,
    status: 'pending_shipment',
    container_count: 3,
    vehicle_count: 5,
    is_demo: true,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: '2026-07-01T06:00:00Z',
    created_at: '2026-06-25T14:00:00Z',
    updated_at: '2026-07-01T06:00:00Z',
    containers: [
      { id: 'c5', record_id: 'demo-rec-004', container_number: 'MAEU1234567', status: 'normal', container_type: '40HQ', created_at: '2026-06-25T14:00:00Z' },
      { id: 'c6', record_id: 'demo-rec-004', container_number: 'MAEU1234568', status: 'normal', container_type: '40HQ', created_at: '2026-06-25T14:00:00Z' },
      { id: 'c7', record_id: 'demo-rec-004', container_number: 'MAEU1234569', status: 'exception', container_type: '20GP', created_at: '2026-06-25T14:00:00Z' },
    ],
    vehicles: [
      { id: 'v10', record_id: 'demo-rec-004', container_id: 'c5', vin: 'WBA3A5C5XDF123456', brand: 'BMW', model: '320i', year: 2020, color: '白色', created_at: '2026-06-25T14:00:00Z' },
      { id: 'v11', record_id: 'demo-rec-004', container_id: 'c5', vin: 'WBA3A5C5XDF123457', brand: 'BMW', model: '520i', year: 2021, color: '黑色', created_at: '2026-06-25T14:00:00Z' },
      { id: 'v12', record_id: 'demo-rec-004', container_id: 'c6', vin: 'WBA3A5C5XDF123458', brand: 'BMW', model: 'X3', year: 2022, color: '蓝色', created_at: '2026-06-25T14:00:00Z' },
      { id: 'v13', record_id: 'demo-rec-004', container_id: 'c6', vin: 'WBA3A5C5XDF123459', brand: 'BMW', model: 'X5', year: 2021, color: '灰色', created_at: '2026-06-25T14:00:00Z' },
      { id: 'v14', record_id: 'demo-rec-004', container_id: 'c7', vin: 'WBA3A5C5XDF123460', brand: 'BMW', model: '740Li', year: 2023, color: '黑色', created_at: '2026-06-25T14:00:00Z' },
    ],
    legs: [
      { id: 'l4', record_id: 'demo-rec-004', vessel_name: 'MAERSK MCKINNEY', imo: '9619907', voyage: 'V.2507N', from_port_code: 'CNNGB', from_port_name: '宁波舟山港', from_port_lat: 29.87, from_port_lng: 121.97, to_port_code: 'AEDXB', to_port_name: '杰贝阿里', to_port_lat: 25.00, to_port_lng: 55.00, etd: '2026-07-10', eta: '2026-08-05', status: 'planned', is_current: true, sequence: 1, created_at: '2026-06-25T14:00:00Z' },
    ],
    notifications: [
      { id: 'n2', record_id: 'demo-rec-004', organization_id: '', type: 'risk_warning', title: '集装箱 MAEU1234569 状态异常', content: '集装箱 MAEU1234569 未能按时抵达堆场，请核实。已影响 1 辆车辆（WBA3A5C5XDF123460）。', created_at: '2026-07-01T06:00:00Z', is_read: false },
    ],
  };
}

function buildDemoRecord5(): TransportRecord {
  return {
    id: 'demo-rec-005',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(5),
    bl_number: 'OOLU2026061501',
    carrier_tracking_number: 'OOCL-TR-20260705',
    vessel_name: 'OOCL HONG KONG',
    imo: '9622629',
    voyage: 'V.2506C',
    export_port_code: 'CNSGH',
    export_port_name: '深圳蛇口港',
    dest_port_code: 'THBKK',
    dest_port_name: '曼谷 (Bangkok)',
    etd: '2026-06-15',
    eta: '2026-06-22',
    ata: '2026-06-22T08:00:00Z',
    eta_source: 'carrier',
    last_position_lat: 13.75,
    last_position_lng: 100.5,
    last_position_label: '曼谷港',
    last_position_time: '2026-06-25T14:00:00Z',
    remaining_distance: 0,
    progress: 95,
    status: 'customs_clearance',
    container_count: 1,
    vehicle_count: 2,
    is_demo: true,
    is_archived: false,
    data_source: 'carrier',
    data_updated_at: '2026-06-25T14:00:00Z',
    created_at: '2026-06-10T08:00:00Z',
    updated_at: '2026-06-25T14:00:00Z',
    containers: [
      { id: 'c8', record_id: 'demo-rec-005', container_number: 'OOLU5678901', status: 'normal', seal_number: 'SEAL005', container_type: '40HQ', created_at: '2026-06-10T08:00:00Z' },
    ],
    vehicles: [
      { id: 'v15', record_id: 'demo-rec-005', container_id: 'c8', vin: 'WVWZZZ3CZ8E123456', brand: 'Volkswagen', model: 'Passat', year: 2020, color: '黑色', created_at: '2026-06-10T08:00:00Z' },
      { id: 'v16', record_id: 'demo-rec-005', container_id: 'c8', vin: 'WVWZZZ3CZ8E123457', brand: 'Volkswagen', model: 'Tiguan', year: 2021, color: '白色', created_at: '2026-06-10T08:00:00Z' },
    ],
    legs: [
      { id: 'l5', record_id: 'demo-rec-005', vessel_name: 'OOCL HONG KONG', imo: '9622629', voyage: 'V.2506C', from_port_code: 'CNSGH', from_port_name: '深圳蛇口港', from_port_lat: 22.48, from_port_lng: 113.90, to_port_code: 'THBKK', to_port_name: '曼谷', to_port_lat: 13.75, to_port_lng: 100.50, etd: '2026-06-15', eta: '2026-06-22', atd: '2026-06-15T08:00:00Z', ata: '2026-06-22T08:00:00Z', status: 'completed', is_current: true, sequence: 1, created_at: '2026-06-10T08:00:00Z' },
    ],
    notifications: [
      { id: 'n3', record_id: 'demo-rec-005', organization_id: '', type: 'normal_update', title: 'OOCL HONG KONG 已抵达曼谷港', content: '已开始进口清关手续。', created_at: '2026-06-22T08:30:00Z', is_read: true },
    ],
  };
}

function buildDemoRecord6(): TransportRecord {
  return {
    id: 'demo-rec-006',
    organization_id: '',
    user_id: '',
    tracking_number: demoTrackingNumber(6),
    bl_number: 'ONEU2026070101',
    carrier_tracking_number: 'ONE-TR-20260706',
    vessel_name: 'ONE AQUILA',
    imo: '9805453',
    voyage: 'V.2507D',
    export_port_code: 'CNQDG',
    export_port_name: '青岛港',
    dest_port_code: 'ZADUR',
    dest_port_name: '德班 (Durban)',
    etd: '2026-07-15',
    eta: '2026-08-10',
    eta_source: 'ais_estimated',
    last_position_lat: 7.8,
    last_position_lng: 77.5,
    last_position_label: '印度洋 · 斯里兰卡以南',
    last_position_time: '2026-07-20T12:00:00Z',
    remaining_distance: 3800,
    progress: 40,
    status: 'in_transit',
    container_count: 2,
    vehicle_count: 3,
    is_demo: true,
    is_archived: false,
    data_source: 'ais',
    data_updated_at: '2026-07-20T12:00:00Z',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-20T12:00:00Z',
    containers: [
      { id: 'c9', record_id: 'demo-rec-006', container_number: 'ONEU3456789', status: 'normal', container_type: '40HQ', created_at: '2026-07-01T10:00:00Z' },
      { id: 'c10', record_id: 'demo-rec-006', container_number: 'ONEU3456790', status: 'normal', container_type: '40HQ', created_at: '2026-07-01T10:00:00Z' },
    ],
    vehicles: [
      { id: 'v17', record_id: 'demo-rec-006', container_id: 'c9', vin: '1HGCM82633A123456', brand: 'Honda', model: 'Accord', year: 2021, color: '白色', created_at: '2026-07-01T10:00:00Z' },
      { id: 'v18', record_id: 'demo-rec-006', container_id: 'c9', vin: '1HGCM82633A123457', brand: 'Honda', model: 'CR-V', year: 2022, color: '黑色', created_at: '2026-07-01T10:00:00Z' },
      { id: 'v19', record_id: 'demo-rec-006', container_id: 'c10', vin: '1HGCM82633A123458', brand: 'Honda', model: 'Civic', year: 2023, color: '红色', created_at: '2026-07-01T10:00:00Z' },
    ],
    legs: [
      { id: 'l6', record_id: 'demo-rec-006', vessel_name: 'ONE AQUILA', imo: '9805453', voyage: 'V.2507D', from_port_code: 'CNQDG', from_port_name: '青岛港', from_port_lat: 36.06, from_port_lng: 120.32, to_port_code: 'SGSIN', to_port_name: '新加坡（中转）', to_port_lat: 1.29, to_port_lng: 103.85, etd: '2026-07-15', eta: '2026-07-22', atd: '2026-07-15T10:00:00Z', ata: '2026-07-21T18:00:00Z', status: 'completed', is_current: false, sequence: 1, created_at: '2026-07-01T10:00:00Z' },
      { id: 'l7', record_id: 'demo-rec-006', vessel_name: 'ONE AQUILA', imo: '9805453', voyage: 'V.2507D', from_port_code: 'SGSIN', from_port_name: '新加坡', from_port_lat: 1.29, from_port_lng: 103.85, to_port_code: 'ZADUR', to_port_name: '德班', to_port_lat: -29.86, to_port_lng: 31.03, etd: '2026-07-22', eta: '2026-08-10', atd: '2026-07-22T04:00:00Z', status: 'in_progress', is_current: true, sequence: 2, created_at: '2026-07-01T10:00:00Z' },
    ],
    notifications: [
      { id: 'n4', record_id: 'demo-rec-006', organization_id: '', type: 'important_change', title: 'ONE AQUILA 已完成新加坡中转', content: '船舶于 2026-07-21 18:00 抵达新加坡，已于 2026-07-22 04:00 出发前往德班。', created_at: '2026-07-22T04:30:00Z', is_read: false },
    ],
  };
}

// ============ 查询逻辑 ============

/** 识别输入编号类型 */
export function detectInputType(input: string): 'bl' | 'carrier_tracking' | 'vin' | 'unknown' {
  const trimmed = input.trim().toUpperCase();

  // VIN: 17位字母数字，不含 I/O/Q（避免与数字混淆）
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(trimmed)) {
    return 'vin';
  }

  // 提单号: 4字母 + 10-12数字 (如 COSU6823456789)
  if (/^[A-Z]{4}\d{10,12}$/.test(trimmed)) {
    return 'bl';
  }

  // 承运商跟踪号: 包含字母数字和连字符
  if (/^[A-Z]{2,6}[-][A-Z]{2}[-]\d{6,}$/i.test(trimmed)) {
    return 'carrier_tracking';
  }

  // 平台内部编号: TR + 6位数字
  if (/^TR\d{6}$/.test(trimmed)) {
    return 'bl';
  }

  return 'unknown';
}

/** 统一查询 */
export function queryTransport(input: string): QueryResult | null {
  const type = detectInputType(input);
  const demoRecords = getDemoRecords();

  if (type === 'unknown') {
    return null;
  }

  const searchKey = input.trim().toUpperCase();

  if (type === 'vin') {
    // VIN 查询 - 可能匹配多条记录
    const matched = demoRecords.filter((r) =>
      r.vehicles?.some((v) => v.vin.toUpperCase() === searchKey)
    );
    if (matched.length === 0) return null;
    return {
      type: 'vin',
      input: searchKey,
      records: matched,
      is_demo: true,
      is_existing: false,
    };
  }

  // 提单号或承运商跟踪号查询
  const record = demoRecords.find(
    (r) =>
      r.bl_number?.toUpperCase() === searchKey ||
      r.carrier_tracking_number?.toUpperCase() === searchKey
  );

  if (!record) {
    // 返回"待查询"状态
    return {
      type: type as 'bl' | 'carrier_tracking',
      input: searchKey,
      is_demo: false,
      is_existing: false,
    };
  }

  return {
    type: type as 'bl' | 'carrier_tracking',
    input: searchKey,
    record,
    is_demo: true,
    is_existing: false,
  };
}

/** 获取演示查询单号 */
export function getDemoQueryNumbers(): string[] {
  return [
    'COSU6823456789',
    'MSCU7890123456',
    'LGXCE6DB5N0123789',
    'MAEU2026072001',
    'HLCU2026071801',
  ];
}

/** 批量导入解析 */
export function parseBatchImport(text: string): BatchImportItem[] {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const parts = line.split(/[\t,]/).map((p) => p.trim());
    const blNumber = parts[0] || '';
    const carrierTracking = parts[1] || '';
    const vin = parts[2] || '';

    if (!blNumber && !carrierTracking) {
      return { status: 'format_error', message: '缺少提单号或承运商跟踪号' };
    }

    const queryResult = queryTransport(blNumber || carrierTracking);
    if (queryResult?.record) {
      return { bl_number: blNumber, carrier_tracking_number: carrierTracking, vin, status: 'duplicate', message: '已存在相同记录' };
    }

    return { bl_number: blNumber, carrier_tracking_number: carrierTracking, vin, status: 'success', message: '可加入运输清单' };
  });
}