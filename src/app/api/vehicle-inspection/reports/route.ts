import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json({ error: "缺少 vehicleId 参数" }, { status: 400 });
    }

    const { data, error } = await client
      .from("vehicle_inspection_reports")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json(data ?? []);
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
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "用户认证失败" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, reportType, orderId, reportData } = body;

    if (!vehicleId || !reportType) {
      return NextResponse.json({ error: "缺少 vehicleId 或 reportType" }, { status: 400 });
    }

    const { data: vehicle } = await client
      .from("vehicle_archives")
      .select("id, organization_id, vin, plate_number, brand, driving_license_image_url")
      .eq("id", vehicleId)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json({ error: "车辆档案不存在" }, { status: 404 });
    }

    const { data, error } = await client
      .from("vehicle_inspection_reports")
      .insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        organization_id: vehicle.organization_id ?? null,
        report_type: reportType,
        order_id: orderId ?? null,
        report_data: reportData ?? {},
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}