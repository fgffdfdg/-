/**
 * 车况检测报告 - 前端 API client
 */
import type {
  VehicleInspectionReport,
  CreateReportPayload,
  UpdateReportPayload,
} from "./reports";

const BASE = "/api/vehicle-inspection/reports";

function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 获取单个检测报告 */
export async function getReport(
  token: string,
  id: string
): Promise<VehicleInspectionReport> {
  const res = await fetch(`${BASE}/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "获取检测报告失败");
  }
  return res.json();
}

/** 获取某辆车的历史检测报告 */
export async function fetchReportsByVehicle(
  token: string,
  vehicleId: string
): Promise<VehicleInspectionReport[]> {
  const res = await fetch(`${BASE}?vehicleId=${encodeURIComponent(vehicleId)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("获取检测报告失败");
  return res.json();
}

/** 创建检测报告（发起检测前先创建 pending 记录） */
export async function createReport(
  token: string,
  payload: CreateReportPayload
): Promise<VehicleInspectionReport> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "创建检测报告失败");
  }
  return res.json();
}

/** 更新检测报告状态/数据 */
export async function updateReport(
  token: string,
  id: string,
  payload: UpdateReportPayload
): Promise<VehicleInspectionReport> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "更新检测报告失败");
  }
  return res.json();
}

/** 删除检测报告 */
export async function deleteReport(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("删除检测报告失败");
}