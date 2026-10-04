/**
 * POST /api/vehicle-inspection/init-query
 *
 * 车况查询初始化：创建临时车辆 + 报告订单组合。
 * 支持 multipart/form-data（含文件上传）或 JSON。
 *
 * 请求体 (JSON):
 *   { vin, reportTypes: string[], organizationId }
 *
 * 请求体 (multipart/form-data):
 *   vin (string)
 *   reportTypes (JSON string array)
 *   organizationId (string)
 *   files (File[]) - 行驶证/绿本等图片
 */
import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';
import { AuthError, getAuthedClient, toErrorResponse } from '@/lib/invoice-tax/api-helpers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(request: NextRequest) {
  try {
    const { userId, client } = await getAuthedClient(request);

    let vin: string;
    let reportTypes: string[];
    let organizationId: string | null = null;
    const uploadedFiles: Array<{ key: string; name: string; mime: string; category: string }> = [];

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // multipart 模式：支持文件上传
      const formData = await request.formData();

      const vinField = formData.get('vin');
      if (!vinField || typeof vinField !== 'string' || !vinField.trim()) {
        return NextResponse.json({ error: 'VIN 码不能为空' }, { status: 400 });
      }
      vin = vinField.trim().toUpperCase();

      const reportTypesRaw = formData.get('reportTypes');
      if (!reportTypesRaw || typeof reportTypesRaw !== 'string') {
        return NextResponse.json({ error: '请选择至少一种报告类型' }, { status: 400 });
      }
      try {
        reportTypes = JSON.parse(reportTypesRaw);
      } catch {
        return NextResponse.json({ error: '报告类型格式错误' }, { status: 400 });
      }

      if (!Array.isArray(reportTypes) || reportTypes.length === 0) {
        return NextResponse.json({ error: '请选择至少一种报告类型' }, { status: 400 });
      }

      const orgField = formData.get('organizationId');
      if (orgField && typeof orgField === 'string') {
        organizationId = orgField;
      }

      // 处理文件上传
      const fileEntries = formData.getAll('files');
      for (const entry of fileEntries) {
        if (!(entry instanceof File)) continue;
        const file = entry as File;

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `文件 "${file.name}" 超过 10MB 限制` },
            { status: 400 },
          );
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
          return NextResponse.json(
            { error: `文件 "${file.name}" 格式不支持，仅支持 JPG/PNG/WebP/PDF` },
            { status: 400 },
          );
        }

        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        if (buffer.length === 0) continue;

        const safeName = sanitizeSegment(file.name);
        const category = file.name.toLowerCase().includes('行驶') ? 'driving_license'
          : file.name.toLowerCase().includes('绿本') || file.name.toLowerCase().includes('登记') ? 'green_book'
          : 'other';

        const s3 = getS3Storage();
        const fileKey = await s3.uploadFile({
          fileContent: buffer,
          fileName: `vehicle-query/${vin}/${safeName}`,
          contentType: file.type || 'application/octet-stream',
        });

        uploadedFiles.push({
          key: fileKey,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          category,
        });
      }
    } else {
      // JSON 模式：仅 VIN + 报告类型
      const body = await request.json().catch(() => null);
      if (!body || !body.vin) {
        return NextResponse.json({ error: 'VIN 码不能为空' }, { status: 400 });
      }
      vin = body.vin.trim().toUpperCase();
      reportTypes = body.reportTypes || [];
      organizationId = body.organizationId || null;

      if (!Array.isArray(reportTypes) || reportTypes.length === 0) {
        return NextResponse.json({ error: '请选择至少一种报告类型' }, { status: 400 });
      }
    }

    // 创建临时车辆
    const { data: vehicleData, error: vehicleError } = await client
      .from('vehicle_archives')
      .insert({
        vin,
        status: 'temporary',
        created_by: userId,
        organization_id: organizationId,
        source: 'vin_query',
        ...(uploadedFiles.length > 0
          ? {
              license_image_key: uploadedFiles.find((f) => f.category === 'driving_license')?.key || null,
              green_book_image_key: uploadedFiles.find((f) => f.category === 'green_book')?.key || null,
            }
          : {}),
      })
      .select('id')
      .single();

    if (vehicleError || !vehicleData) {
      return NextResponse.json(
        { error: `创建临时车辆失败: ${vehicleError?.message || '未知错误'}` },
        { status: 500 },
      );
    }

    const vehicleId = vehicleData.id;

    // 创建报告订单（每个报告类型一个订单）
    const reportCosts: Record<string, number> = {
      insurance: 2900,
      mileage: 1500,
      battery: 3900,
      technical: 2500,
      maintenance: 2000,
      accident: 3500,
    };

    const createdOrders: Array<{ id: string; reportType: string; costCents: number }> = [];
    for (const reportType of reportTypes) {
      const costCents = reportCosts[reportType] || 0;
      const { data: orderData, error: orderError } = await client
        .from('report_orders')
        .insert({
          vehicle_id: vehicleId,
          organization_id: organizationId,
          created_by: userId,
          report_type: reportType,
          status: 'pending',
          financial_status: 'pending',
          cost_cents: costCents,
          query_params: JSON.stringify({ vin }),
        })
        .select('id')
        .single();

      if (orderError || !orderData) {
        // 回滚：删除临时车辆（CASCADE 会删除已创建的报告订单）
        await client.from('vehicle_archives').delete().eq('id', vehicleId);
        return NextResponse.json(
          { error: `创建报告订单失败 (${reportType}): ${orderError?.message || '未知错误'}` },
          { status: 500 },
        );
      }

      createdOrders.push({ id: orderData.id, reportType, costCents });
    }

    // 计算总费用
    const totalCost = createdOrders.reduce((sum, o) => sum + o.costCents, 0);

    return NextResponse.json(
      {
        success: true,
        vehicleId,
        vin,
        orders: createdOrders,
        totalCost,
        uploadedFiles: uploadedFiles.map((f) => ({ key: f.key, name: f.name, mime: f.mime, category: f.category })),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    console.error('init-query error:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}