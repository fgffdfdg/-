import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getMemberByUserId, updateMemberRole, suspendMember, activateMember, removeMember } from "@/lib/org/service";
import { canManageMembers } from "@/lib/org/permissions";

// PUT /api/organizations/[id]/members/[mid] - Update member (role/status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
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

    const { id, mid } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership || !membership.role || !canManageMembers(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理成员" }, { status: 403 });
    }

    const body = await request.json();
    const { action, role_id } = body;

    switch (action) {
      case "change_role":
        if (!role_id) {
          return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
        }
        await updateMemberRole(mid, role_id);
        break;
      case "suspend":
        await suspendMember(mid);
        break;
      case "activate":
        await activateMember(mid);
        break;
      default:
        return NextResponse.json({ error: "无效的操作" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/organizations/[id]/members/[mid] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新成员失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id]/members/[mid] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
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

    const { id, mid } = await params;
    const membership = await getMemberByUserId(id, user.id);
    if (!membership || !membership.role || !canManageMembers(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理成员" }, { status: 403 });
    }

    await removeMember(mid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/organizations/[id]/members/[mid] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "移除成员失败" },
      { status: 500 }
    );
  }
}
