/**
 * 单证-车辆关联索引 - 服务端工具
 *
 * 在 API 路由中调用，保存单证时自动写入关联索引。
 * 直接使用 Supabase 客户端。
 */
import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface LinkVehicleDoc {
  docType: string;
  docId: string;
  docNo?: string;
  vins: string[];
}

/**
 * 为单证创建/更新车辆关联（先删后插，实现 upsert）。
 * 在单证保存 API 路由中调用。
 */
export async function upsertVehicleLinks(
  userId: string,
  orgId: string | null,
  doc: LinkVehicleDoc
): Promise<number> {
  const supabase = await getSupabaseClient();

  const cleanVins = [...new Set(
    doc.vins
      .map((v) => v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""))
      .filter((v) => v.length >= 17)
  )];

  if (cleanVins.length === 0) return 0;

  // 先删除该单证的旧关联
  await supabase
    .from("document_vehicle_links")
    .delete()
    .eq("doc_type", doc.docType)
    .eq("doc_id", doc.docId);

  // 插入新关联
  const rows = cleanVins.map((vin) => ({
    user_id: userId,
    organization_id: orgId,
    doc_type: doc.docType,
    doc_id: doc.docId,
    doc_no: doc.docNo || null,
    vin,
  }));

  await supabase.from("document_vehicle_links").insert(rows);
  return rows.length;
}

/**
 * 删除指定单证的所有车辆关联。
 */
export async function removeVehicleLinks(
  docType: string,
  docId: string
): Promise<void> {
  const supabase = await getSupabaseClient();

  await supabase
    .from("document_vehicle_links")
    .delete()
    .eq("doc_type", docType)
    .eq("doc_id", docId);
}

/**
 * 查询某个 VIN 关联的所有单证（服务端）。
 */
export async function getDocumentsByVinServer(
  vin: string
): Promise<Array<{ docType: string; docId: string; docNo: string | null }>> {
  const supabase = await getSupabaseClient();

  const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  const { data } = await supabase
    .from("document_vehicle_links")
    .select("doc_type, doc_id, doc_no")
    .eq("vin", cleanVin);

  return (data || []).map((row: Record<string, unknown>) => ({
    docType: row.doc_type as string,
    docId: row.doc_id as string,
    docNo: (row.doc_no as string) || null,
  }));
}