import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
    }
    const client = getSupabaseClient(token);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "用户认证失败" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");
    const watchStatus = searchParams.get("watch_status") || "active";

    if (!organizationId) {
      return NextResponse.json({ error: "缺少 organization_id" }, { status: 400 });
    }

    // Verify organization membership
    const { data: member, error: memberError } = await client
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: "无权访问该组织" }, { status: 403 });
    }

    let query = client
      .from("model_watches")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (watchStatus !== "all") {
      query = query.eq("watch_status", watchStatus);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
    }
    const client = getSupabaseClient(token);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "用户认证失败" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      name,
      brand,
      series,
      model,
      year_min,
      year_max,
      price_min,
      price_max,
      mileage_min,
      mileage_max,
      location,
    } = body;

    if (!organization_id) {
      return NextResponse.json({ error: "缺少 organization_id" }, { status: 400 });
    }

    if (!brand) {
      return NextResponse.json({ error: "品牌为必填项" }, { status: 400 });
    }

    // Verify organization membership
    const { data: member, error: memberError } = await client
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .eq("status", "active")
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: "无权访问该组织" }, { status: 403 });
    }

    // Dedup: check if identical conditions already exist for this user
    const dedupQuery = client
      .from("model_watches")
      .select("id, name, watch_status")
      .eq("created_by", user.id)
      .eq("brand", brand);

    if (series) dedupQuery.eq("series", series);
    else dedupQuery.is("series", null);
    if (model) dedupQuery.eq("model", model);
    else dedupQuery.is("model", null);
    if (year_min != null) dedupQuery.eq("year_min", year_min);
    else dedupQuery.is("year_min", null);
    if (year_max != null) dedupQuery.eq("year_max", year_max);
    else dedupQuery.is("year_max", null);
    if (price_min != null) dedupQuery.eq("price_min", price_min);
    else dedupQuery.is("price_min", null);
    if (price_max != null) dedupQuery.eq("price_max", price_max);
    else dedupQuery.is("price_max", null);
    if (mileage_min != null) dedupQuery.eq("mileage_min", mileage_min);
    else dedupQuery.is("mileage_min", null);
    if (mileage_max != null) dedupQuery.eq("mileage_max", mileage_max);
    else dedupQuery.is("mileage_max", null);
    if (location) dedupQuery.eq("location", location);
    else dedupQuery.is("location", null);

    const { data: existing } = await dedupQuery.maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `已存在相同的关注条件（关注名称：${existing.name || "未命名"}，状态：${existing.watch_status === "active" ? "启用" : existing.watch_status === "paused" ? "暂停" : "归档"}）`,
          data: existing,
        },
        { status: 409 }
      );
    }

    const { data, error } = await client
      .from("model_watches")
      .insert({
        organization_id,
        name: name || `关注 ${brand} ${series || ""}`.trim(),
        brand,
        series: series || null,
        model: model || null,
        year_min: year_min ?? null,
        year_max: year_max ?? null,
        price_min: price_min ?? null,
        price_max: price_max ?? null,
        mileage_min: mileage_min ?? null,
        mileage_max: mileage_max ?? null,
        location: location || null,
        watch_status: "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `创建失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}