import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await client
    .from('company_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '公司信息不存在' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // If setting as default, clear other defaults first
  if (body.is_default) {
    await client
      .from('company_profiles')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .neq('id', id);
  }

  const { data, error } = await client
    .from('company_profiles')
    .update({
      company_name: body.company_name,
      company_name_en: body.company_name_en,
      social_credit_code: body.social_credit_code,
      legal_person: body.legal_person,
      contact: body.contact,
      contact_phone: body.contact_phone,
      contact_email: body.contact_email,
      country: body.country,
      country_code: body.country_code,
      key_no: body.key_no,
      address: body.address,
      address_en: body.address_en,
      is_default: body.is_default,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await client
    .from('company_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
