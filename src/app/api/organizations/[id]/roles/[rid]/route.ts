import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { updateRole, deleteRole, getMemberByUserId } from "@/lib/org/service";
import { canManageRoles } from "@/lib/org/permissions";
import type { PermissionConfig } from "@/lib/org/types";

// PUT /api/organizations/[id]/roles/[rid] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
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

    const { id, rid } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership || !membership.role || !canManageRoles(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理角色" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    const role = await updateRole(rid, {
      name,
      description,
      permissions: permissions as PermissionConfig | undefined,
    });

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("PUT /api/organizations/[id]/roles/[rid] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新角色失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id]/roles/[rid] - Delete custom role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
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

    const { id, rid } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership || !membership.role || !canManageRoles(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理角色" }, { status: 403 });
    }

    await deleteRole(rid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/organizations/[id]/roles/[rid] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除角色失败" },
      { status: 500 }
    );
  }
}
