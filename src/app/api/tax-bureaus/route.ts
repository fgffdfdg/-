import { NextRequest, NextResponse } from 'next/server';
import type { TaxBureauFavoriteInput, TaxBureauSiteType } from '@/lib/invoice-tax/types';
import { AuthError, getAuthedClient, getPositiveIntParam, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

interface CreateTaxBureauBody extends TaxBureauFavoriteInput {
  organization_id?: string | null;
}

const ALLOWED_SITE_TYPES: TaxBureauSiteType[] = ['national', 'provincial', 'business_system'];

function normalizeBody(body: Record<string, unknown>): CreateTaxBureauBody {
  const name = String(body.name ?? '').trim();
  const url = String(body.url ?? '').trim();
  const siteType = String(body.site_type ?? '') as TaxBureauSiteType;
  if (!name) throw new Error('请填写机构名称');
  if (!url) throw new Error('请填写官网地址');
  if (!/^https?:\/\//i.test(url)) throw new Error('官网地址需以 http:// 或 https:// 开头');
  if (!ALLOWED_SITE_TYPES.includes(siteType)) throw new Error('机构类型非法');

  const businessTags = Array.isArray(body.business_tags)
    ? (body.business_tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : [];

  return {
    name,
    url,
    site_type: siteType,
    region: body.region ? String(body.region) : '全国',
    description: body.description ? String(body.description) : null,
    business_tags: businessTags,
    organization_id: body.organization_id ? String(body.organization_id) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const limit = getPositiveIntParam(searchParams, 'limit', 50, 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0);
    const siteType = searchParams.get('site_type');
    const region = searchParams.get('region');
    const search = searchParams.get('search')?.trim();
    const orgId = searchParams.get('organization_id');

    let query = client
      .from('tax_bureau_favorites')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orgId) query = query.eq('organization_id', orgId);
    if (siteType && ALLOWED_SITE_TYPES.includes(siteType as TaxBureauSiteType)) {
      query = query.eq('site_type', siteType);
    }
    if (region) query = query.eq('region', region);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,region.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ data, total: count ?? 0 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const raw = (await request.json()) as Record<string, unknown>;
    const input = normalizeBody(raw);

    const { data, error } = await client
      .from('tax_bureau_favorites')
      .insert({
        user_id: userId,
        organization_id: input.organization_id ?? null,
        name: input.name,
        url: input.url,
        site_type: input.site_type,
        region: input.region,
        description: input.description,
        business_tags: input.business_tags ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}
