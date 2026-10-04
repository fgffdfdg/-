/**
 * 报告订单 - 服务端数据访问层
 * 通过 Supabase 客户端操作 report_orders 表，按 organization_id 隔离。
 */
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ReportType, ReportStatus } from '@/lib/vehicle-inspection/reports';
import { REPORT_TYPE_PRICES } from '@/lib/vehicle-inspection/reports';
import type {
  ReportOrder,
  ReportOrderStatus,
  FinancialStatus,
  CreateReportCombinationPayload,
  ReportCombinationResponse,
  SaveTemporaryVehiclePayload,
  SaveTemporaryVehicleResponse,
  VinDuplicateCheck,
  VinExistingVehicle,
} from '@/lib/vehicle-inspection/report-orders';

// ─── 报告组合提交 ───────────────────────────────────────────────

export async function createReportCombination(
  token: string,
  payload: CreateReportCombinationPayload
): Promise<ReportCombinationResponse> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const vinUpper = payload.vin.toUpperCase().trim();
  const orgId = payload.organizationId ?? undefined;

  // 1. 检查 VIN 是否已有活跃车辆
  let vinExists = false;
  let existingVehicleId: string | null = null;
  if (orgId) {
    const { data: existing } = await client
      .from('vehicle_archives')
      .select('id, status')
      .eq('vin', vinUpper)
      .eq('organization_id', orgId)
      .neq('status', 'temporary')
      .limit(1);
    if (existing && existing.length > 0) {
      vinExists = true;
      existingVehicleId = existing[0].id;
    }
  }

  // 2. 创建临时车辆（状态为 temporary）
  const { data: tempVehicle, error: vehicleError } = await client
    .from('vehicle_archives')
    .insert({
      user_id: user.id,
      organization_id: payload.organizationId ?? null,
      vin: vinUpper,
      driving_license_image_url: payload.drivingLicenseImageUrl ?? null,
      source: 'vin_query',
      status: 'temporary',
      tags: [],
      custom_fields: {},
    })
    .select('id')
    .single();

  if (vehicleError) throw new Error(`创建临时车辆失败: ${vehicleError.message}`);
  const vehicleId = tempVehicle.id;

  // 3. 计算总费用
  let totalCostCents = 0;
  for (const rt of payload.reportTypes) {
    totalCostCents += REPORT_TYPE_PRICES[rt] ?? 0;
  }

  // 4. 创建报告订单（每个报告类型一个订单，状态为 pending）
  const orders: ReportOrder[] = [];
  for (const reportType of payload.reportTypes) {
    const costCents = REPORT_TYPE_PRICES[reportType] ?? 0;
    const { data: order, error: orderError } = await client
      .from('report_orders')
      .insert({
        vehicle_id: vehicleId,
        organization_id: payload.organizationId,
        created_by: user.id,
        report_type: reportType,
        status: 'pending',
        financial_status: 'pending',
        cost_cents: costCents,
        query_params: { vin: vinUpper },
      })
      .select('*')
      .single();

    if (orderError) throw new Error(`创建报告订单失败: ${orderError.message}`);
    orders.push(mapOrderRecord(order));
  }

  // 5. 查询企业余额（这里简化处理，实际应从企业账户表查询）
  const remainingBalanceCents = 0; // TODO: 从企业余额表查询

  return {
    vehicleId,
    vinExists,
    existingVehicleId,
    orders,
    totalCostCents,
    remainingBalanceCents,
  };
}

// ─── 确认提交报告订单 ───────────────────────────────────────────

export async function submitReportOrders(
  token: string,
  vehicleId: string,
  orderIds: string[]
): Promise<ReportOrder[]> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const now = new Date().toISOString();
  const results: ReportOrder[] = [];

  for (const orderId of orderIds) {
    const { data: order, error } = await client
      .from('report_orders')
      .update({
        status: 'querying',
        financial_status: 'charged',
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('created_by', user.id)
      .select('*')
      .single();

    if (error) throw new Error(`提交报告订单失败: ${error.message}`);
    results.push(mapOrderRecord(order));
  }

  return results;
}

// ─── 查询报告订单 ───────────────────────────────────────────────

export async function getReportOrdersByVehicleId(
  token: string,
  vehicleId: string
): Promise<ReportOrder[]> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const { data, error } = await client
    .from('report_orders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`查询报告订单失败: ${error.message}`);
  return (data ?? []).map(mapOrderRecord);
}

export async function getReportOrderById(
  token: string,
  orderId: string
): Promise<ReportOrder | null> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const { data, error } = await client
    .from('report_orders')
    .select('*')
    .eq('id', orderId)
    .eq('created_by', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`查询报告订单失败: ${error.message}`);
  }
  return mapOrderRecord(data);
}

// ─── 更新报告订单状态 ───────────────────────────────────────────

export async function updateReportOrderStatus(
  token: string,
  orderId: string,
  status: ReportOrderStatus,
  financialStatus?: FinancialStatus,
  resultSummary?: string | null,
  errorMessage?: string | null
): Promise<ReportOrder> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (financialStatus) updateData.financial_status = financialStatus;
  if (resultSummary !== undefined) updateData.result_summary = resultSummary;
  if (errorMessage !== undefined) updateData.error_message = errorMessage;

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('report_orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('created_by', user.id)
    .select('*')
    .single();

  if (error) throw new Error(`更新报告订单失败: ${error.message}`);
  return mapOrderRecord(data);
}

