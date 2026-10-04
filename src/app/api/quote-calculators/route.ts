import { NextRequest, NextResponse } from 'next/server';
import { getAuthedClient, toErrorResponse, ValidationError } from '@/lib/invoice-tax/api-helpers';

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

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    // scope=trash 查回收站（已软删除），默认查有效方案
    const scope = request.nextUrl.searchParams.get('scope');
    let query = client.from('quote_calculators').select('*');
    if (scope === 'trash') {
      query = query.not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    } else {
      query = query.is('deleted_at', null).order('updated_at', { ascending: false });
    }
    const { data, error } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({
      data: (data as DbRow[] | null)?.map(rowToCalc) ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const body = await request.json();
    const { title, description, items, defaultExchangeRate } = body;

    if (!title?.trim()) throw new ValidationError('方案名称不能为空');
    // v2 可视化计算器：items 为 { v: 2, cells: [...] }；旧版数组格式已弃用
    const validItems =
      items !== null &&
      typeof items === 'object' &&
      !Array.isArray(items) &&
      (items as { v?: unknown }).v === 2 &&
      Array.isArray((items as { cells?: unknown }).cells);
    if (!validItems) throw new ValidationError('计算器数据格式无效');

    const insertPayload = {
      user_id: userId,
      title: String(title).trim(),
      description: String(description ?? '').trim(),
      items,
      default_exchange_rate: Number(defaultExchangeRate ?? 1),
    };

    const { data, error } = await client
      .from('quote_calculators')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ data: rowToCalc(data as DbRow) }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}