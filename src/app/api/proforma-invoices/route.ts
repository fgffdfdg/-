import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

/**
 * 形式发票 列表 / 创建
 *
 * 数据隔离：按「所有者（user_id）或所属组织（organization_id）」隔离，
 * 确保用户保存的发票一定能被自己读回（修复此前因 org 竞态导致保存后列表不可见的问题）。
 */

interface CreateInvoiceBody {
  title?: string;
  buyer_info: Record<string, unknown>;
  order_info: Record<string, unknown>;
  vehicles: Record<string, unknown>[];
  organization_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const organizationId = searchParams.get('organization_id');
    const search = searchParams.get('search');

    let query = client
      .from('proforma_invoices')
      .select('id, title, buyer_info, order_info, vehicles, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 所有者或同组织成员可见
    if (organizationId) {
      query = query.or(`user_id.eq.${user.id},organization_id.eq.${organizationId}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    if (search) {
      query = query.ilike('order_info->>invoice_no', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ data, total: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);

    // Verify user identity from token
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = (await request.json()) as CreateInvoiceBody;

    if (!body.buyer_info || !body.order_info || !body.vehicles) {
      return NextResponse.json(
        { error: '缺少必填字段: buyer_info, order_info, vehicles' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('proforma_invoices')
      .insert({
        title: body.title ?? '未命名发票',
        buyer_info: body.buyer_info,
        order_info: body.order_info,
        vehicles: body.vehicles,
        user_id: user.id,
        organization_id: body.organization_id ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    // 写入车辆关联索引（反向联动）：仅车辆条目带 VIN
    const vins = (body.vehicles ?? [])
      .map((v) => String(v.vin ?? ''))
      .filter(Boolean);
    if (vins.length > 0) {
      upsertVehicleLinks(user.id, body.organization_id ?? null, {
        docType: 'proforma_invoice',
        docId: data.id,
        docNo: (body.order_info?.invoice_no as string) ?? undefined,
        vins,
      }).catch(() => { /* 索引写入失败不影响主流程 */ });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
