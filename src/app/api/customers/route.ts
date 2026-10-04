import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface CreateCustomerBody {
  company_name?: string;
  company_name_en?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  country?: string;
  city?: string;
  address?: string;
  address_en?: string;
  tags?: string[];
  status?: string;
  notes?: string;
  source?: string;
  website?: string;
  organization_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    const search = searchParams.get('search');
    const orgId = searchParams.get('organization_id');

    let query = client
      .from('customers')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by organization if provided
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (country) {
      query = query.eq('country', country);
    }
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ data, total: count ?? 0 });
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

    const body = (await request.json()) as CreateCustomerBody;

    const { data, error } = await client
      .from('customers')
      .insert({
        user_id: user.id,
        organization_id: body.organization_id ?? null,
        company_name: body.company_name ?? '未命名客户',
        company_name_en: body.company_name_en,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        country: body.country,
        city: body.city,
        address: body.address,
        address_en: body.address_en,
        tags: body.tags ?? [],
        status: body.status ?? 'potential',
        notes: body.notes,
        source: body.source,
        website: body.website,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
