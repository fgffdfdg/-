'use client';

/**
 * 车辆查询页面 - 车况查询流程
 *
 * 流程：选择报告类型 → 上传所需资料 → 查询结果 → 保存车辆
 *
 * 对应需求：
 * - 0004: 先查询后保存 - 临时车辆承载报告，保存后才进入候选车源池
 * - 0005: 组合确认费用，报告独立执行
 * - 0006: 按VIN统一车辆身份并复用报告
 */
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrgId } from '@/lib/org/hooks';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_PRICES,
  REPORT_TYPE_REQUIREMENTS,
} from '@/lib/vehicle-inspection/reports';
import type { ReportType } from '@/lib/vehicle-inspection/reports';
import type {
  ReportOrder,
  ReportCombinationResponse,
} from '@/lib/vehicle-inspection/report-orders';
import {
  REPORT_ORDER_STATUS_LABELS,
  REPORT_ORDER_STATUS_COLORS,
  FINANCIAL_STATUS_LABELS,
} from '@/lib/vehicle-inspection/report-orders';
import { initQuery, saveTempVehicle, checkVin } from '@/lib/vehicle-inspection/report-order-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Upload, FileText, X, Check, AlertTriangle } from 'lucide-react';

// ─── 步骤定义 ───────────────────────────────────────────────────

type Step = 'reports' | 'upload' | 'results';

const STEP_LABELS: Record<Step, string> = {
  reports: '选择报告',
  upload: '上传资料',
  results: '查询结果',
};

// ─── 主组件 ─────────────────────────────────────────────────────

