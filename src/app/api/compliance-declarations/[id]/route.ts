import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { upsertVehicleLinks } from '@/lib/vehicle-linkage/server';

interface UpdateDeclarationBody {
  title?: string;
  company_info?: Record<string, unknown>;
  vehicles?: Record<string, unknown>[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { data, error } = await client
      .from('compliance_declarations')
      .select('id, title, company_info, vehicles, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '声明不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const body = (await request.json()) as UpdateDeclarationBody;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.company_info !== undefined) updateData.company_info = body.company_info;
    if (body.vehicles !== undefined) updateData.vehicles = body.vehicles;

    const { data, error } = await client
      .from('compliance_declarations')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '声明不存在或无权修改' }, { status: 404 });
    }

    // 写入车辆关联索引
    if (body.vehicles) {
      const vins = body.vehicles.map((v: Record<string, unknown>) => String(v.vin ?? '')).filter(Boolean);
      if (vins.length > 0) {
        upsertVehicleLinks(data.user_id || '', null, {
          docType: 'compliance_declaration',
          docId: id,
          vins,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { error } = await client
      .from('compliance_declarations')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
