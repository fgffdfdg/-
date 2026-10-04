'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Search,
  Trash2,
  ArrowRight,
  FileText,
  Globe,
  ClipboardList,
  ClipboardCheck,
  Landmark,
  CheckCircle2,
  Circle,
  Upload,
  Download,
  Eye,
  X,
  FileCheck,
  Pencil,
  Car,
  Calendar,
  Building2,
  Loader2,
  Hash,
  CloudUpload,
  AlertTriangle,
  X as XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import {
  listExportLicenses,
  createExportLicense,
  updateExportLicense,
  deleteExportLicense,
  getExportLicenseFileUrl,
  downloadExportLicense,
} from '@/lib/export-license/api-client';
import {
  getLastExporter,
  setLastExporter,
  hasLocalIssued,
  countLocalIssued,
  migrateLocalIssued,
  clearLocalIssued,
} from '@/lib/export-license/storage';
import {
  parseVins,
  detectFileType,
  type ExportLicense,
} from '@/lib/export-license/types';

const FLOW_STEPS = [
  {
    icon: ClipboardCheck,
    title: '准备材料',
    desc: '行驶证、检测报告、合同、准入声明',
  },
  {
    icon: Landmark,
    title: '登录商务部平台',
    desc: '使用法人卡登录业务系统统一平台',
  },
  {
    icon: Upload,
    title: '提交申请',
    desc: '上传材料并提交，等待审核发证',
  },
  {
    icon: FileCheck,
    title: '归档许可证',
    desc: '下载正式许可证并上传归档，按 VIN 检索',
  },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExportLicensePage() {
  const { token, loading: authLoading } = useAuth();
  const { organization } = useOrg();

  // ─── 已签发许可证库 ───
  const [licenses, setLicenses] = useState<ExportLicense[]>([]);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingLic, setEditingLic] = useState<ExportLicense | null>(null);
  const [previewLic, setPreviewLic] = useState<ExportLicense | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading || !token) return;
    setLoading(true);
    try {
      const data = await listExportLicenses(token);
      setLicenses(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载许可证失败');
    } finally {
      setLoading(false);
    }
  }, [token, authLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 检测本地是否还有历史数据，提示迁移
  useEffect(() => {
    if (authLoading || !token) return;
    setMigrationAvailable(hasLocalIssued());
  }, [authLoading, token]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return licenses;
    return licenses.filter((lic) => {
      if (lic.licenseNo.toUpperCase().includes(q)) return true;
      if (lic.exporter?.toUpperCase().includes(q)) return true;
      if (lic.fileName.toUpperCase().includes(q)) return true;
      if (lic.note?.toUpperCase().includes(q)) return true;
      // 关键：任意一个 VIN 命中即可
      return lic.vins.some((v) => v.toUpperCase().includes(q));
    });
  }, [licenses, search]);

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('确认删除这份已签发许可证？文件将一并删除。')) return;
    try {
      await deleteExportLicense(token, id);
      toast.success('已删除');
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleDownload = async (lic: ExportLicense) => {
    if (!token) return;
    try {
      await downloadExportLicense(token, lic);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败');
    }
  };

  const openPreview = async (lic: ExportLicense) => {
    if (!token) return;
    try {
      const { url } = await getExportLicenseFileUrl(token, lic.id);
      setPreviewUrl(url);
      setPreviewLic(lic);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '预览失败');
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewLic(null);
  };

  const openEdit = (lic: ExportLicense) => {
    setEditingLic(lic);
  };

  const handleMigrate = async () => {
    if (!token) return;
    const count = countLocalIssued();
    if (count === 0) return;
    if (
      !confirm(
        `检测到 ${count} 条保存在本地浏览器的许可证，将上传到云端账号，之后换浏览器登录也能查看。是否立即迁移？`,
      )
    )
      return;

    setMigrating(true);
    setMigrationProgress({ total: count, succeeded: 0, failed: 0 });
    try {
      const result = await migrateLocalIssued(
        async (params) => {
          const f = params.file;
          await createExportLicense(token, {
            file: f,
            licenseNo: params.licenseNo,
            vins: params.vins,
            exporter: params.exporter ?? undefined,
            issueDate: params.issueDate ?? undefined,
            note: params.note
              ? `${params.note}（本地迁移）`
              : '本地迁移',
            organizationId: organization?.id ?? null,
          });
        },
        (p) =>
          setMigrationProgress({
            total: p.total,
            succeeded: p.succeeded,
            failed: p.failed,
          }),
      );
      if (result.failed === 0) {
        await clearLocalIssued();
        toast.success(`已成功迁移 ${result.succeeded} 条许可证到云端`);
      } else {
        toast.warning(
          `迁移完成：${result.succeeded} 条成功，${result.failed} 条失败，失败的本地记录已保留`,
        );
      }
      setMigrationAvailable(hasLocalIssued());
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  const dismissMigration = () => {
    setMigrationAvailable(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">出口许可证</h1>
            <Badge
              variant="secondary"
              className="bg-accent/10 text-accent border-0"
            >
              二手车出口
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            跳转商务部业务系统统一平台申请出口许可证，准备目标市场准入声明，并归档已签发的正式许可证（按车架号检索）。
          </p>
        </div>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          上传已签发许可证
        </Button>
      </div>

      {/* 两个核心功能入口卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 次要功能：市场准入声明 */}
        <Link
          href="/compliance-declaration"
          className="group relative block rounded-xl bg-card text-card-foreground shadow-card transition-all hover:shadow-float hover:-translate-y-0.5 overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" aria-hidden />
          <div className="p-5 pl-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <ClipboardCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">市场准入声明</h2>
                    <Badge className="bg-accent/15 text-accent border-0 text-[10px] px-1.5 py-0 h-4">
                      随附材料
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs">
                    生成符合目标市场要求的市场准入声明（企业信息 + 车辆清单），A4 预览并可导出 PDF，作为许可证申请随附材料。
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>

            <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                企业信息
              </span>
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                车辆清单
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                A4 / PDF
              </span>
            </div>

            <div className="mt-4">
              <Button size="sm" className="pointer-events-none">
                制作声明
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Link>

        <a
          href="https://ecomp.mofcom.gov.cn/loginCorp.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block rounded-xl bg-card text-card-foreground shadow-card transition-all hover:shadow-float hover:-translate-y-0.5 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">商务部统一平台</h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary"
                    >
                      官方网站
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs">
                    中华人民共和国商务部业务系统统一平台 — 二手车出口许可证在线申请入口。
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              <Landmark className="h-3.5 w-3.5 shrink-0" />
              <code className="font-mono truncate">ecomp.mofcom.gov.cn</code>
            </div>

            <div className="mt-4">
              <Button size="sm" variant="outline" className="pointer-events-none">
                前往官网
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </a>
      </div>

      {/* 已签发许可证库 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                已签发许可证库
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                上传并保存从商务部申请到的正式许可证，按任意车架号（VIN）检索，数据随账号云端同步
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="搜索 VIN / 许可证号 / 出口商 / 文件名"
                  className="pl-8 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                上传
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator />
        {migrationAvailable && (
          <div className="flex items-start gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-amber-900 dark:text-amber-200">
                检测到 {countLocalIssued()} 条本地保存的许可证
              </p>
              <p className="text-[11.5px] text-amber-800/80 dark:text-amber-300/70 mt-0.5">
                之前的许可证保存在当前浏览器，换浏览器或清缓存会丢失。一键迁移到账号后，任意设备登录都能查看。
                {migrationProgress && (
                  <span className="ml-1 font-mono">
                    （进度 {migrationProgress.succeeded + migrationProgress.failed}/
                    {migrationProgress.total}）
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                onClick={handleMigrate}
                disabled={migrating}
              >
                {migrating ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CloudUpload className="mr-1 h-3 w-3" />
                )}
                {migrating ? '迁移中…' : '一键迁移'}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-amber-800/60 dark:text-amber-300/60 hover:bg-amber-100/70 dark:hover:bg-amber-900/40"
                onClick={dismissMigration}
                disabled={migrating}
                title="稍后提示"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {licenses.length === 0
                  ? '还没有已签发的许可证'
                  : '没有匹配的许可证'}
              </p>
              {licenses.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  上传第一份许可证
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-[11.5px] text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5">
                      备注
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      许可证号
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      出口商
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      关联车架号 (VIN)
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      发证日期
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">文件</th>
                    <th className="text-left font-medium px-4 py-2.5">
                      上传时间
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lic) => (
                    <tr
                      key={lic.id}
                      className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[180px]">
                        {lic.note ? (
                          <span className="line-clamp-2" title={lic.note}>
                            {lic.note}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                        {lic.licenseNo || '—'}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] max-w-[200px] truncate">
                        {lic.exporter || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {lic.vins.slice(0, 3).map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center gap-0.5 rounded bg-primary/8 px-1.5 py-0.5 text-[10.5px] font-mono"
                            >
                              <Car className="h-2.5 w-2.5 text-muted-foreground" />
                              {v}
                            </span>
                          ))}
                          {lic.vins.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1 font-normal"
                            >
                              +{lic.vins.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap text-muted-foreground">
                        {lic.issueDate || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[11.5px]">
                          <span
                            className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${
                              detectFileType(lic.fileName, lic.fileMime) === 'pdf'
                                ? 'bg-red-50 text-red-600'
                                : detectFileType(lic.fileName, lic.fileMime) === 'image'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {detectFileType(lic.fileName, lic.fileMime) === 'pdf'
                              ? 'PDF'
                              : detectFileType(lic.fileName, lic.fileMime) === 'image'
                                ? 'IMG'
                                : 'FILE'}
                          </span>
                          <span className="truncate max-w-[140px] text-muted-foreground">
                            {lic.fileName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
                            {formatSize(lic.fileSize)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(lic.createdAt).toLocaleString('zh-CN', {
                          hour12: false,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(lic)}
                            title="修改"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openPreview(lic)}
                            title="预览"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownload(lic)}
                            title="下载"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(lic.id)}
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 text-[11px] text-muted-foreground border-t">
              <span>
                共 {licenses.length} 份许可证
                {search && (
                  <span className="ml-1">
                    （匹配 {filtered.length} 份）
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {licenses.reduce((s, l) => s + l.vins.length, 0)} 个车架号已归档
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 申请流程指引 */}
      <Card className="border-primary/10 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            申请流程指引
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            完成草单制作后，按以下步骤在商务部平台正式提交申请
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {FLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <div key={step.title} className="relative">
                  <div className="flex flex-col items-start gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isLast ? 'bg-accent/10' : 'bg-primary/10'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isLast ? 'text-accent' : 'text-primary'}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isLast ? (
                          <CheckCircle2 className="h-3 w-3 text-accent" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground/50" />
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          步骤 {idx + 1}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold mt-0.5">
                        {step.title}
                      </h4>
                      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <UploadDialog
        open={uploadOpen || !!editingLic}
        editing={editingLic}
        token={token}
        organizationId={organization?.id ?? null}
        onOpenChange={(v) => {
          if (!v) {
            setUploadOpen(false);
            setEditingLic(null);
          }
        }}
        onSaved={() => {
          setUploadOpen(false);
          setEditingLic(null);
          void refresh();
        }}
      />

      <PreviewDialog
        lic={previewLic}
        url={previewUrl}
        onClose={closePreview}
        onDownload={handleDownload}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 上传对话框
// ────────────────────────────────────────────────────────────────────

function UploadDialog({
  open,
  editing,
  token,
  organizationId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** 传入已存在的许可证记录则进入编辑模式；新建为 null */
  editing: ExportLicense | null;
  token: string | null;
  organizationId: string | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [file, setFile] = useState<File | null>(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [vinText, setVinText] = useState('');
  const [exporter, setExporter] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const vinCount = useMemo(() => parseVins(vinText).length, [vinText]);

  // 打开弹窗时初始化：编辑模式填充已有数据；新建模式自动填入上次出口商
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFile(null);
      setLicenseNo(editing.licenseNo || '');
      setVinText(editing.vins.join('\n'));
      setExporter(editing.exporter || '');
      setIssueDate(editing.issueDate ?? '');
      setNote(editing.note || '');
    } else {
      setFile(null);
      setLicenseNo('');
      setVinText('');
      setIssueDate('');
      setNote('');
      setSaving(false);
      setDragOver(false);
      if (!exporter) {
        const last = getLastExporter();
        if (last) setExporter(last);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const reset = () => {
    setFile(null);
    setLicenseNo('');
    setVinText('');
    setIssueDate('');
    setNote('');
    setSaving(false);
    setDragOver(false);
    // 出口商不重置：保留为上一次使用的值，下次打开自动带入
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleExporterBlur = () => {
    if (exporter.trim()) setLastExporter(exporter.trim());
  };

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast.error('文件不能超过 20MB');
      return;
    }
    setFile(f);
    // 新建时从文件名尝试识别许可证号；编辑时保留已填写的
    const baseName = f.name.replace(/\.[^.]+$/, '');
    if (!licenseNo && /^\d{2}-\d{2}-\d+/.test(baseName)) {
      setLicenseNo(baseName.match(/^\d{2}-\d{2}-\d+/)?.[0] ?? '');
    }
  };

  const handleSubmit = async () => {
    const vins = parseVins(vinText);
    if (vins.length === 0) {
      toast.error('至少填写一个车架号（VIN），多个 VIN 可用换行或逗号分隔');
      return;
    }
    if (!isEdit && !file) {
      toast.error('请选择要上传的许可证文件');
      return;
    }
    if (!token) {
      toast.error('登录已过期，请刷新后重试');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editing) {
        await updateExportLicense(token, editing.id, {
          file: file ?? undefined,
          licenseNo: licenseNo.trim(),
          vins,
          exporter: exporter.trim() || null,
          issueDate: issueDate || null,
          note: note.trim() || null,
        });
      } else if (file) {
        await createExportLicense(token, {
          file,
          licenseNo: licenseNo.trim(),
          vins,
          exporter: exporter.trim() || null,
          issueDate: issueDate || null,
          note: note.trim() || null,
          organizationId,
        });
      }
      if (exporter.trim()) setLastExporter(exporter.trim());
      toast.success(
        isEdit
          ? '许可证信息已更新'
          : `已保存：${vins.length} 个车架号已关联，任意一个 VIN 均可检索到`,
      );
      reset();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="h-4 w-4 text-primary" />
                修改已签发的出口许可证
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-primary" />
                上传已签发的出口许可证
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? '可修改许可证号、车架号、出口商、发证日期、备注等信息；不重新选择文件则保留原文件。'
              : '支持 PDF 或图片（JPG/PNG 等）。请填写该许可证涵盖的所有车架号（VIN），后续可用任意一个 VIN 检索到这份许可证。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 文件拖拽区 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[280px]">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(file.size)} · 点击更换{isEdit ? '（不选则保留原文件）' : ''}
                  </p>
                </div>
              </div>
            ) : isEdit && editing ? (
              <div className="flex items-center justify-center gap-3">
                <FileCheck className="h-6 w-6 text-success" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[280px]">
                    {editing.fileName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    原文件 · {formatSize(editing.fileSize)} · 点击可替换为新文件
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm">点击或拖拽文件到此处上传</p>
                <p className="text-[11px] text-muted-foreground">
                  支持 PDF / JPG / PNG，最大 20MB
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Hash className="h-3 w-3" />
                许可证号
              </Label>
              <Input
                className="mt-1 h-8 text-sm font-mono"
                placeholder="26-35-200999"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                发证日期
              </Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              出口商
            </Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="广州通达汽车出口有限公司"
              value={exporter}
              onChange={(e) => setExporter(e.target.value)}
              onBlur={handleExporterBlur}
            />
          </div>

          <div>
            <Label className="text-xs flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                车架号 VIN（必填，支持一证多车）
              </span>
              <span
                className={`text-[10.5px] font-normal ${vinCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
              >
                已识别 {vinCount} 个
              </span>
            </Label>
            <Textarea
              className="mt-1 font-mono text-xs min-h-[90px]"
              placeholder={
                '每行一个 VIN，或用逗号/空格分隔，例如：\nLSGAB52L7DF000001\nLSGAB52L7DF000002\nLSGAB52L7DF000003'
              }
              value={vinText}
              onChange={(e) => setVinText(e.target.value)}
            />
            <p className="text-[10.5px] text-muted-foreground mt-1">
              之后搜索任意一个 VIN，都能找到本许可证。
            </p>
          </div>

          <div>
            <Label className="text-xs">备注（可选）</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="例如：阿联酋订单 / 2025 Q1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving || (!file && !isEdit)}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                保存中…
              </>
            ) : (
              <>
                <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                {isEdit ? '保存修改' : '保存许可证'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────
// 预览对话框
// ────────────────────────────────────────────────────────────────────

function PreviewDialog({
  lic,
  url,
  onClose,
  onDownload,
}: {
  lic: ExportLicense | null;
  url: string | null;
  onClose: () => void;
  onDownload: (lic: ExportLicense) => void;
}) {
  return (
    <Dialog
      open={!!lic}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {lic && url && (
          <>
            <DialogHeader className="px-5 py-3 border-b flex-row items-center justify-between space-y-0">
              <div className="min-w-0">
                <DialogTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-mono">{lic.licenseNo}</span>
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5 truncate">
                  {lic.fileName} · {lic.vins.length} 个 VIN
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onDownload(lic)}
                >
                  <Download className="mr-1 h-3 w-3" />
                  下载
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-muted/40 p-4 min-h-[60vh]">
              {detectFileType(lic.fileName, lic.fileMime) === 'pdf' ? (
                <iframe
                  src={url}
                  className="w-full h-[75vh] rounded-md border bg-white"
                  title={lic.fileName}
                />
              ) : detectFileType(lic.fileName, lic.fileMime) === 'image' ? (
                <div className="flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={lic.fileName}
                    className="max-w-full max-h-[75vh] object-contain rounded-md shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
                  <FileText className="h-10 w-10 mb-2" />
                  该文件类型不支持在线预览，请下载后查看。
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
