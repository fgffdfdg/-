import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const body = await request.json();
    const { title, doc_data, doc_type } = body;

    if (!doc_data) {
      return NextResponse.json({ error: '缺少表单数据' }, { status: 400 });
    }

    const tradeInfo = doc_data?.tradeInfo as { invoiceNo?: string; plNo?: string; contractNo?: string } | undefined;
    const docNo = [tradeInfo?.invoiceNo, tradeInfo?.plNo, tradeInfo?.contractNo]
      .filter(Boolean)
      .join('|') || '';

    const { data, error } = await client
      .from('saved_documents')
      .insert({
        title: title || '未命名草稿',
        doc_type: doc_type || 'trade',
        doc_data,
        doc_no: docNo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`保存失败: ${error.message}`);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const search = searchParams.get('search')?.trim();
    const vin = searchParams.get('vin')?.trim();
    const docNo = searchParams.get('doc_no')?.trim();

    let query = client
      .from('saved_documents')
      .select('*', { count: 'exact' })
      .eq('doc_type', 'trade')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Search by title or doc_no (database-level)
    if (search) {
      query = query.or(`title.ilike.%${search}%,doc_no.ilike.%${search}%`);
    }

    // Search by contract/invoice/PL number (e.g., INV-TD-2025-001, CON-xxx, PL-xxx)
    if (docNo) {
      query = query.or(`doc_no.ilike.%${docNo}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    let results = data || [];

    // VIN search: filter in JS since JSONB array search is complex via Supabase client
    if (vin) {
      const vinUpper = vin.toUpperCase();
      results = results.filter((doc) => {
        const docData = doc.doc_data as Record<string, unknown> | null;
        if (!docData) return false;

        // Check vehicles array for VIN match
        const vehicles = docData.vehicles as Array<{ vin?: string }> | undefined;
        if (vehicles && Array.isArray(vehicles)) {
          return vehicles.some((v) => v.vin?.toUpperCase().includes(vinUpper));
        }

        // Also check doc_no for VIN-like patterns
        const docNoStr = (docData.tradeNo as string) || (doc.doc_no as string) || '';
        return docNoStr.toUpperCase().includes(vinUpper);
      });
    }

    return NextResponse.json({ data: results, total: count ?? 0, filtered: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}