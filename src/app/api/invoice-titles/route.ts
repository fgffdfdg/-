import { NextRequest, NextResponse } from 'next/server';
import type { InvoiceTitleInput, InvoiceTitleType } from '@/lib/invoice-tax/types';
import { AuthError, getAuthedClient, getPositiveIntParam, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

interface CreateInvoiceTitleBody extends InvoiceTitleInput {
  organization_id?: string | null;
}

const ALLOWED_TITLE_TYPES: InvoiceTitleType[] = ['own_company', 'partner'];

function normalizeBody(body: Record<string, unknown>): CreateInvoiceTitleBody {
  const titleType = String(body.title_type ?? '') as InvoiceTitleType;
  if (!ALLOWED_TITLE_TYPES.includes(titleType)) {
    throw new Error('抬头类型非法，必须为 own_company 或 partner');
  }
  const companyName = String(body.company_name ?? '').trim();
  if (!companyName) {
    throw new Error('请填写公司/个人名称');
  }
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : [];

  return {
    title_type: titleType,
    company_name: companyName,
    company_name_en: body.company_name_en ? String(body.company_name_en) : null,
    tax_id: body.tax_id ? String(body.tax_id).trim() : null,
    overseas_tax_id: body.overseas_tax_id ? String(body.overseas_tax_id).trim() : null,
    address: body.address ? String(body.address) : null,
    address_en: body.address_en ? String(body.address_en) : null,
    phone: body.phone ? String(body.phone).trim() : null,
    bank_name: body.bank_name ? String(body.bank_name) : null,
    bank_account: body.bank_account ? String(body.bank_account).trim() : null,
    contact_name: body.contact_name ? String(body.contact_name) : null,
    contact_email: body.contact_email ? String(body.contact_email).trim() : null,
    country: body.country ? String(body.country) : null,
    city: body.city ? String(body.city) : null,
    shipping_address: body.shipping_address ? String(body.shipping_address) : null,
    tags,
    remark: body.remark ? String(body.remark) : null,
    is_default: Boolean(body.is_default),
    organization_id: body.organization_id ? String(body.organization_id) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const limit = getPositiveIntParam(searchParams, 'limit', 50, 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0);
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.trim();
    const orgId = searchParams.get('organization_id');

    let query = client
      .from('invoice_titles')
      .select('*', { count: 'exact' })
      .order('is_default', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orgId) query = query.eq('organization_id', orgId);
    if (type === 'own_company' || type === 'partner') {
      query = query.eq('title_type', type);
    }
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,tax_id.ilike.%${search}%,contact_name.ilike.%${search}%`,
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

    // 若设为默认，则取消同类型其他抬头的默认标记
    if (input.is_default) {
      const clearQuery = client
        .from('invoice_titles')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('title_type', input.title_type);
      if (input.organization_id) {
        clearQuery.eq('organization_id', input.organization_id);
      }
      const { error: clearError } = await clearQuery;
      if (clearError) throw new Error(`重置默认抬头失败: ${clearError.message}`);
    }

    const { data, error } = await client
      .from('invoice_titles')
      .insert({
        user_id: userId,
        organization_id: input.organization_id ?? null,
        title_type: input.title_type,
        company_name: input.company_name,
        company_name_en: input.company_name_en,
        tax_id: input.tax_id,
        overseas_tax_id: input.overseas_tax_id,
        address: input.address,
        address_en: input.address_en,
        phone: input.phone,
        bank_name: input.bank_name,
        bank_account: input.bank_account,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        country: input.country,
        city: input.city,
        shipping_address: input.shipping_address,
        tags: input.tags ?? [],
        remark: input.remark,
        is_default: input.is_default ?? false,
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
