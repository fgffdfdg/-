import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserOrganizations, createOrganization } from "@/lib/org/service";

// GET /api/organizations - List user's organizations
export async function GET(request: NextRequest) {
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

    const organizations = await getUserOrganizations(user.id);
    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error("GET /api/organizations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取组织列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
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

    const body = await request.json();
    const { name, slug: rawSlug, industry, contact_email, contact_phone } = body;

    if (!name || !rawSlug) {
      return NextResponse.json({ error: "组织名称和标识不能为空" }, { status: 400 });
    }

    // Auto-sanitize slug: lowercase, spaces/special chars to hyphens, trim
    const slug = String(rawSlug)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3 || slug.length > 30) {
      return NextResponse.json(
        { error: "组织标识只能包含小写字母、数字和连字符，3-30个字符" },
        { status: 400 }
      );
    }

    const organization = await createOrganization({
      name,
      slug,
      industry,
      contact_email,
      contact_phone,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: organization }, { status: 201 });
  } catch (error) {
    console.error("POST /api/organizations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建组织失败" },
      { status: 500 }
    );
  }
}
