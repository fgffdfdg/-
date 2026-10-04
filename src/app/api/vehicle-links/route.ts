/**
 * 单证-车辆关联索引 API
 *
 * 支持双向查询：
 * - GET  /api/vehicle-links?vin=LSV...   → 该 VIN 关联的所有单证
 * - GET  /api/vehicle-links?doc_no=INV-001 → 该编号关联的所有 VIN
 * - GET  /api/vehicle-links?doc_type=invoice&doc_id=xxx → 指定单证的所有 VIN
 * - POST /api/vehicle-links               → 创建关联（upsert）
 * - DELETE /api/vehicle-links?doc_type=xxx&doc_id=xxx → 删除单证的所有关联
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, toErrorResponse } from "@/lib/invoice-tax/api-helpers";

export const runtime = "nodejs";

// ─── GET：查询关联 ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get("vin");
    const docNo = searchParams.get("doc_no");
    const docType = searchParams.get("doc_type");
    const docId = searchParams.get("doc_id");

    let query = client
      .from("document_vehicle_links")
      .select("*")
      .eq("user_id", userId);

    if (vin) {
      query = query.eq("vin", vin.toUpperCase());
    }
    if (docNo) {
      query = query.eq("doc_no", docNo);
    }
    if (docType) {
      query = query.eq("doc_type", docType);
    }
    if (docId) {
      query = query.eq("doc_id", docId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ─── POST：创建/更新关联 ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const body = await request.json();
    const { doc_type, doc_id, doc_no, vins } = body as {
      doc_type: string;
      doc_id: string;
      doc_no?: string;
      vins: string[];
    };

    if (!doc_type || !doc_id || !vins?.length) {
      return NextResponse.json({ error: "缺少必填字段：doc_type, doc_id, vins" }, { status: 400 });
    }

    // 先删除该单证的所有旧关联
    await client
      .from("document_vehicle_links")
      .delete()
      .eq("user_id", userId)
      .eq("doc_type", doc_type)
      .eq("doc_id", doc_id);

    // 批量插入新关联
    const rows = vins.map((vin) => ({
      user_id: userId,
      doc_type,
      doc_id,
      doc_no: doc_no ?? null,
      vin: vin.toUpperCase(),
    }));

    const { error } = await client
      .from("document_vehicle_links")
      .insert(rows);

    if (error) throw error;

    return NextResponse.json({ success: true, linked: vins.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ─── DELETE：删除单证的所有关联 ──────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("doc_type");
    const docId = searchParams.get("doc_id");

    if (!docType || !docId) {
      return NextResponse.json({ error: "缺少 doc_type 或 doc_id" }, { status: 400 });
    }

    const { error } = await client
      .from("document_vehicle_links")
      .delete()
      .eq("user_id", userId)
      .eq("doc_type", docType)
      .eq("doc_id", docId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}