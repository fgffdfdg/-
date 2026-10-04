import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { mergeLicenseAndRegistration } from '@/lib/car-inventory/service';

/**
 * POST /api/car-inventory/merge
 * 合并行驶证和绿本解析结果，按去重策略生成最终数据
 */
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

    const body = await request.json();
    const { licenseData, registrationData } = body as {
      licenseData?: Record<string, unknown>;
      registrationData?: Record<string, unknown>;
    };

    if (!licenseData && !registrationData) {
      return NextResponse.json(
        { error: '请至少提供行驶证或绿本其中一方的解析结果' },
        { status: 400 }
      );
    }

    const merged = mergeLicenseAndRegistration(licenseData, registrationData);

    return NextResponse.json({ data: merged });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}