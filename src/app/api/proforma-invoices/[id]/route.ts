import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 形式发票 详情 / 更新 / 删除
 *
 * 权限：记录所有者（user_id）或所属组织（organization_id）成员可访问。
 * 组织 ID 由客户端通过 query 参数 organization_id 传入，仅用于归属校验。
 */

interface UpdateInvoiceBody {
  title?: string;
  buyer_info?: Record<string, unknown>;
  order_info?: Record<string, unknown>;
  vehicles?: Record<string, unknown>[];
}

/** 读取记录并校验归属（所有者或同组织），无权或不存在时返回 null */
async function getOwnedRecord(
  client: SupabaseClient,
  id: string,
  userId: string,
  orgId: string | null
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('proforma_invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`查询失败: ${error.message}`);
  if (!data) return null;

  const record = data as Record<string, unknown>;
  const isOwner = record.user_id === userId;
  const isOrgMember = !!orgId && record.organization_id === orgId;
  if (!isOwner && !isOrgMember) return null;
  return record;
}

/** 认证结果：成功返回 client+user，失败返回 error */
type AuthResult =
  | { client: SupabaseClient; user: User; error: null }
  | { client: null; user: null; error: NextResponse };

/** 校验 token 并返回当前用户；失败返回错误响应 */
async function authenticate(request: NextRequest): Promise<AuthResult> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return {
      client: null,
      user: null,
      error: NextResponse.json({ error: '未授权，请先登录' }, { status: 401 }),
    };
  }
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    return {
      client: null,
      user: null,
      error: NextResponse.json({ error: '用户认证失败' }, { status: 401 }),
    };
  }
  return { client, user, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticate(request);
    if (auth.error) return auth.error;
    const { client, user } = auth;

    const orgId = request.nextUrl.searchParams.get('organization_id');
    const record = await getOwnedRecord(client, id, user.id, orgId);
    if (!record) {
      return NextResponse.json({ error: '发票不存在' }, { status: 404 });
    }

    // 仅返回需要的字段
    const { id: rid, title, buyer_info, order_info, vehicles, created_at, updated_at } = record;
    return NextResponse.json({
      data: { id: rid, title, buyer_info, order_info, vehicles, created_at, updated_at },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticate(request);
    if (auth.error) return auth.error;
    const { client, user } = auth;

    const orgId = request.nextUrl.searchParams.get('organization_id');
    const existing = await getOwnedRecord(client, id, user.id, orgId);
    if (!existing) {
      return NextResponse.json({ error: '发票不存在或无权修改' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateInvoiceBody;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.buyer_info !== undefined) updateData.buyer_info = body.buyer_info;
    if (body.order_info !== undefined) updateData.order_info = body.order_info;
    if (body.vehicles !== undefined) updateData.vehicles = body.vehicles;

    const { data, error } = await client
      .from('proforma_invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '发票不存在或无权修改' }, { status: 404 });
    }

    // 写入车辆关联索引（仅车辆条目带 VIN）
    if (body.vehicles) {
      const vins = body.vehicles.map((v) => String(v.vin ?? '')).filter(Boolean);
      if (vins.length > 0) {
        upsertVehicleLinks(user.id, (existing.organization_id as string) ?? null, {
          docType: 'proforma_invoice',
          docId: id,
          docNo: (body.order_info?.invoice_no as string) ?? undefined,
          vins,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticate(request);
    if (auth.error) return auth.error;
    const { client, user } = auth;

    const orgId = request.nextUrl.searchParams.get('organization_id');
    const existing = await getOwnedRecord(client, id, user.id, orgId);
    if (!existing) {
      return NextResponse.json({ error: '发票不存在或无权删除' }, { status: 404 });
    }

    const { error } = await client
      .from('proforma_invoices')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
