import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserOrganizations, createOrganization } from "@/lib/org/service";

// POST /api/organizations/auto-create - Auto-create a personal organization for new users
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "认证失败" }, { status: 401 });
    }

    // Check if user already has an organization
    const existingOrgs = await getUserOrganizations(user.id);
    if (existingOrgs.length > 0) {
      // User already has an org, return the first one
      return NextResponse.json({ success: true, data: existingOrgs[0], created: false });
    }

    // Generate a unique slug based on user ID and timestamp
    const slugSuffix = user.id.replace(/-/g, "").substring(0, 8);
    const timestamp = Date.now().toString(36).slice(-4);
    const slug = `personal-${slugSuffix}-${timestamp}`;

    // Get user email for the org name
    const userEmail = user.email || "";
    const userName = userEmail.split("@")[0] || "用户";

    // Create personal organization
    const org = await createOrganization({
      name: `${userName} 的工作区`,
      slug,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: org, created: true });
  } catch (error) {
    console.error("POST /api/organizations/auto-create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自动创建组织失败" },
      { status: 500 }
    );
  }
}
