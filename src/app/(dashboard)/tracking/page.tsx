'use client';

// ============ 运输跟踪 - 运输清单主页面 ============

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Upload,
  RefreshCw,
  Ship,
  Anchor,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Box,
  FileText,
  X,
  Loader2,
  Eye,
  Package,
  Car,
  Bell,
  ArrowUpRight,
  Navigation,
  ArrowRight,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { getDemoRecords, detectInputType, queryTransport } from '@/lib/tracking/data-service';
import { useAuth } from '@/lib/auth-context';
import type { TransportRecord, TransportStatus, QueryResult, BatchImportItem } from '@/lib/tracking/types';


// ============ 状态定义 ============

const STATUS_GROUPS: { key: TransportStatus | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: '全部', icon: <FileText className="size-3.5" />, color: 'bg-muted text-muted-foreground' },
  { key: 'pending_shipment', label: '待装运', icon: <Clock className="size-3.5" />, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { key: 'awaiting_departure', label: '待开船', icon: <Anchor className="size-3.5" />, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { key: 'at_sea', label: '海运途中', icon: <Ship className="size-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { key: 'in_transit', label: '中转中', icon: <Navigation className="size-3.5" />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { key: 'arrived', label: '已到港', icon: <Box className="size-3.5" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  { key: 'customs_clearance', label: '清关中', icon: <FileText className="size-3.5" />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { key: 'delivered', label: '已交付', icon: <CheckCircle2 className="size-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { key: 'exception', label: '异常', icon: <AlertTriangle className="size-3.5" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { key: 'cancelled', label: '已取消', icon: <XCircle className="size-3.5" />, color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
];

const STATUS_LABEL_MAP: Record<TransportStatus, string> = {
  pending_shipment: '待装运',
  awaiting_departure: '待开船',
  at_sea: '海运途中',
  in_transit: '中转中',
  arrived: '已到港',
  customs_clearance: '清关中',
  delivered: '已交付',
  exception: '异常',
  cancelled: '已取消',
};

const STATUS_COLOR_MAP: Record<TransportStatus, string> = {
  pending_shipment: 'bg-slate-100 text-slate-700 border-slate-200',
  awaiting_departure: 'bg-blue-50 text-blue-700 border-blue-200',
  at_sea: 'bg-sky-50 text-sky-700 border-sky-200',
  in_transit: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  arrived: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  customs_clearance: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  exception: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_SORT_ORDER: TransportStatus[] = [
  'exception',
  'at_sea',
  'in_transit',
  'awaiting_departure',
  'pending_shipment',
  'arrived',
  'customs_clearance',
  'delivered',
  'cancelled',
];

// ============ 主组件 ============

export default function TrackingPage() {
  const [records, setRecords] = useState<TransportRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TransportRecord[]>([]);
  const [activeStatus, setActiveStatus] = useState<TransportStatus | 'all'>('all');
  const [queryInput, setQueryInput] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchResult, setBatchResult] = useState<BatchImportItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [queryResultForLogin, setQueryResultForLogin] = useState<QueryResult | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { user } = useAuth();

  // 加载数据
  useEffect(() => {
    setLoading(true);
    const records = getDemoRecords();
    setRecords(records);
    setFilteredRecords(records);
    setLoading(false);
  }, []);

  // 登录后恢复查询结果
  useEffect(() => {
    if (user && queryResultForLogin) {
      setQueryResult(queryResultForLogin);
      setShowQueryModal(true);
      setQueryResultForLogin(null);
    }
  }, [user, queryResultForLogin]);

  // 加入运输清单（未登录跳转登录后返回）
  const handleAddToList = useCallback(() => {
    if (!user) {
      setQueryResultForLogin(queryResult);
      setShowQueryModal(false);
      router.push('/login?redirect=/tracking');
      return;
    }
    // 已登录用户：关闭弹窗，记录已显示在列表中
    setShowQueryModal(false);
  }, [user, queryResult, router]);

  // 筛选逻辑
  const applyFilters = useCallback(() => {
    let result = [...records];

    if (activeStatus !== 'all') {
      result = result.filter((r) => r.status === activeStatus);
    }

    // 排序
    result.sort((a, b) => {
      const ai = STATUS_SORT_ORDER.indexOf(a.status);
      const bi = STATUS_SORT_ORDER.indexOf(b.status);
      if (ai !== bi) return ai - bi;
      if (a.eta && b.eta) return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    setFilteredRecords(result);
  }, [records, activeStatus]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 统计
  const stats = {
    total: records.length,
    atSea: records.filter((r) => r.status === 'at_sea' || r.status === 'in_transit').length,
    exception: records.filter((r) => r.status === 'exception').length,
    unreadNotifications: records.filter((r) => r.notifications?.some((n) => !n.is_read)).length,
  };

  // 统一查询
  const handleQuery = async () => {
    if (!queryInput.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    setShowQueryModal(true);

    try {
      const inputType = detectInputType(queryInput.trim());
      const body: Record<string, string> = {};

      if (inputType === 'bl') {
        body.billNo = queryInput.trim();
      } else if (inputType === 'carrier_tracking') {
        body.billNo = queryInput.trim();
      } else if (inputType === 'vin') {
        body.billNo = queryInput.trim();
      } else {
        body.billNo = queryInput.trim();
      }
      body.isExport = 'E';

      const res = await fetch('/api/transport-records/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setQueryResult(data.data);
      } else {
        setQueryResult(null);
      }
    } catch {
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  // 刷新单条记录
  const handleRefreshRecord = async (record: TransportRecord) => {
    setRefreshingIds(prev => new Set(prev).add(record.id));
    try {
      const res = await fetch(`/api/transport-records/${record.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo: record.bl_number,
          containerNo: record.containers?.[0]?.container_number || '',
          isExport: 'E',
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.record) {
        setRecords(prev => prev.map(r => r.id === record.id ? data.data.record : r));
        setFilteredRecords(prev => prev.map(r => r.id === record.id ? data.data.record : r));
        setLastRefreshTime(new Date());
      }
    } catch {
      // ignore
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  // 批量导入
  const handleBatchImport = async () => {
    if (!batchText.trim()) return;
    try {
      const res = await fetch('/api/transport-records/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batchText }),
      });
      const data = await res.json();
      setBatchResult(data);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">运输跟踪</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理订舱、报关、海运、清关至交付全过程的运输记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Upload className="size-4" />
            批量导入
          </button>
          <button
            onClick={() => {
              setLastRefreshTime(new Date());
              setRecords(getDemoRecords());
              setFilteredRecords(getDemoRecords().filter(r => activeStatus === 'all' || r.status === activeStatus));
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="size-4" />
            刷新
          </button>
          {lastRefreshTime && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              最近刷新: {lastRefreshTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <button
          onClick={() => {
            setActiveStatus('all');
            document.getElementById('records-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
        >
          <p className="text-sm text-muted-foreground">运输记录</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </button>
        <button
          onClick={() => {
            setActiveStatus('at_sea');
            document.getElementById('records-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
        >
          <p className="text-sm text-muted-foreground">海运途中</p>
          <p className="mt-1 text-2xl font-bold text-sky-600">{stats.atSea}</p>
        </button>
        <button
          onClick={() => setShowNotificationsModal(true)}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
        >
          <p className="text-sm text-muted-foreground">未读通知</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.unreadNotifications}</p>
        </button>
        </div>

      {/* 查询与筛选区 */}
      <div className="rounded-xl border border-border bg-card">
        {/* 统一查询入口 */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                placeholder="输入提单号、承运商跟踪号或 VIN"
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleQuery}
              disabled={queryLoading || !queryInput.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {queryLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              查询
            </button>
            
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            支持提单号、承运商跟踪号、VIN 车架号自动识别
          </p>
        </div>

        
      </div>

      {/* 状态标签页 */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_GROUPS.map((group) => {
          const count =
            group.key === 'all'
              ? records.length
              : records.filter((r) => r.status === group.key).length;
          return (
            <button
              key={group.key}
              onClick={() => setActiveStatus(group.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStatus === group.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {group.icon}
              {group.label}
              <span className="ml-0.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 运输清单 - 表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Ship className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-foreground">
            {activeStatus === 'all' ? '暂无运输记录' : `暂无「${STATUS_LABEL_MAP[activeStatus as TransportStatus] || activeStatus}」状态的运输记录`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            通过上方查询入口搜索并添加运输记录，或批量导入
          </p>
        </div>
      ) : (
        <div id="records-table" className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    提单号 / 跟踪号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    船舶
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    起运港 → 目的港
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    预计到港
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    装载
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    进度
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <TransportRow
                    key={record.id}
                    record={record}
                    refreshingIds={refreshingIds}
                    onRefresh={handleRefreshRecord}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 查询结果弹窗 */}
      {showQueryModal && (
        <QueryResultModal
          result={queryResult}
          loading={queryLoading}
          onClose={() => { setShowQueryModal(false); setQueryResult(null); }}
          input={queryInput}
          onAddToList={handleAddToList}
        />
      )}

      {/* 批量导入弹窗 */}
      {showBatchModal && (
        <BatchImportModal
          text={batchText}
          onTextChange={setBatchText}
          result={batchResult}
          onImport={handleBatchImport}
          onClose={() => { setShowBatchModal(false); setBatchText(''); setBatchResult(null); }}
        />
      )}

      {/* 通知中心弹窗 */}
      {showNotificationsModal && (
        <NotificationCenterModal
          records={records}
          onClose={() => setShowNotificationsModal(false)}
        />
      )}

      {/* 数据来源提示 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
        <strong>Freightower 飞驼</strong> — 已接入飞驼集装箱综合跟踪 API，支持近百个船公司及中国港区全程物流跟踪数据。输入提单号/箱号即可查询实时运输状态。
      </div>
    </div>
  );
}

// ============ 海运进展地图组件 ============


function NotificationCenterModal({
  records,
  onClose,
}: {
  records: TransportRecord[];
  onClose: () => void;
}) {
  const allNotifications = records.flatMap((r) =>
    (r.notifications || []).map((n) => ({ ...n, record: r }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">消息中心</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 ${
                    n.type === 'risk_warning'
                      ? 'border-red-200 bg-red-50/50'
                      : n.type === 'important_change'
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-border bg-background'
                  } ${!n.is_read ? 'ring-1 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="size-2 rounded-full bg-primary" />}
                        <span className="text-sm font-medium text-foreground">{n.title}</span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            n.type === 'risk_warning'
                              ? 'bg-red-100 text-red-700'
                              : n.type === 'important_change'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {n.type === 'risk_warning' ? '风险' : n.type === 'important_change' ? '重要' : '更新'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{n.content}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{n.record.bl_number}</span>
                        <span>{n.created_at}</span>
                      </div>
                    </div>
                    <Link
                      href={`/tracking/${n.record.id}`}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                      title="查看详情"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 运输行组件 ============

function TransportRow({
  record,
  refreshingIds,
  onRefresh,
}: { record: TransportRecord; refreshingIds: Set<string>; onRefresh: (r: TransportRecord) => void }) {
  const router = useRouter();
  const statusGroup = STATUS_GROUPS.find(g => g.key === record.status);
  const isRefreshing = refreshingIds.has(record.id);
  
  const handleRowClick = () => {
    window.open(`/tracking/${record.id}`, '_blank');
  };
  
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/tracking/${record.id}`, '_blank');
  };

  return (
    <tr
      onClick={handleRowClick}
      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
    >
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
          statusGroup?.color || "bg-muted text-muted-foreground"
        )}>
          {statusGroup?.label || record.status}
        </span>
        {record.is_demo && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
            演示
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-sm text-foreground">
          {record.bl_number || record.carrier_tracking_number || '-'}
        </div>
        <div className="text-xs text-muted-foreground">
          {record.tracking_number}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-sm text-foreground">{record.vessel_name || '-'}</div>
        <div className="text-xs text-muted-foreground">
          IMO {record.imo || '-'} · {record.voyage || '-'}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <span>{record.export_port_name || '-'}</span>
          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
          <span>{record.dest_port_name || '-'}</span>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-sm text-foreground">{record.eta || '-'}</div>
        <div className="text-xs text-muted-foreground">
          来源: {record.eta_source === 'carrier' ? '船公司' : record.eta_source === 'logistics' ? '物流商' : 'AIS推算'}
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Package className="size-3.5 text-muted-foreground" />
            {record.container_count}箱
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Car className="size-3.5 text-muted-foreground" />
            {record.vehicle_count}辆
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${Math.min(record.progress || 0, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-9 text-right">
            {record.progress || 0}%
          </span>
        </div>
        {record.data_updated_at && (
          <p className="text-[10px] text-muted-foreground mt-1">
            更新: {new Date(record.data_updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} {new Date(record.data_updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button
            onClick={handleViewClick}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="在新窗口查看运输详情"
          >
            <Eye className="size-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh(record);
            }}
            disabled={isRefreshing}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="刷新运输状态"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function QueryResultModal({
  result,
  loading,
  onClose,
  input,
  onAddToList,
}: {
  result: ReturnType<typeof queryTransport> | null;
  loading: boolean;
  onClose: () => void;
  input: string;
  onAddToList: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">查询结果</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : !result ? (
            <div className="py-8 text-center text-muted-foreground">查询失败</div>
          ) : result.type === 'unknown' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">无法识别</p>
              <p className="mt-1">{result.message}</p>
            </div>
          ) : result.not_found ? (
            <div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <Search className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-foreground">未找到运输记录</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  编号「{input}」暂无匹配的运输信息
                </p>
                
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  可添加为"待查询记录"，后续手动更新
                </span>
                <button onClick={onAddToList} className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                  加入运输清单
                </button>
              </div>
            </div>
          ) : result.records && result.records.length > 0 ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                VIN 查询 — 找到 {result.records.length} 条关联记录
              </p>
              <div className="space-y-2">
                {result.records.map((r) => (
                  <Link
                    key={r.id}
                    href={`/tracking/${r.id}`}
                    className="block rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{r.bl_number}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLOR_MAP[r.status]
                        }`}
                      >
                        {STATUS_LABEL_MAP[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.vessel_name} · {r.export_port_name} → {r.dest_port_name} · ETA {r.eta}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : result.record ? (
            <div>
              {/* 演示数据确认 */}
              {result.is_demo && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-medium">这是演示数据</p>
                  <p className="mt-0.5 text-xs">
                    以下为演示运输记录，仅用于功能体验，不代表真实运输数据。
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{result.record.bl_number}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLOR_MAP[result.record.status]
                    }`}
                  >
                    {STATUS_LABEL_MAP[result.record.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {result.record.vessel_name} · {result.record.voyage}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.record.export_port_name} → {result.record.dest_port_name} · ETA {result.record.eta}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{result.record.container_count} 集装箱</span>
                  <span>·</span>
                  <span>{result.record.vehicle_count} 车辆</span>
                  <span>·</span>
                  <span>进度 {result.record.progress}%</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/tracking/${result.record.id}`}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  查看详情
                </Link>
                <button onClick={onAddToList} className="rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                  加入运输清单
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============ 批量导入弹窗 ============

function BatchImportModal({
  text,
  onTextChange,
  result,
  onImport,
  onClose,
}: {
  text: string;
  onTextChange: (v: string) => void;
  result: BatchImportItem[] | null;
  onImport: () => void;
  onClose: () => void;
}) {
  const total = result ? result.length : 0;
  const success = result ? result.filter((r) => r.status === 'success').length : 0;
  const duplicate = result ? result.filter((r) => r.status === 'duplicate').length : 0;
  const formatError = result ? result.filter((r) => r.status === 'format_error').length : 0;
  const pendingQuery = result ? result.filter((r) => r.status === 'pending_query').length : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">批量导入</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            每行一条记录，支持 Tab / 逗号分隔。格式：提单号, 承运商跟踪号, VIN
          </p>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={`COSU6823456789\tCOSCO-TR-20260701\tJTMHU82J50D123456\nMSCU7890123456\tMSC-TR-20260702\n`}
            rows={8}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground">
              解析结果: {total} 条
            </p>
            <div className="mt-1 flex gap-3 text-xs">
              <span className="text-green-600">成功 {success}</span>
              <span className="text-amber-600">重复 {duplicate}</span>
              <span className="text-blue-600">待查询 {pendingQuery}</span>
              <span className="text-red-600">格式错误 {formatError}</span>
            </div>
            {result.length > 0 && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {result.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{r.bl_number || r.carrier_tracking_number || '—'}</span>
                    <span
                      className={
                        r.status === 'success'
                          ? 'text-green-600'
                          : r.status === 'duplicate'
                          ? 'text-amber-600'
                          : r.status === 'pending_query'
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }
                    >
                      {r.message || r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onImport}
            disabled={!text.trim()}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            解析并导入
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}