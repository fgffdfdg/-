import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// ─── GET ─── 获取当前用户的自定义平台列表
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
    }

    const client = getSupabaseClient(token);

    // 验证用户身份
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "用户认证失败，请重新登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    let query = client
      .from("source_platforms")
      .select("id, name, url, domain, type, organization_id, user_id, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST ─── 创建自定义平台
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
    }

    const client = getSupabaseClient(token);

    // 从会话确定用户身份，不信任前端传入的 createdBy
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "用户认证失败，请重新登录" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, domain, organization_id } = body;

    // 校验必填字段
    if (!url || !domain) {
      return NextResponse.json(
        { error: "缺少必填字段: url, domain" },
        { status: 400 }
      );
    }

    // 校验 URL 协议
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: "URL 格式无效" }, { status: 400 });
    }

    // 规范化域名
    const normalizedDomain = domain.trim().toLowerCase();

    // 检查同组织下是否已存在相同域名
    const { data: existing, error: checkError } = await client
      .from("source_platforms")
      .select("id, name, url, domain, type, organization_id, user_id, created_at, updated_at")
      .eq("organization_id", organization_id ?? null)
      .eq("domain", normalizedDomain)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: `查询失败: ${checkError.message}` }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: "该平台已存在，已为您定位到已有平台",
      });
    }

    // 插入新记录，user_id 来自会话
    const { data, error } = await client
      .from("source_platforms")
      .insert({
        name: name || normalizedDomain,
        url: normalizedUrl,
        domain: normalizedDomain,
        type: "custom",
        user_id: user.id,
        organization_id: organization_id ?? null,
      })
      .select("id, name, url, domain, type, organization_id, user_id, created_at, updated_at")
      .single();

    if (error) {
      // 处理唯一约束冲突（并发竞态）
      if (error.code === "23505") {
        const { data: dup } = await client
          .from("source_platforms")
          .select("id, name, url, domain, type, organization_id, user_id, created_at, updated_at")
          .eq("organization_id", organization_id ?? null)
          .eq("domain", normalizedDomain)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          data: dup,
          message: "该平台已存在，已为您定位到已有平台",
        });
      }
      return NextResponse.json({ error: `创建失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}