export default function VehicleQueryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = useOrgId();

  // 步骤状态
  const [step, setStep] = useState<Step>('reports');

  // 报告选择
  const [selectedReports, setSelectedReports] = useState<Set<ReportType>>(new Set());

  // VIN 输入
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState('');

  // 行驶证文件上传
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 查询结果
  const [combinationResponse, setCombinationResponse] = useState<ReportCombinationResponse | null>(null);
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 保存
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── 计算需要哪些资料 ──────────────────────────────────────────

  const needsVIN = Array.from(selectedReports).some(t => REPORT_TYPE_REQUIREMENTS[t]?.needVIN);
  const needsLicense = Array.from(selectedReports).some(t => REPORT_TYPE_REQUIREMENTS[t]?.needLicense);

  // ─── 切换报告选择 ────────────────────────────────────────────

  const toggleReport = useCallback((type: ReportType) => {
    setSelectedReports(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // ─── 计算总费用 ──────────────────────────────────────────────

  const totalCost = Array.from(selectedReports).reduce(
    (sum, type) => sum + (REPORT_TYPE_PRICES[type] ?? 0),
    0
  );

  // ─── 文件上传处理 ────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('仅支持 JPG、PNG、WebP 图片或 PDF 文件');
      return;
    }

    // 校验文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setLicenseFile(file);
    setError('');

    // 生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setLicensePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLicensePreview(null);
    }
  }, []);

  const removeFile = useCallback(() => {
    setLicenseFile(null);
    setLicensePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // ─── VIN 校验 ────────────────────────────────────────────────

  const validateVin = useCallback((value: string): boolean => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (cleaned.length === 0) {
      setVinError('请输入VIN码');
      return false;
    }
    if (cleaned.length !== 17) {
      setVinError('VIN码应为17位字符');
      return false;
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
      setVinError('VIN码包含无效字符（不含I、O、Q）');
      return false;
    }
    setVinError('');
    return true;
  }, []);

  // ─── 提交查询 ────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // 校验
    if (selectedReports.size === 0) {
      setError('请至少选择一种报告类型');
      setStep('reports');
      return;
    }

    if (needsVIN && !validateVin(vin)) {
      setStep('upload');
      return;
    }

    if (needsLicense && !licenseFile) {
      setError('请上传行驶证照片');
      setStep('upload');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await initQuery({
        vin: vin.replace(/\s/g, '').toUpperCase(),
        reportTypes: Array.from(selectedReports),
        organizationId: orgId ?? null,
        drivingLicenseFile: needsLicense ? licenseFile : null,
      });

      setCombinationResponse(result);
      setOrders(result.orders);
      setStep('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [vin, selectedReports, orgId, needsVIN, needsLicense, licenseFile, validateVin]);

  // ─── 保存车辆 ────────────────────────────────────────────────

  const handleSave = useCallback(async (mergeStrategy?: 'create_new' | 'merge', mergeTargetId?: string) => {
    if (!combinationResponse) return;

    setSaving(true);
    try {
      const result = await saveTempVehicle({
        vehicleId: combinationResponse.vehicleId,
        mergeStrategy,
        mergeTargetVehicleId: mergeTargetId ?? null,
      });

      if (result.success) {
        router.push(`/car-inventory/${result.vehicleId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
      setShowMergeDialog(false);
    }
  }, [combinationResponse, router]);

  // ─── 渲染 ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {(Object.keys(STEP_LABELS) as Step[]).map((s, idx) => {
            const stepIdx = (Object.keys(STEP_LABELS) as Step[]).indexOf(step);
            const currentIdx = (Object.keys(STEP_LABELS) as Step[]).indexOf(s);
            const isDone = currentIdx < stepIdx;
            const isCurrent = currentIdx === stepIdx;

            return (
              <div key={s} className="flex items-center gap-2">
                {idx > 0 && (
                  <div className={cn('h-px w-8', isDone ? 'bg-primary' : 'bg-border')} />
                )}
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isDone && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                    !isDone && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={cn(
                  'hidden text-sm sm:inline',
                  isCurrent && 'font-semibold text-foreground',
                  !isCurrent && 'text-muted-foreground'
                )}>
                  {STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 underline hover:no-underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* Step 1: 选择报告类型 */}
      {step === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle>选择车况报告</CardTitle>
            <CardDescription>
              按需选择报告类型，提交前会统一确认费用。每份报告独立查询，互不影响。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((type) => {
                const selected = selectedReports.has(type);
                const price = REPORT_TYPE_PRICES[type] ?? 0;
                const req = REPORT_TYPE_REQUIREMENTS[type];

                return (
                  <div
                    key={type}
                    className={cn(
                      'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    )}
                    onClick={() => toggleReport(type)}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleReport(type)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{REPORT_TYPE_LABELS[type]}</span>
                        <span className="text-sm font-semibold text-primary">
                          ¥{(price / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {REPORT_TYPE_DESCRIPTIONS[type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        需要：{req.needVIN ? 'VIN码' : ''}
                        {req.needLicense && req.needVIN ? '、' : ''}
                        {req.needLicense ? '行驶证' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* 费用汇总 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">已选 {selectedReports.size} 种报告</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">合计费用：</span>
                <span className="text-lg font-bold text-primary">
                  ¥{(totalCost / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={() => setStep('upload')}
              disabled={selectedReports.size === 0}
              className="w-full"
            >
              下一步：上传查询资料
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 上传查询资料 */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>上传查询资料</CardTitle>
            <CardDescription>
              根据所选报告类型，上传必要的查询资料。资料完整后可提交查询。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 已选报告摘要 */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">已选报告</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedReports).map(type => (
                  <Badge key={type} variant="secondary">
                    {REPORT_TYPE_LABELS[type]}
                    <span className="ml-1 text-muted-foreground">
                      ¥{((REPORT_TYPE_PRICES[type] ?? 0) / 100).toFixed(2)}
                    </span>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-sm font-medium text-primary">
                合计：¥{(totalCost / 100).toFixed(2)}
              </div>
            </div>

            {/* VIN 输入 */}
            {needsVIN && (
              <div className="space-y-2">
                <Label htmlFor="vin" className="flex items-center gap-1">
                  VIN码（车辆识别代号）
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vin"
                  placeholder="例如：LSVAA4180E2123456"
                  value={vin}
                  onChange={(e) => {
                    setVin(e.target.value.toUpperCase());
                    if (vinError) setVinError('');
                  }}
                  maxLength={17}
                  className="font-mono text-lg tracking-wider"
                />
                {vinError && <p className="text-sm text-red-600">{vinError}</p>}
                <p className="text-xs text-muted-foreground">
                  输入17位VIN码，系统将自动查重，避免重复查询
                </p>
              </div>
            )}

            {/* 行驶证上传 */}
            {needsLicense && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  行驶证照片
                  <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  出险报告和里程报告需要行驶证信息。支持 JPG、PNG、WebP 或 PDF，最大 10MB。
                </p>

                {licenseFile ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                        {licensePreview ? (
                          <img
                            src={licensePreview}
                            alt="行驶证预览"
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <FileText className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{licenseFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(licenseFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">点击上传行驶证</p>
                      <p className="text-xs text-muted-foreground">
                        支持 JPG / PNG / WebP / PDF
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep('reports')} className="flex-1">
                上一步
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting ? '提交中...' : `查询（¥${(totalCost / 100).toFixed(2)}）`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 查询结果 */}
      {step === 'results' && combinationResponse && (
        <Card>
          <CardHeader>
            <CardTitle>查询结果</CardTitle>
            <CardDescription>
              每份报告独立查询，状态实时更新。查看结果后可以保存车辆到候选车源池。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* VIN查重提示 */}
            {combinationResponse.vinExists && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    该VIN已存在车辆记录
                  </p>
                </div>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  保存时您可以选择合并报告到已有车辆，或创建新车辆档案
                </p>
              </div>
            )}

            {/* 订单列表 */}
            <div className="space-y-3">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {REPORT_TYPE_LABELS[order.reportType as ReportType] ?? order.reportType}
                      </span>
                      <Badge variant="outline" className={cn('text-xs', REPORT_ORDER_STATUS_COLORS[order.status])}>
                        {REPORT_ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>¥{(order.costCents / 100).toFixed(2)}</span>
                      <span>{FINANCIAL_STATUS_LABELS[order.financialStatus]}</span>
                    </div>
                    {order.errorMessage && (
                      <p className="text-xs text-red-600">{order.errorMessage}</p>
                    )}
                    {order.resultSummary && (
                      <p className="text-xs text-muted-foreground">{order.resultSummary}</p>
                    )}
                  </div>
                  {order.status === 'completed' && (
                    <Check className="size-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('reports');
                  setCombinationResponse(null);
                  setOrders([]);
                  setSelectedReports(new Set());
                  setVin('');
                  setLicenseFile(null);
                  setLicensePreview(null);
                }}
                className="flex-1"
              >
                重新查询
              </Button>
              {combinationResponse.vinExists ? (
                <Button
                  onClick={() => setShowMergeDialog(true)}
                  disabled={saving}
                  className="flex-1"
                >
                  保存车辆
                </Button>
              ) : (
                <Button
                  onClick={() => handleSave('create_new')}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? '保存中...' : '保存到候选车源池'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合并对话框 */}
      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>该VIN已有车辆记录</AlertDialogTitle>
            <AlertDialogDescription>
              您希望如何处理本次查询的报告？
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            <div
              className="cursor-pointer rounded-lg border p-4 hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => {
                setShowMergeDialog(false);
                handleSave('create_new');
              }}
            >
              <p className="font-medium">创建新车辆档案</p>
              <p className="text-sm text-muted-foreground">
                保留两份独立的车辆记录，各自拥有独立的报告
              </p>
            </div>

            {combinationResponse?.existingVehicleId && (
              <div
                className="cursor-pointer rounded-lg border p-4 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setShowMergeDialog(false);
                  handleSave('merge', combinationResponse.existingVehicleId!);
                }}
              >
                <p className="font-medium">合并到已有车辆</p>
                <p className="text-sm text-muted-foreground">
                  将本次查询的报告合并到已有车辆，删除临时车辆。
                  已有报告不会被覆盖。
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}