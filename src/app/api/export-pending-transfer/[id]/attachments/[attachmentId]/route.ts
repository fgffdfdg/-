import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getS3Storage } from '@/lib/s3';
import type { ExportPendingTransferRecord, AttachmentRecord, AttachmentCategory } from '@/lib/export-pending-transfer/types';

const CATEGORY_TO_DB_FIELD: Record<AttachmentCategory, keyof ExportPendingTransferRecord> = {
  green_book: 'green_book_keys',
  driving_license: 'driving_license_keys',
  invoice: 'invoice_keys',
  temp_plate: 'temp_plate_keys',
};

// DELETE /api/export-pending-transfer/[id]/attachments/[attachmentId] - 删除附件
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    // 获取当前记录
    const { data: existing } = await client
      .from('export_pending_transfers')
      .select('id, green_book_keys, driving_license_keys, invoice_keys, temp_plate_keys')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 在所有类别中查找附件
    const record = existing as ExportPendingTransferRecord;
    const allCategories: AttachmentCategory[] = ['green_book', 'driving_license', 'invoice', 'temp_plate'];
    let foundAttachment: AttachmentRecord | null = null;
    let foundCategory: AttachmentCategory | null = null;

    for (const cat of allCategories) {
      const field = CATEGORY_TO_DB_FIELD[cat];
      const attachments = (record as unknown as Record<string, unknown>)[field] as AttachmentRecord[] ?? [];
      const found = attachments.find((a) => a.id === attachmentId);
      if (found) {
        foundAttachment = found;
        foundCategory = cat;
        break;
      }
    }

    if (!foundAttachment || !foundCategory) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    // 从 S3 删除文件
    const storage = getS3Storage();
    await storage.deleteFile({ fileKey: foundAttachment.fileKey }).catch(() => {});

    // 更新数据库
    const dbField = CATEGORY_TO_DB_FIELD[foundCategory];
    const updatedAttachments = ((record as unknown as Record<string, unknown>)[dbField] as AttachmentRecord[] ?? []).filter(
      (a) => a.id !== attachmentId
    );

    const { error } = await client
      .from('export_pending_transfers')
      .update({ [dbField]: updatedAttachments, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`删除附件失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/export-pending-transfer/[id]/attachments/[attachmentId]/file-url - 获取签名URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { data: existing } = await client
      .from('export_pending_transfers')
      .select('id, green_book_keys, driving_license_keys, invoice_keys, temp_plate_keys')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const record = existing as ExportPendingTransferRecord;
    const allCategories: AttachmentCategory[] = ['green_book', 'driving_license', 'invoice', 'temp_plate'];
    let foundAttachment: AttachmentRecord | null = null;

    for (const cat of allCategories) {
      const field = CATEGORY_TO_DB_FIELD[cat];
      const attachments = (record as unknown as Record<string, unknown>)[field] as AttachmentRecord[] ?? [];
      const found = attachments.find((a) => a.id === attachmentId);
      if (found) {
        foundAttachment = found;
        break;
      }
    }

    if (!foundAttachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    const storage = getS3Storage();
    const url = await storage.generatePresignedUrl({
      key: foundAttachment.fileKey,
      expireTime: 3600, // 1小时
    });

    return NextResponse.json({ url, fileName: foundAttachment.fileName, fileMime: foundAttachment.fileMime });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}