// ============ 运输跟踪 - Freightower API 客户端 ============
// 文档: https://doc.freightower.com/318680523e0

const FREIGHTOWER_API_BASE = 'http://openapi.freightower.com/application/v1';
const FREIGHTOWER_API_TOKEN = process.env.FREIGHTOWER_API_TOKEN || '';

/** Freightower 查询请求参数 */
export interface FreightowerQueryParams {
  /** 提单号 / 订舱号 / 港区分单号 */
  billNo?: string;
  /** 箱号 */
  containerNo?: string;
  /** 船公司代码（不明确时传 AUTO） */
  carrierCode?: string;
  /** 港区代码（与 isExport 绑定使用） */
  portCode?: string;
  /** 进出口标识: E=出口, I=进口 */
  isExport?: string;
  /** 客户自定义业务编号 */
  businessNo?: string;
  /** 单号类型: BL=提单号, BK=订舱号 */
  billCategory?: string;
  /** 起运港代码 */
  polCode?: string;
  /** 目的港代码 */
  podCode?: string;
  /** 网站账号ID（绑定微信推送） */
  openId?: string;
}

/** Freightower 查询响应 */
export interface FreightowerQueryResponse {
  alertMessage?: string | null;
  statusCode: number;
  message: string;
  data: {
    query: {
      param: Record<string, string | null>;
      actualParam: Record<string, string | null>;
      method: string;
    };
    result: FreightowerResult;
  };
}

/** Freightower 运输结果 */
export interface FreightowerResult {
  billNo: string;
  containerNo: string;
  isBillNo: boolean;
  billCategory: string;
  statusCategory: string;
  statusDescription: string;
  endTime?: string;
  updateTime: string;
  firstObtainDataTime: string;
  iframeUrl: string;
  carrier: {
    nameCn: string;
    scac: string;
    nameEn: string;
    code: string;
    url: string;
  };
  booking?: {
    bookingStatus: string;
    bookingStatusCn: string;
    totalContainers: string;
    priceCalculationDate: string;
  };
  receipt: FreightowerPort;
  delivery: FreightowerPort;
  firstVessel?: {
    vessel: string;
    voyage: string;
    routeCode: string;
  };
  currentStatus: FreightowerStatusEvent;
  places: FreightowerPlace[];
  routes: FreightowerRoute[];
  terminalPlan?: FreightowerTerminalPlan;
  containers: FreightowerContainer[];
}

export interface FreightowerPort {
  code: string;
  name: string;
  nameOrigin: string;
  lat: number;
  lon: number;
  portTimeZone: string;
  eta?: string | null;
  ata?: string | null;
  std?: string | null;
  etd?: string | null;
  atd?: string | null;
  terminalName?: string;
  firmsCode?: string | null;
}

export interface FreightowerStatusEvent {
  transportMode: string;
  vslName?: string | null;
  voy?: string | null;
  containerNo: string;
  eventCode: string;
  eventTime: string;
  isEsti: string;
  eventPlace: string;
  portTimeZone: string;
  descriptionCn: string;
  descriptionEn: string;
  eventPlaceOrigin: string;
  eventDescriptionOrigin?: string;
  portCode: string;
  lat: number;
  lon: number;
  portDetailCn?: string | null;
  distance?: number | null;
  terminalName?: string;
  firmsCode?: string | null;
  source: number;
  mmsi?: string | null;
}

export interface FreightowerPlace {
  code: string;
  name: string;
  nameCn: string;
  nameOrigin: string;
  type: number; // 1=起运港, 2=起运港码头, 4=中转港, 5=目的港
  lat: number;
  lon: number;
  portTimeZone: string;
  transportMode_in: string;
  containerCount_in: string;
  sta?: string | null;
  eta?: string | null;
  eta_ft?: string | null;
  ata?: string | null;
  ata_ais?: string | null;
  atb_ais?: string | null;
  disc?: string | null;
  std?: string | null;
  etd?: string | null;
  load?: string | null;
  atd?: string | null;
  atd_ais?: string | null;
  atbd_ais?: string | null;
  terminalName?: string;
  firmsCode?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  transportMode_out: string;
  containerCount_out: string;
}

export interface FreightowerRoute {
  route: number;
  polCode: string;
  polName: string;
  polOrigin: string;
  polLat: string;
  polLon: string;
  polZone: string;
  podCode: string;
  podName: string;
  podOrigin: string;
  podFirmsCode?: string | null;
  podLat: string;
  podLon: string;
  podZone: string;
  transportMode: string;
  modeDetails: {
    vessel?: string | null;
    voyage?: string | null;
    routeCode?: string | null;
    polEtd?: string | null;
    polAtd?: string | null;
    polAtdSource?: number | null;
    polStd?: string | null;
    polAtdAis?: string | null;
    polAtbdAis?: string | null;
    podEta?: string | null;
    podEtaFt?: string | null;
    podAta?: string | null;
    podAtaSource?: number | null;
    podSta?: string | null;
    podAtaAis?: string | null;
    podAtbAis?: string | null;
  };
}

export interface FreightowerTerminalPlan {
  etd: string;
  atd: string;
  eta: string;
  ata: string;
  portsEn: string;
  portsCn: string;
  portCode: string;
  portName: string;
  vessel: string;
  voyage: string;
  terminalName: string;
  terminalCode: string;
  portTimeZone: string;
  open: string;
  close: string;
  portClose?: string | null;
  customsClose?: string | null;
  shippingAgent: string;
  shippingAgentCn: string;
}

export interface FreightowerContainer {
  containerType: string;
  containerSize: string;
  containerTypeGroup: string;
  containerNo: string;
  sealNo: string;
  currentStatusCode: string;
  currentStatusDescriptionCn: string;
  currentStatusDescriptionEn: string;
  eventPlace: string;
  portCode: string;
  lat: number;
  lon: number;
  offLoadOfCarrier: boolean;
  serviceType: string;
  status: FreightowerStatusEvent[];
}

/** 调用 Freightower 查询接口 */
export async function queryFreightower(
  params: FreightowerQueryParams
): Promise<FreightowerQueryResponse> {
  if (!FREIGHTOWER_API_TOKEN) {
    throw new Error('Freightower API Token 未配置，请设置环境变量 FREIGHTOWER_API_TOKEN');
  }

  const body: Record<string, string> = {};
  if (params.billNo) body.billNo = params.billNo;
  if (params.containerNo) body.containerNo = params.containerNo;
  if (params.carrierCode) body.carrierCode = params.carrierCode;
  if (params.portCode) body.portCode = params.portCode;
  if (params.isExport) body.isExport = params.isExport;
  if (params.businessNo) body.businessNo = params.businessNo;
  if (params.billCategory) body.billCategory = params.billCategory;
  if (params.polCode) body.polCode = params.polCode;
  if (params.podCode) body.podCode = params.podCode;
  if (params.openId) body.openId = params.openId;

  const response = await fetch(`${FREIGHTOWER_API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FREIGHTOWER_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Freightower API 请求失败 (${response.status}): ${errorText}`);
  }

  const data: FreightowerQueryResponse = await response.json();
  return data;
}

/** 检查 Freightower API Token 是否已配置 */
export function isFreightowerConfigured(): boolean {
  return !!FREIGHTOWER_API_TOKEN;
}