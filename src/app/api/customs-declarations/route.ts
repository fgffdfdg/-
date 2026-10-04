import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { CustomsDeclarationFull } from '@/lib/customs-declaration/types';
import { summarizeGoods } from '@/lib/customs-declaration/types';
import { COUNTRIES, CUSTOMS_OFFICES, TRANSPORT_MODES } from '@/lib/customs-codes';

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

interface CreateBody {
  data: CustomsDeclarationFull;
  organization_id?: string;
}

interface UpdateBody {
  data: CustomsDeclarationFull;
  status?: string;
}

function codeName(list: { code: string; name: string }[], code?: string) {
  if (!code) return null;
  return list.find((x) => x.code === code)?.name ?? null;
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

function rowToListItem(row: CustomsDeclarationRow) {
  const tradeCountryName = codeName(COUNTRIES, row.trade_country_code ?? undefined);
  const arrivalCountryName = codeName(COUNTRIES, row.arrival_country_code ?? undefined);
  const exitCustomsName = codeName(CUSTOMS_OFFICES, row.exit_customs_code ?? undefined);
  const transportModeName = codeName(TRANSPORT_MODES, row.transport_mode_code ?? undefined);
  return {
    id: row.id,
    entryNo: row.entry_no,
    customsNo: row.customs_no,
    contractNo: row.contract_no,
    consigneeName: row.consignee_name,
    tradeCountryCode: row.trade_country_code,
    tradeCountryName,
    arrivalCountryCode: row.arrival_country_code,
    arrivalCountryName,
    exitCustomsCode: row.exit_customs_code,
    exitCustomsName,
    transportModeCode: row.transport_mode_code,
    transportModeName,
    itemCount: row.item_count,
    totalQuantity: row.total_quantity,
    totalAmount: row.total_amount,
    currencyCode: row.currency_code,
    exportDate: row.export_date,
    declareDate: row.declare_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);
    const offset = Number(searchParams.get('offset') ?? 0);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const q = (searchParams.get('q') ?? '').trim();
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = client
      .from('customs_declarations')
      .select(
        'id,organization_id,entry_no,customs_no,contract_no,consignee_name,trade_country_code,arrival_country_code,exit_customs_code,transport_mode_code,item_count,total_quantity,total_amount,currency_code,export_date,declare_date,status,created_at,updated_at',
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (dateFrom) {
      query = query.gte('export_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('export_date', dateTo);
    }
    if (q) {
      query = query.or(`entry_no.ilike.%${q}%,customs_no.ilike.%${q}%,contract_no.ilike.%${q}%,consignee_name.ilike.%${q}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    const list = (data as unknown as CustomsDeclarationRow[]).map(rowToListItem);
    return NextResponse.json({ data: list, total: count ?? 0 });
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
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = (await request.json()) as CreateBody;
    if (!body.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: '缺少必填字段: data' }, { status: 400 });
    }

    const data = body.data;
    const summary = extractSummary(data);

    // 服务端生成预录入编号：ED + YYYYMMDD + 3位流水（按组织+申报日期递增）
    let entryNo = (data.entryNo || '').trim();
    if (!entryNo || entryNo === 'auto') {
      // 使用用户填写的申报日期；若未填写则回退到当天
      const dateStr = summary.declareDate || new Date().toISOString().split('T')[0];
      const ymd = dateStr.replace(/-/g, '');
      const prefix = `ED${ymd}`;
      const orgFilter = body.organization_id ?? null;

      // 同一申报日期、本组织的最大流水号
      let seq = 0;
      const { data: rows, error: listErr } = orgFilter
        ? await client
            .from('customs_declarations')
            .select('entry_no')
            .eq('organization_id', orgFilter)
            .like('entry_no', `${prefix}%`)
            .order('entry_no', { ascending: false })
            .limit(1)
        : await client
            .from('customs_declarations')
            .select('entry_no')
            .is('organization_id', null)
            .like('entry_no', `${prefix}%`)
            .order('entry_no', { ascending: false })
            .limit(1);
      if (listErr) throw new Error(`查询编号失败: ${listErr.message}`);
      if (rows && rows.length > 0) {
        const lastSeq = parseInt((rows[0] as { entry_no: string }).entry_no.slice(prefix.length), 10);
        if (!Number.isNaN(lastSeq)) seq = lastSeq;
      }
      entryNo = `${prefix}${String(seq + 1).padStart(3, '0')}`;
      // 回写到 data，保证保存的 jsonb 与 entry_no 字段一致
      data.entryNo = entryNo;
      // 预录入编号与海关编号一致
      data.customsNo = entryNo;
    }

    const insertPayload = {
      organization_id: body.organization_id ?? null,
      entry_no: entryNo,
      customs_no: entryNo,
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
      status: 'draft',
      data: data as unknown as Record<string, unknown>,
      created_by: user.id,
    };

    const { data: inserted, error } = await client
      .from('customs_declarations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
