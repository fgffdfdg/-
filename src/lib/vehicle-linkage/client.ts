/**
 * 数据联动系统 - 前端 API Client
 *
 * 从 vehicle_archives 表查询车辆数据，用于自动填充单证。
 */
import type { VehicleArchive } from "@/lib/car-inventory/types";
import type { DocTypeKey } from "./types";
import { applyMapping } from "./mappings";

const API_BASE = "/api/car-inventory";

/**
 * 根据 VIN 精确查询车辆档案。
 * 返回第一匹配项，未找到返回 null。
 */
export async function fetchVehicleByVin(token: string, vin: string): Promise<VehicleArchive | null> {
  if (!vin || vin.length < 8) return null;

  try {
    const url = `${API_BASE}?vin=${encodeURIComponent(vin)}&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const items: VehicleArchive[] = data.items ?? data.data ?? [];

    // 精确匹配 VIN（大小写不敏感）
    const normalizedInput = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    const match = items.find((item) => {
      const itemVin = (item.vin ?? "").toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
      return itemVin === normalizedInput;
    });

    return match ?? null;
  } catch {
    return null;
  }
}

/**
 * 批量查询多个 VIN 对应的车辆档案。
 */
export async function fetchVehiclesByVins(token: string, vins: string[]): Promise<VehicleArchive[]> {
  const results: VehicleArchive[] = [];
  for (const vin of vins) {
    const vehicle = await fetchVehicleByVin(token, vin);
    if (vehicle) results.push(vehicle);
  }
  return results;
}

/**
 * 根据 ID 查询车辆档案完整信息。
 */
export async function fetchVehicleById(token: string, id: string): Promise<VehicleArchive | null> {
  try {
    const url = `${API_BASE}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as VehicleArchive) ?? null;
  } catch {
    return null;
  }
}

/**
 * VIN 搜索建议（供 autocomplete 使用）。
 * 返回精简字段列表，用于下拉选项展示。
 */
export interface VinSuggestion {
  id: string;
  vin: string;
  brand: string;
  model: string;
  brandModel: string;
  customModelName: string;
  fuelType: string;
  plateNumber: string;
}

export async function searchVehicleArchives(
  token: string,
  q: string,
  limit = 8
): Promise<VinSuggestion[]> {
  if (!q || q.length < 3) return [];
  try {
    const url = `${API_BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items: VinSuggestion[] = (json.data ?? []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      vin: (item.vin as string) ?? "",
      brand: (item.brand as string) ?? "",
      model: (item.model as string) ?? "",
      brandModel: (item.brand_model as string) ?? "",
      customModelName: (item.custom_model_name as string) ?? "",
      fuelType: (item.fuel_type as string) ?? "",
      plateNumber: (item.plate_number as string) ?? "",
    }));
    return items;
  } catch {
    return [];
  }
}

/**
 * 独立 lookupByVin 函数：查询车辆档案并返回映射后的填充数据。
 * 需要显式传入 token，通常由 useVinAutoFill hook 封装调用。
 */
export async function lookupByVin(
  token: string,
  vin: string,
  docType: DocTypeKey
): Promise<Record<string, unknown> | null> {
  const trimmed = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  if (!trimmed || trimmed.length < 8) return null;

  const vehicle = await fetchVehicleByVin(token, trimmed);
  if (!vehicle) return null;

  return applyMapping(vehicle, docType);
}