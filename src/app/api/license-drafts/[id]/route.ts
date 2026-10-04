import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

interface DbRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  draft_no: string;
  title: string;
  exporter: string;
  country: string;
  vehicle_count: number;
  total_amount: string;
  status: string;
  contract_no: string | null;
  vins: string[] | null;
  brand: string | null;
  model: string | null;
  main_data: unknown;
  annex_data: unknown;
  created_at: string;
  updated_at: string;
}

function rowToDraft(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    no: row.draft_no,
    title: row.title,
    exporter: row.exporter,
    country: row.country,
    vehicleCount: row.vehicle_count,
    totalAmount: Number(row.total_amount) || 0,
    status: row.status,
    contractNo: row.contract_no ?? undefined,
    vins: row.vins ?? undefined,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    main: row.main_data,
    annex: row.annex_data,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

async function fetchOwned(
  client: SupabaseClient,
  id: string,
): Promise<DbRow | null> {
  const { data, error } = await client
    .from('license_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询失败: ${error.message}`);
  return (data as DbRow | null) ?? null;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const row = await fetchOwned(client, id);
    if (!row) return NextResponse.json({ error: '草单不存在' }, { status: 404 });
    return NextResponse.json({ data: rowToDraft(row) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const existing = await fetchOwned(client, id);
    if (!existing) return NextResponse.json({ error: '草单不存在' }, { status: 404 });

    const body = (await request.json()) as {
      draftNo?: string;
      title?: string;
      exporter?: string;
      country?: string;
      vehicleCount?: number;
      totalAmount?: number;
      status?: string;
      contractNo?: string;
      vins?: string[];
      brand?: string;
      model?: string;
      main?: unknown;
      annex?: unknown;
    };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.draftNo !== undefined) updates.draft_no = body.draftNo.trim();
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.exporter !== undefined) updates.exporter = body.exporter.trim();
    if (body.country !== undefined) updates.country = body.country.trim();
    if (body.vehicleCount !== undefined) updates.vehicle_count = body.vehicleCount;
    if (body.totalAmount !== undefined) updates.total_amount = String(body.totalAmount);
    if (body.status !== undefined) updates.status = body.status;
    if (body.contractNo !== undefined) updates.contract_no = body.contractNo.trim() || null;
    if (body.vins !== undefined) updates.vins = body.vins.length ? body.vins : null;
    if (body.brand !== undefined) updates.brand = body.brand.trim() || null;
    if (body.model !== undefined) updates.model = body.model.trim() || null;
    if (body.main !== undefined) updates.main_data = body.main;
    if (body.annex !== undefined) updates.annex_data = body.annex;

    const { data, error } = await client
      .from('license_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    return NextResponse.json({ data: rowToDraft(data as DbRow) });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const existing = await fetchOwned(client, id);
    if (!existing) return NextResponse.json({ error: '草单不存在' }, { status: 404 });

    const { error } = await client.from('license_drafts').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}