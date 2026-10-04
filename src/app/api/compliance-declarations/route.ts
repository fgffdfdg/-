import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

interface CompanyInfo {
  companyName: string;
  creditCode: string;
  recipient: string;
  date: string;
}

interface VehicleItem {
  brand: string;
  model: string;
  vin: string;
  destination: string;
}

interface CreateDeclarationBody {
  title?: string;
  company_info: CompanyInfo;
  vehicles: VehicleItem[];
  organization_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const organizationId = searchParams.get('organization_id');

    let query = client
      .from('compliance_declarations')
      .select('id, title, company_info, vehicles, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
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
    const client = getSupabaseClient(token);

    const body = (await request.json()) as CreateDeclarationBody;

    if (!body.company_info || !body.vehicles) {
      return NextResponse.json(
        { error: '缺少必填字段: company_info, vehicles' },
        { status: 400 }
      );
    }

    // 获取用户身份
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未登录或登录状态已失效，请重新登录后再保存' }, { status: 401 });
    }
    const userId = user.id;

    const { data, error } = await client
      .from('compliance_declarations')
      .insert({
        title: body.title ?? '未命名声明',
        company_info: body.company_info,
        vehicles: body.vehicles,
        user_id: userId,
        organization_id: body.organization_id ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    // 写入车辆关联索引
    if (userId && data) {
      const vins = (body.vehicles ?? []).map((v: VehicleItem) => v.vin).filter(Boolean);
      if (vins.length > 0) {
        upsertVehicleLinks(userId, body.organization_id ?? null, {
          docType: 'compliance_declaration',
          docId: data.id,
          vins,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
