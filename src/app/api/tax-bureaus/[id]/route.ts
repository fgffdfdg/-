import { NextRequest, NextResponse } from 'next/server';
import type { TaxBureauSiteType } from '@/lib/invoice-tax/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

const ALLOWED_SITE_TYPES: TaxBureauSiteType[] = ['national', 'provincial', 'business_system'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await getAuthedClient(request);
    const { data, error } = await client
      .from('tax_bureau_favorites')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '收藏不存在' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await getAuthedClient(request);
    const body = (await request.json()) as Record<string, unknown>;

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new Error('请填写机构名称');
      update.name = name;
    }
    if (body.url !== undefined) {
      const url = String(body.url).trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('官网地址需以 http:// 或 https:// 开头');
      update.url = url;
    }
    if (body.site_type !== undefined) {
      const t = String(body.site_type) as TaxBureauSiteType;
      if (!ALLOWED_SITE_TYPES.includes(t)) throw new Error('机构类型非法');
      update.site_type = t;
    }
    if (body.region !== undefined) update.region = String(body.region);
    if (body.description !== undefined) update.description = body.description ?? null;
    if (body.business_tags !== undefined) {
      update.business_tags = Array.isArray(body.business_tags)
        ? (body.business_tags as unknown[]).map((t) => String(t)).filter(Boolean)
        : [];
    }
    if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order) || 0;

    const { data, error } = await client
      .from('tax_bureau_favorites')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '收藏不存在或无权修改' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await getAuthedClient(request);
    const { error } = await client.from('tax_bureau_favorites').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