// ─── 保存临时车辆 ───────────────────────────────────────────────

export async function saveTemporaryVehicle(
  token: string,
  payload: SaveTemporaryVehiclePayload
): Promise<SaveTemporaryVehicleResponse> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  // 1. 验证临时车辆存在且属于当前用户
  const { data: tempVehicle, error: fetchError } = await client
    .from('vehicle_archives')
    .select('*')
    .eq('id', payload.vehicleId)
    .eq('user_id', user.id)
    .eq('status', 'temporary')
    .single();

  if (fetchError || !tempVehicle) {
    throw new Error('临时车辆不存在或无权操作');
  }

  const vin = tempVehicle.vin;

  // 2. 处理合并策略
  if (payload.mergeStrategy === 'merge' && payload.mergeTargetVehicleId) {
    // 合并：将报告订单转移到目标车辆，删除临时车辆
    const { data: transferredData } = await client
      .from('report_orders')
      .update({ vehicle_id: payload.mergeTargetVehicleId })
      .eq('vehicle_id', payload.vehicleId)
      .select('id');
    const transferredCount = (transferredData ?? []).length;

    // 也转移 vehicle_inspection_reports
    await client
      .from('vehicle_inspection_reports')
      .update({ vehicle_id: payload.mergeTargetVehicleId })
      .eq('vehicle_id', payload.vehicleId);

    // 删除临时车辆
    await client
      .from('vehicle_archives')
      .delete()
      .eq('id', payload.vehicleId);

    return {
      success: true,
      vehicleId: payload.mergeTargetVehicleId,
      mergedToVehicleId: payload.mergeTargetVehicleId,
      transferredOrders: transferredCount ?? 0,
    };
  }

  // 3. 创建新车辆（转为 active）
  const updateData: Record<string, unknown> = {
    status: 'active',
    source: 'vin_query',
    updated_at: new Date().toISOString(),
  };

  if (payload.vehicleData) {
    if (payload.vehicleData.plateNumber !== undefined) updateData.plate_number = payload.vehicleData.plateNumber;
    if (payload.vehicleData.brandModel !== undefined) updateData.brand_model = payload.vehicleData.brandModel;
    if (payload.vehicleData.customModelName !== undefined) updateData.custom_model_name = payload.vehicleData.customModelName;
    if (payload.vehicleData.notes !== undefined) updateData.notes = payload.vehicleData.notes;
    if (payload.vehicleData.tags) updateData.tags = payload.vehicleData.tags;
  }

  const { error: updateError } = await client
    .from('vehicle_archives')
    .update(updateData)
    .eq('id', payload.vehicleId);

  if (updateError) throw new Error(`保存车辆失败: ${updateError.message}`);

  // 4. 统计转移的报告订单数
  const { count: orderCount } = await client
    .from('report_orders')
    .select('*', { count: 'exact' })
    .eq('vehicle_id', payload.vehicleId);

  return {
    success: true,
    vehicleId: payload.vehicleId,
    transferredOrders: orderCount ?? 0,
  };
}

// ─── VIN 查重 ───────────────────────────────────────────────────

export async function checkVinDuplicate(
  token: string,
  vin: string,
  organizationId?: string | null
): Promise<VinDuplicateCheck> {
  const client = getSupabaseClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('用户认证失败');

  const vinUpper = vin.toUpperCase().trim();
  let query = client
    .from('vehicle_archives')
    .select('id, vin, plate_number, brand_model, custom_model_name, status, created_at')
    .eq('vin', vinUpper)
    .neq('status', 'temporary')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`VIN查重失败: ${error.message}`);

  const existingVehicles: VinExistingVehicle[] = await Promise.all(
    (data ?? []).map(async (v) => {
      const { count } = await client
        .from('report_orders')
        .select('*', { count: 'exact' })
        .eq('vehicle_id', v.id);

      const { data: lastReport } = await client
        .from('report_orders')
        .select('created_at')
        .eq('vehicle_id', v.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        id: v.id,
        vin: v.vin,
        plateNumber: v.plate_number,
        brandModel: v.brand_model,
        customModelName: v.custom_model_name,
        status: v.status,
        reportCount: count ?? 0,
        lastReportAt: lastReport?.[0]?.created_at ?? null,
        createdAt: v.created_at,
      };
    })
  );

  return {
    exists: existingVehicles.length > 0,
    existingVehicles,
  };
}

// ─── 辅助函数 ───────────────────────────────────────────────────

function mapOrderRecord(record: Record<string, unknown>): ReportOrder {
  return {
    id: record.id as string,
    vehicleId: record.vehicle_id as string,
    organizationId: record.organization_id as string,
    createdBy: record.created_by as string,
    reportType: record.report_type as ReportType,
    status: record.status as ReportOrderStatus,
    financialStatus: record.financial_status as FinancialStatus,
    costCents: record.cost_cents as number,
    queryParams: (record.query_params as Record<string, unknown>) ?? {},
    resultSummary: record.result_summary as string | null,
    errorMessage: record.error_message as string | null,
    submittedAt: record.submitted_at as string | null,
    completedAt: record.completed_at as string | null,
    expiresAt: record.expires_at as string | null,
    createdAt: record.created_at as string,
    updatedAt: record.updated_at as string,
  };
}