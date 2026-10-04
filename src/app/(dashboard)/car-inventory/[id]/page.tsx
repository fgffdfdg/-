'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Car,
  Shield,
  Gauge,
  Battery,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import type { VehicleArchiveRecord } from '@/lib/car-inventory/types';
import type { VehicleInspectionReport, ReportType } from '@/lib/vehicle-inspection/reports';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_REQUIREMENTS,
} from '@/lib/vehicle-inspection/reports';
import { fetchReportsByVehicle, createReport, updateReport } from '@/lib/vehicle-inspection/report-client';

export default function CarInventoryDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CarInventoryDetailContent />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function CarInventoryDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { token } = useAuth();

  const [vehicle, setVehicle] = useState<VehicleArchiveRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<VehicleInspectionReport[]>([]);
  const [inspecting, setInspecting] = useState<ReportType | null>(null);
  const [inspectMessage, setInspectMessage] = useState('');
  const initialInspect = useRef<string | null>(null);

  // ─── Fetch vehicle ─────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetch(`/api/car-inventory/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setVehicle(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Fetch reports ─────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!id || !token) return;
    try {
      const data = await fetchReportsByVehicle(token, id);
      setReports(data);
    } catch (e) {
      console.error('获取检测报告失败:', e);
    }
  }, [id, token]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ─── Handle ?inspect=xxx ──────────────────────────────────
  useEffect(() => {
    const inspectType = searchParams.get('inspect') as ReportType | null;
    if (inspectType && ['insurance', 'mileage', 'battery'].includes(inspectType) && vehicle && token) {
      if (initialInspect.current !== inspectType) {
        initialInspect.current = inspectType;
        handleInspect(inspectType);
      }
    }
  }, [vehicle, token, searchParams]);

  // ─── Inspection logic ──────────────────────────────────────
  const handleInspect = async (type: ReportType) => {
    if (!vehicle || !token) return;
    setInspecting(type);
    setInspectMessage('正在准备检测...');

    try {
      const req = REPORT_TYPE_REQUIREMENTS[type];

      // Check prerequisites
      if (req.needVIN && !vehicle.vin) {
        setInspectMessage('该车辆缺少 VIN 码，无法检测');
        setInspecting(null);
        return;
      }
      if (req.needLicense && !vehicle.driving_license_image_url) {
        setInspectMessage('该车辆缺少行驶证图片，请先上传行驶证');
        setInspecting(null);
        return;
      }

      // Create pending report
      const report = await createReport(token, { vehicleId: id, reportType: type });
      setReports((prev) => [report, ...prev]);

      // Build API request
      let apiUrl = '';
      let apiBody: Record<string, string> = {};

      if (type === 'insurance') {
        apiUrl = '/api/vehicle-inspection/insurance';
        apiBody = { driving_license_image_url: vehicle.driving_license_image_url!, vin: vehicle.vin! };
      } else if (type === 'mileage') {
        apiUrl = '/api/vehicle-inspection/mileage';
        apiBody = { driving_license_image_url: vehicle.driving_license_image_url!, vin: vehicle.vin! };
      } else if (type === 'battery') {
        apiUrl = '/api/vehicle-inspection/battery';
        apiBody = { vin: vehicle.vin! };
      }

      setInspectMessage('正在查询中，请稍候...');
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      });
      const result = await res.json();

      if (result.error) {
        await updateReport(token, report.id, {
          status: 'failed',
          errorMessage: result.error,
          reportData: result as Record<string, unknown>,
        });
        setInspectMessage(`检测失败：${result.error}`);
      } else {
        await updateReport(token, report.id, {
          status: 'completed',
          orderId: result.order_id,
          reportData: result as Record<string, unknown>,
        });
        setInspectMessage('');
      }

      // Refresh reports
      await loadReports();
    } catch (e) {
      setInspectMessage(`检测失败：${(e as Error).message}`);
    } finally {
      setInspecting(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{error || '车辆档案不存在'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/car-inventory')}>
          返回列表
        </Button>
      </div>
    );
  }

  const statusBadge = vehicle.status === 'active'
    ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">在库</Badge>
    : <Badge variant="secondary">已归档</Badge>;

  const sourceLabel: Record<string, string> = {
    manual: '手动录入',
    ocr_license: '行驶证识别',
    ocr_cert: '绿本识别',
    ocr_both: '双证识别',
  };

  const latestReport = (type: ReportType) => reports.find((r) => r.reportType === type && r.status === 'completed');

  const inspectCount = (['insurance', 'mileage', 'battery'] as ReportType[]).filter((t) => latestReport(t)).length;
  const hasVin = Boolean(vehicle.vin);
  const hasLicense = Boolean(vehicle.driving_license_image_url);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/car-inventory')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {(vehicle.custom_model_name || (`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim())) || '车辆档案'}
            </h1>
            {statusBadge}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {vehicle.vin && <span className="font-mono mr-3">{vehicle.vin}</span>}
            {vehicle.plate_number && <span>{vehicle.plate_number}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/car-inventory/${id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />编辑
          </Button>
        </div>
      </div>

      {/* ─── 车况检测横条（Header 下方，最醒目位置） ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3 bg-muted/30 border-b border-border">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">车况检测</span>
          {inspectCount > 0 && (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success dark:border-success/20">
              {inspectCount}/3 项已完成
            </Badge>
          )}
          {inspectCount === 0 && (
            <Badge className="text-xs bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/20">
              建议检测
            </Badge>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['insurance', 'mileage', 'battery'] as ReportType[]).map((type) => {
            const Icon = type === 'insurance' ? Shield : type === 'mileage' ? Gauge : Battery;
            const latest = latestReport(type);
            const isRunning = inspecting === type;

            const disabled =
              (REPORT_TYPE_REQUIREMENTS[type].needLicense && !hasLicense) ||
              (REPORT_TYPE_REQUIREMENTS[type].needVIN && !hasVin);

            return (
              <div key={type} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  latest
                    ? 'bg-success/10 dark:bg-success/15'
                    : 'bg-warning/10 dark:bg-warning/15'
                }`}>
                  <Icon className={`w-4 h-4 ${latest ? 'text-success dark:text-success' : 'text-warning dark:text-warning'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{REPORT_TYPE_LABELS[type]}</span>
                    {latest && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    )}
                  </div>
                  {latest && latest.reportData ? (
                    <p className="text-xs text-muted-foreground">
                      <ReportSummary type={type} data={latest.reportData} />
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {disabled ? (hasVin ? '需上传行驶证' : '缺少 VIN 码') : '未检测'}
                    </p>
                  )}
                </div>
                <Button
                  variant={latest ? 'outline' : 'default'}
                  size="sm"
                  disabled={isRunning || disabled}
                  onClick={() => handleInspect(type)}
                  className={latest ? '' : 'bg-warning hover:bg-warning/85 text-warning-foreground border-none'}
                >
                  {isRunning ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />检测中</>
                  ) : latest ? (
                    <><RotateCw className="w-3.5 h-3.5 mr-1" />重新检测</>
                  ) : (
                    <><Gauge className="w-3.5 h-3.5 mr-1" />立即检测</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Inspect message */}
        {inspectMessage && (
          <div className="px-5 pb-4">
            <div className="p-3 rounded-lg bg-muted text-sm flex items-start gap-2">
              {inspecting ? (
                <Loader2 className="w-4 h-4 animate-spin mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              )}
              <span>{inspectMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* 检测历史 */}
      {reports.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">检测历史</span>
          <div className="flex-1 border-t border-border" />
        </div>
      )}
      {reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/car-inventory/${id}/report/${r.id}`)}
            >
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{REPORT_TYPE_LABELS[r.reportType as ReportType]}</span>
                  <Badge variant="outline" className="text-xs">
                    {r.status === 'completed' ? '已完成' : r.status === 'pending' ? '查询中' : '失败'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString('zh-CN')}
                  {r.errorMessage && <span className="text-destructive ml-2">{r.errorMessage}</span>}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* 证件图片 */}
      {(vehicle.driving_license_image_url || vehicle.registration_cert_image_url) && (
        <Card>
          <CardHeader><CardTitle className="text-base">证件图片</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.driving_license_image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <div className="text-xs text-muted-foreground px-3 py-1.5 bg-muted">行驶证</div>
                  <VehicleImage src={vehicle.driving_license_image_url} alt="行驶证" />
                </div>
              )}
              {vehicle.registration_cert_image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <div className="text-xs text-muted-foreground px-3 py-1.5 bg-muted">机动车登记证书</div>
                  <VehicleImage src={vehicle.registration_cert_image_url} alt="绿本" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 核心信息 */}
      <Card>
        <CardHeader><CardTitle className="text-base">核心信息</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="VIN" value={vehicle.vin} mono />
            <InfoItem label="号牌号码" value={vehicle.plate_number} />
            <InfoItem label="车源地" value={vehicle.vehicle_origin} />
            <InfoItem label="车辆类型" value={vehicle.vehicle_type} />
            <InfoItem label="品牌型号" value={vehicle.brand_model} />
            <InfoItem label="品牌" value={vehicle.brand} />
            <InfoItem label="型号" value={vehicle.model} />
            <InfoItem label="发动机号码" value={vehicle.engine_number} mono />
            <InfoItem label="发动机型号" value={vehicle.engine_model} />
            <InfoItem label="所有人" value={vehicle.owner_name} />
            <InfoItem label="使用性质" value={vehicle.usage_nature} />
            <InfoItem label="注册日期" value={vehicle.registration_date} />
            <InfoItem label="发证日期" value={vehicle.issue_date} />
          </div>
        </CardContent>
      </Card>

      {/* 详细参数 */}
      <Card>
        <CardHeader><CardTitle className="text-base">详细参数</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="燃料种类" value={vehicle.fuel_type} />
            <InfoItem label="排放标准" value={vehicle.emission_standard} />
            <InfoItem label="车身颜色" value={vehicle.color} />
            <InfoItem label="排量" value={vehicle.displacement} />
            <InfoItem label="功率" value={vehicle.power} />
            <InfoItem label="制造厂" value={vehicle.manufacturer} />
            <InfoItem label="总质量" value={vehicle.gross_mass} />
            <InfoItem label="整备质量" value={vehicle.curb_weight} />
            <InfoItem label="核定载人数" value={vehicle.seating_capacity} />
            <InfoItem label="外廓尺寸" value={vehicle.dimensions} />
            <InfoItem label="转向形式" value={vehicle.steering_type} />
            <InfoItem label="轴数" value={vehicle.axles} />
            <InfoItem label="是否新能源" value={vehicle.is_new_energy ? '是' : '否'} />
            <InfoItem label="登记机关" value={vehicle.registration_authority} />
            <InfoItem label="获得方式" value={vehicle.acquisition_method} />
          </div>
        </CardContent>
      </Card>

      {/* 自定义 */}
      <Card>
        <CardHeader><CardTitle className="text-base">自定义信息</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="车型备注名" value={vehicle.custom_model_name} />
            <InfoItem label="备注" value={vehicle.notes} />
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">标签</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {vehicle.tags?.length > 0
                  ? vehicle.tags.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)
                  : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta */}
      <div className="text-xs text-muted-foreground flex gap-4 px-1">
        <span>数据来源：{sourceLabel[vehicle.source] ?? vehicle.source}</span>
        <span>创建时间：{new Date(vehicle.created_at).toLocaleString('zh-CN')}</span>
        <span>更新时间：{new Date(vehicle.updated_at).toLocaleString('zh-CN')}</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function InfoItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
  return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
}

function ReportSummary({ type, data }: { type: ReportType; data: Record<string, unknown> }) {
  if (type === 'insurance') {
    const d = data as Record<string, unknown>;
    const total = (d as Record<string, unknown>)?.data
      ? ((d as Record<string, unknown>).data as Record<string, unknown>)?.total_records
      : undefined;
    return <span>{total !== undefined ? `${total} 条理赔记录` : '查看详情'}</span>;
  }
  if (type === 'mileage') {
    const d = data as Record<string, unknown>;
    const mileage = (d as Record<string, unknown>)?.data
      ? ((d as Record<string, unknown>).data as Record<string, unknown>)?.mileage
      : undefined;
    return <span>{mileage !== undefined ? `${mileage} 万公里` : '查看详情'}</span>;
  }
  if (type === 'battery') {
    const d = data as Record<string, unknown>;
    const soh = (d as Record<string, unknown>)?.data
      ? ((d as Record<string, unknown>).data as Record<string, unknown>)?.soh
      : undefined;
    return <span>{soh !== undefined ? `SOH ${soh}%` : '查看详情'}</span>;
  }
  return null;
}

/** 证件图片组件 */
function VehicleImage({ src, alt }: { src: string; alt: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    if (src.startsWith('http')) {
      setImgUrl(src);
      return;
    }
    fetch(`/api/car-inventory/image-url?key=${encodeURIComponent(src)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.url) setImgUrl(json.url);
      })
      .catch(() => {/* ignore */});
  }, [src]);

  if (!imgUrl) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img src={imgUrl} alt={alt} className="w-full h-64 object-contain bg-background" />
  );
}