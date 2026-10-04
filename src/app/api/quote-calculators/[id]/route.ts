import { NextRequest, NextResponse } from 'next/server';
import { getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

interface DbRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  description: string;
  items: unknown;
  default_exchange_rate: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToCalc(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    items: row.items,
    defaultExchangeRate: Number(row.default_exchange_rate),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  };
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;
    const { data, error } = await client
      .from('quote_calculators')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    return NextResponse.json({ data: rowToCalc(data as DbRow) });
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
    const body = await request.json();
    const { title, description, items, defaultExchangeRate } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (items !== undefined) {
      // v2 可视化计算器：items 必须为 { v: 2, cells: [...] }，防止旧格式写入后前端不可见
      const validItems =
        items !== null &&
        typeof items === 'object' &&
        !Array.isArray(items) &&
        (items as { v?: unknown }).v === 2 &&
        Array.isArray((items as { cells?: unknown }).cells);
      if (!validItems) return NextResponse.json({ error: '计算器数据格式无效' }, { status: 400 });
      updates.items = items;
    }
    if (defaultExchangeRate !== undefined) updates.default_exchange_rate = Number(defaultExchangeRate);

    const { data, error } = await client
      .from('quote_calculators')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ data: rowToCalc(data as DbRow) });
  } catch (err) {
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

    // ?permanent=true 彻底删除；默认移入回收站（软删除）
    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';
    if (permanent) {
      const { error } = await client.from('quote_calculators').delete().eq('id', id);
      if (error) throw new Error(`删除失败: ${error.message}`);
      return NextResponse.json({ success: true, deleted: 'permanent' });
    }

    const { data, error } = await client
      .from('quote_calculators')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`删除失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    return NextResponse.json({ success: true, deleted: 'trash' });
  } catch (err) {
    return toErrorResponse(err);
  }
}