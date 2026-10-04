/**
 * 车况检测报告云端 API 客户端。
 * 所有方法均需有效的 Supabase session token，由调用方传入。
 */
import { SavedReport } from './types';

export interface CloudReport {
  id: string;
  userId: string | null;
  organizationId: string | null;
  reportType: string;
  vin: string;
  plateNumber?: string;
  brand?: string;
  series?: string;
  modelName?: string;
  year?: string;
  drivingLicenseImageUrl?: string;
  reportData: unknown;
  createdAt: number;
}

export interface CloudReportListResponse {
  data: CloudReport[];
}

export interface CloudReportSingleResponse {
  data: CloudReport;
}

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** 获取云端报告列表（可按类型筛选） */
export async function fetchReports(token: string, type?: string): Promise<CloudReport[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  const url = `/api/vehicle-inspection/reports${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`获取报告列表失败: ${res.status}`);
  const json = (await res.json()) as CloudReportListResponse;
  return json.data ?? [];
}

/** 上传单份报告到云端（含行驶证图片 base64） */
export async function createReport(
  token: string,
  payload: {
    reportType: string;
    vin: string;
    plateNumber?: string;
    brand?: string;
    series?: string;
    modelName?: string;
    year?: string;
    drivingLicenseImage?: string;
    reportData: unknown;
    organizationId?: string;
  },
): Promise<CloudReport> {
  const res = await fetch('/api/vehicle-inspection/reports', {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error((err as { error?: string }).error || `创建失败: ${res.status}`);
  }
  const json = (await res.json()) as CloudReportSingleResponse;
  return json.data;
}

/** 删除云端单条报告 */
export async function deleteReport(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/vehicle-inspection/reports/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`删除失败: ${res.status}`);
}

/** 将 SavedReport 转为云端创建的 payload */
export function toCloudPayload(r: SavedReport): {
  reportType: string;
  vin: string;
  plateNumber?: string;
  brand?: string;
  series?: string;
  modelName?: string;
  year?: string;
  drivingLicenseImage?: string;
  reportData: unknown;
} {
  return {
    reportType: r.type,
    vin: r.vehicle.vin,
    plateNumber: r.vehicle.plateNumber,
    brand: r.vehicle.brand,
    series: r.vehicle.series,
    modelName: r.vehicle.modelName,
    year: r.vehicle.year,
    drivingLicenseImage: r.vehicle.drivingLicenseImage,
    reportData: r.data,
  };
}

/** 将 CloudReport 转为本地 SavedReport（不含行驶证图片 base64，需从 URL 下载） */
export async function cloudToLocalReport(c: CloudReport): Promise<SavedReport> {
  let drivingLicenseImage: string | undefined;
  if (c.drivingLicenseImageUrl) {
    try {
      const res = await fetch(c.drivingLicenseImageUrl);
      if (res.ok) {
        const blob = await res.blob();
        drivingLicenseImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // 图片下载失败不阻塞
    }
  }

  return {
    id: c.id,
    type: c.reportType as SavedReport['type'],
    vehicle: {
      vin: c.vin,
      plateNumber: c.plateNumber,
      brand: c.brand,
      series: c.series,
      modelName: c.modelName,
      year: c.year,
      drivingLicenseImage,
    },
    createdAt: new Date(c.createdAt).toISOString(),
    data: c.reportData as SavedReport['data'],
  };
}