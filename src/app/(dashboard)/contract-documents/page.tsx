'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Download,
  Pencil,
  FileText,
  Upload,
  X,
  Loader2,
  Hash,
  Car,
  FileCheck,
  File,
  Filter,
  ClipboardList,
  LayoutList,
  Archive,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth-context';
import {
  listContractDocuments,
  createContractDocument,
  updateContractDocument,
  deleteContractDocument,
  getContractDocumentFileUrl,
  downloadContractDocument,
} from '@/lib/contract-documents/api-client';
import type { ContractDocument, ContractDocumentStatus } from '@/lib/contract-documents/types';

/** 格式化文件大小 */
function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 格式化日期 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

interface SavedDocumentDraft {
  id: string;
  title: string;
  doc_no: string;
  doc_data: Record<string, unknown> | null;
  doc_type: string;
  created_at: string;
  updated_at: string;
}

export default function ContractDocumentsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [records, setRecords] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tab, setTab] = useState<'archived' | 'drafts'>('archived');

  // Draft state
  const [drafts, setDrafts] = useState<SavedDocumentDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftDeleting, setDraftDeleting] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [contractNo, setContractNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [packingListNo, setPackingListNo] = useState('');
  const [vinsText, setVinsText] = useState('');
  const [recordStatus, setRecordStatus] = useState<ContractDocumentStatus>('draft');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ContractDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listContractDocuments({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRecords(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user, search, statusFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Load drafts from saved_documents
  const loadDrafts = useCallback(async () => {
    if (!user) return;
    setDraftsLoading(true);
    try {
      const res = await fetch('/api/trade-documents?limit=30', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '加载失败');
      setDrafts(json.data || []);
    } catch {
      // silently fail
    } finally {
      setDraftsLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (tab === 'drafts') loadDrafts();
  }, [tab, loadDrafts]);

  // Delete draft
  const handleDeleteDraft = async (id: string) => {
    setDraftDeleting(id);
    try {
      const res = await fetch(`/api/trade-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('删除失败');
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success('草稿已删除');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDraftDeleting(null);
    }
  };

  // Extract summary from draft data
  const draftSummary = (draft: SavedDocumentDraft) => {
    const d = draft.doc_data as Record<string, unknown> | null;
    if (!d) return { invoiceNo: '', contractNo: '', vins: [] as string[], vehicleCount: 0 };
    const tradeInfo = (d.tradeInfo as Record<string, string>) || {};
    const vehicles = (d.vehicles as Array<{ vin?: string }>) || [];
    return {
      invoiceNo: tradeInfo.invoiceNo || draft.doc_no || '',
      contractNo: tradeInfo.contractNo || '',
      vins: vehicles.map((v) => v.vin || '').filter(Boolean),
      vehicleCount: vehicles.length,
    };
  };

  // Reset form
  const resetForm = () => {
    setContractNo('');
    setInvoiceNo('');
    setPackingListNo('');
    setVinsText('');
    setRecordStatus('draft');
    setNotes('');
    setSelectedFile(null);
    setExistingFileName(null);
    setEditingId(null);
  };

  // Open create dialog
  const handleCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (record: ContractDocument) => {
    setEditingId(record.id);
    setContractNo(record.contractNo ?? '');
    setInvoiceNo(record.invoiceNo ?? '');
    setPackingListNo(record.packingListNo ?? '');
    setVinsText(record.vins.join('\n'));
    setRecordStatus(record.status as ContractDocumentStatus);
    setNotes(record.notes ?? '');
    setSelectedFile(null);
    setExistingFileName(record.fileName ?? null);
    setDialogOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    setSaving(true);
    try {
      const vins = vinsText
        .split(/[\s,;，；、\t\r\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      if (editingId) {
        await updateContractDocument(
          editingId,
          {
            contractNo: contractNo || undefined,
            invoiceNo: invoiceNo || undefined,
            packingListNo: packingListNo || undefined,
            vins,
            status: recordStatus,
            notes: notes || undefined,
          },
          selectedFile,
        );
        toast.success('更新成功');
      } else {
        await createContractDocument(
          {
            contractNo: contractNo || undefined,
            invoiceNo: invoiceNo || undefined,
            packingListNo: packingListNo || undefined,
            vins,
            status: recordStatus,
            notes: notes || undefined,
          },
          selectedFile,
        );
        toast.success('保存成功');
      }
      setDialogOpen(false);
      resetForm();
      loadRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContractDocument(deleteTarget.id);
      toast.success('删除成功');
      setDeleteTarget(null);
      loadRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // Preview PDF
  const handlePreview = async (record: ContractDocument) => {
    if (!record.fileKey) {
      toast.error('该记录未上传文件');
      return;
    }
    setPreviewLoading(true);
    try {
      const { url } = await getContractDocumentFileUrl(record.id);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取预览链接失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download
  const handleDownload = async (record: ContractDocument) => {
    if (!record.fileKey) {
      toast.error('该记录未上传文件');
      return;
    }
    try {
      await downloadContractDocument(record.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败');
    }
  };

  // Status badge
  const statusBadge = (status: string) => {
    if (status === 'draft') {
      return (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
          草稿
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
        已归档
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">合同发票装箱单</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              管理合同、发票、装箱单的草稿与归档记录
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={tab === 'drafts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('drafts')}
              className="gap-1.5"
            >
              <ClipboardList className="h-4 w-4" />
              草稿
            </Button>
            <Button
              variant={tab === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('archived')}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              已归档
            </Button>
            <Button onClick={handleCreate} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              新建记录
            </Button>
          </div>
        </div>

        {/* Search & Filter — only for archived tab */}
        {tab === 'archived' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索合同号、发票号、装箱单号、车架号..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Archived Records ── */}
        {tab === 'archived' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <FileText className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-sm text-muted-foreground">暂无归档记录</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    点击「新建记录」开始添加合同、发票、装箱单
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <Card key={record.id} className="group transition-shadow hover:shadow-md">
                    <CardContent className="py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {record.contractNo && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                合同号: {record.contractNo}
                              </span>
                            )}
                            {record.invoiceNo && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                发票号: {record.invoiceNo}
                              </span>
                            )}
                            {record.packingListNo && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                装箱单号: {record.packingListNo}
                              </span>
                            )}
                          </div>
                          {record.vins.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {record.vins.map((vin) => (
                                <Badge key={vin} variant="outline" className="text-xs font-mono">
                                  {vin}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {record.fileName && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <File className="h-3.5 w-3.5" />
                              {record.fileName}
                              {record.fileSize != null && (
                                <span className="text-muted-foreground/60">({formatFileSize(record.fileSize)})</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                            <span>{formatDate(record.createdAt)}</span>
                            {statusBadge(record.status)}
                            {record.notes && (
                              <span className="truncate max-w-[200px]" title={record.notes}>
                                {record.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {record.fileKey && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePreview(record)}
                                disabled={previewLoading}
                                title="预览"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(record)}
                                title="下载"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(record)}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(record)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Drafts ── */}
        {tab === 'drafts' && (
          <>
            {draftsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : drafts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-sm text-muted-foreground">暂无草稿</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    在「单证制作」页面创建合同/发票/装箱单并保存草稿
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => router.push('/documents/new')}
                  >
                    <LayoutList className="h-4 w-4" />
                    去制作单证
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => {
                  const summary = draftSummary(draft);
                  return (
                    <Card key={draft.id} className="group transition-shadow hover:shadow-md">
                      <CardContent className="py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {draft.title || '未命名草稿'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                草稿
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {summary.invoiceNo && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {summary.invoiceNo}
                                </span>
                              )}
                              {summary.contractNo && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Hash className="h-3 w-3" />
                                  {summary.contractNo}
                                </span>
                              )}
                              {summary.vehicleCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Car className="h-3 w-3" />
                                  {summary.vehicleCount} 辆车
                                </span>
                              )}
                            </div>
                            {summary.vins.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {summary.vins.slice(0, 3).map((vin) => (
                                  <Badge key={vin} variant="outline" className="text-xs font-mono">
                                    {vin}
                                  </Badge>
                                ))}
                                {summary.vins.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{summary.vins.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground/60">
                              {draft.updated_at ? formatDate(draft.updated_at) : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => router.push(`/documents/new?draft=${draft.id}`)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              继续编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteDraft(draft.id)}
                              disabled={draftDeleting === draft.id}
                              title="删除"
                            >
                              {draftDeleting === draft.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑记录' : '新建记录'}</DialogTitle>
            <DialogDescription>
              填写合同、发票、装箱单编号及车架号，可选择上传 PDF 文件
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contractNo">合同号</Label>
                <Input
                  id="contractNo"
                  placeholder="如 CT-2025-001"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">发票号</Label>
                <Input
                  id="invoiceNo"
                  placeholder="如 INV-2025-001"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="packingListNo">装箱单号</Label>
              <Input
                id="packingListNo"
                placeholder="如 PL-2025-001"
                value={packingListNo}
                onChange={(e) => setPackingListNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vins">车架号（VIN）</Label>
              <Textarea
                id="vins"
                placeholder="每行一个 VIN，或用逗号/空格分隔&#10;如: WVWZZZ3CZWE123456&#10;    LSVNU2189EN123456"
                rows={3}
                value={vinsText}
                onChange={(e) => setVinsText(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={recordStatus} onValueChange={(v) => setRecordStatus(v as ContractDocumentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>上传 PDF（可选）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setSelectedFile(f);
                    }}
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                {existingFileName && !selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    当前文件: {existingFileName}
                  </p>
                )}
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    新文件: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="可选备注信息"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>文件预览</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="flex-1 w-full h-full rounded-lg border"
              title="PDF Preview"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后不可恢复，确定要删除这条记录吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}