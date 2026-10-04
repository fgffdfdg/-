import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getCurrentOrgContext } from "@/lib/org/service";

// GET /api/organizations/current - Get current organization context
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const client = getSupabaseClient(token);
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "认证失败" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id") || undefined;

    const context = await getCurrentOrgContext(user.id, orgId);
    return NextResponse.json({ success: true, data: context });
  } catch (error) {
    console.error("GET /api/organizations/current error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取组织上下文失败" },
      { status: 500 }
    );
  }
}
