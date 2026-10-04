import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/trade-documents/next-seq?date=20260101&prefix=INV
// Returns the next sequence number for a given date and document type prefix
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const prefix = searchParams.get('prefix');

    if (!date || !prefix) {
      return NextResponse.json({ error: 'Missing date or prefix' }, { status: 400 });
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);
    
    // Count documents with the same date and prefix (e.g., doc_no contains 'INV20260101-')
    // Use ilike with % prefix so it matches anywhere in the concatenated doc_no string
    const pattern = `%${prefix}${date}-%`;
    
    const { count, error } = await supabase
      .from('saved_documents')
      .select('*', { count: 'exact', head: true })
      .ilike('doc_no', pattern);

    if (error) {
      console.error('Failed to count documents:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Next sequence = count + 1
    const nextSeq = (count ?? 0) + 1;

    return NextResponse.json({ nextSeq });
  } catch (e) {
    console.error('next-seq error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}