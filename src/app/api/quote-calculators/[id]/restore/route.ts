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

/** 从回收站恢复方案（清除软删除标记） */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await getAuthedClient(request);
    const { id } = await ctx.params;

    const { data, error } = await client
      .from('quote_calculators')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`恢复失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const row = data as DbRow;
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        title: row.title,
        description: row.description,
        items: row.items,
        defaultExchangeRate: Number(row.default_exchange_rate),
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        deletedAt: null,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
