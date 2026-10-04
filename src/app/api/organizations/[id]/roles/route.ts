import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getOrganizationRoles, createCustomRole, getMemberByUserId } from "@/lib/org/service";
import { canManageRoles } from "@/lib/org/permissions";
import type { PermissionConfig } from "@/lib/org/types";

// GET /api/organizations/[id]/roles - List roles
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

    const roles = await getOrganizationRoles(id);
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("GET /api/organizations/[id]/roles error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取角色列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/roles - Create custom role
export async function POST(
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
    if (!membership || !membership.role || !canManageRoles(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理角色" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json({ error: "角色名称和权限配置不能为空" }, { status: 400 });
    }

    const role = await createCustomRole(id, name, description || "", permissions as PermissionConfig);
    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    console.error("POST /api/organizations/[id]/roles error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建角色失败" },
      { status: 500 }
    );
  }
}
