import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getOrganizationById, updateOrganization, getMemberByUserId } from "@/lib/org/service";
import { canManageSettings } from "@/lib/org/permissions";

// GET /api/organizations/[id] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership) {
      return NextResponse.json({ error: "无权访问该组织" }, { status: 403 });
    }

    const organization = await getOrganizationById(id);
    if (!organization) {
      return NextResponse.json({ error: "组织不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: organization });
  } catch (error) {
    console.error("GET /api/organizations/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取组织详情失败" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[id] - Update organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership || !membership.role || !canManageSettings(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权修改组织设置" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ["name", "industry", "contact_email", "contact_phone", "logo_url", "settings"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const organization = await updateOrganization(id, updates as never);
    return NextResponse.json({ success: true, data: organization });
  } catch (error) {
    console.error("PUT /api/organizations/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新组织失败" },
      { status: 500 }
    );
  }
}
