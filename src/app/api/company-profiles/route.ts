import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data, error } = await client
    .from('company_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '获取公司信息失败' }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();

  // If setting as default, clear other defaults first
  if (body.is_default) {
    await client
      .from('company_profiles')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await client
    .from('company_profiles')
    .insert({
      user_id: user.id,
      company_name: body.company_name || null,
      company_name_en: body.company_name_en || null,
      social_credit_code: body.social_credit_code || null,
      legal_person: body.legal_person || null,
      contact: body.contact || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      country: body.country || null,
      country_code: body.country_code || null,
      key_no: body.key_no || null,
      address: body.address || null,
      address_en: body.address_en || null,
      is_default: body.is_default ?? false,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `创建失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data });
}
