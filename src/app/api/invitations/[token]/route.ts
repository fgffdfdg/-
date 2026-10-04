import { NextRequest, NextResponse } from "next/server";
import { getInvitationByToken, acceptInvitation } from "@/lib/org/service";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: "邀请不存在或已过期" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        organization_name: invitation.organizations.name,
        organization_id: invitation.organization_id,
        role_name: invitation.organization_roles.name,
        role_description: invitation.organization_roles.description,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("GET /api/invitations/[token] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询邀请失败" },
      { status: 500 }
    );
  }
}

// POST /api/invitations/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
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

    const { token: inviteToken } = await params;
    const organization = await acceptInvitation(inviteToken, user.id);

    return NextResponse.json({
      success: true,
      data: {
        organization_id: organization.id,
        organization_name: organization.name,
      },
    });
  } catch (error) {
    console.error("POST /api/invitations/[token] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "接受邀请失败" },
      { status: 500 }
    );
  }
}
