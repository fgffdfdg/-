/**
 * 单证-车辆关联索引 API - 单资源操作
 *
 * DELETE /api/vehicle-links/[id] → 删除单条关联
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, toErrorResponse } from "@/lib/invoice-tax/api-helpers";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, userId } = await getAuthedClient(_request);
    const { id } = await params;

    const { error } = await client
      .from("document_vehicle_links")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}