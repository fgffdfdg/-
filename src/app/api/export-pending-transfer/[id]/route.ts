import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ExportPendingTransferRecord, UpdateExportPendingTransferInput } from '@/lib/export-pending-transfer/types';

// GET /api/export-pending-transfer/[id] - 详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { data, error } = await client
      .from('export_pending_transfers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const record = data as ExportPendingTransferRecord;

    // 获取关联车辆
    let vehicle = null;
    if (record.vehicle_archive_id) {
      const { data: v } = await client
        .from('vehicle_archives')
        .select('id, vin, plate_number, brand_model, custom_model_name, model_remark, brand, model, color, fuel_type, registration_date')
        .eq('id', record.vehicle_archive_id)
        .maybeSingle();
      vehicle = v ?? null;
    }

    return NextResponse.json({
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      vehicleArchiveId: record.vehicle_archive_id,
      status: record.status,
      greenBookKeys: record.green_book_keys ?? [],
      drivingLicenseKeys: record.driving_license_keys ?? [],
      invoiceKeys: record.invoice_keys ?? [],
      tempPlateKeys: record.temp_plate_keys ?? [],
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      vehicle,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/export-pending-transfer/[id] - 更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const body = (await request.json()) as UpdateExportPendingTransferInput;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await client
      .from('export_pending_transfers')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    const record = data as ExportPendingTransferRecord;

    return NextResponse.json({
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      vehicleArchiveId: record.vehicle_archive_id,
      status: record.status,
      greenBookKeys: record.green_book_keys ?? [],
      drivingLicenseKeys: record.driving_license_keys ?? [],
      invoiceKeys: record.invoice_keys ?? [],
      tempPlateKeys: record.temp_plate_keys ?? [],
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/export-pending-transfer/[id] - 删除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    // 先获取记录以清理 S3 文件
    const { data: existing } = await client
      .from('export_pending_transfers')
      .select('green_book_keys, driving_license_keys, invoice_keys, temp_plate_keys')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

    // 删除数据库记录
    const { error } = await client
      .from('export_pending_transfers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    // 异步清理 S3 文件（不阻塞响应）
    if (existing) {
      const record = existing as ExportPendingTransferRecord;
      const allKeys = [
        ...(record.green_book_keys ?? []),
        ...(record.driving_license_keys ?? []),
        ...(record.invoice_keys ?? []),
        ...(record.temp_plate_keys ?? []),
      ];
      if (allKeys.length > 0) {
        const { getS3Storage } = await import('@/lib/s3');
        const storage = getS3Storage();
        for (const att of allKeys) {
          if (att.fileKey) {
            storage.deleteFile({ fileKey: att.fileKey }).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}