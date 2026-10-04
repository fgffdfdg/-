import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { CustomsDeclarationFull } from '@/lib/customs-declaration/types';
import { summarizeGoods } from '@/lib/customs-declaration/types';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

interface CustomsDeclarationRow {
  id: string;
  organization_id: string | null;
  entry_no: string;
  customs_no: string | null;
  contract_no: string | null;
  consignee_name: string | null;
  trade_country_code: string | null;
  arrival_country_code: string | null;
  exit_customs_code: string | null;
  transport_mode_code: string | null;
  item_count: number;
  total_quantity: number;
  total_amount: number;
  currency_code: string | null;
  export_date: string | null;
  declare_date: string | null;
  status: string;
  data: CustomsDeclarationFull;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateBody {
  data?: CustomsDeclarationFull;
  status?: 'draft' | 'submitted' | 'archived';
}

function extractSummary(data: CustomsDeclarationFull) {
  const s = summarizeGoods(data);
  const currencyCode = (Array.isArray(data.goods) ? data.goods : []).find((g) => g.currencyCode)?.currencyCode ?? null;
  return {
    itemCount: data.goods?.length ?? 0,
    totalQuantity: s.totalQuantity,
    totalAmount: Math.round(s.totalAmount * 100) / 100,
    currencyCode,
    contractNo: data.contractNo || null,
    consigneeName: data.consignee?.name || null,
    tradeCountryCode: data.tradeCountryCode || null,
    arrivalCountryCode: data.arrivalCountryCode || null,
    exitCustomsCode: data.exitCustomsCode || null,
    transportModeCode: data.transportModeCode || null,
    exportDate: data.exportDate || null,
    declareDate: data.declareDate || null,
    customsNo: data.customsNo || null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { data, error } = await client
      .from('customs_declarations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '报关单不存在' }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateBody;
    if (!body.data && !body.status) {
      return NextResponse.json({ error: '缺少更新内容' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await client
      .from('customs_declarations')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(`查询失败: ${fetchErr.message}`);
    if (!existing) {
      return NextResponse.json({ error: '报关单不存在' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) {
      updatePayload.status = body.status;
    }
    if (body.data) {
      const summary = extractSummary(body.data);
      Object.assign(updatePayload, {
        entry_no: body.data.entryNo,
        customs_no: body.data.entryNo,
        contract_no: summary.contractNo,
        consignee_name: summary.consigneeName,
        trade_country_code: summary.tradeCountryCode,
        arrival_country_code: summary.arrivalCountryCode,
        exit_customs_code: summary.exitCustomsCode,
        transport_mode_code: summary.transportModeCode,
        item_count: summary.itemCount,
        total_quantity: summary.totalQuantity,
        total_amount: summary.totalAmount,
        currency_code: summary.currencyCode,
        export_date: summary.exportDate,
        declare_date: summary.declareDate,
        data: body.data as unknown as Record<string, unknown>,
      });
    }

    const { data: updated, error } = await client
      .from('customs_declarations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    // 写入车辆关联索引
    if (body.data?.goods) {
      const vins = body.data.goods.map((g: { vin?: string }) => g.vin).filter(Boolean) as string[];
      if (vins.length > 0) {
        upsertVehicleLinks(user.id, null, {
          docType: 'customs_declaration',
          docId: id,
          docNo: body.data.entryNo,
          vins,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const { error } = await client.from('customs_declarations').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
