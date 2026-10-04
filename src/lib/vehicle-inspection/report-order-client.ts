/**
 * 报告订单 - 前端 API 客户端
 */
import type {
  ReportCombinationResponse,
  ReportOrder,
  CreateReportCombinationPayload,
  SaveTemporaryVehiclePayload,
  SaveTemporaryVehicleResponse,
  VinDuplicateCheck,
  ReportOrderStatus,
  FinancialStatus,
} from './report-orders';

const BASE = '/api/vehicle-inspection';

function getAuthHeaders(): Record<string, string> {
  // 通过 Supabase 客户端获取 token
  if (typeof window === 'undefined') return {};
  // 从 localStorage 读取 supabase token
  const supabaseToken = (() => {
    try {
      const keys = Object.keys(localStorage);
      const key = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!key) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.access_token ?? null;
    } catch {
      return null;
    }
  })();
  return supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {};
}

/** 初始化查询：创建临时车辆 + 报告订单组合 */
export async function initQuery(payload: CreateReportCombinationPayload): Promise<ReportCombinationResponse> {
  const hasFile = !!payload.drivingLicenseFile;

  if (hasFile) {
    // 有文件时使用 multipart/form-data
    const formData = new FormData();
    formData.append('vin', payload.vin);
    formData.append('reportTypes', JSON.stringify(payload.reportTypes));
    if (payload.organizationId) {
      formData.append('organizationId', payload.organizationId);
    }
    if (payload.drivingLicenseFile) {
      formData.append('drivingLicense', payload.drivingLicenseFile);
    }
    if (payload.drivingLicenseImageUrl) {
      formData.append('drivingLicenseImageUrl', payload.drivingLicenseImageUrl);
    }

    const res = await fetch(`${BASE}/init-query`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // 无文件时使用 JSON
  const jsonPayload: Record<string, unknown> = {
    vin: payload.vin,
    reportTypes: payload.reportTypes,
    organizationId: payload.organizationId ?? null,
    drivingLicenseImageUrl: payload.drivingLicenseImageUrl ?? null,
  };

  const res = await fetch(`${BASE}/init-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(jsonPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 获取报告订单详情 */
export async function getReportOrder(orderId: string): Promise<ReportOrder> {
  const res = await fetch(`${BASE}/report-orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

/** 更新报告订单状态 */
export async function updateReportOrder(
  orderId: string,
  update: {
    status: ReportOrderStatus;
    financialStatus?: FinancialStatus;
    resultSummary?: string | null;
    errorMessage?: string | null;
  }
): Promise<ReportOrder> {
  const res = await fetch(`${BASE}/report-orders/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

/** 保存临时车辆 */
export async function saveTempVehicle(payload: SaveTemporaryVehiclePayload): Promise<SaveTemporaryVehicleResponse> {
  const res = await fetch(`${BASE}/save-temp-vehicle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** VIN查重 */
export async function checkVin(vin: string, organizationId?: string | null): Promise<VinDuplicateCheck> {
  const params = new URLSearchParams({ vin });
  if (organizationId) params.set('organization_id', organizationId);
  const res = await fetch(`${BASE}/vin-check?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}