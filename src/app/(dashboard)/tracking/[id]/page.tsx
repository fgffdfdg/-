'use client';

// ============ 运输跟踪 - 运输详情页 ============

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Ship,
  Anchor,
  Navigation,
  Package,
  Car,
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  Bell,
  RefreshCw,
  Edit3,
  Check,
  X,
  Archive,
  History,
  Globe,
  ChevronRight,
  Loader2,
  Eye,
  FileText,
} from 'lucide-react';
import { getDemoRecords } from '@/lib/tracking/data-service';
import type { TransportRecord, TransportStatus, TransportNotification } from '@/lib/tracking/types';

// ============ 状态映射 ============

const STATUS_LABEL: Record<TransportStatus, string> = {
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

const STATUS_COLOR: Record<TransportStatus, string> = {
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

// ============ 主组件 ============



// ============ 海运进展地图（客户端动态加载） ============
const TransportMap = dynamic(() => Promise.resolve(function TransportMapInner({ record }: { record: TransportRecord }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let link = document.querySelector('link[data-leaflet-css]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      link.setAttribute('data-leaflet-css', '');
      document.head.appendChild(link);
    }

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const legs = record.legs || [];
      const points: [number, number][] = [];
      const labels: string[] = [];

      if (legs.length > 0) {
        legs.forEach((leg) => {
          if (leg.from_port_lat && leg.from_port_lng) {
            points.push([leg.from_port_lat, leg.from_port_lng]);
            labels.push(leg.from_port_name || '');
          }
          if (leg.to_port_lat && leg.to_port_lng) {
            points.push([leg.to_port_lat, leg.to_port_lng]);
            labels.push(leg.to_port_name || '');
          }
        });
      }

      if (record.last_position_lat && record.last_position_lng && (record.status === 'at_sea' || record.status === 'in_transit')) {
        const shipIcon = L.divIcon({
          className: 'ship-marker',
          html: '<div style="width:24px;height:24px;background:#E67E22;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(230,126,34,0.7);"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([record.last_position_lat, record.last_position_lng], { icon: shipIcon })
          .addTo(map)
          .bindPopup(`<b>${record.vessel_name || '船舶'}</b><br/>${record.last_position_label || ''}<br/>定位: ${record.last_position_time ? new Date(record.last_position_time).toLocaleString('zh-CN') : '-'}`);
      }

      if (points.length > 0) {
        L.polyline(points, {
          color: '#3B82F6',
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 6',
        }).addTo(map);

        points.forEach(([lat, lng], i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const color = isFirst ? '#1E40AF' : isLast ? '#27AE60' : '#F59E0B';
          const size = isFirst || isLast ? 10 : 8;

          const portIcon = L.divIcon({
            className: 'port-marker',
            html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [size + 4, size + 4],
            iconAnchor: [(size + 4) / 2, (size + 4) / 2],
          });

          L.marker([lat, lng], { icon: portIcon })
            .addTo(map)
            .bindPopup(`<b>${labels[i] || ''}</b>`);
        });

        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([20, 60], 3);
      }

      mapInstanceRef.current = map;
    };

    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [record.id, record.last_position_lat, record.last_position_lng, record.legs]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-card px-4 py-2.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Navigation className="size-4 text-brand" />
          船舶位置
        </h3>
        <a href="https://www.vesselfinder.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline hover:text-brand">
          数据来源: vesselfinder.com
        </a>
      </div>
      <div ref={mapRef} className="w-full bg-muted" style={{ height: '400px' }} />
      <style>{`
        .ship-marker { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(230,126,34,0.7); }
          50% { box-shadow: 0 0 24px rgba(230,126,34,0.9); }
        }
        .leaflet-container { height: 100% !important; width: 100% !important; }
      `}</style>
    </div>
  );
}), { ssr: false });

export default function TrackingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<TransportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'vehicles' | 'history' | 'notifications'>('overview');
  const [etaOverride, setEtaOverride] = useState<string | null>(null);
  const [editingEta, setEditingEta] = useState(false);

  useEffect(() => {
    setLoading(true);
    // 演示数据
    const records = getDemoRecords();
    const found = records.find((r) => r.id === id);
    if (found) {
      setRecord(found);
      setEtaOverride(null);
    }
    setLoading(false);
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/transport-records/${id}/refresh`, { method: 'POST' });
      // 模拟刷新
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Ship className="size-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-medium text-foreground">运输记录不存在</p>
        <Link href="/tracking" className="mt-4 text-sm text-primary hover:underline">
          返回运输清单
        </Link>
      </div>
    );
  }

  const unreadNotifications =
    record.notifications?.filter((n) => !n.is_read) || [];
  const currentLeg = record.legs?.find((l) => l.is_current);
  const hasException = record.status === 'exception';
  const hasPartialException =
    record.containers?.some((c) => c.status === 'exception') &&
    record.status !== 'exception';

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/tracking"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{record.bl_number}</h1>
            <p className="text-sm text-muted-foreground">
              {record.tracking_number} · {record.vessel_name} · {record.voyage}
            </p>
          </div>
          {record.is_demo && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              演示数据
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '更新中...' : '更新运输状态'}
          </button>
        </div>
      </div>

      {/* 异常警告 */}
      {(hasException || hasPartialException) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">
                {hasException
                  ? '运输记录异常'
                  : `部分异常 — ${record.containers?.filter((c) => c.status === 'exception').length}/${record.containers?.length} 个集装箱异常`}
              </p>
              <p className="mt-1 text-sm text-red-700">
                请检查集装箱状态，联系承运商确认具体情况。
              </p>
              {record.notifications
                ?.filter((n) => n.type === 'risk_warning')
                .map((n) => (
                  <p key={n.id} className="mt-1 text-xs text-red-600">
                    {n.title}: {n.content}
                  </p>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 核心信息卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={<Clock className="size-4" />}
          label="运输状态"
          value={STATUS_LABEL[record.status]}
          badge={
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[record.status]}`}>
              {STATUS_LABEL[record.status]}
            </span>
          }
        />
        <InfoCard
          icon={<Calendar className="size-4" />}
          label="预计到港时间"
          value={etaOverride || record.eta || '—'}
          editable
          editing={editingEta}
          onEdit={() => setEditingEta(!editingEta)}
          onSave={(v) => { setEtaOverride(v); setEditingEta(false); }}
          onCancel={() => setEditingEta(false)}
          source={record.eta_source}
        />
        <InfoCard
          icon={<MapPin className="size-4" />}
          label="预计剩余距离"
          value={`${record.remaining_distance?.toLocaleString() || '—'} 海里`}
          sub={record.last_position_label}
        />
        <InfoCard
          icon={<Globe className="size-4" />}
          label="数据来源"
          value={record.data_source === 'carrier' ? '船公司' : record.data_source === 'ais' ? 'AIS' : record.data_source || '—'}
          sub={`更新于 ${record.data_updated_at}`}
        />
      </div>

      {/* 船舶信息 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">当前船舶</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">船名</p>
            <p className="mt-1 text-sm font-medium text-foreground">{record.vessel_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IMO</p>
            <p className="mt-1 text-sm font-medium text-foreground font-mono">{record.imo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">航次</p>
            <p className="mt-1 text-sm font-medium text-foreground">{record.voyage}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">最新位置</p>
            <p className="mt-1 text-sm font-medium text-foreground">{record.last_position_label || '—'}</p>
            <p className="text-xs text-muted-foreground">{record.last_position_time}</p>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-foreground">{record.export_port_name}</span>
            <span className="text-xs text-muted-foreground"> · {record.etd}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ship className="size-4 text-primary" />
            <span className="text-xs text-muted-foreground">{record.progress}%</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-foreground">{record.dest_port_name}</span>
            <span className="text-xs text-muted-foreground"> · {record.eta}</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${
              hasException ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{ width: `${record.progress || 0}%` }}
          />
        </div>
      </div>

      {/* 标签页 */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex border-b border-border">
          {[
            { key: 'overview' as const, label: '运输概览', icon: Ship },
            { key: 'containers' as const, label: `集装箱 (${record.containers?.length || 0})`, icon: Package },
            { key: 'vehicles' as const, label: `车辆 (${record.vehicles?.length || 0})`, icon: Car },
            { key: 'history' as const, label: '运输轨迹', icon: History },
            { key: 'notifications' as const, label: `通知 (${unreadNotifications.length})`, icon: Bell },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.key === 'notifications' && unreadNotifications.length > 0 && (
                <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && <OverviewTab record={record} />}
          {activeTab === 'containers' && <ContainersTab containers={record.containers || []} />}
          {activeTab === 'vehicles' && <VehiclesTab vehicles={record.vehicles || []} />}
          {activeTab === 'history' && <HistoryTab legs={record.legs || []} />}
          {activeTab === 'notifications' && <NotificationsTab notifications={record.notifications || []} />}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Archive className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">归档后停止同步和通知</span>
        </div>
        <Link
          href="/tracking"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          返回运输清单
        </Link>
      </div>
    </div>
  );
}

// ============ 信息卡片 ============

function InfoCard({
  icon,
  label,
  value,
  badge,
  sub,
  editable,
  editing,
  onEdit,
  onSave,
  onCancel,
  source,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
  sub?: string;
  editable?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onSave?: (value: string) => void;
  onCancel?: () => void;
  source?: string;
}) {
  const [editValue, setEditValue] = useState(value);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        {editable && !editing && (
          <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <Edit3 className="size-3" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <button
            onClick={() => onSave?.(editValue)}
            className="rounded-md p-1 text-green-600 hover:bg-green-50"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            {badge || <p className="text-lg font-bold text-foreground">{value}</p>}
          </div>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          {source && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              来源: {source === 'carrier' ? '船公司' : source === 'ais_estimated' ? 'AIS推算' : source}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ============ 概览标签页 ============

function OverviewTab({ record }: { record: TransportRecord }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <OverviewItem label="运输记录编号" value={record.tracking_number} />
        <OverviewItem label="提单号" value={record.bl_number} />
        <OverviewItem label="承运商跟踪号" value={record.carrier_tracking_number || '—'} />
        <OverviewItem label="起运港" value={`${record.export_port_name} (${record.export_port_code})`} />
        <OverviewItem label="目的港" value={`${record.dest_port_name} (${record.dest_port_code})`} />
        <OverviewItem label="预计离港" value={record.etd || '—'} />
        <OverviewItem label="预计到港" value={record.eta || '—'} />
        <OverviewItem label="实际离港" value={(record as { atd?: string }).atd || '—'} />
        <OverviewItem label="实际到港" value={(record as { ata?: string }).ata || '—'} />
      </div>

      {/* 当前航段 */}
      {record.legs && record.legs.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">当前航段</p>
          {record.legs
            .filter((l) => l.is_current)
            .map((leg) => (
              <div key={leg.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Ship className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{leg.vessel_name}</span>
                  <span className="text-xs text-muted-foreground">
                    IMO {leg.imo} · {leg.voyage}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground">{leg.from_port_name}</span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <span className="text-foreground">{leg.to_port_name}</span>
                  <span className="text-xs text-muted-foreground">
                    ETD {leg.etd} · ETA {leg.eta}
                  </span>
                </div>
                {leg.atd && <p className="text-xs text-muted-foreground">实际离港: {leg.atd}</p>}
                {leg.ata && <p className="text-xs text-muted-foreground">实际到港: {leg.ata}</p>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}

// ============ 集装箱标签页 ============

function ContainersTab({ containers }: { containers: TransportRecord['containers'] }) {
  if (!containers || containers.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无集装箱数据</p>;
  }
  return (
    <div className="space-y-2">
      {containers.map((c) => (
        <div
          key={c.id}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
            c.status === 'exception'
              ? 'border-red-200 bg-red-50/50'
              : 'border-border bg-background'
          }`}
        >
          <div className="flex items-center gap-3">
            <Package className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{c.container_number}</p>
              <p className="text-xs text-muted-foreground">
                {c.container_type} · {c.seal_number ? `封号: ${c.seal_number}` : '无封号'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {c.status === 'exception' && (
              <span className="text-xs font-medium text-red-600">异常</span>
            )}
            <span className="text-xs text-muted-foreground">{c.created_at}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 车辆标签页 ============

function VehiclesTab({ vehicles }: { vehicles: TransportRecord['vehicles'] }) {
  if (!vehicles || vehicles.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无车辆数据</p>;
  }
  return (
    <div className="space-y-2">
      {vehicles.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Car className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-mono font-medium text-foreground">{v.vin}</p>
              <p className="text-xs text-muted-foreground">
                {v.brand} {v.model} · {v.year} · {v.color}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{v.created_at}</span>
        </div>
      ))}
    </div>
  );
}

// ============ 运输轨迹标签页 ============

function HistoryTab({ legs }: { legs: TransportRecord['legs'] }) {
  if (!legs || legs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无轨迹数据</p>;
  }
  return (
    <div className="space-y-0">
      {legs.map((leg, i) => (
        <div key={leg.id} className="relative flex gap-4 pb-6">
          {/* 时间线竖线 */}
          <div className="flex flex-col items-center">
            <div
              className={`flex size-7 items-center justify-center rounded-full border-2 ${
                leg.is_current
                  ? 'border-primary bg-primary text-primary-foreground'
                  : leg.status === 'completed'
                  ? 'border-green-400 bg-green-50 text-green-600'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              <span className="text-xs font-bold">{i + 1}</span>
            </div>
            {i < legs.length - 1 && (
              <div className="mt-1 h-full w-0.5 bg-border" />
            )}
          </div>
          {/* 内容 */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{leg.vessel_name}</span>
              {leg.is_current && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  当前
                </span>
              )}
              {leg.status === 'completed' && (
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                  已完成
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              IMO {leg.imo} · {leg.voyage}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <span className="font-medium text-foreground">{leg.from_port_name}</span>
              <Navigation className="size-3 text-muted-foreground" />
              <span className="font-medium text-foreground">{leg.to_port_name}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>ETD: {leg.etd}</span>
              <span>ETA: {leg.eta}</span>
              {leg.atd && <span>ATD: {leg.atd}</span>}
              {leg.ata && <span>ATA: {leg.ata}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 通知标签页 ============

function NotificationsTab({ notifications }: { notifications: TransportRecord['notifications'] }) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Bell className="size-10 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">暂无通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`rounded-lg border px-4 py-3 ${
            n.type === 'risk_warning'
              ? 'border-red-200 bg-red-50/50'
              : n.type === 'important_change'
              ? 'border-amber-200 bg-amber-50/50'
              : !n.is_read
              ? 'border-primary/20 bg-primary/5'
              : 'border-border bg-background'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              {n.type === 'risk_warning' ? (
                <AlertTriangle className="size-4 text-red-600 mt-0.5" />
              ) : n.type === 'important_change' ? (
                <Bell className="size-4 text-amber-600 mt-0.5" />
              ) : (
                <Bell className="size-4 text-muted-foreground mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {!n.is_read && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.content}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{n.created_at}</span>
          </div>
        </div>
      ))}
    </div>
  );
}