import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import type { ExportPendingTransferRecord, AttachmentRecord, AttachmentCategory } from '@/lib/export-pending-transfer/types';

const ALLOWED_CATEGORIES: AttachmentCategory[] = ['green_book', 'driving_license', 'invoice', 'temp_plate'];

const CATEGORY_TO_DB_FIELD: Record<AttachmentCategory, keyof ExportPendingTransferRecord> = {
  green_book: 'green_book_keys',
  driving_license: 'driving_license_keys',
  invoice: 'invoice_keys',
  temp_plate: 'temp_plate_keys',
};

// POST /api/export-pending-transfer/[id]/attachments - 上传附件
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);

    // 验证记录存在
    const { data: existing } = await client
      .from('export_pending_transfers')
      .select('id, green_book_keys, driving_license_keys, invoice_keys, temp_plate_keys')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category as AttachmentCategory)) {
      return NextResponse.json({ error: '无效的附件类别' }, { status: 400 });
    }

    const cat = category as AttachmentCategory;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = getS3Storage();
    const safeName = sanitizeSegment(file.name);
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `export-pending-transfer/${id}/${safeName}`,
      contentType: file.type,
    });

    const attachment: AttachmentRecord = {
      id: crypto.randomUUID(),
      fileKey,
      fileName: file.name,
      fileMime: file.type,
      fileSize: file.size,
      category: cat,
      uploadedAt: new Date().toISOString(),
    };

    // 更新数据库记录
    const dbField = CATEGORY_TO_DB_FIELD[cat];
    const existingAttachments = (existing as unknown as Record<string, unknown>)[dbField] as AttachmentRecord[] ?? [];
    const updatedAttachments = [...existingAttachments, attachment];

    const { error } = await client
      .from('export_pending_transfers')
      .update({ [dbField]: updatedAttachments, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`更新附件失败: ${error.message}`);

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}