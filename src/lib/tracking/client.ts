// ============ 运输跟踪 - Supabase 客户端服务 ============

import { getSupabaseClient } from '@/storage/database/supabase-client';
import type {
  TransportRecord,
  TransportContainer,
  TransportVehicle,
  TransportLeg,
  TransportNotification,
  TransportNotificationRead,
  TransportManualOverride,
  TransportListFilters,
  PaginationParams,
} from './types';

// ============ 运输记录 CRUD ============

export async function getTransportRecords(
  organizationId: string,
  filters: TransportListFilters = {},
  pagination: PaginationParams = { page: 1, page_size: 20 }
): Promise<{ data: TransportRecord[]; count: number }> {
  const client = getSupabaseClient();
  let query = client
    .from('transport_records')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_archived', false);

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.bl_number) {
    query = query.ilike('bl_number', `%${filters.bl_number}%`);
  }
  if (filters.carrier_tracking_number) {
    query = query.ilike('carrier_tracking_number', `%${filters.carrier_tracking_number}%`);
  }
  if (filters.dest_port) {
    query = query.or(`dest_port_name.ilike.%${filters.dest_port}%,dest_port_code.ilike.%${filters.dest_port}%`);
  }
  if (filters.eta_from) {
    query = query.gte('eta', filters.eta_from);
  }
  if (filters.eta_to) {
    query = query.lte('eta', filters.eta_to);
  }
  if (filters.vin) {
    // VIN filtering via subquery handled separately
    query = query.or(`bl_number.ilike.%${filters.vin}%,carrier_tracking_number.ilike.%${filters.vin}%`);
  }

  const from = (pagination.page - 1) * pagination.page_size;
  const to = from + pagination.page_size - 1;

  const { data, error, count } = await query
    .order('eta', { ascending: true })
    .range(from, to);

  if (error) throw new Error(`查询运输记录失败: ${error.message}`);
  return { data: (data as TransportRecord[]) || [], count: count || 0 };
}

export async function getTransportRecordById(id: string): Promise<TransportRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_records')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`查询运输记录失败: ${error.message}`);
  if (!data) return null;

  const record = data as TransportRecord;

  // 并行加载关联数据
  const [containers, vehicles, legs, notifications, overrides] = await Promise.all([
    getContainersByRecord(id),
    getVehiclesByRecord(id),
    getLegsByRecord(id),
    getNotificationsByRecord(id),
    getManualOverridesByRecord(id),
  ]);

  record.containers = containers;
  record.vehicles = vehicles;
  record.legs = legs;
  record.notifications = notifications;
  record.manual_overrides = overrides;

  return record;
}

export async function createTransportRecord(
  record: Partial<TransportRecord>
): Promise<TransportRecord> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_records')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`创建运输记录失败: ${error.message}`);
  return data as TransportRecord;
}

export async function updateTransportRecord(
  id: string,
  updates: Partial<TransportRecord>
): Promise<TransportRecord> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`更新运输记录失败: ${error.message}`);
  return data as TransportRecord;
}

export async function archiveTransportRecord(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_records')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`归档运输记录失败: ${error.message}`);
}

export async function restoreTransportRecord(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_records')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`恢复运输记录失败: ${error.message}`);
}

export async function deleteTransportRecord(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_records')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`删除运输记录失败: ${error.message}`);
}

