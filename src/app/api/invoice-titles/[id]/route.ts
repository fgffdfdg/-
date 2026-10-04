import { NextRequest, NextResponse } from 'next/server';
import type { InvoiceTitleInput, InvoiceTitleType } from '@/lib/invoice-tax/types';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

const ALLOWED_TITLE_TYPES: InvoiceTitleType[] = ['own_company', 'partner'];

const UPDATE_FIELDS = [
  'title_type',
  'company_name',
  'company_name_en',
  'tax_id',
  'overseas_tax_id',
  'address',
  'address_en',
  'phone',
  'bank_name',
  'bank_account',
  'contact_name',
  'contact_email',
  'country',
  'city',
  'shipping_address',
  'tags',
  'remark',
  'is_default',
] as const;

type UpdateField = (typeof UPDATE_FIELDS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await getAuthedClient(request);
    const { data, error } = await client
      .from('invoice_titles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '抬头不存在' }, { status: 404 });
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
    const { client, userId } = await getAuthedClient(request);
    const body = (await request.json()) as Partial<InvoiceTitleInput> & { organization_id?: string | null };

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of UPDATE_FIELDS) {
      const v = body[field as UpdateField];
      if (v !== undefined) {
        if (field === 'title_type') {
          if (!ALLOWED_TITLE_TYPES.includes(v as InvoiceTitleType)) {
            throw new Error('抬头类型非法');
          }
        }
        if (field === 'company_name') {
          const name = String(v ?? '').trim();
          if (!name) throw new Error('请填写公司/个人名称');
          update[field] = name;
          continue;
        }
        if (field === 'tags') {
          update[field] = Array.isArray(v)
            ? (v as unknown[]).map((t) => String(t)).filter(Boolean)
            : [];
          continue;
        }
        update[field] = v ?? null;
      }
    }

    if (body.is_default === true) {
      const type = (body.title_type as InvoiceTitleType | undefined) ?? (
        await client.from('invoice_titles').select('title_type,organization_id').eq('id', id).maybeSingle()
      ).data?.title_type;
      if (type) {
        const clearQuery = client
          .from('invoice_titles')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('title_type', type)
          .neq('id', id);
        const orgId = body.organization_id;
        if (orgId) clearQuery.eq('organization_id', orgId);
        const { error: clearError } = await clearQuery;
        if (clearError) throw new Error(`重置默认抬头失败: ${clearError.message}`);
      }
    }

    const { data, error } = await client
      .from('invoice_titles')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '抬头不存在或无权修改' }, { status: 404 });
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
    const { error } = await client.from('invoice_titles').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
