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
    .from('buyer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: `获取买方档案失败: ${error.message}` }, { status: 500 });
  }

  // Map to frontend BuyerProfile shape
  const profiles = (data || []).map((p) => ({
    id: p.id,
    buyerName: p.buyer_name,
    buyerNameEn: p.buyer_name_en || '',
    address: p.address || '',
    addressEn: p.address_en || '',
    country: p.country || '',
    countryEn: p.country_en || '',
    phone: p.phone || '',
    email: p.email || '',
  }));

  return NextResponse.json({ profiles });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const client = getSupabaseClient(token);

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await client
    .from('buyer_profiles')
    .insert({
      user_id: user.id,
      buyer_name: body.buyerName || null,
      buyer_name_en: body.buyerNameEn || null,
      address: body.address || null,
      address_en: body.addressEn || null,
      country: body.country || null,
      country_en: body.countryEn || null,
      phone: body.phone || null,
      email: body.email || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `保存失败: ${error.message}` }, { status: 500 });
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