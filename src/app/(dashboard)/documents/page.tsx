'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, Plus, Search, ClipboardList, ArrowRight,
  Eye, Download, Trash2, Pencil, Upload, Loader2, Hash, Car, File,
  FileCheck, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  listContractDocuments,
  deleteContractDocument,
  getContractDocumentFileUrl,
  downloadContractDocument,
} from '@/lib/contract-documents/api-client';
import type { ContractDocument } from '@/lib/contract-documents/types';

/** 格式化日期 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** 格式化文件大小 */
function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TradeDocumentDraft {
  id: string;
  title: string;
  doc_no: string;
  doc_data: Record<string, unknown> | null;
  doc_type: string;
  created_at: string;
  updated_at: string;
}

/** 文档类型颜色配置 */
const TYPE_CONFIG: Record<string, { label: string; border: string; badge: string }> = {
  invoice: { label: '发票', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  'packing-list': { label: '装箱单', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  contract: { label: '合同', border: 'border-l-sky-600', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  all: { label: '三合一', border: 'border-l-primary', badge: 'bg-primary/10 text-primary' },
  trade: { label: '单证', border: 'border-l-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export default function DocumentsHubPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  // ─── 草稿列表 ───
  const [drafts, setDrafts] = useState<TradeDocumentDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [draftSearch, setDraftSearch] = useState('');

  // ─── 正式文件 ───
  const [archives, setArchives] = useState<ContractDocument[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(true);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState<string>('all');

  // ─── 草稿操作状态 ───
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftTitle, setEditingDraftTitle] = useState('');
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // ─── 正式文件对话框 ───
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContractDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── 加载草稿 ───
  const loadDrafts = useCallback(async () => {
    if (!user) return;
    setLoadingDrafts(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (draftSearch) params.set('search', draftSearch);
      const res = await fetch(`/api/trade-documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '加载失败');
      setDrafts(json.data || []);
    } catch {
      // silently fail
    }
    setLoadingDrafts(false);
  }, [user, token, draftSearch]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // ─── 加载正式文件 ───
  const loadArchives = useCallback(async () => {
    if (!user) return;
    setLoadingArchives(true);
    try {
      const data = await listContractDocuments({
        search: archiveSearch || undefined,
        status: archiveStatus !== 'all' ? archiveStatus : undefined,
      });
      setArchives(data);
    } catch { /* ignore */ }
    setLoadingArchives(false);
  }, [user, archiveSearch, archiveStatus]);

  useEffect(() => { loadArchives(); }, [loadArchives]);

  // ─── 草稿摘要提取 ───
  const draftSummary = (draft: TradeDocumentDraft) => {
    const d = draft.doc_data as Record<string, unknown> | null;
    if (!d) return { invoiceNo: '', contractNo: '', licenseNo: '', customsNo: '', vins: [] as string[], vehicleCount: 0 };
    const tradeInfo = (d.tradeInfo as Record<string, string>) || {};
    const vehicles = (d.vehicles as Array<{ vin?: string }>) || [];
    return {
      invoiceNo: tradeInfo.invoiceNo || draft.doc_no || '',
      contractNo: tradeInfo.contractNo || '',
      licenseNo: tradeInfo.licenseNo || '',
      customsNo: tradeInfo.customsNo || '',
      vins: vehicles.map((v) => v.vin || '').filter(Boolean),
      vehicleCount: vehicles.length,
    };
  };

  // ─── 草稿重命名 ───
  const handleStartRename = (draft: TradeDocumentDraft) => {
    setEditingDraftId(draft.id);
    setEditingDraftTitle(draft.title || '');
  };

  const handleConfirmRename = async () => {
    if (!editingDraftId || !editingDraftTitle.trim()) {
      setEditingDraftId(null);
      return;
    }
    try {
      const res = await fetch(`/api/trade-documents/${editingDraftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editingDraftTitle.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '更新失败');
      }
      setDrafts((prev) =>
        prev.map((d) => (d.id === editingDraftId ? { ...d, title: editingDraftTitle.trim() } : d))
      );
      toast.success('备注已更新');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setEditingDraftId(null);
      setEditingDraftTitle('');
    }
  };

  const handleCancelRename = () => {
    setEditingDraftId(null);
    setEditingDraftTitle('');
  };

  // ─── 草稿删除 ───
  const handleDeleteDraft = async (id: string) => {
    setDeletingDraftId(id);
    try {
      const res = await fetch(`/api/trade-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '删除失败');
      }
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success('草稿已删除');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingDraftId(null);
    }
  };

  // ─── 正式文件操作 ───
  const handlePreview = async (record: ContractDocument) => {
    if (!record.fileKey) { toast.error('未上传文件'); return; }
    setPreviewLoading(true);
    try {
      const { url } = await getContractDocumentFileUrl(record.id);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取预览链接失败');
    } finally { setPreviewLoading(false); }
  };

  const handleDownload = async (record: ContractDocument) => {
    if (!record.fileKey) { toast.error('未上传文件'); return; }
    try { await downloadContractDocument(record.id); }
    catch (err) { toast.error(err instanceof Error ? err.message : '下载失败'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContractDocument(deleteTarget.id);
      toast.success('已删除');
      setDeleteTarget(null);
      loadArchives();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally { setDeleting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* 页面标题 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">发票合同装箱单</h1>
            <p className="mt-1 text-sm text-muted-foreground">一站管理交易单证：草稿列表与正式归档</p>
          </div>
          <Button size="lg" className="gap-2 shrink-0" onClick={() => router.push('/documents/new')}>
            <Plus className="h-5 w-5" />
            新建交易单证
          </Button>
        </div>

        {/* ===== 双列布局 ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ──────── 左列：草稿列表 ──────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  草稿列表
                  {drafts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{drafts.length}</Badge>
                  )}
                </CardTitle>
                <div className="relative w-44">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-9 text-sm"
                    placeholder="搜索草稿…"
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingDrafts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">暂无草稿</p>
                  <p className="text-xs mt-1 opacity-60">点击「新建交易单证」创建草稿</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map((draft) => {
                    const summary = draftSummary(draft);
                    const isRenaming = editingDraftId === draft.id;
                    const tc = TYPE_CONFIG[draft.doc_type] || TYPE_CONFIG.trade;
                    return (
                      <div
                        key={draft.id}
                        className={`group flex items-center gap-3 p-3 rounded-lg border border-l-2 hover:bg-muted/40 transition-colors cursor-pointer ${tc.border} border-l-2`}
                        onClick={() => {
                          if (!isRenaming) router.push(`/documents/new?draft=${draft.id}`);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Input
                                className="h-7 text-sm"
                                value={editingDraftTitle}
                                onChange={(e) => setEditingDraftTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConfirmRename();
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                                autoFocus
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleConfirmRename}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCancelRename}>
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {draft.title || '未命名草稿'}
                                </span>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  草稿
                                </Badge>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${tc.badge}`}>
                                  {tc.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Car className="h-3 w-3 shrink-0" />
                                  <span className="font-mono">{summary.vins.length > 0 ? summary.vins.slice(0, 2).join(', ') + (summary.vins.length > 2 ? ` +${summary.vins.length - 2}` : '') : '-'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Hash className="h-3 w-3 shrink-0" />
                                  {summary.contractNo || '-'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3 shrink-0" />
                                  {summary.licenseNo || '-'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <ClipboardList className="h-3 w-3 shrink-0" />
                                  {summary.customsNo || '-'}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground/60 mt-1">
                                {draft.updated_at ? formatDate(draft.updated_at) : ''}
                              </div>
                            </>
                          )}
                        </div>
                        {!isRenaming && (
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(draft);
                              }}
                              title="重命名"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDraft(draft.id);
                              }}
                              disabled={deletingDraftId === draft.id}
                              title="删除"
                            >
                              {deletingDraftId === draft.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ──────── 右列：正式文件 ──────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  正式文件
                  {archives.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{archives.length}</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-40">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-8 pl-9 text-sm"
                      placeholder="搜索…"
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 text-xs ${archiveStatus === 'all' ? 'bg-muted' : ''}`}
                    onClick={() => setArchiveStatus(archiveStatus === 'all' ? 'archived' : 'all')}
                  >
                    {archiveStatus === 'all' ? '全部' : '已归档'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingArchives ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : archives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileCheck className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">暂无正式文件</p>
                  <p className="text-xs mt-1 opacity-60">上传已签发的合同、发票、装箱单 PDF 进行归档</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {archives.map((record) => (
                    <div key={record.id} className="group flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {record.contractNo && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              {record.contractNo}
                            </span>
                          )}
                          {record.invoiceNo && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              {record.invoiceNo}
                            </span>
                          )}
                          {record.packingListNo && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                              <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              {record.packingListNo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {record.vins.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              {record.vins.slice(0, 3).join(', ')}
                              {record.vins.length > 3 && ` +${record.vins.length - 3}`}
                            </span>
                          )}
                          {record.fileName && (
                            <span className="flex items-center gap-1">
                              <File className="h-3 w-3" />
                              {record.fileName}
                              {record.fileSize != null && <span className="opacity-60">({formatFileSize(record.fileSize)})</span>}
                            </span>
                          )}
                          <span>{formatDate(record.createdAt)}</span>
                          <Badge variant="secondary" className={`text-xs ${record.status === 'archived' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                            {record.status === 'archived' ? '已归档' : '草稿'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {record.fileKey && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(record)} disabled={previewLoading} title="预览">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(record)} title="下载">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(record)} title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 预览对话框 */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>文件预览</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="flex-1 w-full h-full rounded-lg border" title="PDF Preview" />
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}