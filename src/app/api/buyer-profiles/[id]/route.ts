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
    .from('buyer_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '买方档案不存在' }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: data.id,
      buyerName: data.buyer_name,
      buyerNameEn: data.buyer_name_en || '',
      address: data.address || '',
      addressEn: data.address_en || '',
      country: data.country || '',
      countryEn: data.country_en || '',
      phone: data.phone || '',
      email: data.email || '',
    },
  });
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

  const { data, error } = await client
    .from('buyer_profiles')
    .update({
      buyer_name: body.buyerName,
      buyer_name_en: body.buyerNameEn,
      address: body.address,
      address_en: body.addressEn,
      country: body.country,
      country_en: body.countryEn,
      phone: body.phone,
      email: body.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      id: data.id,
      buyerName: data.buyer_name,
      buyerNameEn: data.buyer_name_en || '',
      address: data.address || '',
      addressEn: data.address_en || '',
      country: data.country || '',
      countryEn: data.country_en || '',
      phone: data.phone || '',
      email: data.email || '',
    },
  });
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
    .from('buyer_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}