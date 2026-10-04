import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface UpdateBody {
  title?: string;
  doc_data?: Record<string, unknown>;
}

// PUT /api/trade-documents/[id] — update title (remark) and/or doc_data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const body = (await request.json()) as UpdateBody;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.doc_data !== undefined) {
      updateData.doc_data = body.doc_data;
      const tradeInfo = (body.doc_data as { tradeInfo?: { invoiceNo?: string; plNo?: string; contractNo?: string } }).tradeInfo;
      updateData.doc_no = [tradeInfo?.invoiceNo, tradeInfo?.plNo, tradeInfo?.contractNo]
        .filter(Boolean)
        .join('|') || '';
    }

    const { data, error } = await client
      .from('saved_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '草稿不存在或无权修改' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/trade-documents/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { error } = await client
      .from('saved_documents')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
