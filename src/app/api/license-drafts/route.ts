import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

interface DbRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  draft_no: string;
  title: string;
  exporter: string;
  country: string;
  vehicle_count: number;
  total_amount: string;
  status: string;
  contract_no: string | null;
  vins: string[] | null;
  brand: string | null;
  model: string | null;
  main_data: unknown;
  annex_data: unknown;
  created_at: string;
  updated_at: string;
}

function rowToDraft(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    no: row.draft_no,
    title: row.title,
    exporter: row.exporter,
    country: row.country,
    vehicleCount: row.vehicle_count,
    totalAmount: Number(row.total_amount) || 0,
    status: row.status,
    contractNo: row.contract_no ?? undefined,
    vins: row.vins ?? undefined,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    main: row.main_data,
    annex: row.annex_data,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    let query = client
      .from('license_drafts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (search) {
      const q = search.toUpperCase();
      query = query.or(
        `draft_no.ilike.%${q}%,exporter.ilike.%${q}%,country.ilike.%${q}%,title.ilike.%${q}%,contract_no.ilike.%${q}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      data: (data as DbRow[] | null)?.map(rowToDraft) ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);

    const body = (await request.json()) as {
      draftNo?: string;
      title?: string;
      exporter?: string;
      country?: string;
      vehicleCount?: number;
      totalAmount?: number;
      status?: string;
      contractNo?: string;
      vins?: string[];
      brand?: string;
      model?: string;
      main?: unknown;
      annex?: unknown;
      organizationId?: string;
    };

    const draftNo = body.draftNo?.trim() || '未命名';
    const title = body.title?.trim() || `草单 ${draftNo || ''}`.trim();

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      draft_no: draftNo,
      title,
      exporter: body.exporter?.trim() || '',
      country: body.country?.trim() || '',
      vehicle_count: body.vehicleCount ?? 0,
      total_amount: String(body.totalAmount ?? 0),
      status: body.status || 'draft',
      contract_no: body.contractNo?.trim() || null,
      vins: body.vins?.length ? body.vins : null,
      brand: body.brand?.trim() || null,
      model: body.model?.trim() || null,
      main_data: body.main ?? {},
      annex_data: body.annex ?? {},
      organization_id: body.organizationId?.trim() || null,
    };

    const { data, error } = await client
      .from('license_drafts')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data: rowToDraft(data as DbRow) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}