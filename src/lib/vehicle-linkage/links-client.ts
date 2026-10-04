/**
 * 单证-车辆关联索引 - 前端 API Client
 *
 * 提供从单证表单中写入/查询关联关系的能力。
 */
import { useAuth } from "@/lib/auth-context";

const BASE = "/api/vehicle-links";

// ─── 类型 ──────────────────────────────────────────────────────

export interface VehicleLink {
  id: string;
  user_id: string;
  organization_id: string | null;
  doc_type: string;
  doc_id: string;
  doc_no: string | null;
  vin: string;
  created_at: string;
}

export interface LinkVehicleInput {
  doc_type: string;
  doc_id: string;
  doc_no?: string;
  vins: string[];
}

// ─── API 函数 ──────────────────────────────────────────────────

/**
 * 为单证创建/更新车辆关联（先删后插，实现 upsert）。
 */
export async function linkVehiclesToDocument(
  token: string,
  input: LinkVehicleInput
): Promise<number> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("保存关联失败");
  const data = await res.json();
  return data.linked ?? 0;
}

/**
 * 查询某个 VIN 关联的所有单证。
 */
export async function getDocumentsByVin(
  token: string,
  vin: string
): Promise<VehicleLink[]> {
  const res = await fetch(`${BASE}?vin=${encodeURIComponent(vin)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/**
 * 查询某个单证编号关联的所有 VIN。
 */
export async function getVinsByDocNo(
  token: string,
  docNo: string
): Promise<VehicleLink[]> {
  const res = await fetch(`${BASE}?doc_no=${encodeURIComponent(docNo)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/**
 * 删除单证的所有车辆关联。
 */
export async function removeDocumentLinks(
  token: string,
  docType: string,
  docId: string
): Promise<void> {
  await fetch(`${BASE}?doc_type=${docType}&doc_id=${docId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}