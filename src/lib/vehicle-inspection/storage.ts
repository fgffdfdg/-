import { SavedReport, ReportType } from './types';
import { fetchReports, createReport, deleteReport as deleteCloudReport, toCloudPayload, cloudToLocalReport } from './api-client';

const STORAGE_KEY = 'exportdrive_vehicle_reports_v1';
const SYNCED_KEY = 'exportdrive_vehicle_reports_synced_v1'; // 已同步到云端的 report id 集合

export function getSavedReports(): SavedReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedReport[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getReportsByType(type: ReportType): SavedReport[] {
  return getSavedReports()
    .filter((r) => r.type === type)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getReportById(id: string): SavedReport | undefined {
  return getSavedReports().find((r) => r.id === id);
}

export function saveReport(report: SavedReport): void {
  if (typeof window === 'undefined') return;
  const list = getSavedReports();
  const idx = list.findIndex((r) => r.id === report.id);
  if (idx >= 0) list[idx] = report;
  else list.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteReport(id: string): void {
  if (typeof window === 'undefined') return;
  const list = getSavedReports().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function generateReportId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── 云端同步 ─────────────────────────────────────────────────

/** 获取已同步到云端的报告 ID 集合 */
function getSyncedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SYNCED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** 记录已同步的云端 ID */
function addSyncedIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const existing = getSyncedIds();
  for (const id of ids) existing.add(id);
  localStorage.setItem(SYNCED_KEY, JSON.stringify(Array.from(existing)));
}

/** 记录已同步的云端 ID（单个） */
function addSyncedId(id: string): void {
  addSyncedIds([id]);
}

/** 移除已同步记录 */
function removeSyncedId(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getSyncedIds();
  existing.delete(id);
  localStorage.setItem(SYNCED_KEY, JSON.stringify(Array.from(existing)));
}

/** 检查是否有未同步到云端的本地报告 */
export function hasLocalOnlyReports(): boolean {
  if (typeof window === 'undefined') return false;
  const synced = getSyncedIds();
  const local = getSavedReports();
  return local.some((r) => !synced.has(r.id));
}

/** 获取未同步到云端的本地报告数量 */
export function localOnlyCount(): number {
  if (typeof window === 'undefined') return 0;
  const synced = getSyncedIds();
  return getSavedReports().filter((r) => !synced.has(r.id)).length;
}

/** 从云端拉取报告列表，合并到本地（云端优先，去重基于时间戳+类型+VIN） */
export async function syncReportsFromCloud(token: string): Promise<SavedReport[]> {
  if (typeof window === 'undefined') return [];
  try {
    const cloudReports = await fetchReports(token);
    const local = getSavedReports();
    const synced = getSyncedIds();

    // 建立本地报告的特征映射（类型+VIN → 报告）
    const localByKey = new Map<string, SavedReport>();
    for (const r of local) {
      const key = `${r.type}::${r.vehicle.vin}`;
      const existing = localByKey.get(key);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        localByKey.set(key, r);
      }
    }

    // 云端报告转换为本地格式
    const merged: SavedReport[] = [];
    const cloudIds = new Set<string>();

    for (const c of cloudReports) {
      cloudIds.add(c.id);
      const key = `${c.reportType}::${c.vin}`;
      const localMatch = localByKey.get(key);
      // 云端优先
      const cloudAsLocal = await cloudToLocalReport(c);
      merged.push(cloudAsLocal);
      if (localMatch) {
        localByKey.delete(key);
      }
    }

    // 保留云端没有的本地报告
    for (const [, localReport] of localByKey) {
      if (!synced.has(localReport.id)) {
        merged.push(localReport);
      }
    }

    // 按时间降序
    merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    addSyncedIds(Array.from(cloudIds));

    return merged;
  } catch {
    // 云端同步失败，返回本地数据
    return getSavedReports();
  }
}

/** 批量迁移本地报告到云端 */
export async function migrateReportsToCloud(
  token: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ success: number; failed: number }> {
  const synced = getSyncedIds();
  const local = getSavedReports().filter((r) => !synced.has(r.id));
  let success = 0;
  let failed = 0;

  for (let i = 0; i < local.length; i++) {
    const r = local[i];
    try {
      const cloud = await createReport(token, toCloudPayload(r));
      addSyncedId(cloud.id);
      // 更新本地记录，绑定云端 ID
      r.id = cloud.id;
      success++;
    } catch {
      failed++;
    }
    onProgress?.(success + failed, local.length);
  }

  // 保存更新后的本地记录
  if (success > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
  }

  return { success, failed };
}

/** 保存报告并同步到云端 */
export async function saveReportToCloud(
  token: string,
  report: SavedReport,
): Promise<SavedReport> {
  // 先保存到本地
  saveReport(report);

  try {
    const cloud = await createReport(token, toCloudPayload(report));
    addSyncedId(cloud.id);
    // 更新本地记录绑定云端 ID
    report.id = cloud.id;
    saveReport(report);
  } catch {
    // 云端保存失败，本地已保存，不阻塞
  }

  return report;
}

/** 删除报告并同步从云端删除 */
export async function deleteReportFromCloud(
  token: string,
  id: string,
): Promise<void> {
  // 先删除本地
  deleteReport(id);

  try {
    // 如果是云端 ID（UUID 格式），尝试从云端删除
    if (id.includes('-')) {
      await deleteCloudReport(token, id);
      removeSyncedId(id);
    }
  } catch {
    // 云端删除失败不阻塞
  }
}
