import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import {
  getOrganizationMembers,
  createInvitation,
  getMemberByUserId,
  getMemberCount,
  getOrganizationById,
} from "@/lib/org/service";
import { canManageMembers } from "@/lib/org/permissions";

// GET /api/organizations/[id]/members - List members
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

    const members = await getOrganizationMembers(id);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("GET /api/organizations/[id]/members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取成员列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/members - Invite a member
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
    if (!membership || !membership.role || !canManageMembers(membership.role.permissions as never)) {
      return NextResponse.json({ error: "无权管理成员" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role_id } = body;

    if (!email || !role_id) {
      return NextResponse.json({ error: "邮箱和角色不能为空" }, { status: 400 });
    }

    // Check member limit
    const org = await getOrganizationById(id);
    if (!org) {
      return NextResponse.json({ error: "组织不存在" }, { status: 404 });
    }

    const memberCount = await getMemberCount(id);
    if (memberCount >= org.max_members) {
      return NextResponse.json(
        { error: `组织成员数已达上限（最多${org.max_members}人）` },
        { status: 400 }
      );
    }

    const invitation = await createInvitation(id, email, role_id, user.id);

    // Generate invitation URL
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || "localhost:5000";
    const inviteUrl = `${baseUrl.startsWith("http") ? "" : "https://"}${baseUrl}/invite/${invitation.token}`;

    return NextResponse.json({
      success: true,
      data: {
        invitation,
        invite_url: inviteUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/organizations/[id]/members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "邀请成员失败" },
      { status: 500 }
    );
  }
}
