/**
 * 车源管理 - 前端 API client
 */
import type {
  VehicleArchive,
  CreateVehicleArchivePayload,
  UpdateVehicleArchivePayload,
  VehicleArchiveListParams,
  VehicleArchiveListResponse,
  VehicleArchiveSummary,
  OcrParseResult,
  MergeRequest,
} from "./types";

const BASE = "/api/car-inventory";

function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── 列表 ─────────────────────────────────────────────────────

export async function fetchVehicleArchives(
  token: string,
  params: VehicleArchiveListParams = {}
): Promise<VehicleArchiveListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.q) searchParams.set("q", params.q);
  if (params.vin) searchParams.set("vin", params.vin);
  if (params.plateNumber) searchParams.set("plate_number", params.plateNumber);
  if (params.brand) searchParams.set("brand", params.brand);
  if (params.fuelType) searchParams.set("fuel_type", params.fuelType);
  if (params.status) searchParams.set("status", params.status);

  const res = await fetch(`${BASE}?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("获取车辆列表失败");
  return res.json();
}

// ─── 详情 ─────────────────────────────────────────────────────

export async function fetchVehicleArchive(token: string, id: string): Promise<VehicleArchive> {
  const res = await fetch(`${BASE}/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("获取车辆详情失败");
  return res.json();
}

// ─── 创建 ─────────────────────────────────────────────────────

export async function createVehicleArchive(
  token: string,
  payload: CreateVehicleArchivePayload
): Promise<VehicleArchive> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "创建车辆档案失败");
  }
  return res.json();
}

// ─── 更新 ─────────────────────────────────────────────────────

export async function updateVehicleArchive(
  token: string,
  id: string,
  payload: UpdateVehicleArchivePayload
): Promise<VehicleArchive> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "更新车辆档案失败");
  }
  return res.json();
}

// ─── 删除（归档）───────────────────────────────────────────────

export async function archiveVehicleArchive(token: string, id: string): Promise<VehicleArchive> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("归档车辆档案失败");
  return res.json();
}

// ─── OCR 解析行驶证 ────────────────────────────────────────────

export async function parseLicenseImage(
  token: string,
  imageBase64: string
): Promise<OcrParseResult> {
  const res = await fetch(`${BASE}/parse-license`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  return res.json();
}

// ─── OCR 解析绿本 ──────────────────────────────────────────────

export async function parseRegistrationImage(
  token: string,
  imageBase64: string
): Promise<OcrParseResult> {
  const res = await fetch(`${BASE}/parse-registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  return res.json();
}

// ─── 合并行驶证+绿本 ──────────────────────────────────────────

export async function mergeVehicleData(
  token: string,
  payload: MergeRequest
): Promise<OcrParseResult> {
  const res = await fetch(`${BASE}/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ─── 轻量检索（供其他模块调用）─────────────────────────────────

export async function searchVehicleArchives(
  token: string,
  q?: string,
  limit = 20
): Promise<VehicleArchiveSummary[]> {
  const searchParams = new URLSearchParams();
  if (q) searchParams.set("q", q);
  if (limit) searchParams.set("limit", String(limit));

  const res = await fetch(`${BASE}/search?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("搜索车辆失败");
  return res.json();
}