export async function checkDuplicateRecord(
  organizationId: string,
  blNumber?: string,
  carrierTrackingNumber?: string
): Promise<TransportRecord | null> {
  const client = getSupabaseClient();
  let query = client
    .from('transport_records')
    .select('*')
    .eq('organization_id', organizationId);

  if (blNumber && carrierTrackingNumber) {
    query = query.or(`bl_number.eq.${blNumber},carrier_tracking_number.eq.${carrierTrackingNumber}`);
  } else if (blNumber) {
    query = query.eq('bl_number', blNumber);
  } else if (carrierTrackingNumber) {
    query = query.eq('carrier_tracking_number', carrierTrackingNumber);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(`查重失败: ${error.message}`);
  return data as TransportRecord | null;
}

// ============ 集装箱 ============

export async function getContainersByRecord(recordId: string): Promise<TransportContainer[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_containers')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`查询集装箱失败: ${error.message}`);
  return (data as TransportContainer[]) || [];
}

export async function createContainers(
  containers: Partial<TransportContainer>[]
): Promise<TransportContainer[]> {
  if (containers.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_containers')
    .insert(containers)
    .select();

  if (error) throw new Error(`创建集装箱失败: ${error.message}`);
  return (data as TransportContainer[]) || [];
}

// ============ 车辆 ============

export async function getVehiclesByRecord(recordId: string): Promise<TransportVehicle[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_vehicles')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`查询车辆失败: ${error.message}`);
  return (data as TransportVehicle[]) || [];
}

export async function createVehicles(
  vehicles: Partial<TransportVehicle>[]
): Promise<TransportVehicle[]> {
  if (vehicles.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_vehicles')
    .insert(vehicles)
    .select();

  if (error) throw new Error(`创建车辆失败: ${error.message}`);
  return (data as TransportVehicle[]) || [];
}

// ============ 航段 ============

export async function getLegsByRecord(recordId: string): Promise<TransportLeg[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_legs')
    .select('*')
    .eq('record_id', recordId)
    .order('sequence', { ascending: true });

  if (error) throw new Error(`查询航段失败: ${error.message}`);
  return (data as TransportLeg[]) || [];
}

export async function createLegs(
  legs: Partial<TransportLeg>[]
): Promise<TransportLeg[]> {
  if (legs.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_legs')
    .insert(legs)
    .select();

  if (error) throw new Error(`创建航段失败: ${error.message}`);
  return (data as TransportLeg[]) || [];
}

// ============ 通知 ============

export async function getNotificationsByRecord(
  recordId: string
): Promise<TransportNotification[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_notifications')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`查询通知失败: ${error.message}`);
  return (data as TransportNotification[]) || [];
}

export async function getNotificationReadStatuses(
  notificationIds: string[],
  userId: string
): Promise<TransportNotificationRead[]> {
  if (notificationIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_notification_reads')
    .select('*')
    .eq('user_id', userId)
    .in('notification_id', notificationIds);

  if (error) throw new Error(`查询通知已读状态失败: ${error.message}`);
  return (data as TransportNotificationRead[]) || [];
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_notification_reads')
    .upsert(
      { notification_id: notificationId, user_id: userId, read_at: new Date().toISOString() },
      { onConflict: 'notification_id,user_id' }
    );

  if (error) throw new Error(`标记通知已读失败: ${error.message}`);
}

export async function markAllNotificationsRead(
  notificationIds: string[],
  userId: string
): Promise<void> {
  if (notificationIds.length === 0) return;
  const client = getSupabaseClient();
  const reads = notificationIds.map((nid) => ({
    notification_id: nid,
    user_id: userId,
    read_at: new Date().toISOString(),
  }));
  const { error } = await client
    .from('transport_notification_reads')
    .upsert(reads, { onConflict: 'notification_id,user_id' });

  if (error) throw new Error(`批量标记已读失败: ${error.message}`);
}

// ============ 手动覆盖 ============

export async function getManualOverridesByRecord(
  recordId: string
): Promise<TransportManualOverride[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('transport_manual_overrides')
    .select('*')
    .eq('record_id', recordId);

  if (error) throw new Error(`查询手动覆盖失败: ${error.message}`);
  return (data as TransportManualOverride[]) || [];
}

export async function upsertManualOverride(
  recordId: string,
  fieldName: string,
  manualValue: string,
  autoValue: string | undefined,
  source: string | undefined,
  userId: string
): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_manual_overrides')
    .upsert(
      {
        record_id: recordId,
        field_name: fieldName,
        manual_value: manualValue,
        auto_value: autoValue,
        source,
        overridden_by: userId,
        overridden_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_name' }
    );

  if (error) throw new Error(`保存手动覆盖失败: ${error.message}`);
}

export async function deleteManualOverride(
  recordId: string,
  fieldName: string
): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('transport_manual_overrides')
    .delete()
    .eq('record_id', recordId)
    .eq('field_name', fieldName);

  if (error) throw new Error(`删除手动覆盖失败: ${error.message}`);
}

// ============ VIN 查询 ============

export async function getRecordsByVin(
  organizationId: string,
  vin: string
): Promise<TransportRecord[]> {
  const client = getSupabaseClient();
  // 先通过 vehicles 表查 record_id
  const { data: vehicleData, error: vehicleError } = await client
    .from('transport_vehicles')
    .select('record_id')
    .eq('vin', vin.toUpperCase());

  if (vehicleError) throw new Error(`VIN查询失败: ${vehicleError.message}`);
  if (!vehicleData || vehicleData.length === 0) return [];

  const recordIds = [...new Set(vehicleData.map((v: { record_id: string }) => v.record_id))];

  const { data, error } = await client
    .from('transport_records')
    .select('*')
    .eq('organization_id', organizationId)
    .in('id', recordIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`查询运输记录失败: ${error.message}`);
  return (data as TransportRecord[]) || [];
}